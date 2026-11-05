/** Movimientos por página en la búsqueda (especificación 009, RF-904). */
export const SEARCH_PAGE_SIZE = 100;

/** Categorías que se pueden elegir a la vez en un filtro. */
export const SEARCH_MAX_CATEGORIES = 50;

export type RangeProblem = 'reversed';

/**
 * Comprueba un rango «desde–hasta» de importes (céntimos) o de fechas (`YYYY-MM-DD`, que se
 * ordenan como texto). Los extremos van incluidos, así que iguales vale.
 */
export function rangeError<T extends number | string>(
  from: T | undefined,
  to: T | undefined,
): RangeProblem | null {
  if (from === undefined || to === undefined) return null;
  return from > to ? 'reversed' : null;
}
