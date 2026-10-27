import type { Household } from '@smartnomic/api';
import type { FastifyInstance } from 'fastify';
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
  deps: { access: HouseholdAccess },
): void {
  app.get(
    '/api/households/:householdId',
    { preHandler: deps.access.requireMember('household.view') },
    async (request): Promise<Household> => toHousehold(request.membership!.household),
  );
}
