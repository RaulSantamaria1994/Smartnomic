import type { Transaction } from '@smartnomic/api';

/**
 * Busca un movimiento entre los datos ya cargados bajo `periods`. Ahí cuelgan los meses
 * (`{ transactions }`), pero también las gráficas (sin movimientos) y, con la búsqueda, sus
 * páginas (`{ pages: [{ transactions }] }`): cada entrada se mira según su forma y lo que no
 * tiene movimientos se salta.
 */
export function findCachedTransaction(
  entries: readonly (readonly [unknown, unknown])[],
  id: string,
): Transaction | undefined {
  for (const [, data] of entries) {
    for (const list of transactionLists(data)) {
      const found = list.find((t) => t.id === id);
      if (found) return found;
    }
  }
  return undefined;
}

function transactionLists(data: unknown): Transaction[][] {
  if (!data || typeof data !== 'object') return [];
  const record = data as { transactions?: unknown; pages?: unknown };
  if (Array.isArray(record.transactions)) return [record.transactions as Transaction[]];
  if (Array.isArray(record.pages)) return record.pages.flatMap(transactionLists);
  return [];
}
