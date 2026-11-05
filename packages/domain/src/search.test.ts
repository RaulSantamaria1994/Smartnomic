import { describe, expect, it } from 'vitest';
import { rangeError, SEARCH_MAX_CATEGORIES, SEARCH_PAGE_SIZE } from './search';

describe('búsqueda de movimientos (especificación 009)', () => {
  it('páginas de 100 y como mucho 50 categorías a la vez', () => {
    expect(SEARCH_PAGE_SIZE).toBe(100);
    expect(SEARCH_MAX_CATEGORIES).toBe(50);
  });

  it('un rango sin uno de sus extremos o con los dos iguales vale', () => {
    expect(rangeError(undefined, undefined)).toBeNull();
    expect(rangeError(5000, undefined)).toBeNull();
    expect(rangeError(undefined, 5000)).toBeNull();
    expect(rangeError(5000, 5000)).toBeNull();
    expect(rangeError('2026-10-01', '2026-10-01')).toBeNull();
  });

  it('«desde» mayor que «hasta» está al revés, con importes y con fechas', () => {
    expect(rangeError(10001, 10000)).toBe('reversed');
    expect(rangeError('2026-10-02', '2026-10-01')).toBe('reversed');
    expect(rangeError('2025-12-31', '2026-01-01')).toBeNull();
  });
});
