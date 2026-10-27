import { describe, expect, it } from 'vitest';
import type { RecurrenceRule } from './recurrence';
import { upcoming } from './upcoming';

const rule = (
  id: string,
  dayOfMonth: number,
  extra: Partial<RecurrenceRule & { active: boolean }> = {},
) => ({
  id,
  active: true,
  frequency: 'monthly' as const,
  interval: 1,
  dayOfMonth,
  startDate: '2026-09-01',
  endDate: null,
  ...extra,
});

describe('upcoming', () => {
  const today = '2026-10-27';

  it('vencimientos de los próximos 30 días, ordenados por fecha', () => {
    const items = upcoming([rule('luz', 15), rule('alquiler', 1)], [], today, 30, today);
    expect(items.filter((i) => !i.overdue)).toEqual([
      { ruleId: 'alquiler', dueDate: '2026-11-01', overdue: false },
      { ruleId: 'luz', dueDate: '2026-11-15', overdue: false },
    ]);
  });

  it('incluye los atrasados sin resolver', () => {
    const items = upcoming([rule('luz', 15)], [], today, 30, '2026-01-01');
    expect(items).toEqual([
      { ruleId: 'luz', dueDate: '2026-09-15', overdue: true },
      { ruleId: 'luz', dueDate: '2026-10-15', overdue: true },
      { ruleId: 'luz', dueDate: '2026-11-15', overdue: false },
    ]);
  });

  it('excluye los pagados u omitidos', () => {
    const items = upcoming(
      [rule('luz', 15)],
      [
        { ruleId: 'luz', dueDate: '2026-09-15' },
        { ruleId: 'luz', dueDate: '2026-10-15' },
      ],
      today,
      30,
      '2026-01-01',
    );
    expect(items).toEqual([{ ruleId: 'luz', dueDate: '2026-11-15', overdue: false }]);
  });

  it('un vencimiento de hoy no está atrasado', () => {
    expect(upcoming([rule('x', 27)], [], today, 0, today)).toContainEqual({
      ruleId: 'x',
      dueDate: '2026-10-27',
      overdue: false,
    });
  });

  it('ignora las reglas desactivadas', () => {
    expect(upcoming([rule('luz', 15, { active: false })], [], today, 30, today)).toEqual([]);
  });

  it('los atrasados se buscan solo desde la fecha indicada', () => {
    const items = upcoming([rule('luz', 15)], [], today, 30, '2026-10-01');
    expect(items.map((i) => i.dueDate)).toEqual(['2026-10-15', '2026-11-15']);
  });
});
