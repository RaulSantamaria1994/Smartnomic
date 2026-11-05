import type { Transaction } from '@smartnomic/api';
import { describe, expect, it } from 'vitest';
import { findCachedTransaction } from './cachedTransaction';

const tx = (id: string) =>
  ({ id, kind: 'expense', amountCents: 100, date: '2026-10-01' }) as unknown as Transaction;

describe('findCachedTransaction', () => {
  it('lo encuentra aunque antes haya datos de las gráficas, que no tienen movimientos', () => {
    const charts = { months: [], categories: [], savings: { monthsCents: [], goals: [] } };
    const entries = [
      [['periods', 'h', '2026-11-01'], { transactions: [tx('a')] }],
      [['periods', 'h', 'charts', '2026-11-01'], charts],
      [['periods', 'h', '2026-10-01'], { transactions: [tx('b')] }],
    ] as const;
    expect(findCachedTransaction(entries, 'b')?.id).toBe('b');
  });

  it('busca también en las páginas de la búsqueda', () => {
    const entries = [
      [
        ['periods', 'h', 'search', {}],
        { pages: [{ transactions: [tx('a')] }, { transactions: [tx('c')] }] },
      ],
    ] as const;
    expect(findCachedTransaction(entries, 'c')?.id).toBe('c');
  });

  it('sin datos o sin el movimiento, nada', () => {
    expect(findCachedTransaction([[['periods'], undefined]], 'x')).toBeUndefined();
    expect(
      findCachedTransaction([[['periods'], { transactions: [tx('a')] }]], 'x'),
    ).toBeUndefined();
  });
});
