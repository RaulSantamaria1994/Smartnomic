import { csvExportSchema, errorResponseSchema, searchResponseSchema } from '@smartnomic/api';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { categories, transactions } from '../src/db/schema';
import { joinHousehold, me, newId, signUp, useTestServer, type TestUser } from './helpers';

// Hoy es 2026-10-27 (TEST_NOW).
const ctx = useTestServer();

let owner: TestUser;
let ownerMember: string;
let householdId: string;
let groceries: string;
let leisure: string;
let salary: string;

const HEADER = ['Fecha', 'Tipo', 'Categoría', 'Importe (€)', 'Nota', 'Apuntado por'];

/** Lee un CSV con `;` como lo haría Excel: comillas dobles, `""` y saltos dentro de comillas. */
function parseCsv(text: string): string[][] {
  expect(text.startsWith('﻿')).toBe(true);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const body = text.slice(1);
  for (let i = 0; i < body.length; i++) {
    const c = body[i]!;
    if (quoted) {
      if (c === '"' && body[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ';') {
      row.push(field);
      field = '';
    } else if (c === '\r' && body[i + 1] === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
    } else field += c;
  }
  expect(field).toBe('');
  expect(row).toEqual([]);
  return rows;
}

function exportCsv(query: string, user: TestUser | null = owner, household = householdId) {
  return ctx.app.inject({
    method: 'GET',
    url: `/api/households/${household}/transactions/export${query ? `?${query}` : ''}`,
    headers: user ? { cookie: user.cookie } : {},
  });
}

async function rowsOf(query: string, user = owner) {
  const response = await exportCsv(query, user);
  expect(response.statusCode, response.body).toBe(200);
  const body = csvExportSchema.parse(response.json());
  const [header, ...rows] = parseCsv(body.csv);
  expect(header).toEqual(HEADER);
  return { fileName: body.fileName, rows };
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

function insert(
  rows: {
    kind: 'expense' | 'income';
    categoryId: string;
    amountCents: number;
    date: string;
    note?: string;
    memberId?: string | null;
    deleted?: boolean;
  }[],
) {
  return ctx.db.insert(transactions).values(
    rows.map(({ deleted, memberId, ...r }) => ({
      id: newId(),
      householdId,
      memberId: memberId === undefined ? ownerMember : memberId,
      ...r,
      ...(deleted && { deletedAt: new Date() }),
    })),
  );
}

/** «-45,30» → -4530 céntimos. */
const cents = (text: string) => Math.round(Number(text.replace(',', '.')) * 100);

beforeEach(async () => {
  owner = await signUp(ctx.app);
  const profile = await me(ctx.app, owner);
  householdId = profile.household.id;
  ownerMember = profile.member.id;
  groceries = await categoryOf('Supermercado');
  leisure = await categoryOf('Ocio');
  salary = await categoryOf('Nómina', 'income');
});

describe('acceso (especificación 010)', () => {
  it('sin sesión, 401; otro hogar u hogar inexistente, 403 sin datos', async () => {
    await insert([
      {
        kind: 'expense',
        categoryId: groceries,
        amountCents: 4242,
        date: '2026-10-01',
        note: 'secreta',
      },
    ]);
    expect((await exportCsv('', null)).statusCode).toBe(401);
    const stranger = await signUp(ctx.app);
    const theirs = await exportCsv('', stranger);
    expect(theirs.statusCode).toBe(403);
    expect(theirs.body).not.toMatch(/secreta|42,42/);
    expect((await exportCsv('', owner, newId())).statusCode).toBe(403);
  });

  it('un lector puede exportar', async () => {
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');
    await insert([
      { kind: 'expense', categoryId: groceries, amountCents: 100, date: '2026-10-01' },
    ]);
    expect((await rowsOf('', viewer)).rows).toHaveLength(1);
  });

  it('con cursor o filtros no válidos, 400', async () => {
    for (const bad of ['cursor=abc', 'kind=savings', 'minCents=2&maxCents=1', 'from=2026-02-30']) {
      const response = await exportCsv(bad);
      expect(response.statusCode, bad).toBe(400);
      errorResponseSchema.parse(response.json());
    }
  });
});

describe('el archivo (RF-1003, RF-1004)', () => {
  it('nombre con la fecha del hogar, títulos y cada columna', async () => {
    await insert([
      {
        kind: 'expense',
        categoryId: groceries,
        amountCents: 4530,
        date: '2026-10-27',
        note: 'Mercadona',
      },
      { kind: 'income', categoryId: salary, amountCents: 180000, date: '2026-10-01' },
    ]);
    const { fileName, rows } = await rowsOf('');
    expect(fileName).toBe('smartnomic-movimientos-2026-10-27.csv');
    const name = (await me(ctx.app, owner)).user.name;
    expect(rows).toEqual([
      ['27/10/2026', 'Gasto', 'Supermercado', '-45,30', 'Mercadona', name],
      ['01/10/2026', 'Ingreso', 'Nómina', '1800,00', '', name],
    ]);
  });

  it('quien ya no está sale como «Antiguo miembro»; borrados fuera', async () => {
    await insert([
      {
        kind: 'expense',
        categoryId: groceries,
        amountCents: 100,
        date: '2026-10-02',
        memberId: null,
      },
      {
        kind: 'expense',
        categoryId: groceries,
        amountCents: 999,
        date: '2026-10-03',
        deleted: true,
      },
    ]);
    const { rows } = await rowsOf('');
    expect(rows).toEqual([['02/10/2026', 'Gasto', 'Supermercado', '-1,00', '', 'Antiguo miembro']]);
  });

  it('las categorías archivadas salen con su nombre', async () => {
    await insert([{ kind: 'expense', categoryId: leisure, amountCents: 100, date: '2026-10-02' }]);
    await ctx.db
      .update(categories)
      .set({ archivedAt: new Date() })
      .where(eq(categories.id, leisure));
    expect((await rowsOf('')).rows[0]![2]).toBe('Ocio');
  });

  it('sin movimientos, solo los títulos', async () => {
    expect((await rowsOf('')).rows).toEqual([]);
  });
});

describe('CE-1002: notas difíciles no rompen el archivo ni se ejecutan', () => {
  it('mismas filas y columnas, el texto intacto y ninguna celda empieza por una fórmula', async () => {
    const notes = [
      'pan; leche',
      'el "bueno"',
      'dos\nlíneas',
      'con\r\nretorno',
      '=SUMA(A1:A9)',
      '+34 600 000 000',
      '-resta',
      '@usuario',
      '=HIPERVINCULO("http://x";"clic")',
      '\tTabulador',
      ';;;',
      '"',
    ];
    await insert(
      notes.map((note, i) => ({
        kind: 'expense' as const,
        categoryId: groceries,
        amountCents: 100 + i,
        date: `2026-10-${String(1 + i).padStart(2, '0')}`,
        note,
      })),
    );
    const { rows } = await rowsOf('');
    expect(rows).toHaveLength(notes.length);
    for (const row of rows) expect(row).toHaveLength(6);
    const byAmount = new Map(rows.map((r) => [-cents(r[3]!), r[4]!]));
    notes.forEach((note, i) => {
      const cell = byAmount.get(100 + i)!;
      expect(cell.replace(/^'/, ''), JSON.stringify(note)).toBe(note);
      expect(/^[=+\-@\t\r]/.test(cell), JSON.stringify(cell)).toBe(false);
    });
  });
});

describe('CE-1001: lo mismo que la búsqueda', () => {
  it('mismos movimientos, mismo orden y la suma cuadra con ingresos menos gastos', async () => {
    const cats = [groceries, leisure, await categoryOf('Transporte')];
    await insert(
      Array.from({ length: 300 }, (_, n) => {
        const income = n % 7 === 0;
        return {
          kind: (income ? 'income' : 'expense') as 'income' | 'expense',
          categoryId: income ? salary : cats[n % cats.length]!,
          amountCents: 1 + ((n * 7919) % 30000),
          date: `2026-${String(1 + (n % 10)).padStart(2, '0')}-${String(1 + (n % 28)).padStart(2, '0')}`,
          deleted: n % 31 === 0,
        };
      }),
    );
    for (const query of [
      '',
      'kind=expense',
      `categoryId=${cats[1]}&categoryId=${salary}`,
      'minCents=1000&maxCents=20000&from=2026-03-01&to=2026-08-31',
    ]) {
      const { rows } = await rowsOf(query);
      // La búsqueda, recorriendo todas sus páginas.
      const ids: { date: string; amountCents: number; kind: string }[] = [];
      let cursor: string | null | undefined;
      let totals;
      do {
        const page = searchResponseSchema.parse(
          (
            await ctx.app.inject({
              method: 'GET',
              url: `/api/households/${householdId}/transactions/search?${[query, cursor && `cursor=${cursor}`].filter(Boolean).join('&')}`,
              headers: { cookie: owner.cookie },
            })
          ).json(),
        );
        totals ??= page.totals;
        ids.push(...page.transactions);
        cursor = page.nextCursor;
      } while (cursor);
      expect(rows.length, query).toBe(ids.length);
      rows.forEach((r, i) => {
        const t = ids[i]!;
        expect(r[0], query).toBe(t.date.split('-').reverse().join('/'));
        expect(cents(r[3]!), query).toBe(t.kind === 'expense' ? -t.amountCents : t.amountCents);
      });
      const sum = rows.reduce((s, r) => s + cents(r[3]!), 0);
      expect(sum, query).toBe(totals!.incomeCents - totals!.expenseCents);
    }
  });
});
