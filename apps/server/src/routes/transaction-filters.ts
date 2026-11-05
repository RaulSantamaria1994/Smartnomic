import type { SearchQuery } from '@smartnomic/api';
import { and, eq, gte, inArray, isNull, lte, type SQL } from 'drizzle-orm';
import { transactions } from '../db/schema';

/**
 * Condiciones de los filtros de movimientos, siempre dentro del hogar y sin borrados. Las usan
 * la búsqueda (especificación 009, RF-902) y la exportación a CSV (010, RF-1002), así que las
 * dos devuelven siempre los mismos movimientos.
 */
export function filtersOf(householdId: string, query: SearchQuery): SQL {
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
