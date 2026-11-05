import { describe, expect, it } from 'vitest';
import { searchQueryString } from './searchQuery';

describe('searchQueryString (especificación 009)', () => {
  it('sin filtros no lleva consulta', () => {
    expect(searchQueryString({ categoryIds: [] })).toBe('');
  });

  it('repite categoryId y añade solo lo puesto, con el cursor al final', () => {
    expect(
      searchQueryString(
        {
          kind: 'expense',
          categoryIds: ['a', 'b'],
          minCents: 5000,
          to: '2026-10-31',
        },
        'xyz',
      ),
    ).toBe('?kind=expense&categoryId=a&categoryId=b&minCents=5000&to=2026-10-31&cursor=xyz');
  });
});
