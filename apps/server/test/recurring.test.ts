import {
  categoriesResponseSchema,
  errorResponseSchema,
  periodResponseSchema,
  recurringListSchema,
  recurringRuleSchema,
  resolvedOccurrenceSchema,
  upcomingResponseSchema,
  type Category,
  type RecurringInput,
} from '@smartnomic/api';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { occurrences, recurringRules, transactions } from '../src/db/schema';
import { joinHousehold, me, newId, signUp, useTestServer, type TestUser } from './helpers';

// Hoy es 2026-10-27 (TEST_NOW).
const ctx = useTestServer();

let owner: TestUser;
let householdId: string;
let categories: Category[];

const category = (name: string) => categories.find((c) => c.name === name)!;

function rent(overrides: Partial<RecurringInput> = {}): RecurringInput {
  return {
    kind: 'expense',
    name: 'Alquiler',
    amountCents: 75000,
    categoryId: category('Vivienda').id,
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: 1,
    startDate: '2026-10-27',
    ...overrides,
  };
}

function putRule(user: TestUser, id: string, body: unknown, household = householdId) {
  return ctx.app.inject({
    method: 'PUT',
    url: `/api/households/${household}/recurring/${id}`,
    headers: { cookie: user.cookie },
    payload: body as Record<string, unknown>,
  });
}

async function createRule(body: RecurringInput, user = owner) {
  const id = newId();
  const response = await putRule(user, id, body);
  expect(response.statusCode).toBe(200);
  return recurringRuleSchema.parse(response.json());
}

async function upcomingFor(user = owner, days = 30) {
  const response = await ctx.app.inject({
    method: 'GET',
    url: `/api/households/${householdId}/upcoming?days=${days}`,
    headers: { cookie: user.cookie },
  });
  expect(response.statusCode).toBe(200);
  return upcomingResponseSchema.parse(response.json());
}

function pay(user: TestUser, ruleId: string, dueDate: string, body: Record<string, unknown>) {
  return ctx.app.inject({
    method: 'POST',
    url: `/api/households/${householdId}/recurring/${ruleId}/occurrences/${dueDate}/pay`,
    headers: { cookie: user.cookie },
    payload: body,
  });
}

