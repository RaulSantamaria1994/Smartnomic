import { describe, expect, it } from 'vitest';
import { searchQuerySchema, searchResponseSchema } from './search';

const cat1 = '0190a3f2-7b1c-7d3e-8f4a-123456789abc';
const cat2 = '0190a3f2-7b1c-7d3e-8f4a-123456789abd';

describe('searchQuerySchema (especificación 009)', () => {
  it('sin filtros vale y no lleva nada', () => {
    expect(searchQuerySchema.parse({})).toEqual({ categoryIds: [] });
  });

  it('lee los filtros como llegan en la URL', () => {
    expect(
      searchQuerySchema.parse({
        kind: 'expense',
        categoryId: [cat1, cat2],
        minCents: '5000',
        maxCents: '10000',
        from: '2026-01-01',
        to: '2026-10-31',
        cursor: 'abc_-123',
      }),
    ).toEqual({
      kind: 'expense',
      categoryIds: [cat1, cat2],
      minCents: 5000,
      maxCents: 10000,
      from: '2026-01-01',
      to: '2026-10-31',
      cursor: 'abc_-123',
    });
  });

  it('una sola categoría llega como texto y vale igual', () => {
    expect(searchQuerySchema.parse({ categoryId: cat1 }).categoryIds).toEqual([cat1]);
  });

  it('rechaza valores no válidos', () => {
    for (const bad of [
      { kind: 'savings' },
      { categoryId: 'no-es-uuid' },
      { categoryId: Array.from({ length: 51 }, () => cat1) },
      { minCents: '0' },
      { minCents: '-5' },
      { minCents: '10.5' },
      { minCents: '1e3' },
      { maxCents: '100000000000000' },
      { from: '2026-02-30' },
      { to: 'ayer' },
      { cursor: 'no válido!' },
      { cursor: 'a'.repeat(300) },
    ]) {
      expect(searchQuerySchema.safeParse(bad).success, JSON.stringify(bad).slice(0, 60)).toBe(
        false,
      );
    }
  });

  it('rechaza los rangos al revés y acepta los extremos iguales', () => {
    expect(searchQuerySchema.safeParse({ minCents: '2', maxCents: '1' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ from: '2026-10-02', to: '2026-10-01' }).success).toBe(
      false,
    );
    expect(searchQuerySchema.safeParse({ minCents: '2', maxCents: '2' }).success).toBe(true);
  });
});

describe('searchResponseSchema', () => {
  it('los totales son opcionales (solo van en la primera página)', () => {
    expect(searchResponseSchema.parse({ transactions: [], nextCursor: null })).toEqual({
      transactions: [],
      nextCursor: null,
    });
    expect(
      searchResponseSchema.parse({
        transactions: [],
        nextCursor: 'abc',
        totals: { count: 0, incomeCents: 0, expenseCents: 0 },
      }).totals,
    ).toEqual({ count: 0, incomeCents: 0, expenseCents: 0 });
  });
});
