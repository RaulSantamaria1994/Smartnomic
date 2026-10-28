import { deleteAccountSchema } from '@smartnomic/api';
import { fromNodeHeaders } from 'better-auth/node';
import { count, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Auth, AuthRateLimit } from '../auth';
import type { Database } from '../db/client';
import { households, members, users, verifications } from '../db/schema';
import { findMembership } from '../households';
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

      const membership = await findMembership(db, user.id);
      await db.transaction(async (tx) => {
        if (membership?.member.role === 'owner') {
          const [row] = await tx
            .select({ total: count() })
            .from(members)
            .where(eq(members.householdId, membership.household.id));
          if ((row?.total ?? 0) > 1) {
            throw new ApiError(
              'conflict',
              'Eres el propietario de un hogar con más miembros. Pasa antes la propiedad a uno de ellos.',
            );
          }
          await tx.delete(households).where(eq(households.id, membership.household.id));
        }
        // Las sesiones, las cuentas de Better Auth y la pertenencia al hogar caen en cascada.
        await tx.delete(verifications).where(eq(verifications.value, user.id));
        await tx.delete(users).where(eq(users.id, user.id));
      });
      return reply.status(204).send();
    },
  );
}
