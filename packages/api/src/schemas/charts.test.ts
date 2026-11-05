import { describe, expect, it } from 'vitest';
import { chartsResponseSchema } from './charts';

const month = (start: string, end: string) => ({ start, end, incomeCents: 0, expenseCents: 0 });
const valid = {
  months: [
    month('2026-06-01', '2026-06-30'),
    month('2026-07-01', '2026-07-31'),
    month('2026-08-01', '2026-08-31'),
    month('2026-09-01', '2026-09-30'),
    month('2026-10-01', '2026-10-31'),
    { start: '2026-11-01', end: '2026-11-30', incomeCents: 180000, expenseCents: 165000 },
  ],
  categories: [
    { categoryId: '0190a3f2-7b1c-7d3e-8f4a-123456789abc', monthsCents: [0, 0, 0, 0, 100, 41230] },
  ],
  savings: {
    monthsCents: [0, 0, 1000, 2000, 3000, 4000],
    goals: [{ goalId: '0190a3f2-7b1c-7d3e-8f4a-123456789abd', balanceCents: 4000 }],
  },
};

describe('chartsResponseSchema (especificación 008)', () => {
  it('acepta 6 meses con sus importes', () => {
    expect(chartsResponseSchema.parse(valid)).toEqual(valid);
  });

  it('exige exactamente 6 meses y 6 importes por serie', () => {
    expect(
      chartsResponseSchema.safeParse({ ...valid, months: valid.months.slice(1) }).success,
    ).toBe(false);
    expect(
      chartsResponseSchema.safeParse({
        ...valid,
        categories: [{ ...valid.categories[0], monthsCents: [1, 2, 3] }],
      }).success,
    ).toBe(false);
    expect(
      chartsResponseSchema.safeParse({ ...valid, savings: { ...valid.savings, monthsCents: [] } })
        .success,
    ).toBe(false);
  });

  it('rechaza importes negativos o con decimales', () => {
    for (const bad of [-1, 10.5]) {
      const months = [...valid.months];
      months[0] = { ...months[0]!, expenseCents: bad };
      expect(chartsResponseSchema.safeParse({ ...valid, months }).success, String(bad)).toBe(false);
    }
  });
});
