import type { SearchFilters } from '@smartnomic/api';

/**
 * Filtros de la búsqueda como consulta de la URL (especificación 009): `categoryId` se repite
 * por cada categoría y lo que no se ha puesto no va.
 */
export function searchQueryString(filters: SearchFilters, cursor?: string): string {
  const params = new URLSearchParams();
  if (filters.kind) params.append('kind', filters.kind);
  for (const id of filters.categoryIds) params.append('categoryId', id);
  if (filters.minCents !== undefined) params.append('minCents', String(filters.minCents));
  if (filters.maxCents !== undefined) params.append('maxCents', String(filters.maxCents));
  if (filters.from) params.append('from', filters.from);
  if (filters.to) params.append('to', filters.to);
  if (cursor) params.append('cursor', cursor);
  const text = params.toString();
  return text ? `?${text}` : '';
}
