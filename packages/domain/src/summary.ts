import { sumCents, type Cents } from './money';

export type TransactionKind = 'income' | 'expense';

export const TRANSACTION_KINDS = [
  'income',
  'expense',
] as const satisfies readonly TransactionKind[];

export interface Summary {
  incomeCents: Cents;
  expenseCents: Cents;
  /** Ingresos menos gastos. Puede ser negativo. */
  balanceCents: Cents;
}

/** Totales de un conjunto de movimientos (especificación 001, RF-016 y RF-018). */
export function summarize(
  transactions: readonly { kind: TransactionKind; amountCents: Cents }[],
): Summary {
  const incomeCents = sumCents(
    transactions.filter((t) => t.kind === 'income').map((t) => t.amountCents),
  );
  const expenseCents = sumCents(
    transactions.filter((t) => t.kind === 'expense').map((t) => t.amountCents),
  );
  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents };
}
