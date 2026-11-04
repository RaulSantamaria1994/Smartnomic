import { budgetRecordSchema, errorResponseSchema } from '@smartnomic/api';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { budgets, categories, households } from '../src/db/schema';
import { joinHousehold, me, newId, signUp, useTestServer, type TestUser } from './helpers';

// Hoy es 2026-10-27 (TEST_NOW): el periodo en curso empieza el 1 de octubre.
const ctx = useTestServer();

let owner: TestUser;
let householdId: string;
let groceries: string;

function putBudget(user: TestUser, categoryId: string, body: unknown, household = householdId) {
  return ctx.app.inject({
    method: 'PUT',
    url: `/api/households/${household}/budgets/${categoryId}`,
    headers: { cookie: user.cookie },
    payload: body as Record<string, unknown>,
  });
}

function deleteBudget(user: TestUser, categoryId: string, household = householdId) {
  return ctx.app.inject({
    method: 'DELETE',
    url: `/api/households/${household}/budgets/${categoryId}`,
    headers: { cookie: user.cookie },
  });
}

async function categoryOf(household: string, name: string) {
  const [row] = await ctx.db
    .select()
    .from(categories)
    .where(and(eq(categories.householdId, household), eq(categories.name, name)));
  return row!.id;
}

const rowsOf = (categoryId: string) =>
  ctx.db
    .select()
    .from(budgets)
    .where(eq(budgets.categoryId, categoryId))
    .orderBy(budgets.validFrom);

beforeEach(async () => {
  owner = await signUp(ctx.app);
  householdId = (await me(ctx.app, owner)).household.id;
  groceries = await categoryOf(householdId, 'Supermercado');
});

describe('poner, cambiar y quitar un presupuesto (especificación 007, historia 1)', () => {
  it('poner vale desde el periodo en curso', async () => {
    const response = await putBudget(owner, groceries, { amountCents: 40000 });
    expect(response.statusCode).toBe(200);
    expect(budgetRecordSchema.parse(response.json())).toEqual({
      categoryId: groceries,
      validFrom: '2026-10-01',
      amountCents: 40000,
    });
    expect(await rowsOf(groceries)).toHaveLength(1);
  });

  it('cambiarlo el mismo mes deja el último importe y no crea filas; repetirlo da lo mismo', async () => {
    await putBudget(owner, groceries, { amountCents: 40000 });
    await putBudget(owner, groceries, { amountCents: 45000 });
    const again = await putBudget(owner, groceries, { amountCents: 45000 });
    expect(again.statusCode).toBe(200);
    const rows = await rowsOf(groceries);
    expect(rows.map((r) => [r.validFrom, r.amountCents])).toEqual([['2026-10-01', 45000]]);
  });

  it('cambiarlo no toca los meses pasados (RF-702)', async () => {
    await ctx.db
      .insert(budgets)
      .values({ householdId, categoryId: groceries, validFrom: '2026-09-01', amountCents: 30000 });
    await putBudget(owner, groceries, { amountCents: 40000 });
    const rows = await rowsOf(groceries);
    expect(rows.map((r) => [r.validFrom, r.amountCents])).toEqual([
      ['2026-09-01', 30000],
      ['2026-10-01', 40000],
    ]);
  });

  it('quitarlo deja «sin presupuesto» desde el periodo en curso; repetirlo da lo mismo', async () => {
    await ctx.db
      .insert(budgets)
      .values({ householdId, categoryId: groceries, validFrom: '2026-09-01', amountCents: 30000 });
    expect((await deleteBudget(owner, groceries)).statusCode).toBe(204);
    expect((await deleteBudget(owner, groceries)).statusCode).toBe(204);
    const rows = await rowsOf(groceries);
    expect(rows.map((r) => [r.validFrom, r.amountCents])).toEqual([
      ['2026-09-01', 30000],
      ['2026-10-01', null],
    ]);
  });

  it('con el mes empezando el 25, vale desde el 25', async () => {
    await ctx.db
      .update(households)
      .set({ monthStartDay: 25 })
      .where(eq(households.id, householdId));
    const response = await putBudget(owner, groceries, { amountCents: 40000 });
    expect(response.json()).toMatchObject({ validFrom: '2026-10-25' });
  });

  it('guarda quién lo cambió', async () => {
    await putBudget(owner, groceries, { amountCents: 40000 });
    const [row] = await rowsOf(groceries);
    expect(row!.memberId).toBe((await me(ctx.app, owner)).member.id);
  });
});

describe('quién puede y qué categorías', () => {
  it('un editor puede; un lector no (RF-701)', async () => {
    const editor = await signUp(ctx.app);
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');
    await joinHousehold(ctx.db, owner, viewer, 'viewer');
    expect((await putBudget(editor, groceries, { amountCents: 100 })).statusCode).toBe(200);
    expect((await deleteBudget(editor, groceries)).statusCode).toBe(204);
    expect((await putBudget(viewer, groceries, { amountCents: 100 })).statusCode).toBe(403);
    expect((await deleteBudget(viewer, groceries)).statusCode).toBe(403);
  });

  it('nadie de otro hogar puede tocarlos, ni con el id de una categoría ajena', async () => {
    const stranger = await signUp(ctx.app);
    const strangerHousehold = (await me(ctx.app, stranger)).household.id;
    expect((await putBudget(stranger, groceries, { amountCents: 100 })).statusCode).toBe(403);
    const ownCategoryOfOther = await putBudget(
      stranger,
      groceries,
      { amountCents: 100 },
      strangerHousehold,
    );
    expect(ownCategoryOfOther.statusCode).toBe(404);
    expect((await deleteBudget(stranger, groceries, strangerHousehold)).statusCode).toBe(404);
    expect(await rowsOf(groceries)).toHaveLength(0);
  });

  it('una categoría que no existe da 404 y un id mal escrito, 400', async () => {
    expect((await putBudget(owner, newId(), { amountCents: 100 })).statusCode).toBe(404);
    expect((await putBudget(owner, 'no-es-un-id', { amountCents: 100 })).statusCode).toBe(400);
  });

  it('las categorías de ingresos y las archivadas no llevan presupuesto (409)', async () => {
    const salary = await categoryOf(householdId, 'Nómina');
    const income = await putBudget(owner, salary, { amountCents: 100 });
    expect(income.statusCode).toBe(409);
    expect(errorResponseSchema.parse(income.json()).error.message).toMatch(/gasto/);
    await ctx.db
      .update(categories)
      .set({ archivedAt: new Date() })
      .where(eq(categories.id, groceries));
    expect((await putBudget(owner, groceries, { amountCents: 100 })).statusCode).toBe(409);
  });

  it('importes no válidos: 400 y no se guarda nada', async () => {
    for (const body of [
      {},
      { amountCents: 0 },
      { amountCents: -1 },
      { amountCents: 10.5 },
      { amountCents: '400' },
      { amountCents: 1e15 },
    ]) {
      const response = await putBudget(owner, groceries, body);
      expect(response.statusCode, JSON.stringify(body)).toBe(400);
    }
    expect(await rowsOf(groceries)).toHaveLength(0);
  });
});
