import { describe, expect, it } from 'vitest';
import { calendarResponseSchema, monthSchema } from './calendar';

describe('monthSchema', () => {
  it('acepta YYYY-MM y rechaza otros formatos con un mensaje claro', () => {
    expect(monthSchema.parse('2026-11')).toBe('2026-11');
    const result = monthSchema.safeParse('2026-13');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Mes no válido: se espera AAAA-MM');
  });
});

describe('calendarResponseSchema', () => {
  it('valida una respuesta completa', () => {
    const response = {
      month: '2026-11',
      today: '2026-10-29',
      bounds: { min: '2026-09', max: '2027-10' },
      items: [
        {
          ruleId: '019a2b3c-4d5e-7f00-8a00-000000000001',
          dueDate: '2026-11-01',
          status: 'pending',
          kind: 'expense',
          amountCents: 75000,
          transactionId: null,
          resolvedBy: null,
        },
      ],
      totals: { expenseCents: 75000, incomeCents: 0, pendingExpenseCents: 75000 },
    };
    expect(calendarResponseSchema.parse(response)).toEqual({ ...response, savings: [] });
    expect(
      calendarResponseSchema.safeParse({
        ...response,
        items: [{ ...response.items[0], status: 'cancelado' }],
      }).success,
    ).toBe(false);
  });
});
