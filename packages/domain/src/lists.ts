/** Presupuestos que enseña «Mes» antes del «Ver todos» (especificación 015, RF-1502). */
export const MONTH_BUDGET_ROWS = 3;

/** Próximos pagos que enseña «Mes» antes del «Ver todos» (especificación 015, RF-1503). */
export const MONTH_UPCOMING_ROWS = 5;

/**
 * Recorta una lista a `max` filas sin esconder nunca las que `mustShow` marca (los pagos
 * atrasados, RF-1503): todas ellas entran, y las demás mientras queden huecos hasta `max`.
 * Conserva el orden de la lista. `hidden` es lo que se queda fuera y decide si hace falta
 * «Ver todos» (RF-1504).
 */
export function limitRows<T>(
  items: readonly T[],
  max: number,
  mustShow: (item: T) => boolean = () => false,
): { shown: T[]; hidden: number } {
  const required = items.filter(mustShow).length;
  let free = Math.max(0, max - required);
  const shown: T[] = [];
  for (const item of items) {
    if (mustShow(item)) {
      shown.push(item);
    } else if (free > 0) {
      shown.push(item);
      free -= 1;
    }
  }
  return { shown, hidden: items.length - shown.length };
}
