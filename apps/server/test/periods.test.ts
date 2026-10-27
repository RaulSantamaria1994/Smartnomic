import {
  categoriesResponseSchema,
  periodResponseSchema,
  type Category,
  type TransactionInput,
} from '@smartnomic/api';
import { summarize } from '@smartnomic/domain';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { households } from '../src/db/schema';
import { me, newId, signUp, useTestServer, type TestUser } from './helpers';

const ctx = useTestServer();

let owner: TestUser;
let householdId: string;
let categories: Category[];

async function add(input: Partial<TransactionInput> & Pick<TransactionInput, 'kind'>) {
  const categoryId = categories.find((c) => c.kind === input.kind)!.id;
  const id = newId();
  const response = await ctx.app.inject({
    method: 'PUT',
    url: `/api/households/${householdId}/transactions/${id}`,
    headers: { cookie: owner.cookie },
    payload: { amountCents: 100, date: '2026-10-15', categoryId, ...input },
  });
  expect(response.statusCode).toBe(200);
  return id;
}

function get(start: string, user = owner) {
  return ctx.app.inject({
    method: 'GET',
    url: `/api/households/${householdId}/periods/${start}`,
    headers: { cookie: user.cookie },
  });
}

beforeEach(async () => {
  owner = await signUp(ctx.app);
  householdId = (await me(ctx.app, owner)).household.id;
  categories = categoriesResponseSchema.parse(
    (
      await ctx.app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/categories`,
        headers: { cookie: owner.cookie },
      })
    ).json(),
  ).categories;
});

describe('GET /periods/:start', () => {
  it('devuelve el resumen exacto al céntimo (1.800 € − 1.234,56 € = 565,44 €)', async () => {
    await add({ kind: 'income', amountCents: 180000, date: '2026-10-01' });
    await add({ kind: 'expense', amountCents: 4530, date: '2026-10-05' });
    await add({ kind: 'expense', amountCents: 118926, date: '2026-10-31' });

    const body = periodResponseSchema.parse((await get('2026-10-01')).json());

    expect(body.period).toEqual({ start: '2026-10-01', end: '2026-10-31' });
    expect(body.summary).toEqual({
      incomeCents: 180000,
      expenseCents: 123456,
      balanceCents: 56544,
    });
    expect(body.transactions).toHaveLength(3);
  });

  it('los totales en SQL coinciden con la suma de la lista', async () => {
    const amounts = [1, 99, 4530, 118926, 7, 250000, 33, 1234];
    for (const [i, amountCents] of amounts.entries()) {
      await add({
        kind: i % 3 === 0 ? 'income' : 'expense',
        amountCents,
        date: `2026-10-${10 + i}`,
      });
    }

    const body = periodResponseSchema.parse((await get('2026-10-01')).json());

    expect(body.summary).toEqual(summarize(body.transactions));
  });

  it('excluye los movimientos borrados y los de otros periodos', async () => {
    const kept = await add({ kind: 'expense', amountCents: 500, date: '2026-10-15' });
    const removed = await add({ kind: 'expense', amountCents: 700, date: '2026-10-16' });
    await add({ kind: 'expense', amountCents: 900, date: '2026-09-30' });
    await add({ kind: 'expense', amountCents: 900, date: '2026-11-01' });
    await ctx.app.inject({
      method: 'DELETE',
      url: `/api/households/${householdId}/transactions/${removed}`,
      headers: { cookie: owner.cookie },
    });

    const body = periodResponseSchema.parse((await get('2026-10-01')).json());

    expect(body.transactions.map((t) => t.id)).toEqual([kept]);
    expect(body.summary.expenseCents).toBe(500);
  });

  it('ordena del más reciente al más antiguo', async () => {
    const a = await add({ kind: 'expense', date: '2026-10-02' });
    const b = await add({ kind: 'expense', date: '2026-10-20' });
    const c = await add({ kind: 'expense', date: '2026-10-20' });

    const body = periodResponseSchema.parse((await get('2026-10-01')).json());

    expect(body.transactions.map((t) => t.id)).toEqual([c, b, a]);
  });

  it('respeta el día de inicio de mes del hogar', async () => {
    await ctx.db
      .update(households)
      .set({ monthStartDay: 25 })
      .where(eq(households.id, householdId));
    const inside = [
      await add({ kind: 'expense', date: '2026-10-25' }),
      await add({ kind: 'expense', date: '2026-10-26' }),
      await add({ kind: 'expense', date: '2026-11-24' }),
    ];
    await add({ kind: 'expense', date: '2026-10-24' });
    await add({ kind: 'expense', date: '2026-11-25' });

    const body = periodResponseSchema.parse((await get('2026-10-25')).json());

    expect(body.period).toEqual({ start: '2026-10-25', end: '2026-11-24' });
    expect(new Set(body.transactions.map((t) => t.id))).toEqual(new Set(inside));
  });

  it('un mes sin movimientos devuelve ceros', async () => {
    const body = periodResponseSchema.parse((await get('2027-03-01')).json());

    expect(body.summary).toEqual({ incomeCents: 0, expenseCents: 0, balanceCents: 0 });
    expect(body.transactions).toEqual([]);
  });

  it('rechaza una fecha que no es el inicio de un periodo del hogar', async () => {
    expect((await get('2026-10-15')).statusCode).toBe(400);
    expect((await get('no-es-fecha')).statusCode).toBe(400);
  });

  it('nadie de otro hogar puede verlo', async () => {
    const intruso = await signUp(ctx.app);
    expect((await get('2026-10-01', intruso)).statusCode).toBe(403);
  });
});
