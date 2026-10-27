import { errorResponseSchema } from '@smartnomic/api';
import type { Action } from '@smartnomic/domain';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { members } from '../src/db/schema';
import { createHouseholdAccess } from '../src/plugins/household-access';
import { signUp, useTestServer } from './helpers';

const ctx = useTestServer();

/** Añade una ruta de prueba que exige la acción indicada. */
function routeRequiring(action: Action) {
  const access = createHouseholdAccess(ctx.api);
  ctx.app.get(
    '/api/households/:householdId/prueba',
    { preHandler: access.requireMember(action) },
    async (request) => ({ role: request.membership?.member.role }),
  );
}

/** Mete a `guest` en el hogar de `owner` con el rol indicado. */
async function joinAs(ownerId: string, guestId: string, role: 'editor' | 'viewer') {
  const [owner] = await ctx.db.select().from(members).where(eq(members.userId, ownerId));
  await ctx.db.delete(members).where(eq(members.userId, guestId));
  await ctx.db.insert(members).values({ householdId: owner!.householdId, userId: guestId, role });
  return owner!.householdId;
}

describe('requireMember', () => {
  it('deja pasar a quien tiene permiso', async () => {
    routeRequiring('transactions.write');
    const owner = await signUp(ctx.app);
    const editor = await signUp(ctx.app);
    const householdId = await joinAs(owner.id, editor.id, 'editor');

    const response = await ctx.app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/prueba`,
      headers: { cookie: editor.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ role: 'editor' });
  });

  it('un lector no puede escribir en su propio hogar (403)', async () => {
    routeRequiring('transactions.write');
    const owner = await signUp(ctx.app);
    const viewer = await signUp(ctx.app);
    const householdId = await joinAs(owner.id, viewer.id, 'viewer');

    const response = await ctx.app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/prueba`,
      headers: { cookie: viewer.cookie },
    });

    expect(response.statusCode).toBe(403);
    expect(errorResponseSchema.parse(response.json()).error.message).toMatch(/rol/);
  });

  it('un editor no puede gestionar miembros (403); el propietario sí', async () => {
    routeRequiring('members.manage');
    const owner = await signUp(ctx.app);
    const editor = await signUp(ctx.app);
    const householdId = await joinAs(owner.id, editor.id, 'editor');
    const url = `/api/households/${householdId}/prueba`;

    const asEditor = await ctx.app.inject({
      method: 'GET',
      url,
      headers: { cookie: editor.cookie },
    });
    const asOwner = await ctx.app.inject({ method: 'GET', url, headers: { cookie: owner.cookie } });

    expect(asEditor.statusCode).toBe(403);
    expect(asOwner.statusCode).toBe(200);
  });
});
