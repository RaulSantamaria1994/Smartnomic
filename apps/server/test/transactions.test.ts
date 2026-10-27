import {
  categoriesResponseSchema,
  errorResponseSchema,
  periodResponseSchema,
  transactionSchema,
  type Category,
  type TransactionInput,
} from '@smartnomic/api';
import { DEFAULT_CATEGORIES } from '@smartnomic/domain';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { categories as categoriesTable, transactions } from '../src/db/schema';
import { joinHousehold, me, newId, signUp, useTestServer, type TestUser } from './helpers';

const ctx = useTestServer();

let owner: TestUser;
let householdId: string;
let categories: Category[];

function category(name: string): Category {
  const found = categories.find((c) => c.name === name);
  if (!found) throw new Error(`No existe la categoría ${name}`);
  return found;
}

function put(user: TestUser, id: string, body: unknown, household = householdId) {
  return ctx.app.inject({
    method: 'PUT',
    url: `/api/households/${household}/transactions/${id}`,
    headers: { cookie: user.cookie },
    payload: body as Record<string, unknown>,
  });
}

function expense(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    kind: 'expense',
    amountCents: 4530,
    date: '2026-10-27',
    categoryId: category('Supermercado').id,
    note: null,
    ...overrides,
  };
}

async function period(user: TestUser, start = '2026-10-01') {
  const response = await ctx.app.inject({
    method: 'GET',
    url: `/api/households/${householdId}/periods/${start}`,
    headers: { cookie: user.cookie },
  });
  return periodResponseSchema.parse(response.json());
}

beforeEach(async () => {
  owner = await signUp(ctx.app);
  householdId = (await me(ctx.app, owner)).household.id;
  const response = await ctx.app.inject({
    method: 'GET',
    url: `/api/households/${householdId}/categories`,
    headers: { cookie: owner.cookie },
  });
  categories = categoriesResponseSchema.parse(response.json()).categories;
});

