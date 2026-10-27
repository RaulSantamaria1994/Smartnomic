import { describe, expect, it } from 'vitest';
import { remindersToSchedule, type ReminderOccurrence } from './reminders';

const occurrence = (
  ruleId: string,
  dueDate: string,
  remindDaysBefore: number,
  overdue = false,
): ReminderOccurrence => ({ ruleId, dueDate, remindDaysBefore, overdue });

const on = { enabled: true, time: '09:00' };
// Martes 27 de octubre de 2026, 08:00 en el móvil.
const now = { date: '2026-10-27', time: '08:00' };

describe('remindersToSchedule', () => {
  it('un aviso con la antelación elegida y otro el mismo día', () => {
    expect(remindersToSchedule([occurrence('alquiler', '2026-11-01', 1)], on, now)).toEqual([
      {
        id: 'alquiler|2026-11-01|before',
        ruleId: 'alquiler',
        dueDate: '2026-11-01',
        date: '2026-10-31',
        time: '09:00',
        daysBefore: 1,
      },
      {
        id: 'alquiler|2026-11-01|due',
        ruleId: 'alquiler',
        dueDate: '2026-11-01',
        date: '2026-11-01',
        time: '09:00',
        daysBefore: 0,
      },
    ]);
  });

  it('con antelación 3 y 7 días', () => {
    const three = remindersToSchedule([occurrence('a', '2026-11-10', 3)], on, now);
    const seven = remindersToSchedule([occurrence('a', '2026-11-10', 7)], on, now);
    expect(three.map((r) => r.date)).toEqual(['2026-11-07', '2026-11-10']);
    expect(seven.map((r) => r.date)).toEqual(['2026-11-03', '2026-11-10']);
  });

  it('con antelación 0, solo el aviso del mismo día', () => {
    expect(remindersToSchedule([occurrence('a', '2026-11-10', 0)], on, now)).toEqual([
      {
        id: 'a|2026-11-10|due',
        ruleId: 'a',
        dueDate: '2026-11-10',
        date: '2026-11-10',
        time: '09:00',
        daysBefore: 0,
      },
    ]);
  });

  it('usa la hora configurada', () => {
    const reminders = remindersToSchedule(
      [occurrence('a', '2026-11-10', 1)],
      { enabled: true, time: '20:30' },
      now,
    );
    expect(reminders.every((r) => r.time === '20:30')).toBe(true);
  });

  it('no programa avisos que ya han pasado', () => {
    // Vence mañana con aviso de 1 día: el aviso de hoy a las 09:00 aún no ha pasado.
    expect(
      remindersToSchedule([occurrence('a', '2026-10-28', 1)], on, now).map((r) => r.date),
    ).toEqual(['2026-10-27', '2026-10-28']);
    // A las 10:00 ya pasó el de hoy.
    expect(
      remindersToSchedule([occurrence('a', '2026-10-28', 1)], on, {
        date: '2026-10-27',
        time: '10:00',
      }).map((r) => r.date),
    ).toEqual(['2026-10-28']);
    // Vence en 2 días con aviso de 7: el de antelación ya pasó.
    expect(
      remindersToSchedule([occurrence('a', '2026-10-29', 7)], on, now).map((r) => r.date),
    ).toEqual(['2026-10-29']);
  });

  it('no avisa de los atrasados', () => {
    expect(remindersToSchedule([occurrence('a', '2026-10-15', 1, true)], on, now)).toEqual([]);
  });

  it('con los avisos desactivados no programa nada', () => {
    expect(
      remindersToSchedule(
        [occurrence('a', '2026-11-01', 1)],
        { enabled: false, time: '09:00' },
        now,
      ),
    ).toEqual([]);
  });

  it('el día del cambio de hora el aviso sigue a la hora local configurada', () => {
    const reminders = remindersToSchedule([occurrence('a', '2027-03-28', 0)], on, now);
    expect(reminders).toEqual([
      {
        id: 'a|2027-03-28|due',
        ruleId: 'a',
        dueDate: '2027-03-28',
        date: '2027-03-28',
        time: '09:00',
        daysBefore: 0,
      },
    ]);
  });

  it('ordena por fecha y no pasa del tope', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      occurrence(
        `r${String(i).padStart(2, '0')}`,
        `2026-11-${String((i % 28) + 1).padStart(2, '0')}`,
        1,
      ),
    );
    const reminders = remindersToSchedule(many, on, now, 50);
    expect(reminders).toHaveLength(50);
    const keys = reminders.map((r) => `${r.date} ${r.time} ${r.id}`);
    expect(keys).toEqual([...keys].sort());
  });

  it('rechaza horas no válidas', () => {
    expect(() => remindersToSchedule([], { enabled: true, time: '9:00' }, now)).toThrow();
    expect(() => remindersToSchedule([], { enabled: true, time: '24:00' }, now)).toThrow();
  });
});
