import {
  calendarResponseSchema,
  categoriesResponseSchema,
  errorResponseSchema,
  type Category,
  type RecurringInput,
} from '@smartnomic/api';
import { describe, expect, it } from 'vitest';
import { call, joinHousehold, me, newId, signUp, useTestServer, type TestUser } from './helpers';

// Hoy en los tests: martes 27 de octubre de 2026.
const ctx = useTestServer();

async function setup() {
  const owner = await signUp(ctx.app, { name: 'Lucía' });
  const householdId = (await me(ctx.app, owner)).household.id;
  const response = await call(ctx.app, owner, 'GET', `/api/households/${householdId}/categories`);
  const categories = categoriesResponseSchema.parse(response.json()).categories;
  return { owner, householdId, categories };
}

function byName(categories: Category[], name: string) {
  return categories.find((c) => c.name === name)!.id;
}

async function rule(
  user: TestUser,
  householdId: string,
  input: RecurringInput,
  id: string = newId(),
) {
  const response = await call(
    ctx.app,
    user,
    'PUT',
    `/api/households/${householdId}/recurring/${id}`,
    input,
  );
  expect(response.statusCode).toBe(200);
  return id;
}

const calendar = (user: TestUser, householdId: string, month: string) =>
  call(ctx.app, user, 'GET', `/api/households/${householdId}/calendar/${month}`);

