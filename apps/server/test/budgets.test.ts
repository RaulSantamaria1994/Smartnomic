import {
  budgetRecordSchema,
  errorResponseSchema,
  householdExportSchema,
  periodResponseSchema,
  recurringRuleSchema,
} from '@smartnomic/api';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { budgets, categories, households, transactions } from '../src/db/schema';
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

async function addExpense(categoryId: string, amountCents: number, date: string, id = newId()) {
  const response = await ctx.app.inject({
    method: 'PUT',
    url: `/api/households/${householdId}/transactions/${id}`,
    headers: { cookie: owner.cookie },
    payload: { kind: 'expense', amountCents, date, categoryId },
  });
  expect(response.statusCode).toBe(200);
  return id;
}

async function periodBudgets(start: string, user = owner) {
  const response = await ctx.app.inject({
    method: 'GET',
    url: `/api/households/${householdId}/periods/${start}`,
    headers: { cookie: user.cookie },
  });
  expect(response.statusCode).toBe(200);
  return periodResponseSchema.parse(response.json()).budgets;
}

const sorted = <T extends { categoryId: string }>(list: T[]) =>
  [...list].sort((a, b) => a.categoryId.localeCompare(b.categoryId));

describe('presupuestos en el periodo (especificación 007, historia 2)', () => {
  it('cada presupuesto lleva lo gastado en su categoría en el periodo', async () => {
    const leisure = await categoryOf(householdId, 'Ocio');
    await putBudget(owner, groceries, { amountCents: 40000 });
    await putBudget(owner, leisure, { amountCents: 10000 });
    await addExpense(groceries, 12050, '2026-10-02');
    await addExpense(groceries, 20000, '2026-10-31');
    await addExpense(groceries, 9999, '2026-11-01'); // otro periodo
    await addExpense(groceries, 5000, '2026-09-30'); // otro periodo
    expect(sorted(await periodBudgets('2026-10-01'))).toEqual(
      sorted([
        { categoryId: groceries, amountCents: 40000, spentCents: 32050 },
        { categoryId: leisure, amountCents: 10000, spentCents: 0 },
      ]),
    );
  });

  it('sin presupuestos la lista está vacía y las categorías sin presupuesto no salen', async () => {
    await addExpense(groceries, 500, '2026-10-02');
    expect(await periodBudgets('2026-10-01')).toEqual([]);
  });

  it('cuenta los gastos editados (importe, fecha y categoría) y no los borrados', async () => {
    const leisure = await categoryOf(householdId, 'Ocio');
    await putBudget(owner, groceries, { amountCents: 40000 });
    const moved = await addExpense(groceries, 1000, '2026-10-02');
    await addExpense(leisure, 2500, '2026-10-02', moved); // cambia categoría e importe
    const late = await addExpense(groceries, 3000, '2026-10-02');
    await addExpense(groceries, 3000, '2026-11-02', late); // pasa al mes siguiente
    const gone = await addExpense(groceries, 7000, '2026-10-03');
    const removed = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/households/${householdId}/transactions/${gone}`,
      headers: { cookie: owner.cookie },
    });
    expect(removed.statusCode).toBe(204);
    await addExpense(groceries, 400, '2026-10-04');
    expect(await periodBudgets('2026-10-01')).toEqual([
      { categoryId: groceries, amountCents: 40000, spentCents: 400 },
    ]);
  });

  it('los pagos recurrentes pagados cuentan; los ingresos y lo apartado en huchas, no', async () => {
    const utilities = await categoryOf(householdId, 'Suministros');
    await putBudget(owner, utilities, { amountCents: 10000 });
    const rule = recurringRuleSchema.parse(
      (
        await ctx.app.inject({
          method: 'PUT',
          url: `/api/households/${householdId}/recurring/${newId()}`,
          headers: { cookie: owner.cookie },
          payload: {
            kind: 'expense',
            name: 'Luz',
            amountCents: 6000,
            categoryId: utilities,
            frequency: 'monthly',
            interval: 1,
            dayOfMonth: 15,
            startDate: '2026-10-01',
          },
        })
      ).json(),
    );
    const paid = await ctx.app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/recurring/${rule.id}/occurrences/2026-10-15/pay`,
      headers: { cookie: owner.cookie },
      payload: { transactionId: newId(), amountCents: 6712, date: '2026-10-16' },
    });
    expect(paid.statusCode).toBe(200);
    const goal = newId();
    await ctx.app.inject({
      method: 'PUT',
      url: `/api/households/${householdId}/savings/${goal}`,
      headers: { cookie: owner.cookie },
      payload: {
        name: 'Bici',
        icon: 'sport',
        targetCents: 30000,
        deadline: '2027-07-31',
        contributionDay: 1,
      },
    });
    await ctx.app.inject({
      method: 'PUT',
      url: `/api/households/${householdId}/savings/${goal}/entries/${newId()}`,
      headers: { cookie: owner.cookie },
      payload: { kind: 'deposit', amountCents: 5000, date: '2026-10-20' },
    });
    expect(await periodBudgets('2026-10-01')).toEqual([
      { categoryId: utilities, amountCents: 10000, spentCents: 6712 },
    ]);
  });

  it('un mes pasado muestra el presupuesto de entonces; uno quitado ya no sale', async () => {
    await ctx.db.insert(budgets).values([
      { householdId, categoryId: groceries, validFrom: '2026-08-01', amountCents: 30000 },
      { householdId, categoryId: groceries, validFrom: '2026-09-01', amountCents: 35000 },
    ]);
    await addExpense(groceries, 1000, '2026-08-10');
    await deleteBudget(owner, groceries); // sin presupuesto desde octubre
    expect(await periodBudgets('2026-08-01')).toEqual([
      { categoryId: groceries, amountCents: 30000, spentCents: 1000 },
    ]);
    expect(await periodBudgets('2026-09-01')).toEqual([
      { categoryId: groceries, amountCents: 35000, spentCents: 0 },
    ]);
    expect(await periodBudgets('2026-10-01')).toEqual([]);
    expect(await periodBudgets('2027-03-01')).toEqual([]);
    expect(await periodBudgets('2026-07-01')).toEqual([]);
  });

  it('el presupuesto sigue valiendo en los meses siguientes', async () => {
    await putBudget(owner, groceries, { amountCents: 40000 });
    await addExpense(groceries, 2000, '2027-02-10');
    expect(await periodBudgets('2027-02-01')).toEqual([
      { categoryId: groceries, amountCents: 40000, spentCents: 2000 },
    ]);
  });

  it('con el mes empezando el 25, suma del 25 al 24', async () => {
    await ctx.db
      .update(households)
      .set({ monthStartDay: 25 })
      .where(eq(households.id, householdId));
    await putBudget(owner, groceries, { amountCents: 40000 }); // vale desde el 25 de octubre
    await addExpense(groceries, 1000, '2026-10-24'); // periodo anterior
    await addExpense(groceries, 2000, '2026-10-25');
    await addExpense(groceries, 3000, '2026-11-24');
    await addExpense(groceries, 4000, '2026-11-25'); // periodo siguiente
    expect(await periodBudgets('2026-10-25')).toEqual([
      { categoryId: groceries, amountCents: 40000, spentCents: 5000 },
    ]);
  });

  it('las categorías archivadas no salen; al restaurarlas vuelven con su presupuesto', async () => {
    await putBudget(owner, groceries, { amountCents: 40000 });
    await ctx.db
      .update(categories)
      .set({ archivedAt: new Date() })
      .where(eq(categories.id, groceries));
    expect(await periodBudgets('2026-10-01')).toEqual([]);
    await ctx.db.update(categories).set({ archivedAt: null }).where(eq(categories.id, groceries));
    expect(await periodBudgets('2026-10-01')).toHaveLength(1);
  });

  it('un lector los ve; otro hogar no ve los de este', async () => {
    await putBudget(owner, groceries, { amountCents: 40000 });
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');
    expect(await periodBudgets('2026-10-01', viewer)).toHaveLength(1);
    const stranger = await signUp(ctx.app);
    const strangerHousehold = (await me(ctx.app, stranger)).household.id;
    const theirs = await ctx.app.inject({
      method: 'GET',
      url: `/api/households/${strangerHousehold}/periods/2026-10-01`,
      headers: { cookie: stranger.cookie },
    });
    expect(periodResponseSchema.parse(theirs.json()).budgets).toEqual([]);
  });

  it('CE-702: con cientos de gastos, lo gastado coincide al céntimo con la suma de sus movimientos', async () => {
    const names = ['Supermercado', 'Ocio', 'Transporte', 'Vivienda', 'Ropa'];
    const ids = await Promise.all(names.map((n) => categoryOf(householdId, n)));
    for (const id of ids) await putBudget(owner, id, { amountCents: 50000 });
    const rows = Array.from({ length: 300 }, (_, n) => ({
      id: newId(),
      householdId,
      kind: 'expense' as const,
      categoryId: ids[n % ids.length]!,
      amountCents: 1 + ((n * 7919) % 25000),
      date: `2026-${n % 3 === 0 ? '09' : '10'}-${String(1 + (n % 28)).padStart(2, '0')}`,
    }));
    await ctx.db.insert(transactions).values(rows);
    const budgetsNow = await periodBudgets('2026-10-01');
    for (const id of ids) {
      const expected = rows
        .filter((r) => r.categoryId === id && r.date.startsWith('2026-10'))
        .reduce((sum, r) => sum + r.amountCents, 0);
      expect(budgetsNow.find((b) => b.categoryId === id)?.spentCents, id).toBe(expected);
    }
  });
});

describe('presupuestos en la exportación (RF-708)', () => {
  it('lleva cada cambio con su importe y desde cuándo vale', async () => {
    await ctx.db
      .insert(budgets)
      .values({ householdId, categoryId: groceries, validFrom: '2026-09-01', amountCents: 30000 });
    await deleteBudget(owner, groceries);
    const response = await ctx.app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/export`,
      headers: { cookie: owner.cookie },
    });
    expect(householdExportSchema.parse(response.json()).budgets).toEqual([
      { categoryId: groceries, validFrom: '2026-09-01', amountCents: 30000 },
      { categoryId: groceries, validFrom: '2026-10-01', amountCents: null },
    ]);
  });
});
