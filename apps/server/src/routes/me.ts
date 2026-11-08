import type { MeResponse } from '@smartnomic/api';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/client';
import { ensureDefaultCategories, listMemberships } from '../households';
import type { HouseholdAccess, SessionUser } from '../plugins/household-access';
import { toHousehold } from './households';
import { toMember } from './members';

/**
 * Usuario y sus hogares (especificación 013). Ya no crea un hogar si no tiene ninguno: la app
 * le pide crear uno o unirse (RF-1308). `household` y `member` repiten el primero para la app
 * instalada antes de varios hogares (constitución, art. V.4).
 */
export async function meResponse(db: Database, user: SessionUser): Promise<MeResponse> {
  const memberships = await listMemberships(db, user.id);
  await Promise.all(memberships.map((m) => ensureDefaultCategories(db, m.household.id)));
  const list = memberships.map((m) => ({
    household: toHousehold(m.household),
    member: toMember(m.member),
  }));
  return {
    user,
    households: list,
    household: list[0]?.household ?? null,
    member: list[0]?.member ?? null,
  };
}

export function registerMeRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess },
): void {
  app.get('/api/me', { preHandler: deps.access.requireSession }, async (request) =>
    meResponse(deps.db, request.user!),
  );
}
