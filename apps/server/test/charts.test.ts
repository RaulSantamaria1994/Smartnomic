import { chartsResponseSchema, errorResponseSchema, type ChartsResponse } from '@smartnomic/api';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  categories,
  households,
  savingsEntries,
  savingsGoals,
  transactions,
} from '../src/db/schema';
import { joinHousehold, me, newId, signUp, useTestServer, type TestUser } from './helpers';

// Hoy es 2026-10-27 (TEST_NOW): el periodo en curso empieza el 1 de octubre.
const ctx = useTestServer();

let owner: TestUser;
let householdId: string;
let groceries: string;
let leisure: string;
let salary: string;

function getCharts(start: string, user: TestUser | null = owner, household = householdId) {
  return ctx.app.inject({
    method: 'GET',
    url: `/api/households/${household}/charts/${start}`,
    headers: user ? { cookie: user.cookie } : {},
  });
}

async function charts(start: string, user = owner): Promise<ChartsResponse> {
  const response = await getCharts(start, user);
  expect(response.statusCode, response.body).toBe(200);
  return chartsResponseSchema.parse(response.json());
}

async function categoryOf(household: string, name: string, kind: 'expense' | 'income' = 'expense') {
  const [row] = await ctx.db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.householdId, household),
        eq(categories.name, name),
        eq(categories.kind, kind),
      ),
    );
  return row!.id;
}

function addMovement(
  kind: 'expense' | 'income',
  categoryId: string,
  amountCents: number,
  date: string,
  deleted = false,
) {
  return ctx.db.insert(transactions).values({
    id: newId(),
    householdId,
    kind,
    categoryId,
    amountCents,
    date,
    ...(deleted && { deletedAt: new Date() }),
  });
}

async function addGoal(name: string) {
  const id = newId();
  await ctx.db.insert(savingsGoals).values({
    id,
    householdId,
    name,
    icon: 'car',
    targetCents: 100000,
    deadline: '2027-12-31',
    contributionDay: 1,
    startDate: '2026-01-01',
  });
  return id;
}

function addEntry(
  goalId: string,
  kind: 'deposit' | 'withdrawal',
  amountCents: number,
  date: string,
  deleted = false,
) {
  return ctx.db.insert(savingsEntries).values({
    id: newId(),
    householdId,
    goalId,
    kind,
    amountCents,
    date,
    ...(deleted && { deletedAt: new Date() }),
  });
}

beforeEach(async () => {
  owner = await signUp(ctx.app);
  householdId = (await me(ctx.app, owner)).household.id;
  groceries = await categoryOf(householdId, 'Supermercado');
  leisure = await categoryOf(householdId, 'Ocio');
  const [income] = await ctx.db
    .select()
    .from(categories)
    .where(and(eq(categories.householdId, householdId), eq(categories.kind, 'income')));
  salary = income!.id;
});

describe('acceso a las gráficas (especificación 008)', () => {
  it('sin sesión, 401', async () => {
    expect((await getCharts('2026-10-01', null)).statusCode).toBe(401);
  });

  it('otro hogar, 403 sin datos', async () => {
    await addMovement('expense', groceries, 1000, '2026-10-05');
    const stranger = await signUp(ctx.app);
    const response = await getCharts('2026-10-01', stranger);
    expect(response.statusCode).toBe(403);
    expect(response.body).not.toContain(groceries);
  });

  it('un id de hogar que no existe responde igual que uno ajeno', async () => {
    expect((await getCharts('2026-10-01', owner, newId())).statusCode).toBe(403);
  });

  it('una fecha que no es inicio de periodo o no es fecha, 400', async () => {
    for (const bad of ['2026-10-02', '2026-13-01', 'octubre']) {
      const response = await getCharts(bad);
      expect(response.statusCode, bad).toBe(400);
      errorResponseSchema.parse(response.json());
    }
  });

  it('fuera del calendario (antes del año 1 o después del 9999), 400 sin 500', async () => {
    const tooEarly = await getCharts('0001-05-01');
    expect(tooEarly.statusCode).toBe(400);
    errorResponseSchema.parse(tooEarly.json());
    expect((await getCharts('0001-06-01')).statusCode).toBe(200);
    expect((await getCharts('9999-11-01')).statusCode).toBe(200);
    expect((await getCharts('9999-12-01')).statusCode).toBe(400);
  });

  it('un lector las ve', async () => {
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');
    await addMovement('expense', groceries, 1000, '2026-10-05');
    expect((await charts('2026-10-01', viewer)).months[5]!.expenseCents).toBe(1000);
  });
});

