import { describe, expect, it } from 'vitest';
import { localNow, planReminders, reminderInstant, reminderText } from './plan';

const rule = {
  id: '019a2b3c-4d5e-7f60-8a1b-2c3d4e5f6a7b',
  kind: 'expense' as const,
  name: 'Alquiler',
  amountCents: 75000,
  categoryId: '3b241101-e2bb-4255-8caf-4136c566a962',
  frequency: 'monthly' as const,
  interval: 1,
  dayOfMonth: 1,
  monthOfYear: null,
  weekday: null,
  startDate: '2026-10-27',
  endDate: null,
  remindDaysBefore: 1 as const,
  active: true,
};

const nbsp = (t: string) => t.replace(/\u00a0/g, ' ');

describe('localNow y reminderInstant', () => {
  it('usan la hora local del dispositivo', () => {
    const now = new Date(2026, 9, 27, 8, 5);
    expect(localNow(now)).toEqual({ date: '2026-10-27', time: '08:05' });
    const instant = reminderInstant({
      id: 'x',
      ruleId: 'r',
      dueDate: '2026-11-01',
      date: '2026-10-31',
      time: '09:00',
      daysBefore: 1,
    });
    expect([
      instant.getFullYear(),
      instant.getMonth(),
      instant.getDate(),
      instant.getHours(),
      instant.getMinutes(),
    ]).toEqual([2026, 9, 31, 9, 0]);
  });
});

describe('reminderText', () => {
  it('aviso del día antes y del mismo día', () => {
    const before = reminderText(
      {
        id: 'a',
        ruleId: rule.id,
        dueDate: '2026-11-01',
        date: '2026-10-31',
        time: '09:00',
        daysBefore: 1,
      },
      rule,
    );
    expect(before.title).toBe('Mañana vence Alquiler');
    expect(nbsp(before.body)).toBe('750,00 € · 1 de noviembre');

    const due = reminderText(
      {
        id: 'b',
        ruleId: rule.id,
        dueDate: '2026-11-01',
        date: '2026-11-01',
        time: '09:00',
        daysBefore: 0,
      },
      rule,
    );
    expect(due.title).toBe('Hoy vence Alquiler');
    expect(nbsp(due.body)).toBe('750,00 € · vence hoy');
  });

  it('con varios días de antelación y para cobros', () => {
    expect(
      reminderText(
        {
          id: 'c',
          ruleId: rule.id,
          dueDate: '2026-11-28',
          date: '2026-11-25',
          time: '09:00',
          daysBefore: 3,
        },
        { ...rule, kind: 'income', name: 'Nómina' },
      ).title,
    ).toBe('En 3 días cobras Nómina');
  });
});

describe('planReminders', () => {
  it('combina vencimientos, reglas y ajustes del miembro', () => {
    const planned = planReminders(
      [{ ruleId: rule.id, dueDate: '2026-11-01', overdue: false }],
      [rule],
      { remindersEnabled: true, reminderTime: '09:00' },
      new Date(2026, 9, 27, 8, 0),
    );
    expect(planned.map((p) => [p.reminder.date, p.title])).toEqual([
      ['2026-10-31', 'Mañana vence Alquiler'],
      ['2026-11-01', 'Hoy vence Alquiler'],
    ]);
  });

  it('nada si el miembro desactivó los avisos', () => {
    expect(
      planReminders(
        [{ ruleId: rule.id, dueDate: '2026-11-01', overdue: false }],
        [rule],
        { remindersEnabled: false, reminderTime: '09:00' },
        new Date(2026, 9, 27, 8, 0),
      ),
    ).toEqual([]);
  });
});
