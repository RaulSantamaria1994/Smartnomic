import type { Cents } from './money';

/** Desde esta parte del presupuesto gastada, la categoría está «cerca» (especificación 007). */
export const BUDGET_NEAR_SHARE = 0.8;

export type BudgetLevel = 'ok' | 'near' | 'over';

export interface BudgetProgress {
  /** Lo que queda por gastar (0 si ya se ha llegado o pasado). */
  remainingCents: Cents;
  /** Lo que se ha pasado (0 si no se ha pasado). */
  overCents: Cents;
  /** Parte gastada: 1 es todo el presupuesto. */
  share: number;
  level: BudgetLevel;
}

/** Cómo va un presupuesto con lo gastado en su periodo (RF-705). */
export function budgetProgress(amountCents: Cents, spentCents: Cents): BudgetProgress {
  const share = spentCents / amountCents;
  return {
    remainingCents: Math.max(0, amountCents - spentCents),
    overCents: Math.max(0, spentCents - amountCents),
    share,
    level: spentCents > amountCents ? 'over' : share >= BUDGET_NEAR_SHARE ? 'near' : 'ok',
  };
}

/** De más a menos porcentaje gastado y, a igualdad, por nombre. No cambia la lista. */
export function sortBudgets<T extends { name: string; amountCents: Cents; spentCents: Cents }>(
  list: readonly T[],
): T[] {
  return [...list].sort(
    (a, b) =>
      b.spentCents / b.amountCents - a.spentCents / a.amountCents ||
      a.name.localeCompare(b.name, 'es'),
  );
}