describe('ingresos y gastos por mes (historia 2)', () => {
  it('son 6 meses que terminan en el elegido; los vacíos a 0', async () => {
    await addMovement('income', salary, 180000, '2026-10-01');
    await addMovement('expense', groceries, 41230, '2026-10-31');
    await addMovement('expense', groceries, 500, '2026-05-31'); // fuera de la ventana
    await addMovement('expense', groceries, 700, '2026-11-01'); // fuera de la ventana
    const body = await charts('2026-10-01');
    expect(body.months).toEqual([
      { start: '2026-05-01', end: '2026-05-31', incomeCents: 0, expenseCents: 500 },
      { start: '2026-06-01', end: '2026-06-30', incomeCents: 0, expenseCents: 0 },
      { start: '2026-07-01', end: '2026-07-31', incomeCents: 0, expenseCents: 0 },
      { start: '2026-08-01', end: '2026-08-31', incomeCents: 0, expenseCents: 0 },
      { start: '2026-09-01', end: '2026-09-30', incomeCents: 0, expenseCents: 0 },
      { start: '2026-10-01', end: '2026-10-31', incomeCents: 180000, expenseCents: 41230 },
    ]);
  });

  it('sin borrados y sin lo apartado en huchas', async () => {
    await addMovement('expense', groceries, 1000, '2026-10-05');
    await addMovement('expense', groceries, 9999, '2026-10-06', true);
    const goal = await addGoal('Coche');
    await addEntry(goal, 'deposit', 5000, '2026-10-07');
    const body = await charts('2026-10-01');
    expect(body.months[5]).toMatchObject({ incomeCents: 0, expenseCents: 1000 });
    expect(body.categories).toEqual([
      { categoryId: groceries, monthsCents: [0, 0, 0, 0, 0, 1000] },
    ]);
  });

  it('coinciden con el resumen de «Mes» de cada periodo', async () => {
    await addMovement('income', salary, 200000, '2026-09-01');
    await addMovement('expense', groceries, 3000, '2026-09-10');
    await addMovement('expense', leisure, 1500, '2026-10-10');
    const body = await charts('2026-10-01');
    for (const month of body.months) {
      const period = await ctx.app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/periods/${month.start}`,
        headers: { cookie: owner.cookie },
      });
      const { summary } = period.json() as {
        summary: { incomeCents: number; expenseCents: number };
      };
      expect([month.incomeCents, month.expenseCents], month.start).toEqual([
        summary.incomeCents,
        summary.expenseCents,
      ]);
    }
  });

  it('con el mes empezando el 25, cada mes va del 25 al 24', async () => {
    await ctx.db
      .update(households)
      .set({ monthStartDay: 25 })
      .where(eq(households.id, householdId));
    await addMovement('expense', groceries, 1000, '2026-10-24');
    await addMovement('expense', groceries, 2000, '2026-10-25');
    await addMovement('expense', groceries, 3000, '2026-11-24');
    const body = await charts('2026-10-25');
    expect(body.months[5]).toMatchObject({
      start: '2026-10-25',
      end: '2026-11-24',
      expenseCents: 5000,
    });
    expect(body.months[4]).toMatchObject({ start: '2026-09-25', expenseCents: 1000 });
    expect((await getCharts('2026-10-01')).statusCode).toBe(400);
  });
});

describe('gasto por categoría (historias 1 y 3)', () => {
  it('cada categoría de gasto con gastos, mes a mes; sin ingresos', async () => {
    await addMovement('expense', groceries, 1000, '2026-08-03');
    await addMovement('expense', groceries, 2000, '2026-10-03');
    await addMovement('expense', groceries, 500, '2026-10-04');
    await addMovement('expense', leisure, 700, '2026-09-09');
    await addMovement('income', salary, 100000, '2026-10-01');
    const body = await charts('2026-10-01');
    const byId = new Map(body.categories.map((c) => [c.categoryId, c.monthsCents]));
    expect(byId.size).toBe(2);
    expect(byId.get(groceries)).toEqual([0, 0, 0, 1000, 0, 2500]);
    expect(byId.get(leisure)).toEqual([0, 0, 0, 0, 700, 0]);
  });

  it('las categorías archivadas con gastos siguen saliendo (para que el total cuadre)', async () => {
    await addMovement('expense', leisure, 700, '2026-10-09');
    await ctx.db
      .update(categories)
      .set({ archivedAt: new Date() })
      .where(eq(categories.id, leisure));
    const body = await charts('2026-10-01');
    expect(body.categories).toEqual([{ categoryId: leisure, monthsCents: [0, 0, 0, 0, 0, 700] }]);
  });
});

describe('huchas (historia 4)', () => {
  it('saldo de todas las huchas al final de cada mes y por hucha al final del último', async () => {
    const car = await addGoal('Coche');
    const trip = await addGoal('Viaje');
    await addEntry(car, 'deposit', 10000, '2026-04-15'); // antes de la ventana: cuenta
    await addEntry(car, 'deposit', 5000, '2026-07-01');
    await addEntry(trip, 'deposit', 3000, '2026-08-31');
    await addEntry(car, 'withdrawal', 2000, '2026-09-10');
    await addEntry(trip, 'deposit', 9999, '2026-09-11', true); // borrada
    await addEntry(trip, 'deposit', 1000, '2026-11-01'); // después de la ventana
    const body = await charts('2026-10-01');
    expect(body.savings.monthsCents).toEqual([10000, 10000, 15000, 18000, 16000, 16000]);
    expect(body.savings.goals).toEqual([
      { goalId: car, balanceCents: 13000 },
      { goalId: trip, balanceCents: 3000 },
    ]);
  });

  it('una hucha cerrada devuelve su saldo y deja de salir', async () => {
    const car = await addGoal('Coche');
    await addEntry(car, 'deposit', 5000, '2026-09-01');
    const closed = await ctx.app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/savings/${car}/close`,
      headers: { cookie: owner.cookie },
    });
    expect(closed.statusCode).toBe(200);
    const body = await charts('2026-10-01');
    expect(body.savings.monthsCents).toEqual([0, 0, 0, 0, 5000, 0]);
    expect(body.savings.goals).toEqual([]);
    expect((await charts('2026-09-01')).savings.goals).toEqual([
      { goalId: car, balanceCents: 5000 },
    ]);
  });

  it('sin huchas, todo a 0', async () => {
    const body = await charts('2026-10-01');
    expect(body.savings).toEqual({ monthsCents: [0, 0, 0, 0, 0, 0], goals: [] });
  });
});

