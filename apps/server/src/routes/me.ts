import { putTimezoneSchema, type MeResponse } from '@smartnomic/api';
import type { FastifyInstance } from 'fastify';
import { applySignupTimezone, userHasPassword } from '../account';
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
  const [hasPassword] = await Promise.all([
    userHasPassword(db, user.id),
    ...memberships.map((m) => ensureDefaultCategories(db, m.household.id)),
  ]);
  const list = memberships.map((m) => ({
    household: toHousehold(m.household),
    member: toMember(m.member),
  }));
  return {
    user: { ...user, hasPassword },
    households: list,
    household: list[0]?.household ?? null,
    member: list[0]?.member ?? null,
  };
}

export function registerMeRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess; now?: () => Date },
): void {
  const now = deps.now ?? (() => new Date());
  app.get('/api/me', { preHandler: deps.access.requireSession }, async (request) =>
    meResponse(deps.db, request.user!),
  );
  // Zona del dispositivo tras entrar con Google (el callback no trae x-timezone).
  app.put(
    '/api/me/timezone',
    { preHandler: deps.access.requireSession },
    async (request, reply) => {
      const { timezone } = putTimezoneSchema.parse(request.body ?? {});
      await applySignupTimezone(deps.db, request.user!.id, timezone, now());
      return reply.status(204).send();
    },
  );
}
