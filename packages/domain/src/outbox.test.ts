import { describe, expect, it } from 'vitest';
import {
  budgetsWithPending,
  pendingInPeriod,
  sendOutcome,
  summaryWithPending,
  type PendingEntry,
} from './outbox';

const pending = (
  date: string,
  kind: 'income' | 'expense',
  amountCents: number,
  categoryId = 'super',
  status: 'waiting' | 'rejected' = 'waiting',
): PendingEntry => ({ status, input: { date, kind, amountCents, categoryId } });

describe('sendOutcome (especificación 011, RF-1106)', () => {
  it('2xx se ha enviado', () => {
    expect(sendOutcome(200)).toBe('sent');
    expect(sendOutcome(204)).toBe('sent');
  });

  it('sin respuesta, sesión caducada, espera, demasiadas peticiones o fallo del servidor: reintentar', () => {
    for (const status of [0, 401, 408, 429, 500, 502, 503]) {
      expect(sendOutcome(status), String(status)).toBe('retry');
    }
  });

  it('datos o permisos: rechazado', () => {
    for (const status of [400, 403, 404, 409, 422]) {
      expect(sendOutcome(status), String(status)).toBe('rejected');
    }
  });
});

describe('pendingInPeriod', () => {
  it('los que caen en el periodo, extremos incluidos', () => {
    const list = [
      pending('2026-09-30', 'expense', 1),
      pending('2026-10-01', 'expense', 2),
      pending('2026-10-31', 'expense', 3),
      pending('2026-11-01', 'expense', 4),
    ];
    expect(
      pendingInPeriod(list, { start: '2026-10-01', end: '2026-10-31' }).map(
        (p) => p.input.amountCents,
      ),
    ).toEqual([2, 3]);
  });

  it('con el mes empezando el 25, del 25 al 24', () => {
    const list = [pending('2026-10-24', 'expense', 1), pending('2026-10-25', 'expense', 2)];
    expect(pendingInPeriod(list, { start: '2026-10-25', end: '2026-11-24' })).toHaveLength(1);
  });
});

describe('summaryWithPending (RF-1105, CE-1104)', () => {
  const summary = {
    incomeCents: 100000,
    expenseCents: 30000,
    balanceCents: 70000,
    setAsideCents: 500,
  };

  it('suma ingresos y gastos pendientes y recalcula el balance; lo demás no cambia', () => {
    expect(
      summaryWithPending(summary, [
        pending('2026-10-02', 'expense', 4530),
        pending('2026-10-03', 'income', 1000),
      ]),
    ).toEqual({
      incomeCents: 101000,
      expenseCents: 34530,
      balanceCents: 66470,
      setAsideCents: 500,
    });
  });

  it('los rechazados no cuentan; sin pendientes, igual', () => {
    expect(
      summaryWithPending(summary, [pending('2026-10-02', 'expense', 999, 'x', 'rejected')]),
    ).toEqual(summary);
    expect(summaryWithPending(summary, [])).toEqual(summary);
  });
});

describe('budgetsWithPending', () => {
  const budgets = [
    { categoryId: 'super', amountCents: 40000, spentCents: 10000 },
    { categoryId: 'ocio', amountCents: 5000, spentCents: 0 },
  ];

  it('suma los gastos pendientes de cada categoría; ingresos y rechazados fuera', () => {
    expect(
      budgetsWithPending(budgets, [
        pending('2026-10-02', 'expense', 4530, 'super'),
        pending('2026-10-02', 'expense', 470, 'super'),
        pending('2026-10-02', 'income', 9999, 'super'),
        pending('2026-10-02', 'expense', 7777, 'super', 'rejected'),
        pending('2026-10-02', 'expense', 100, 'sin-presupuesto'),
      ]),
    ).toEqual([
      { categoryId: 'super', amountCents: 40000, spentCents: 15000 },
      { categoryId: 'ocio', amountCents: 5000, spentCents: 0 },
    ]);
  });
});
