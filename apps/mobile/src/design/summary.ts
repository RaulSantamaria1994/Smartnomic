import type { Cents } from '@smartnomic/domain';

/** Proporción gastada de lo ingresado (1 = todo); sin ingresos, `null`. */
export function spentShare(incomeCents: Cents, expenseCents: Cents): number | null {
  if (incomeCents <= 0) return null;
  return expenseCents / incomeCents;
}
