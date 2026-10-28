import { updateHouseholdSchema, type Household } from '@smartnomic/api';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/client';
import { households } from '../db/schema';
import type { HouseholdRow } from '../households';
import type { HouseholdAccess } from '../plugins/household-access';

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
