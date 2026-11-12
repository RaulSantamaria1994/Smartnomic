import { deletePushDeviceSchema, pushDeviceSchema } from '@smartnomic/api';
import { fromNodeHeaders } from 'better-auth/node';
import { and, desc, eq, notInArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Auth, AuthRateLimit } from '../auth';
import type { Database } from '../db/client';
import { pushDevices } from '../db/schema';
import { ApiError } from '../plugins/errors';
import type { HouseholdAccess } from '../plugins/household-access';

/** Móviles que puede tener registrados una persona; al pasarse se descartan los más antiguos. */
export const MAX_DEVICES_PER_USER = 20;

/**
 * Dispositivos de avisos push (especificación 014, RF-1409). El token de un móvil se ata a la
 * sesión de quien lo registra: el usuario y la sesión salen siempre de la sesión de la petición,
 * nunca del cuerpo. Cerrar sesión o borrar la cuenta borra el dispositivo en cascada.
 */
export function registerPushDeviceRoutes(
  app: FastifyInstance,
  deps: { db: Database; auth: Auth; access: HouseholdAccess; rateLimit: AuthRateLimit },
): void {
  const { db, auth, access } = deps;
  const url = '/api/push-device';
  const options = { preHandler: access.requireSession, config: { rateLimit: deps.rateLimit } };

  // Alta o reasignación: un móvil, un token. Si otra cuenta entra en el mismo móvil, el token
  // pasa a su sesión y el móvil solo recibe los avisos de quien tiene la sesión abierta.
  app.put(url, options, async (request, reply) => {
    const { token } = pushDeviceSchema.parse(request.body);
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) throw new ApiError('unauthenticated', 'Inicia sesión para continuar.');
    const userId = request.user!.id;
    await db
      .insert(pushDevices)
      .values({ token, userId, sessionId: session.session.id })
      .onConflictDoUpdate({
        target: pushDevices.token,
        set: { userId, sessionId: session.session.id, updatedAt: new Date() },
      });
    // Sin tope, registrar tokens en bucle llenaría la tabla: se quedan los más recientes.
    await db
      .delete(pushDevices)
      .where(
        and(
          eq(pushDevices.userId, userId),
          notInArray(
            pushDevices.token,
            db
              .select({ token: pushDevices.token })
              .from(pushDevices)
              .where(eq(pushDevices.userId, userId))
              .orderBy(desc(pushDevices.updatedAt))
              .limit(MAX_DEVICES_PER_USER),
          ),
        ),
      );
    return reply.status(204).send();
  });

  // Baja: 204 aunque no exista, y solo se borra si es de este usuario.
  app.delete(url, options, async (request, reply) => {
    const { token } = deletePushDeviceSchema.parse(request.body);
    await db
      .delete(pushDevices)
      .where(and(eq(pushDevices.token, token), eq(pushDevices.userId, request.user!.id)));
    return reply.status(204).send();
  });
}
