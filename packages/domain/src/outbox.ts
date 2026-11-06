import type { DateString } from './dates';
import type { Cents } from './money';
import type { Period } from './periods';
import type { TransactionKind } from './summary';

/**
 * Movimientos apuntados sin conexión que esperan a enviarse (especificación 011). Aquí solo
 * van los cálculos; la bandeja que los guarda y envía está en la app.
 */

/** Lo que el dominio necesita de un pendiente. */
export interface PendingEntry {
  status: 'waiting' | 'rejected';
  input: { date: DateString; kind: TransactionKind; amountCents: Cents; categoryId: string };
}

export type SendOutcome = 'sent' | 'retry' | 'rejected';

/**
 * Qué hacer según la respuesta del servidor (`0` si no la hubo): reintentar si el fallo es de
 * conexión, del servidor o de la sesión; rechazar si es por los datos o los permisos (RF-1106).
 */
export function sendOutcome(status: number): SendOutcome {
  if (status >= 200 && status < 300) return 'sent';
  if (status === 0 || status === 401 || status === 408 || status === 429 || status >= 500) {
    return 'retry';
  }
  return 'rejected';
}

/** Los pendientes con fecha dentro del periodo, extremos incluidos. */
export function pendingInPeriod<T extends PendingEntry>(list: readonly T[], period: Period): T[] {
  return list.filter((p) => p.input.date >= period.start && p.input.date <= period.end);
}

/** Solo los que se van a enviar tal cual: un rechazado no cuenta hasta corregirlo. */
const counted = (list: readonly PendingEntry[]) => list.filter((p) => p.status === 'waiting');

/**
 * El resumen del periodo con los pendientes ya sumados (RF-1105). Recibe solo los pendientes
 * del periodo; lo demás del resumen (lo apartado en huchas) no cambia.
 */
export function summaryWithPending<
  T extends { incomeCents: Cents; expenseCents: Cents; balanceCents: Cents },
>(summary: T, list: readonly PendingEntry[]): T {
  let income = 0;
  let expense = 0;
  for (const p of counted(list)) {
    if (p.input.kind === 'income') income += p.input.amountCents;
    else expense += p.input.amountCents;
  }
  return {
    ...summary,
    incomeCents: summary.incomeCents + income,
    expenseCents: summary.expenseCents + expense,
    balanceCents: summary.balanceCents + income - expense,
  };
}

/** Los presupuestos del periodo con los gastos pendientes de su categoría sumados. */
export function budgetsWithPending<T extends { categoryId: string; spentCents: Cents }>(
  budgets: readonly T[],
  list: readonly PendingEntry[],
): T[] {
  const extra = new Map<string, Cents>();
  for (const p of counted(list)) {
    if (p.input.kind !== 'expense') continue;
    extra.set(p.input.categoryId, (extra.get(p.input.categoryId) ?? 0) + p.input.amountCents);
  }
  return budgets.map((b) => ({ ...b, spentCents: b.spentCents + (extra.get(b.categoryId) ?? 0) }));
}
