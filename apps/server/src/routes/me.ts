import type { MeResponse } from '@smartnomic/api';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/client';
import { ensureDefaultCategories, ensureHousehold } from '../households';
import type { HouseholdAccess, SessionUser } from '../plugins/household-access';
import { toHousehold } from './households';
import { toMember } from './members';

/**
 * Usuario, hogar y rol. Si el usuario no tiene hogar (el registro falló a medias, salió
 * del suyo o lo quitaron de otro), se le crea uno propio vacío.
 */
export async function meResponse(
  db: Database,
  user: SessionUser,
  timezone: string | null = null,
): Promise<MeResponse> {
  const { household, member } = await ensureHousehold(db, user, timezone);
  await ensureDefaultCategories(db, household.id);
  return { user, household: toHousehold(household), member: toMember(member) };
}

export function registerMeRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess },
): void {
  app.get('/api/me', { preHandler: deps.access.requireSession }, async (request) =>
    meResponse(deps.db, request.user!),
  );
}
