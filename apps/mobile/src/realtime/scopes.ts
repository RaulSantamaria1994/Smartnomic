import type { RealtimeScope } from '@smartnomic/api';
import { queryKeys } from '../api/queryKeys';

/**
 * Qué consultas hay que recargar cuando otro miembro cambia algo (especificación 012). Las
 * gráficas y la búsqueda cuelgan de `periods`, así que se recargan con los meses.
 */
export function keysToRefresh(
  householdId: string,
  scopes: readonly RealtimeScope[] | 'all',
): (readonly unknown[])[] {
  const all: Record<RealtimeScope, (readonly unknown[])[]> = {
    transactions: [queryKeys.periods(householdId), queryKeys.calendars(householdId)],
    recurring: [
      queryKeys.recurring(householdId),
      queryKeys.upcoming(householdId),
      queryKeys.periods(householdId),
      queryKeys.calendars(householdId),
    ],
    savings: [
      queryKeys.savings(householdId),
      queryKeys.upcoming(householdId),
      queryKeys.periods(householdId),
      queryKeys.calendars(householdId),
    ],
    budgets: [queryKeys.periods(householdId)],
    categories: [queryKeys.categories(householdId), queryKeys.periods(householdId)],
    household: [
      queryKeys.me,
      queryKeys.periods(householdId),
      queryKeys.calendars(householdId),
      queryKeys.upcoming(householdId),
    ],
    // El rol decide lo que se puede hacer: `me` lo trae.
    members: [queryKeys.me, queryKeys.members(householdId), queryKeys.invitations(householdId)],
  };
  const chosen = scopes === 'all' ? (Object.keys(all) as RealtimeScope[]) : scopes;
  const seen = new Map<string, readonly unknown[]>();
  for (const scope of chosen) {
    for (const key of all[scope]) seen.set(JSON.stringify(key), key);
  }
  return [...seen.values()];
}

/** Espera máxima aunque sigan llegando avisos: con un goteo continuo, recarga igualmente. */
const MAX_WAIT_FACTOR = 4;

/**
 * Agrupa los avisos que llegan casi a la vez: entrega los distintos cuando pasan `delayMs` sin
 * avisos nuevos (o, como mucho, `4 × delayMs` desde el primero), para no recargar 20 veces
 * seguidas (CE-1204).
 */
export function createBatcher<T>(delayMs: number, flush: (items: T[]) => void) {
  let items: T[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let firstAt = 0;
  const run = () => {
    timer = null;
    const batch = items;
    items = [];
    if (batch.length > 0) flush(batch);
  };
  return {
    push(item: T) {
      if (!items.includes(item)) items.push(item);
      const now = Date.now();
      if (timer === null) firstAt = now;
      else clearTimeout(timer);
      const wait = Math.min(delayMs, firstAt + delayMs * MAX_WAIT_FACTOR - now);
      timer = setTimeout(run, Math.max(0, wait));
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      items = [];
    },
  };
}
