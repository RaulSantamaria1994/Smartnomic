import type { SearchFilters } from '@smartnomic/api';

/** Claves de la caché de consultas: lo que cuelga de una clave se invalida con ella. */
export const queryKeys = {
  me: ['me'] as const,
  categories: (householdId: string) => ['categories', householdId] as const,
  periods: (householdId: string) => ['periods', householdId] as const,
  /** Todos los meses del calendario, para invalidarlos juntos. */
  calendars: (householdId: string) => ['calendar', householdId] as const,
  calendar: (householdId: string, month: string) => ['calendar', householdId, month] as const,
  period: (householdId: string, start: string) => ['periods', householdId, start] as const,
  /**
   * Bajo `periods`: todo lo que refresca los meses (apuntar, editar, borrar, pagar, huchas)
   * refresca también las gráficas.
   */
  /** Bajo `periods`, como las gráficas: editar o borrar un movimiento la refresca. */
  search: (householdId: string, filters: SearchFilters) =>
    ['periods', householdId, 'search', filters] as const,
  charts: (householdId: string, start: string) =>
    ['periods', householdId, 'charts', start] as const,
  recurring: (householdId: string) => ['recurring', householdId] as const,
  savings: (householdId: string) => ['savings', householdId] as const,
  /** Bajo `savings`: al refrescar las huchas se refresca también su historial. */
  savingsEntries: (householdId: string, goalId: string) =>
    ['savings', householdId, goalId, 'entries'] as const,
  members: (householdId: string) => ['members', householdId] as const,
  invitations: (householdId: string) => ['invitations', householdId] as const,
  upcoming: (householdId: string, days?: number) =>
    (days === undefined
      ? ['upcoming', householdId]
      : ['upcoming', householdId, days]) as readonly unknown[],
};

/**
 * ¿Se guarda esta consulta en la caché de Android para verla sin conexión? La búsqueda no:
 * sus combinaciones de filtros no tienen fin y no hay búsqueda sin conexión (especificación
 * 009).
 */
export function persistable(queryKey: readonly unknown[]): boolean {
  return !(queryKey[0] === 'periods' && queryKey[2] === 'search');
}
