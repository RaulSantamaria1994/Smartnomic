import { errorResponseSchema, meResponseSchema } from '@smartnomic/api';
import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { categories, members } from '../src/db/schema';
import { createHouseholdAccess } from '../src/plugins/household-access';
import { call, me, newId, signUp, useTestServer, type TestUser } from './helpers';

const ctx = useTestServer();

/** Mete a `guest` también en el hogar de `owner`, sin sacarle del suyo. */
async function addTo(owner: TestUser, guest: TestUser, role: 'editor' | 'viewer') {
  const householdId = (await me(ctx.app, owner)).household.id;
  await ctx.db.insert(members).values({ householdId, userId: guest.id, role });
  return householdId;
}

async function expenseCategory(householdId: string) {
  const [row] = await ctx.db
    .select()
    .from(categories)
    .where(and(eq(categories.householdId, householdId), eq(categories.kind, 'expense')))
    .limit(1);
  return row!.id;
}

function expense(householdId: string, categoryId: string) {
  return {
    url: `/api/households/${householdId}/transactions/${newId()}`,
    body: { kind: 'expense', amountCents: 1234, date: '2026-10-27', categoryId },
  };
}

describe('un usuario en varios hogares (especificación 013)', () => {
  it('me lista sus hogares del más antiguo al más nuevo y repite el primero', async () => {
    const lucia = await signUp(ctx.app, { name: 'Lucía' });
    const marta = await signUp(ctx.app, { name: 'Marta' });
    const own = (await me(ctx.app, lucia)).household.id;
    const beach = await addTo(marta, lucia, 'editor');

    const response = await call(ctx.app, lucia, 'GET', '/api/me');
    const body = meResponseSchema.parse(response.json());
    expect(body.households.map((h) => h.household.id)).toEqual([own, beach]);
    expect(body.households.map((h) => h.member.role)).toEqual(['owner', 'editor']);
    // La app instalada antes de varios hogares sigue viendo el suyo de siempre.
    expect(body.household?.id).toBe(own);
    expect(body.member?.role).toBe('owner');
  });

  it('lee y cambia cada hogar con el rol que tiene en él', async () => {
    const lucia = await signUp(ctx.app);
    const marta = await signUp(ctx.app);
    const own = (await me(ctx.app, lucia)).household.id;
    const beach = await addTo(marta, lucia, 'viewer');

    for (const id of [own, beach]) {
      expect(
        (await call(ctx.app, lucia, 'GET', `/api/households/${id}/categories`)).statusCode,
      ).toBe(200);
    }
    const mine = expense(own, await expenseCategory(own));
    expect((await call(ctx.app, lucia, 'PUT', mine.url, mine.body)).statusCode).toBe(200);
    // En el de la playa es lectora: no puede apuntar.
    const theirs = expense(beach, await expenseCategory(beach));
    const denied = await call(ctx.app, lucia, 'PUT', theirs.url, theirs.body);
    expect(denied.statusCode).toBe(403);
    expect(errorResponseSchema.parse(denied.json()).error.message).toMatch(/rol/);
  });

  it('estar en un hogar con alguien no deja entrar en los otros hogares de esa persona', async () => {
    const lucia = await signUp(ctx.app);
    const marta = await signUp(ctx.app);
    const luciaHome = (await me(ctx.app, lucia)).household.id;
    await addTo(marta, lucia, 'editor');

    // Marta comparte un hogar con Lucía, pero no es miembro del de Lucía.
    const read = await call(ctx.app, marta, 'GET', `/api/households/${luciaHome}/categories`);
    expect(read.statusCode).toBe(403);
    const write = expense(luciaHome, await expenseCategory(luciaHome));
    expect((await call(ctx.app, marta, 'PUT', write.url, write.body)).statusCode).toBe(403);
  });

  it('una ruta con requireMember sin hogar en la URL no deja pasar a nadie', async () => {
    const access = createHouseholdAccess(ctx.api);
    ctx.app.get(
      '/api/sin-hogar-en-la-url',
      { preHandler: access.requireMember('household.view') },
      async () => ({ ok: true }),
    );
    const lucia = await signUp(ctx.app);
    const response = await call(ctx.app, lucia, 'GET', '/api/sin-hogar-en-la-url');
    expect(response.statusCode).toBe(403);
  });
});

describe('sin hogares (especificación 013)', () => {
  it('me devuelve la lista vacía y ya no crea un hogar', async () => {
    const marta = await signUp(ctx.app);
    await ctx.db.delete(members).where(eq(members.userId, marta.id));

    const response = await call(ctx.app, marta, 'GET', '/api/me');
    expect(response.statusCode).toBe(200);
    const body = meResponseSchema.parse(response.json());
    expect(body.households).toEqual([]);
    expect(body.household).toBeNull();
    expect(body.member).toBeNull();
    expect(await ctx.db.select().from(members).where(eq(members.userId, marta.id))).toEqual([]);
  });

  it('al registrarse se sigue creando su hogar (RF-1309)', async () => {
    const nuevo = await signUp(ctx.app, { timezone: 'Atlantic/Canary' });
    const body = await me(ctx.app, nuevo);
    expect(body.households).toHaveLength(1);
    expect(body.household.timezone).toBe('Atlantic/Canary');
    expect(body.member.role).toBe('owner');
  });
});
