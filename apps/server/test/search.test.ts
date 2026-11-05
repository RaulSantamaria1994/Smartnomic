import { errorResponseSchema, searchResponseSchema, type SearchResponse } from '@smartnomic/api';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { categories, transactions } from '../src/db/schema';
import { joinHousehold, me, newId, signUp, useTestServer, type TestUser } from './helpers';

const ctx = useTestServer();

let owner: TestUser;
let householdId: string;
let groceries: string;
let leisure: string;
let salary: string;

interface Row {
  id: string;
  kind: 'expense' | 'income';
  categoryId: string;
  amountCents: number;
  date: string;
  deleted?: boolean;
}

function search(query: string, user: TestUser | null = owner, household = householdId) {
  return ctx.app.inject({
    method: 'GET',
    url: `/api/households/${household}/transactions/search${query ? `?${query}` : ''}`,
    headers: user ? { cookie: user.cookie } : {},
  });
}

async function ok(query: string, user = owner): Promise<SearchResponse> {
  const response = await search(query, user);
  expect(response.statusCode, response.body).toBe(200);
  return searchResponseSchema.parse(response.json());
}

/** Recorre todas las páginas y devuelve los ids en orden y los totales de la primera. */
async function all(query: string) {
  const first = await ok(query);
  const ids = first.transactions.map((t) => t.id);
  let cursor = first.nextCursor;
  while (cursor) {
    const page = await ok(`${query ? `${query}&` : ''}cursor=${cursor}`);
    expect(page.totals).toBeUndefined();
    ids.push(...page.transactions.map((t) => t.id));
    cursor = page.nextCursor;
  }
  return { ids, totals: first.totals! };
}

async function categoryOf(name: string, kind: 'expense' | 'income' = 'expense') {
  const [row] = await ctx.db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.householdId, householdId),
        eq(categories.name, name),
        eq(categories.kind, kind),
      ),
    );
  return row!.id;
}

async function insert(rows: Row[]) {
  await ctx.db.insert(transactions).values(
    rows.map(({ deleted, ...r }) => ({
      ...r,
      householdId,
      ...(deleted && { deletedAt: new Date() }),
    })),
  );
}

/** Lo que debería salir: filtrado a mano y en el orden de «Mes». */
function expected(rows: Row[], keep: (r: Row) => boolean) {
  return rows.filter((r) => !r.deleted && keep(r));
}

beforeEach(async () => {
  owner = await signUp(ctx.app);
  householdId = (await me(ctx.app, owner)).household.id;
  groceries = await categoryOf('Supermercado');
  leisure = await categoryOf('Ocio');
  salary = await categoryOf('Nómina', 'income');
});

describe('acceso (especificación 009)', () => {
  it('sin sesión, 401; otro hogar u hogar inexistente, 403 sin datos', async () => {
    await insert([
      {
        id: newId(),
        kind: 'expense',
        categoryId: groceries,
        amountCents: 4242,
        date: '2026-10-01',
      },
    ]);
    expect((await search('', null)).statusCode).toBe(401);
    const stranger = await signUp(ctx.app);
    const theirs = await search('', stranger);
    expect(theirs.statusCode).toBe(403);
    expect(theirs.body).not.toContain('4242');
    expect((await search('', owner, newId())).statusCode).toBe(403);
  });

  it('un lector puede buscar', async () => {
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');
    await insert([
      { id: newId(), kind: 'expense', categoryId: groceries, amountCents: 100, date: '2026-10-01' },
    ]);
    expect((await ok('', viewer)).transactions).toHaveLength(1);
  });

  it('los ids de categoría de otro hogar no encuentran nada', async () => {
    const stranger = await signUp(ctx.app);
    const theirHousehold = (await me(ctx.app, stranger)).household.id;
    const [their] = await ctx.db
      .select()
      .from(categories)
      .where(and(eq(categories.householdId, theirHousehold), eq(categories.name, 'Supermercado')));
    await insert([
      { id: newId(), kind: 'expense', categoryId: groceries, amountCents: 100, date: '2026-10-01' },
    ]);
    const body = await ok(`categoryId=${their!.id}`);
    expect(body.transactions).toEqual([]);
    expect(body.totals).toEqual({ count: 0, incomeCents: 0, expenseCents: 0 });
  });
});