describe('calendario de un mes', () => {
  it('vencimientos con su estado, importe real de los pagados, quién los resolvió y totales', async () => {
    const { owner, householdId, categories } = await setup();
    const vivienda = byName(categories, 'Vivienda');
    const alquiler = await rule(owner, householdId, {
      kind: 'expense',
      name: 'Alquiler',
      amountCents: 75000,
      categoryId: vivienda,
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 1,
      startDate: '2026-10-01',
    });
    const luz = await rule(owner, householdId, {
      kind: 'expense',
      name: 'Luz',
      amountCents: 6000,
      categoryId: byName(categories, 'Suministros'),
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 15,
      startDate: '2026-10-01',
    });
    const nomina = await rule(owner, householdId, {
      kind: 'income',
      name: 'Nómina',
      amountCents: 180000,
      categoryId: byName(categories, 'Nómina'),
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 28,
      startDate: '2026-10-01',
    });
    const base = `/api/households/${householdId}/recurring`;
    const pay = await call(ctx.app, owner, 'POST', `${base}/${luz}/occurrences/2026-10-15/pay`, {
      transactionId: newId(),
      amountCents: 6712,
      date: '2026-10-16',
    });
    expect(pay.statusCode).toBe(200);
    await call(ctx.app, owner, 'POST', `${base}/${alquiler}/occurrences/2026-10-01/skip`);
    const memberId = (await me(ctx.app, owner)).member.id;

    const response = await calendar(owner, householdId, '2026-10');

    expect(response.statusCode).toBe(200);
    const data = calendarResponseSchema.parse(response.json());
    expect(data.month).toBe('2026-10');
    expect(data.today).toBe('2026-10-27');
    expect(data.bounds).toEqual({ min: '2026-10', max: '2027-10' });
    expect(data.items.map((i) => [i.ruleId, i.dueDate, i.status, i.amountCents])).toEqual([
      [alquiler, '2026-10-01', 'skipped', 75000],
      [luz, '2026-10-15', 'paid', 6712],
      [nomina, '2026-10-28', 'pending', 180000],
    ]);
    const paid = data.items.find((i) => i.ruleId === luz)!;
    expect(paid.transactionId).not.toBeNull();
    expect(paid.resolvedBy).toBe(memberId);
    expect(data.items.find((i) => i.ruleId === nomina)!.resolvedBy).toBeNull();
    expect(data.totals).toEqual({
      expenseCents: 6712,
      incomeCents: 180000,
      pendingExpenseCents: 0,
    });
  });

  it('atrasados y semanales en otro mes', async () => {
    const { owner, householdId, categories } = await setup();
    const gym = await rule(owner, householdId, {
      kind: 'expense',
      name: 'Gimnasio',
      amountCents: 1000,
      categoryId: byName(categories, 'Ocio'),
      frequency: 'weekly',
      interval: 1,
      weekday: 1,
      startDate: '2026-10-05',
    });

    const october = calendarResponseSchema.parse(
      (await calendar(owner, householdId, '2026-10')).json(),
    );
    expect(october.items.map((i) => [i.dueDate, i.status])).toEqual([
      ['2026-10-05', 'overdue'],
      ['2026-10-12', 'overdue'],
      ['2026-10-19', 'overdue'],
      ['2026-10-26', 'overdue'],
    ]);
    expect(october.totals.pendingExpenseCents).toBe(4000);
    const november = calendarResponseSchema.parse(
      (await calendar(owner, householdId, '2026-11')).json(),
    );
    expect(november.items.every((i) => i.ruleId === gym && i.status === 'pending')).toBe(true);
    expect(november.items).toHaveLength(5);
  });

  it('si se borra el movimiento del pago, muestra el importe previsto', async () => {
    const { owner, householdId, categories } = await setup();
    const luz = await rule(owner, householdId, {
      kind: 'expense',
      name: 'Luz',
      amountCents: 6000,
      categoryId: byName(categories, 'Suministros'),
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 15,
      startDate: '2026-10-01',
    });
    const paid = await call(
      ctx.app,
      owner,
      'POST',
      `/api/households/${householdId}/recurring/${luz}/occurrences/2026-10-15/pay`,
      { transactionId: newId(), amountCents: 6712, date: '2026-10-15' },
    );
    expect(paid.statusCode).toBe(200);
    const { transactionId } = paid.json<{ transactionId: string }>();
    await call(
      ctx.app,
      owner,
      'DELETE',
      `/api/households/${householdId}/transactions/${transactionId}`,
    );

    const data = calendarResponseSchema.parse(
      (await calendar(owner, householdId, '2026-10')).json(),
    );
    expect(data.items[0]).toMatchObject({ status: 'paid', amountCents: 6000 });
  });

  it('límites: de 12 meses adelante y hasta el pago más antiguo', async () => {
    const { owner, householdId, categories } = await setup();
    await rule(owner, householdId, {
      kind: 'expense',
      name: 'Seguro',
      amountCents: 30000,
      categoryId: byName(categories, 'Seguros'),
      frequency: 'yearly',
      interval: 1,
      dayOfMonth: 10,
      monthOfYear: 3,
      startDate: '2025-03-10',
    });

    expect((await calendar(owner, householdId, '2025-03')).statusCode).toBe(200);
    expect((await calendar(owner, householdId, '2027-10')).statusCode).toBe(200);
    for (const month of ['2025-02', '2027-11']) {
      const response = await calendar(owner, householdId, month);
      expect(response.statusCode, month).toBe(400);
      expect(errorResponseSchema.parse(response.json()).error.code).toBe('validation_failed');
    }
    for (const month of ['2026-13', '2026-1', 'noviembre']) {
      expect((await calendar(owner, householdId, month)).statusCode, month).toBe(400);
    }
  });

  it('hogar sin pagos: mes actual vacío y totales a cero', async () => {
    const { owner, householdId } = await setup();
    const data = calendarResponseSchema.parse(
      (await calendar(owner, householdId, '2026-10')).json(),
    );
    expect(data.items).toEqual([]);
    expect(data.totals).toEqual({ expenseCents: 0, incomeCents: 0, pendingExpenseCents: 0 });
    expect(data.bounds).toEqual({ min: '2026-10', max: '2027-10' });
    expect((await calendar(owner, householdId, '2026-09')).statusCode).toBe(400);
  });

  it('un lector lo ve; un hogar ajeno da 403; sin sesión, 401', async () => {
    const { owner, householdId } = await setup();
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');
    const stranger = await signUp(ctx.app);

    expect((await calendar(viewer, householdId, '2026-10')).statusCode).toBe(200);
    expect((await calendar(stranger, householdId, '2026-10')).statusCode).toBe(403);
    const anonymous = await ctx.app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/calendar/2026-10`,
    });
    expect(anonymous.statusCode).toBe(401);
  });
});
