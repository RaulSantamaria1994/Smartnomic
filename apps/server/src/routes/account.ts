import { deleteAccountSchema } from '@smartnomic/api';
import { fromNodeHeaders } from 'better-auth/node';
import { count, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Auth, AuthRateLimit } from '../auth';
import type { Database } from '../db/client';
import { households, members, users, verifications } from '../db/schema';
import { listMemberships } from '../households';
import { ApiError } from '../plugins/errors';
import type { HouseholdAccess } from '../plugins/household-access';

/**
 * Borrar la cuenta (RF-039, constitución art. VI.6). Se confirma con la contraseña. Si el
 * usuario es el propietario y hay más miembros, antes tiene que pasar la propiedad. Si es
 * el único miembro, se borra también el hogar con todos sus datos. Si no, sus movimientos
 * se quedan en el hogar como de «un antiguo miembro».
 */
export function registerAccountRoutes(
  app: FastifyInstance,
  deps: { db: Database; auth: Auth; access: HouseholdAccess; rateLimit: AuthRateLimit },
): void {
  const { db, auth, access } = deps;

  app.delete(
    '/api/account',
    { preHandler: access.requireSession, config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const { password } = deleteAccountSchema.parse(request.body ?? {});
      const user = request.user!;
      const valid = await auth.api
        .verifyPassword({ body: { password }, headers: fromNodeHeaders(request.headers) })
        .then(() => true)
        .catch(() => false);
      if (!valid) throw new ApiError('validation_failed', 'La contraseña no es correcta.');

      // Todos sus hogares (especificación 013): donde es propietario con más miembros hay que
      // pasar antes la propiedad; los que solo tienen a esta persona se borran con la cuenta.
      const memberships = await listMemberships(db, user.id);
      await db.transaction(async (tx) => {
        const owned = memberships.filter((m) => m.member.role === 'owner');
        const counts = await Promise.all(
          owned.map(async (m) => {
            const [row] = await tx
              .select({ total: count() })
              .from(members)
              .where(eq(members.householdId, m.household.id));
            return { membership: m, total: row?.total ?? 0 };
          }),
        );
        const blocked = counts
          .filter((c) => c.total > 1)
          .map((c) => `«${c.membership.household.name}»`);
        if (blocked.length > 0) {
          throw new ApiError(
            'conflict',
            `Eres el propietario de ${blocked.length > 1 ? 'hogares' : 'un hogar'} con más miembros (${blocked.join(', ')}). Pasa antes la propiedad a uno de ellos.`,
          );
        }
        for (const { membership } of counts) {
          await tx.delete(households).where(eq(households.id, membership.household.id));
        }
        // Las sesiones, las cuentas de Better Auth y la pertenencia a los hogares caen en
        // cascada; sus movimientos se quedan como de «un antiguo miembro».
        await tx.delete(verifications).where(eq(verifications.value, user.id));
        await tx.delete(users).where(eq(users.id, user.id));
      });
      // Los demás miembros ven que ya no está; sus conexiones de tiempo real se cierran.
      request.realtime = memberships.map((m) => ({
        householdId: m.household.id,
        scope: 'members' as const,
      }));
      return reply.status(204).send();
    },
  );
}
