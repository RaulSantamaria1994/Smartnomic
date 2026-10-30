import { describe, expect, it } from 'vitest';
import { calendarResponseSchema } from './calendar';
import { upcomingResponseSchema } from './recurring';
import { savingsEntryInputSchema, savingsGoalInputSchema } from './savings';
import { periodResponseSchema } from './transactions';

const goal = {
  name: 'Vacaciones',
  icon: 'travel',
  targetCents: 120000,
  deadline: '2027-07-31',
  contributionDay: 1,
};

describe('savingsGoalInputSchema', () => {
  it('acepta una hucha válida y recorta el nombre', () => {
    expect(savingsGoalInputSchema.parse({ ...goal, name: '  Vacaciones ' })).toEqual(goal);
  });

  it('rechaza nombre vacío o largo, icono fuera del catálogo, objetivo no positivo y día fuera de 1–31', () => {
    for (const bad of [
      { name: '' },
      { name: 'x'.repeat(41) },
      { icon: 'pig' },
      { targetCents: 0 },
      { targetCents: -5 },
      { targetCents: 10.5 },
      { contributionDay: 0 },
      { contributionDay: 32 },
      { deadline: '2027-02-30' },
    ]) {
      expect(
        savingsGoalInputSchema.safeParse({ ...goal, ...bad }).success,
        JSON.stringify(bad),
      ).toBe(false);
    }
  });
});

describe('savingsEntryInputSchema', () => {
  const entry = { kind: 'deposit', amountCents: 13334, date: '2026-11-01' };

  it('aportar con o sin mes asociado; sacar sin mes', () => {
    expect(savingsEntryInputSchema.parse(entry)).toEqual({ ...entry, dueDate: null });
    expect(savingsEntryInputSchema.parse({ ...entry, dueDate: '2026-11-01' }).dueDate).toBe(
      '2026-11-01',
    );
    expect(savingsEntryInputSchema.safeParse({ ...entry, kind: 'withdrawal' }).success).toBe(true);
  });

  it('rechaza saltar por esta vía, sacar asociado a un mes e importes no positivos', () => {
    expect(savingsEntryInputSchema.safeParse({ ...entry, kind: 'skip' }).success).toBe(false);
    expect(
      savingsEntryInputSchema.safeParse({ ...entry, kind: 'withdrawal', dueDate: '2026-11-01' })
        .success,
    ).toBe(false);
    expect(savingsEntryInputSchema.safeParse({ ...entry, amountCents: 0 }).success).toBe(false);
  });
});

describe('respuestas ampliadas, compatibles con un servidor anterior', () => {
  it('sin los campos nuevos, se rellenan vacíos', () => {
    const period = periodResponseSchema.parse({
      period: { start: '2026-10-01', end: '2026-10-31' },
      summary: { incomeCents: 0, expenseCents: 0, balanceCents: 0 },
      transactions: [],
    });
    expect(period.summary.setAsideCents).toBe(0);
    expect(upcomingResponseSchema.parse({ today: '2026-10-30', occurrences: [] }).savings).toEqual(
      [],
    );
    const calendar = calendarResponseSchema.parse({
      month: '2026-10',
      today: '2026-10-30',
      bounds: { min: '2026-10', max: '2027-10' },
      items: [],
      totals: { expenseCents: 0, incomeCents: 0, pendingExpenseCents: 0 },
    });
    expect(calendar.savings).toEqual([]);
  });
});
