import { describe, expect, it } from 'vitest';
import { householdExportSchema } from './account';
import { budgetInputSchema, periodBudgetSchema } from './budgets';
import { periodResponseSchema } from './transactions';

describe('budgetInputSchema (especificación 007)', () => {
  it('acepta un importe en céntimos positivo', () => {
    expect(budgetInputSchema.parse({ amountCents: 40000 })).toEqual({ amountCents: 40000 });
  });

  it('rechaza vacío, cero, negativo, decimales y desmesurado', () => {
    for (const bad of [
      {},
      { amountCents: 0 },
      { amountCents: -1 },
      { amountCents: 10.5 },
      { amountCents: 1e15 },
    ]) {
      expect(budgetInputSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });
});

describe('presupuestos en el periodo y en la exportación', () => {
  const period = {
    period: { start: '2026-11-01', end: '2026-11-30' },
    summary: { incomeCents: 0, expenseCents: 0, balanceCents: 0, setAsideCents: 0 },
    transactions: [],
  };

  it('el periodo sin presupuestos (servidor antiguo) da una lista vacía', () => {
    expect(periodResponseSchema.parse(period).budgets).toEqual([]);
  });

  it('el periodo lleva importe y lo gastado de cada categoría', () => {
    const budget = {
      categoryId: '0190a5a0-0000-7000-8000-000000000001',
      amountCents: 40000,
      spentCents: 41200,
    };
    expect(periodBudgetSchema.parse(budget)).toEqual(budget);
    expect(periodResponseSchema.parse({ ...period, budgets: [budget] }).budgets).toEqual([budget]);
  });

  it('lo gastado puede ser cero pero no negativo', () => {
    const base = { categoryId: '0190a5a0-0000-7000-8000-000000000001', amountCents: 100 };
    expect(periodBudgetSchema.safeParse({ ...base, spentCents: 0 }).success).toBe(true);
    expect(periodBudgetSchema.safeParse({ ...base, spentCents: -1 }).success).toBe(false);
  });

  it('una exportación antigua sin presupuestos da una lista vacía', () => {
    const shape = householdExportSchema.shape.budgets;
    expect(shape.parse(undefined)).toEqual([]);
    expect(
      shape.parse([
        {
          categoryId: '0190a5a0-0000-7000-8000-000000000001',
          validFrom: '2026-11-01',
          amountCents: null,
        },
      ]),
    ).toHaveLength(1);
  });
});
