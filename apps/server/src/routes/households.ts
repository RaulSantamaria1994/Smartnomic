import {
  createHouseholdSchema,
  TIMEZONE_HEADER,
  updateHouseholdSchema,
  type Household,
  type Membership,
} from '@smartnomic/api';
import { MAX_HOUSEHOLDS } from '@smartnomic/domain';
import { count, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/client';
import { households, members } from '../db/schema';
import { createHousehold, type HouseholdRow } from '../households';
import { ApiError } from '../plugins/errors';
import type { HouseholdAccess } from '../plugins/household-access';
import { toMember } from './members';

export function toHousehold(row: HouseholdRow): Household {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
    monthStartDay: row.monthStartDay,
    timezone: row.timezone,
  };
}

export function registerHouseholdRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess },
): void {
  // Crear un hogar del que se es propietario, con las categorías de siempre (especificación
  // 013, RF-1305). Hasta 5 por persona, también con varias peticiones a la vez.
  app.post(
    '/api/households',
    { preHandler: deps.access.requireSession },
    async (request, reply): Promise<Membership> => {
      const { name } = createHouseholdSchema.parse(request.body ?? {});
      const timezone = request.headers[TIMEZONE_HEADER];
      const created = await createHousehold(deps.db, request.user!, {
        name,
        timezone: typeof timezone === 'string' ? timezone : null,
      });
      if (created === 'limit' || created === 'exists') {
        throw new ApiError(
          'conflict',
          `Ya estás en ${MAX_HOUSEHOLDS} hogares, el máximo. Sal de uno o bórralo para crear otro.`,
        );
      }
      reply.status(201);
      return { household: toHousehold(created.household), member: toMember(created.member) };
    },
  );

  // Borrar un hogar: solo su propietario y si es su único miembro (RF-1307). Sus datos se
  // borran en cascada. Con más miembros, primero pasa la propiedad y sale.
  app.delete(
    '/api/households/:householdId',
    { preHandler: deps.access.requireMember('household.update') },
    async (request, reply) => {
      const { household } = request.membership!;
      await deps.db.transaction(async (tx) => {
        const [row] = await tx
          .select({ total: count() })
          .from(members)
          .where(eq(members.householdId, household.id));
        if ((row?.total ?? 0) > 1) {
          throw new ApiError(
            'conflict',
            'El hogar tiene más miembros: pasa antes la propiedad a uno de ellos y sal del hogar.',
          );
        }
        await tx.delete(households).where(eq(households.id, household.id));
      });
      // Sus conexiones de tiempo real se cierran (ya no es miembro).
      request.realtime = [{ householdId: household.id, scope: 'members' }];
      return reply.status(204).send();
    },
  );

  app.get(
    '/api/households/:householdId',
    { preHandler: deps.access.requireMember('household.view') },
    async (request): Promise<Household> => toHousehold(request.membership!.household),
  );

  // Nombre e inicio de mes (RF-003). Los periodos se calculan al consultar, así que cambiar
  // el día los recalcula para todos sin tocar los movimientos.
  app.patch(
    '/api/households/:householdId',
    { preHandler: deps.access.requireMember('household.update') },
    async (request): Promise<Household> => {
      const input = updateHouseholdSchema.parse(request.body);
      const [row] = await deps.db
        .update(households)
        .set(input)
        .where(eq(households.id, request.membership!.household.id))
        .returning();
      return toHousehold(row!);
    },
  );
}