describe('categorías', () => {
  it('cada hogar nuevo tiene las categorías predefinidas', () => {
    expect(categories.map((c) => [c.kind, c.name])).toEqual(
      DEFAULT_CATEGORIES.map((c) => [c.kind, c.name]),
    );
    expect(categories.every((c) => !c.archived)).toBe(true);
  });

  it('un hogar creado antes de las categorías las recibe al abrir la app', async () => {
    await ctx.db.delete(categoriesTable).where(eq(categoriesTable.householdId, householdId));

    await Promise.all([me(ctx.app, owner), me(ctx.app, owner)]);

    const rows = await ctx.db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.householdId, householdId));
    expect(rows).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it('nadie de otro hogar puede verlas', async () => {
    const intruso = await signUp(ctx.app);
    const response = await ctx.app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/categories`,
      headers: { cookie: intruso.cookie },
    });
    expect(response.statusCode).toBe(403);
  });
});

describe('PUT /transactions/:id', () => {
  it('crea un gasto con quien lo apuntó', async () => {
    const id = newId();
    const response = await put(owner, id, expense({ note: 'Compra semanal' }));

    expect(response.statusCode).toBe(200);
    const tx = transactionSchema.parse(response.json());
    expect(tx).toMatchObject({
      id,
      kind: 'expense',
      amountCents: 4530,
      date: '2026-10-27',
      note: 'Compra semanal',
    });
    expect(tx.memberId).toBe((await me(ctx.app, owner)).member.id);
  });

  it('es idempotente: repetir la misma petición no duplica el movimiento', async () => {
    const id = newId();
    const first = await put(owner, id, expense());
    const second = await put(owner, id, expense());

    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({ id, amountCents: 4530 });
    expect(first.json().createdAt).toBe(second.json().createdAt);
    expect(await ctx.db.select().from(transactions)).toHaveLength(1);
  });

  it('edita un movimiento sin cambiar quién lo apuntó', async () => {
    const editor = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');
    const id = newId();
    const created = transactionSchema.parse((await put(owner, id, expense())).json());

    const response = await put(
      editor,
      id,
      expense({ amountCents: 6712, date: '2026-11-03', note: 'Corregido' }),
    );

    expect(response.statusCode).toBe(200);
    const edited = transactionSchema.parse(response.json());
    expect(edited).toMatchObject({ amountCents: 6712, date: '2026-11-03', note: 'Corregido' });
    expect(edited.memberId).toBe(created.memberId);
    expect(edited.createdAt).toBe(created.createdAt);
    expect(Date.parse(edited.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.updatedAt));
  });

  it('rechaza importes, fechas e identificadores no válidos', async () => {
    for (const body of [
      expense({ amountCents: 0 }),
      expense({ amountCents: -100 }),
      { ...expense(), amountCents: 45.3 },
      { ...expense(), date: '2026-02-30' },
      { ...expense(), kind: 'transfer' },
    ]) {
      const response = await put(owner, newId(), body);
      expect(response.statusCode).toBe(400);
      expect(errorResponseSchema.parse(response.json()).error.code).toBe('validation_failed');
    }
    const v4 = await put(owner, '3b241101-e2bb-4255-8caf-4136c566a962', expense());
    expect(v4.statusCode).toBe(400);
    expect(await ctx.db.select().from(transactions)).toHaveLength(0);
  });

  it('rechaza una categoría de otro hogar o de otro tipo', async () => {
    const other = await signUp(ctx.app);
    const otherHousehold = (await me(ctx.app, other)).household.id;
    const otherCategories = categoriesResponseSchema.parse(
      (
        await ctx.app.inject({
          method: 'GET',
          url: `/api/households/${otherHousehold}/categories`,
          headers: { cookie: other.cookie },
        })
      ).json(),
    ).categories;

    const foreign = await put(owner, newId(), expense({ categoryId: otherCategories[3]!.id }));
    const wrongKind = await put(owner, newId(), expense({ categoryId: category('Nómina').id }));

    for (const response of [foreign, wrongKind]) {
      expect(response.statusCode).toBe(400);
      expect(errorResponseSchema.parse(response.json()).error.code).toBe('validation_failed');
    }
  });

  it('un lector no puede apuntar ni editar', async () => {
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');

    expect((await put(viewer, newId(), expense())).statusCode).toBe(403);
    expect((await period(viewer)).transactions).toHaveLength(0);
  });

  it('nadie de otro hogar puede apuntar en este', async () => {
    const intruso = await signUp(ctx.app);
    expect((await put(intruso, newId(), expense())).statusCode).toBe(403);
  });

  it('no se puede sobrescribir un movimiento de otro hogar usando su id', async () => {
    const id = newId();
    await put(owner, id, expense({ amountCents: 1000 }));
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
      .categories.find((c) => c.name === 'Supermercado')!;

    const response = await put(
      intruso,
      id,
      expense({ amountCents: 1, categoryId: intrusoCategory.id }),
      intrusoHousehold,
    );

    expect(response.statusCode).toBe(404);
    const [row] = await ctx.db.select().from(transactions).where(eq(transactions.id, id));
    expect(row?.amountCents).toBe(1000);
    expect(row?.householdId).toBe(householdId);
  });
});

describe('borrar y restaurar', () => {
  it('borra (de forma lógica) y restaura un movimiento', async () => {
    const id = newId();
    await put(owner, id, expense());

    const deleted = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/households/${householdId}/transactions/${id}`,
      headers: { cookie: owner.cookie },
    });
    expect(deleted.statusCode).toBe(204);
    expect((await period(owner)).transactions).toHaveLength(0);
    const [row] = await ctx.db.select().from(transactions).where(eq(transactions.id, id));
    expect(row?.deletedAt).toBeInstanceOf(Date);

    const restored = await ctx.app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/transactions/${id}/restore`,
      headers: { cookie: owner.cookie },
    });
    expect(restored.statusCode).toBe(200);
    expect(transactionSchema.parse(restored.json()).id).toBe(id);
    expect((await period(owner)).transactions.map((t) => t.id)).toEqual([id]);
  });

  it('no se puede editar un movimiento borrado sin restaurarlo', async () => {
    const id = newId();
    await put(owner, id, expense());
    await ctx.app.inject({
      method: 'DELETE',
      url: `/api/households/${householdId}/transactions/${id}`,
      headers: { cookie: owner.cookie },
    });

    expect((await put(owner, id, expense({ amountCents: 1 }))).statusCode).toBe(404);
  });

  it('borrar o restaurar algo que no existe responde 404', async () => {
    const id = newId();
    for (const [method, url] of [
      ['DELETE', `/api/households/${householdId}/transactions/${id}`],
      ['POST', `/api/households/${householdId}/transactions/${id}/restore`],
    ] as const) {
      const response = await ctx.app.inject({ method, url, headers: { cookie: owner.cookie } });
      expect(response.statusCode).toBe(404);
    }
  });

  it('un lector no puede borrar ni restaurar', async () => {
    const id = newId();
    await put(owner, id, expense());
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');

    const response = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/households/${householdId}/transactions/${id}`,
      headers: { cookie: viewer.cookie },
    });
    expect(response.statusCode).toBe(403);
  });

  it('nadie de otro hogar puede borrar un movimiento ajeno', async () => {
    const id = newId();
    await put(owner, id, expense());
    const intruso = await signUp(ctx.app);
    const intrusoHousehold = (await me(ctx.app, intruso)).household.id;

    const response = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/households/${intrusoHousehold}/transactions/${id}`,
      headers: { cookie: intruso.cookie },
    });

    expect(response.statusCode).toBe(404);
    expect((await period(owner)).transactions).toHaveLength(1);
  });
});
