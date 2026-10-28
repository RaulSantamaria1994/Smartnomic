import { errorResponseSchema, householdSchema, periodResponseSchema } from '@smartnomic/api';
import { describe, expect, it } from 'vitest';
import { call, joinHousehold, me, newId, signUp, useTestServer, type TestUser } from './helpers';

const ctx = useTestServer();

async function setup() {
  const owner = await signUp(ctx.app, { name: 'Lucía' });
  const { household } = await me(ctx.app, owner);
  return { owner, householdId: household.id };
}

const patch = (user: TestUser, householdId: string, body: unknown) =>
  call(ctx.app, user, 'PATCH', `/api/households/${householdId}`, body);

describe('ajustes del hogar', () => {
  it('el propietario cambia el nombre y el inicio de mes', async () => {
    const { owner, householdId } = await setup();

    const response = await patch(owner, householdId, { name: '  Casa  ', monthStartDay: 25 });

    expect(response.statusCode).toBe(200);
    const household = householdSchema.parse(response.json());
    expect(household).toMatchObject({ name: 'Casa', monthStartDay: 25 });
    expect((await me(ctx.app, owner)).household.monthStartDay).toBe(25);
  });

  it('el día de inicio va del 1 al 28', async () => {
    const { owner, householdId } = await setup();
    for (const day of [0, 29, 31, 1.5]) {
      const response = await patch(owner, householdId, { monthStartDay: day });
      expect(response.statusCode, `día ${day}`).toBe(400);
      expect(errorResponseSchema.parse(response.json()).error.code).toBe('validation_failed');
    }
    expect((await patch(owner, householdId, { monthStartDay: 28 })).statusCode).toBe(200);
    expect((await patch(owner, householdId, { monthStartDay: 1 })).statusCode).toBe(200);
  });

  it('rechaza un cuerpo vacío o un nombre en blanco', async () => {
    const { owner, householdId } = await setup();
    expect((await patch(owner, householdId, {})).statusCode).toBe(400);
    expect((await patch(owner, householdId, { name: '   ' })).statusCode).toBe(400);
  });

  it('editores y lectores no pueden cambiarlos', async () => {
    const { owner, householdId } = await setup();
    const editor = await signUp(ctx.app);
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');
    await joinHousehold(ctx.db, owner, viewer, 'viewer');

    for (const user of [editor, viewer]) {
      const response = await patch(user, householdId, { monthStartDay: 10 });
      expect(response.statusCode).toBe(403);
    }
    expect((await me(ctx.app, owner)).household.monthStartDay).toBe(1);
  });

  it('nadie cambia un hogar ajeno', async () => {
    const { householdId } = await setup();
    const stranger = await signUp(ctx.app);
    expect((await patch(stranger, householdId, { monthStartDay: 10 })).statusCode).toBe(403);
  });

  it('con inicio el día 25, un gasto del 26 de octubre cuenta en «25 oct – 24 nov»', async () => {
    const { owner, householdId } = await setup();
    const { categories } = (
      await call(ctx.app, owner, 'GET', `/api/households/${householdId}/categories`)
    ).json<{ categories: { id: string; kind: string }[] }>();
    const categoryId = categories.find((c) => c.kind === 'expense')!.id;
    await call(ctx.app, owner, 'PUT', `/api/households/${householdId}/transactions/${newId()}`, {
      kind: 'expense',
      amountCents: 1200,
      date: '2026-10-26',
      categoryId,
    });

    await patch(owner, householdId, { monthStartDay: 25 });

    const period = periodResponseSchema.parse(
      (
        await call(ctx.app, owner, 'GET', `/api/households/${householdId}/periods/2026-10-25`)
      ).json(),
    );
    expect(period.period).toEqual({ start: '2026-10-25', end: '2026-11-24' });
    expect(period.summary.expenseCents).toBe(1200);
    const before = await call(
      ctx.app,
      owner,
      'GET',
      `/api/households/${householdId}/periods/2026-09-25`,
    );
    expect(periodResponseSchema.parse(before.json()).summary.expenseCents).toBe(0);
  });
});
