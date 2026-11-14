/** Estado de una fila: se queda, está entrando o se está yendo (especificación 006). */
export interface Tracked<T> {
  key: string;
  item: T;
  state: 'stay' | 'enter' | 'leave';
}

/**
 * Compara la lista que se ve con la nueva: las filas nuevas entran, las que ya no están se
 * quedan en su sitio marcadas para salir y el resto sigue igual. Sin lista anterior (la
 * primera carga), nada se anima.
 */
export function trackList<T>(
  previous: Tracked<T>[] | null,
  next: readonly T[],
  keyOf: (item: T) => string,
): Tracked<T>[] {
  if (!previous) return next.map((item) => ({ key: keyOf(item), item, state: 'stay' }));
  const before = new Map(previous.map((t) => [t.key, t]));
  const nextKeys = new Set(next.map(keyOf));
  const result: Tracked<T>[] = next.map((item) => {
    const key = keyOf(item);
    const old = before.get(key);
    const state = !old || old.state === 'leave' ? 'enter' : old.state;
    return { key, item, state };
  });
  // Cada fila que se va vuelve a su sitio: detrás de la que tenía delante y sigue en la lista.
  previous.forEach((t, index) => {
    if (nextKeys.has(t.key)) return;
    const leaving: Tracked<T> = { ...t, state: 'leave' };
    let anchor = -1;
    for (let i = index - 1; i >= 0 && anchor < 0; i--) {
      anchor = result.findIndex((r) => r.key === previous[i]!.key);
    }
    result.splice(anchor + 1, 0, leaving);
  });
  return result;
}

/** La lista sin la fila que ha terminado de fundirse. */
export function withoutKey<T>(list: Tracked<T>[], key: string): Tracked<T>[] {
  return list.filter((t) => t.key !== key);
}
