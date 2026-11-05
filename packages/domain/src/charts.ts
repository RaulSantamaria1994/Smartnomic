import type { Cents } from './money';
import { periodOf, shiftPeriod, type Period } from './periods';
import type { DateString } from './dates';

/** Meses de las gráficas de evolución (especificación 008, RF-803). */
export const CHART_MONTHS = 6;

/** Parte mínima de una barra cuyo importe no es 0, para que siempre se vea. */
export const MIN_BAR_SHARE = 0.02;

/** Los `CHART_MONTHS` periodos que terminan en el que empieza en `start`, del más antiguo. */
export function chartWindow(start: DateString, monthStartDay: number): Period[] {
  const last = periodOf(start, monthStartDay);
  return Array.from({ length: CHART_MONTHS }, (_, i) =>
    shiftPeriod(last, i - (CHART_MONTHS - 1), monthStartDay),
  );
}

/** Porcentaje entero de cada importe sobre el total; 0 si el total es 0. */
export function shares(amounts: readonly Cents[]): number[] {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  return amounts.map((amount) => (total === 0 ? 0 : Math.round((amount / total) * 100)));
}

/** Parte de la barra que se pinta (0 a 1), con un mínimo visible si el valor no es 0. */
export function barShare(value: Cents, max: Cents): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(MIN_BAR_SHARE, Math.min(1, value / max));
}

/** De mayor a menor importe y, a igualdad, por nombre. No cambia la lista. */
export function sortByAmount<T extends { name: string; amountCents: Cents }>(
  list: readonly T[],
): T[] {
  return [...list].sort(
    (a, b) => b.amountCents - a.amountCents || a.name.localeCompare(b.name, 'es'),
  );
}

/**
 * Categoría que muestra «Evolución» al abrirla desde el selector: la de más gasto del mes
 * entre las de gasto no archivadas; si no hay gastos, la primera de ellas por nombre.
 */
export function defaultCategory(
  categories: readonly { id: string; name: string; kind: string; archived: boolean }[],
  spent: readonly { categoryId: string; amountCents: Cents }[],
): string | undefined {
  const usable = categories.filter((c) => c.kind === 'expense' && !c.archived);
  const byId = new Map(usable.map((c) => [c.id, c]));
  const top = sortByAmount(
    spent
      .filter((s) => s.amountCents > 0 && byId.has(s.categoryId))
      .map((s) => ({
        id: s.categoryId,
        name: byId.get(s.categoryId)!.name,
        amountCents: s.amountCents,
      })),
  )[0];
  if (top) return top.id;
  return [...usable].sort((a, b) => a.name.localeCompare(b.name, 'es'))[0]?.id;
}
