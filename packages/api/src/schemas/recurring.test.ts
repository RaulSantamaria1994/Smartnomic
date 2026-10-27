import { describe, expect, it } from 'vitest';
import { recurringInputSchema } from './recurring';

const base = {
  kind: 'expense',
  name: 'Alquiler',
  amountCents: 75000,
  categoryId: '3b241101-e2bb-4255-8caf-4136c566a962',
  frequency: 'monthly',
  interval: 1,
  dayOfMonth: 1,
  startDate: '2026-10-27',
};

describe('recurringInputSchema', () => {
  it('completa los valores por defecto', () => {
    expect(recurringInputSchema.parse(base)).toMatchObject({
      monthOfYear: null,
      weekday: null,
      endDate: null,
      remindDaysBefore: 1,
      active: true,
    });
  });

  it('exige los días que pide cada frecuencia', () => {
    expect(recurringInputSchema.safeParse({ ...base, dayOfMonth: null }).success).toBe(false);
    expect(
      recurringInputSchema.safeParse({ ...base, frequency: 'yearly', monthOfYear: 3 }).success,
    ).toBe(true);
    expect(recurringInputSchema.safeParse({ ...base, frequency: 'yearly' }).success).toBe(false);
    expect(
      recurringInputSchema.safeParse({ ...base, frequency: 'weekly', dayOfMonth: null, weekday: 5 })
        .success,
    ).toBe(true);
    expect(
      recurringInputSchema.safeParse({ ...base, frequency: 'weekly', weekday: 5 }).success,
    ).toBe(false);
  });

  it('rechaza valores fuera de rango', () => {
    for (const patch of [
      { dayOfMonth: 32 },
      { interval: 0 },
      { interval: 13 },
      { remindDaysBefore: 2 },
      { name: '  ' },
      { amountCents: 0 },
      { endDate: '2026-10-01' },
    ]) {
      expect(recurringInputSchema.safeParse({ ...base, ...patch }).success).toBe(false);
    }
  });
});