describe('filtros (historias 1 y 2)', () => {
  let rows: Row[];
  beforeEach(async () => {
    rows = [
      { id: newId(), kind: 'income', categoryId: salary, amountCents: 180000, date: '2026-10-01' },
      {
        id: newId(),
        kind: 'expense',
        categoryId: groceries,
        amountCents: 5000,
        date: '2026-10-05',
      },
      {
        id: newId(),
        kind: 'expense',
        categoryId: groceries,
        amountCents: 10000,
        date: '2026-09-30',
      },
      { id: newId(), kind: 'expense', categoryId: leisure, amountCents: 10001, date: '2026-09-15' },
      { id: newId(), kind: 'expense', categoryId: leisure, amountCents: 4999, date: '2025-12-31' },
      {
        id: newId(),
        kind: 'expense',
        categoryId: groceries,
        amountCents: 7777,
        date: '2026-10-05',
        deleted: true,
      },
    ];
    await insert(rows);
  });

  it('sin filtros: todos, de más reciente a más antiguo, sin borrados, con número y totales', async () => {
    const body = await ok('');
    expect(body.transactions.map((t) => t.date)).toEqual([
      '2026-10-05',
      '2026-10-01',
      '2026-09-30',
      '2026-09-15',
      '2025-12-31',
    ]);
    expect(body.nextCursor).toBeNull();
    expect(body.totals).toEqual({ count: 5, incomeCents: 180000, expenseCents: 29999 + 1 });
  });

  it('por tipo', async () => {
    expect((await ok('kind=income')).transactions.map((t) => t.amountCents)).toEqual([180000]);
    expect((await ok('kind=expense')).totals).toEqual({
      count: 4,
      incomeCents: 0,
      expenseCents: 30000,
    });
  });

  it('por una o varias categorías', async () => {
    expect((await ok(`categoryId=${leisure}`)).transactions.map((t) => t.amountCents)).toEqual([
      10001, 4999,
    ]);
    const both = await ok(`categoryId=${leisure}&categoryId=${salary}`);
    expect(both.totals).toEqual({ count: 3, incomeCents: 180000, expenseCents: 15000 });
  });

  it('por importe, con los extremos incluidos', async () => {
    const body = await ok('minCents=5000&maxCents=10000');
    expect(body.transactions.map((t) => t.amountCents)).toEqual([5000, 10000]);
    expect((await ok('minCents=10001')).transactions.map((t) => t.amountCents)).toEqual([
      180000, 10001,
    ]);
    expect((await ok('maxCents=4999')).transactions.map((t) => t.amountCents)).toEqual([4999]);
  });

  it('por fechas, con los extremos incluidos', async () => {
    expect((await ok('from=2026-09-30&to=2026-10-01')).transactions.map((t) => t.date)).toEqual([
      '2026-10-01',
      '2026-09-30',
    ]);
    expect((await ok('to=2025-12-31')).transactions.map((t) => t.amountCents)).toEqual([4999]);
    expect((await ok('from=2026-10-02')).totals!.count).toBe(1);
  });

  it('combinados', async () => {
    const body = await ok(
      `kind=expense&categoryId=${groceries}&categoryId=${leisure}&minCents=5000&from=2026-09-01&to=2026-09-30`,
    );
    expect(body.transactions.map((t) => t.amountCents)).toEqual([10000, 10001]);
    expect(body.totals).toEqual({ count: 2, incomeCents: 0, expenseCents: 20001 });
  });

  it('valores no válidos, rangos al revés y cursores manipulados: 400', async () => {
    for (const bad of [
      'kind=savings',
      'categoryId=no-es-uuid',
      'minCents=0',
      'minCents=abc',
      'minCents=2&maxCents=1',
      'from=2026-02-30',
      'from=2026-10-02&to=2026-10-01',
      'cursor=no%20vale',
      'cursor=bm8tZXMtanNvbg',
      `cursor=${Buffer.from(JSON.stringify(['2026-10-01', 'ayer', 'x'])).toString('base64url')}`,
      `cursor=${Buffer.from(JSON.stringify(["2026-10-01' OR 1=1--", '2026-10-01T00:00:00.000000Z', newId()])).toString('base64url')}`,
    ]) {
      const response = await search(bad);
      expect(response.statusCode, bad).toBe(400);
      errorResponseSchema.parse(response.json());
    }
  });
});

