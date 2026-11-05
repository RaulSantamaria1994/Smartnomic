import { searchQuerySchema, type SearchQuery, type SearchResponse } from '@smartnomic/api';
import { isValidDate, SEARCH_PAGE_SIZE } from '@smartnomic/domain';
import { and, desc, eq, gte, inArray, isNull, lte, sql, type SQL } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Database } from '../db/client';
import { transactions } from '../db/schema';
import { ApiError } from '../plugins/errors';
import type { HouseholdAccess } from '../plugins/household-access';
import { toTransaction } from './transactions';

const paramsSchema = z.object({ householdId: z.uuid() });

/** Instante con microsegundos, como lo guarda PostgreSQL, para que el cursor sea exacto. */
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

/** Posición en el orden de «Mes» (`date`, `created_at`, `id`, todo descendente). */
type Cursor = [date: string, createdAt: string, id: string];

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeCursor(text: string): Cursor {
  const invalid = new ApiError('validation_failed', 'Cursor no válido.');
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(text, 'base64url').toString('utf8'));
  } catch {
    throw invalid;
  }
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    typeof value[0] !== 'string' ||
    !isValidDate(value[0]) ||
    typeof value[1] !== 'string' ||
    !INSTANT.test(value[1]) ||
    !z.uuid().safeParse(value[2]).success
  ) {
    throw invalid;
  }
  return value as Cursor;
}

/** Condiciones de los filtros, siempre dentro del hogar y sin borrados (RF-902). */
function filtersOf(householdId: string, query: SearchQuery): SQL {
  const conditions: (SQL | undefined)[] = [
    eq(transactions.householdId, householdId),
    isNull(transactions.deletedAt),
    query.kind && eq(transactions.kind, query.kind),
    query.categoryIds.length > 0 ? inArray(transactions.categoryId, query.categoryIds) : undefined,
    query.minCents !== undefined ? gte(transactions.amountCents, query.minCents) : undefined,
    query.maxCents !== undefined ? lte(transactions.amountCents, query.maxCents) : undefined,
    query.from ? gte(transactions.date, query.from) : undefined,
    query.to ? lte(transactions.date, query.to) : undefined,
  ];
  return and(...conditions)!;
}

export function registerSearchRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess },
): void {
  const { db, access } = deps;

  // Búsqueda de movimientos con filtros (especificación 009): una página de 100 por clave y,
  // en la primera, el número y los totales de todos los que cumplen los filtros (RF-905).
  app.get(
    '/api/households/:householdId/transactions/search',
    { preHandler: access.requireMember('household.view') },
    async (request): Promise<SearchResponse> => {
      paramsSchema.parse(request.params);
      const query = searchQuerySchema.parse(request.query);
      const { household } = request.membership!;
      const filters = filtersOf(household.id, query);
      const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
      const after = cursor
        ? sql`(${transactions.date}, ${transactions.createdAt}, ${transactions.id}) < (${cursor[0]}::date, ${cursor[1]}::timestamptz, ${cursor[2]}::uuid)`
        : undefined;

      const [rows, totals] = await Promise.all([
        db
          .select({
            row: transactions,
            // Con microsegundos: `Date` de JavaScript solo guarda milisegundos.
            createdAtText: sql<string>`to_char(${transactions.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
          })
          .from(transactions)
          .where(after ? and(filters, after) : filters)
          .orderBy(desc(transactions.date), desc(transactions.createdAt), desc(transactions.id))
          .limit(SEARCH_PAGE_SIZE + 1),
        cursor
          ? undefined
          : db
              .select({
                count: sql<string>`count(*)`,
                income: sql<string>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.kind} = 'income'), 0)`,
                expense: sql<string>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.kind} = 'expense'), 0)`,
              })
              .from(transactions)
              .where(filters)
              .then(([row]) => row),
      ]);

      const page = rows.slice(0, SEARCH_PAGE_SIZE);
      const last = page.at(-1);
      return {
        transactions: page.map(({ row }) => toTransaction(row)),
        nextCursor:
          rows.length > SEARCH_PAGE_SIZE && last
            ? encodeCursor([last.row.date, last.createdAtText, last.row.id])
            : null,
        ...(totals && {
          totals: {
            count: Number(totals.count),
            incomeCents: Number(totals.income),
            expenseCents: Number(totals.expense),
          },
        }),
      };
    },
  );
}