function skip(user: TestUser, ruleId: string, dueDate: string) {
  return ctx.app.inject({
    method: 'POST',
    url: `/api/households/${householdId}/recurring/${ruleId}/occurrences/${dueDate}/skip`,
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

describe('crear y listar', () => {
  it('crea un pago mensual y aparece en la lista', async () => {
    const rule = await createRule(rent());

    expect(rule).toMatchObject({
      name: 'Alquiler',
      amountCents: 75000,
      active: true,
      remindDaysBefore: 1,
    });
    const list = recurringListSchema.parse(
      (
        await ctx.app.inject({
          method: 'GET',
          url: `/api/households/${householdId}/recurring`,
          headers: { cookie: owner.cookie },
        })
      ).json(),
    );
    expect(list.rules.map((r) => r.id)).toEqual([rule.id]);
  });

  it('es idempotente por id', async () => {
    const id = newId();
    await putRule(owner, id, rent());
    await putRule(owner, id, rent());

    expect(await ctx.db.select().from(recurringRules)).toHaveLength(1);
  });

  it('rechaza días incoherentes y categorías de otro hogar o tipo', async () => {
    const other = await signUp(ctx.app);
    const otherHousehold = (await me(ctx.app, other)).household.id;
    const [otherCategory] = categoriesResponseSchema
      .parse(
        (
          await ctx.app.inject({
            method: 'GET',
            url: `/api/households/${otherHousehold}/categories`,
            headers: { cookie: other.cookie },
          })
        ).json(),
      )
      .categories.filter((c) => c.kind === 'expense');

    for (const body of [
      rent({ dayOfMonth: null }),
      rent({ frequency: 'weekly' }),
      rent({ categoryId: category('Nómina').id }),
      rent({ categoryId: otherCategory!.id }),
    ]) {
      const response = await putRule(owner, newId(), body);
      expect(response.statusCode).toBe(400);
      expect(errorResponseSchema.parse(response.json()).error.code).toBe('validation_failed');
    }
  });

  it('un lector no puede crear; alguien de otro hogar tampoco', async () => {
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');
    const intruso = await signUp(ctx.app);

    expect((await putRule(viewer, newId(), rent())).statusCode).toBe(403);
    expect((await putRule(intruso, newId(), rent())).statusCode).toBe(403);
  });

  it('no se puede sobrescribir la regla de otro hogar con su id', async () => {
    const rule = await createRule(rent());
    const intruso = await signUp(ctx.app);
    const intrusoHousehold = (await me(ctx.app, intruso)).household.id;
    const intrusoCategory = categoriesResponseSchema
      .parse(
        (
          await ctx.app.inject({
            method: 'GET',
            url: `/api/households/${intrusoHousehold}/categories`,
            headers: { cookie: intruso.cookie },
          })
        ).json(),
      )
      .categories.find((c) => c.name === 'Vivienda')!;

    const response = await putRule(
      intruso,
      rule.id,
      rent({ amountCents: 1, categoryId: intrusoCategory.id }),
      intrusoHousehold,
    );

    expect(response.statusCode).toBe(404);
    const [row] = await ctx.db.select().from(recurringRules).where(eq(recurringRules.id, rule.id));
    expect(row?.amountCents).toBe(75000);
  });
});

describe('próximos pagos', () => {
  it('lista los vencimientos de los próximos 30 días y los atrasados', async () => {
    const alquiler = await createRule(rent());
    const luz = await createRule(
      rent({
        name: 'Luz',
        amountCents: 6000,
        categoryId: category('Suministros').id,
        dayOfMonth: 15,
        startDate: '2026-09-01',
      }),
    );

    const body = await upcomingFor();

    expect(body.today).toBe('2026-10-27');
    expect(body.occurrences).toEqual([
      { ruleId: luz.id, dueDate: '2026-09-15', overdue: true },
      { ruleId: luz.id, dueDate: '2026-10-15', overdue: true },
      { ruleId: alquiler.id, dueDate: '2026-11-01', overdue: false },
      { ruleId: luz.id, dueDate: '2026-11-15', overdue: false },
    ]);
  });

  it('un pago el día 31 cae el último día del mes', async () => {
    const rule = await createRule(rent({ dayOfMonth: 31, startDate: '2026-11-01' }));

    const body = await upcomingFor(owner, 60);

    expect(body.occurrences).toEqual([{ ruleId: rule.id, dueDate: '2026-11-30', overdue: false }]);
  });

  it('un lector puede verlos', async () => {
    await createRule(rent());
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');

    expect((await upcomingFor(viewer)).occurrences).toHaveLength(1);
  });
});

describe('pagar y omitir', () => {
  it('pagar con el importe real crea el gasto y deja de estar pendiente', async () => {
    const luz = await createRule(
      rent({
        name: 'Luz',
        amountCents: 6000,
        categoryId: category('Suministros').id,
        dayOfMonth: 15,
        startDate: '2026-10-01',
      }),
    );
    const transactionId = newId();

    const response = await pay(owner, luz.id, '2026-10-15', {
      transactionId,
      amountCents: 6712,
      date: '2026-10-16',
    });

    expect(response.statusCode).toBe(200);
    expect(resolvedOccurrenceSchema.parse(response.json())).toMatchObject({
      status: 'paid',
      transactionId,
      resolvedBy: (await me(ctx.app, owner)).member.id,
    });
    const [tx] = await ctx.db.select().from(transactions).where(eq(transactions.id, transactionId));
    expect(tx).toMatchObject({
      kind: 'expense',
      amountCents: 6712,
      date: '2026-10-16',
      categoryId: category('Suministros').id,
      note: 'Luz',
    });
    expect((await upcomingFor()).occurrences.map((o) => o.dueDate)).toEqual(['2026-11-15']);
    const period = periodResponseSchema.parse(
      (
        await ctx.app.inject({
          method: 'GET',
          url: `/api/households/${householdId}/periods/2026-10-01`,
          headers: { cookie: owner.cookie },
        })
      ).json(),
    );
    expect(period.summary.expenseCents).toBe(6712);
  });

  it('un cobro recurrente crea un ingreso', async () => {
    const nomina = await createRule(
      rent({
        kind: 'income',
        name: 'Nómina',
        amountCents: 180000,
        categoryId: category('Nómina').id,
        dayOfMonth: 28,
      }),
    );

    const response = await pay(owner, nomina.id, '2026-10-28', {
      transactionId: newId(),
      amountCents: 180000,
      date: '2026-10-28',
    });

    expect(response.statusCode).toBe(200);
    const [tx] = await ctx.db.select().from(transactions);
    expect(tx?.kind).toBe('income');
  });

  it('reintentar el mismo pago no duplica; pagar dos veces con otro id da 409', async () => {
    const rule = await createRule(rent());
    const transactionId = newId();
    const body = { transactionId, amountCents: 75000, date: '2026-11-01' };

    expect((await pay(owner, rule.id, '2026-11-01', body)).statusCode).toBe(200);
    expect((await pay(owner, rule.id, '2026-11-01', body)).statusCode).toBe(200);
    const again = await pay(owner, rule.id, '2026-11-01', { ...body, transactionId: newId() });

    expect(again.statusCode).toBe(409);
    expect(errorResponseSchema.parse(again.json()).error.code).toBe('conflict');
    expect(await ctx.db.select().from(transactions)).toHaveLength(1);
  });

  it('dos miembros que pagan a la vez crean un solo gasto', async () => {
    const rule = await createRule(rent());
    const editor = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');

    const responses = await Promise.all(
      [owner, editor, owner, editor].map((user) =>
        pay(user, rule.id, '2026-11-01', {
          transactionId: newId(),
          amountCents: 75000,
          date: '2026-11-01',
        }),
      ),
    );

    expect(responses.map((r) => r.statusCode).sort()).toEqual([200, 409, 409, 409]);
    expect(await ctx.db.select().from(transactions)).toHaveLength(1);
    expect(await ctx.db.select().from(occurrences)).toHaveLength(1);
  });

  it('rechaza una fecha que no es un vencimiento de la regla', async () => {
    const rule = await createRule(rent());

    const response = await pay(owner, rule.id, '2026-11-02', {
      transactionId: newId(),
      amountCents: 75000,
      date: '2026-11-02',
    });

    expect(response.statusCode).toBe(400);
    expect(await ctx.db.select().from(transactions)).toHaveLength(0);
  });

  it('omitir no crea movimiento; después ya no se puede pagar', async () => {
    const rule = await createRule(rent());

    const skipped = await skip(owner, rule.id, '2026-11-01');
    expect(skipped.statusCode).toBe(200);
    expect(resolvedOccurrenceSchema.parse(skipped.json()).status).toBe('skipped');
    expect((await skip(owner, rule.id, '2026-11-01')).statusCode).toBe(200);
    expect((await upcomingFor()).occurrences).toEqual([]);

    const paid = await pay(owner, rule.id, '2026-11-01', {
      transactionId: newId(),
      amountCents: 75000,
      date: '2026-11-01',
    });
    expect(paid.statusCode).toBe(409);
    expect(await ctx.db.select().from(transactions)).toHaveLength(0);
  });

  it('un lector no puede pagar ni omitir', async () => {
    const rule = await createRule(rent());
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');

    expect(
      (
        await pay(viewer, rule.id, '2026-11-01', {
          transactionId: newId(),
          amountCents: 1,
          date: '2026-11-01',
        })
      ).statusCode,
    ).toBe(403);
    expect((await skip(viewer, rule.id, '2026-11-01')).statusCode).toBe(403);
  });
});

describe('editar, desactivar y borrar', () => {
  it('cambiar el importe no cambia los ya pagados ni la fecha de inicio', async () => {
    const rule = await createRule(rent({ startDate: '2026-09-01' }));
    const paidId = newId();
    await pay(owner, rule.id, '2026-10-01', {
      transactionId: paidId,
      amountCents: 75000,
      date: '2026-10-01',
    });

    const response = await putRule(
      owner,
      rule.id,
      rent({ startDate: '2026-09-01', amountCents: 80000 }),
    );

    expect(recurringRuleSchema.parse(response.json())).toMatchObject({
      amountCents: 80000,
      startDate: '2026-09-01',
    });
    const [tx] = await ctx.db.select().from(transactions).where(eq(transactions.id, paidId));
    expect(tx?.amountCents).toBe(75000);
  });

  it('cambiar el día solo afecta a los vencimientos a partir de hoy', async () => {
    const rule = await createRule(rent({ startDate: '2026-09-01' }));
    await pay(owner, rule.id, '2026-10-01', {
      transactionId: newId(),
      amountCents: 75000,
      date: '2026-10-01',
    });

    const response = await putRule(
      owner,
      rule.id,
      rent({ startDate: '2026-09-01', dayOfMonth: 5 }),
    );

    expect(recurringRuleSchema.parse(response.json()).startDate).toBe('2026-10-27');
    expect((await upcomingFor()).occurrences).toEqual([
      { ruleId: rule.id, dueDate: '2026-11-05', overdue: false },
    ]);
    expect(await ctx.db.select().from(occurrences)).toHaveLength(1);
  });

  it('desactivar quita sus vencimientos', async () => {
    const rule = await createRule(rent());

    await putRule(owner, rule.id, rent({ active: false }));

    expect((await upcomingFor()).occurrences).toEqual([]);
    const paid = await pay(owner, rule.id, '2026-11-01', {
      transactionId: newId(),
      amountCents: 75000,
      date: '2026-11-01',
    });
    expect(paid.statusCode).toBe(400);
  });

  it('borrar la regla conserva los movimientos ya creados', async () => {
    const rule = await createRule(rent({ startDate: '2026-10-01' }));
    const paidId = newId();
    await pay(owner, rule.id, '2026-10-01', {
      transactionId: paidId,
      amountCents: 75000,
      date: '2026-10-01',
    });

    const response = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/households/${householdId}/recurring/${rule.id}`,
      headers: { cookie: owner.cookie },
    });

    expect(response.statusCode).toBe(204);
    expect(await ctx.db.select().from(recurringRules)).toHaveLength(0);
    expect(await ctx.db.select().from(occurrences)).toHaveLength(0);
    const [tx] = await ctx.db.select().from(transactions).where(eq(transactions.id, paidId));
    expect(tx?.deletedAt).toBeNull();
  });

  it('nadie de otro hogar puede borrarla', async () => {
    const rule = await createRule(rent());
    const intruso = await signUp(ctx.app);
    const intrusoHousehold = (await me(ctx.app, intruso)).household.id;

    const response = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/households/${intrusoHousehold}/recurring/${rule.id}`,
      headers: { cookie: intruso.cookie },
    });

    expect(response.statusCode).toBe(404);
    expect(await ctx.db.select().from(recurringRules)).toHaveLength(1);
  });
});
