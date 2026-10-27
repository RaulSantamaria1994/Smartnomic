import type { MeResponse } from '@smartnomic/api';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/client';
import { ensureDefaultCategories, ensureHousehold } from '../households';
import type { HouseholdAccess } from '../plugins/household-access';
import { toHousehold } from './households';

export function registerMeRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess },
): void {
  app.get(
    '/api/me',
    { preHandler: deps.access.requireSession },
    async (request): Promise<MeResponse> => {
      const user = request.user!;
      // Normalmente el hogar se crea al registrarse; si aquel paso falló, se crea aquí.
      const { household, member } = await ensureHousehold(deps.db, user, null);
      await ensureDefaultCategories(deps.db, household.id);
      return {
        user,
        household: toHousehold(household),
        member: { id: member.id, role: member.role },
      };
    },
  );
}