describe('páginas (RF-904)', () => {
  it('de 100 en 100 sin repetir ni saltar, también si se apunta uno entre páginas', async () => {
    const rows: Row[] = Array.from({ length: 250 }, (_, n) => ({
      id: newId(),
      kind: 'expense' as const,
      categoryId: groceries,
      amountCents: 100 + n,
      // Muchas en el mismo día: el orden lo decide la creación y el id.
      date: `2026-10-${String(1 + (n % 5)).padStart(2, '0')}`,
    }));
    await insert(rows);
    const first = await ok('');
    expect(first.transactions).toHaveLength(100);
    expect(first.totals!.count).toBe(250);
    // Un movimiento nuevo entre la primera y la segunda página.
    await insert([
      { id: newId(), kind: 'expense', categoryId: groceries, amountCents: 1, date: '2026-10-03' },
    ]);
    const second = await ok(`cursor=${first.nextCursor}`);
    const third = await ok(`cursor=${second.nextCursor}`);
    expect(third.nextCursor).toBeNull();
    const seen = [...first.transactions, ...second.transactions, ...third.transactions].map(
      (t) => t.id,
    );
    expect(new Set(seen).size).toBe(seen.length);
    for (const r of rows) expect(seen, r.id).toContain(r.id);
    // El orden es el de «Mes»: fecha descendente.
    const dates = seen.map(
      (id) => [...rows, { id, date: '2026-10-03' }].find((r) => r.id === id)!.date,
    );
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});

describe('CE-901: cada combinación coincide con un filtrado a mano', () => {
  it('cientos de movimientos, varias combinaciones, todas las páginas', async () => {
    const cats = [groceries, leisure, await categoryOf('Transporte'), await categoryOf('Vivienda')];
    const rows: Row[] = Array.from({ length: 400 }, (_, n) => {
      const income = n % 9 === 0;
      return {
        id: newId(),
        kind: income ? 'income' : 'expense',
        categoryId: income ? salary : cats[n % cats.length]!,
        amountCents: 1 + ((n * 7919) % 30000),
        date: `2026-${String(1 + (n % 10)).padStart(2, '0')}-${String(1 + (n % 28)).padStart(2, '0')}`,
        deleted: n % 23 === 0,
      };
    });
    await insert(rows);
    const cases: [string, (r: Row) => boolean][] = [
      ['', () => true],
      ['kind=income', (r) => r.kind === 'income'],
      [
        `categoryId=${cats[1]}&categoryId=${cats[2]}`,
        (r) => r.categoryId === cats[1] || r.categoryId === cats[2],
      ],
      ['minCents=1000&maxCents=20000', (r) => r.amountCents >= 1000 && r.amountCents <= 20000],
      ['from=2026-03-15&to=2026-07-01', (r) => r.date >= '2026-03-15' && r.date <= '2026-07-01'],
      [
        `kind=expense&categoryId=${cats[0]}&minCents=5000&from=2026-02-01`,
        (r) =>
          r.kind === 'expense' &&
          r.categoryId === cats[0] &&
          r.amountCents >= 5000 &&
          r.date >= '2026-02-01',
      ],
    ];
    for (const [query, keep] of cases) {
      const want = expected(rows, keep);
      const { ids, totals } = await all(query);
      expect(new Set(ids), query).toEqual(new Set(want.map((r) => r.id)));
      expect(ids.length, query).toBe(want.length);
      const sum = (kind: Row['kind']) =>
        want.filter((r) => r.kind === kind).reduce((s, r) => s + r.amountCents, 0);
      expect(totals, query).toEqual({
        count: want.length,
        incomeCents: sum('income'),
        expenseCents: sum('expense'),
      });
    }
  });
});