describe('CE-801: con cientos de movimientos, cada cifra coincide al céntimo', () => {
  it('ingresos, gastos, categorías y huchas', async () => {
    const names = ['Supermercado', 'Ocio', 'Transporte', 'Vivienda', 'Ropa'];
    const ids = await Promise.all(names.map((n) => categoryOf(householdId, n)));
    const months = ['05', '06', '07', '08', '09', '10'];
    const rows = Array.from({ length: 600 }, (_, n) => ({
      id: newId(),
      householdId,
      kind: (n % 7 === 0 ? 'income' : 'expense') as 'income' | 'expense',
      categoryId: n % 7 === 0 ? salary : ids[n % ids.length]!,
      amountCents: 1 + ((n * 7919) % 25000),
      date: `2026-${months[n % 6]}-${String(1 + (n % 28)).padStart(2, '0')}`,
    }));
    await ctx.db.insert(transactions).values(rows);
    const goals = [await addGoal('Coche'), await addGoal('Viaje')];
    const entries = Array.from({ length: 120 }, (_, n) => ({
      id: newId(),
      householdId,
      goalId: goals[n % 2]!,
      kind: (n % 5 === 0 ? 'withdrawal' : 'deposit') as 'deposit' | 'withdrawal',
      amountCents: n % 5 === 0 ? 100 : 1 + ((n * 104729) % 9000),
      date: `2026-${months[n % 6]}-${String(1 + (n % 28)).padStart(2, '0')}`,
    }));
    await ctx.db.insert(savingsEntries).values(entries);

    const body = await charts('2026-10-01');
    months.forEach((m, i) => {
      const inMonth = rows.filter((r) => r.date.startsWith(`2026-${m}`));
      const sum = (list: typeof rows) => list.reduce((s, r) => s + r.amountCents, 0);
      expect(body.months[i]!.incomeCents).toBe(sum(inMonth.filter((r) => r.kind === 'income')));
      expect(body.months[i]!.expenseCents).toBe(sum(inMonth.filter((r) => r.kind === 'expense')));
      for (const id of ids) {
        const series = body.categories.find((c) => c.categoryId === id)!.monthsCents;
        expect(series[i]).toBe(sum(inMonth.filter((r) => r.categoryId === id)));
      }
      const upTo = entries.filter((e) => e.date <= `2026-${m}-31`);
      expect(body.savings.monthsCents[i]).toBe(
        upTo.reduce((s, e) => s + (e.kind === 'deposit' ? e.amountCents : -e.amountCents), 0),
      );
    });
  });
});
