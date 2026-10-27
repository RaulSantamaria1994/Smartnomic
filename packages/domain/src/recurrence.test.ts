import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { nextOccurrence, occurrencesBetween, type RecurrenceRule } from './recurrence';

const monthly = (dayOfMonth: number, extra: Partial<RecurrenceRule> = {}): RecurrenceRule => ({
  frequency: 'monthly',
  interval: 1,
  dayOfMonth,
  startDate: '2026-01-01',
  endDate: null,
  ...extra,
});

describe('occurrencesBetween — mensual', () => {
  it('el día 1 de cada mes', () => {
    expect(occurrencesBetween(monthly(1), '2026-10-01', '2027-01-31')).toEqual([
      '2026-10-01',
      '2026-11-01',
      '2026-12-01',
      '2027-01-01',
    ]);
  });

  it('el día 31 cae el último día en los meses cortos', () => {
    expect(occurrencesBetween(monthly(31), '2026-01-01', '2026-05-31')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
    expect(
      occurrencesBetween(monthly(30, { startDate: '2024-01-01' }), '2024-02-01', '2024-02-29'),
    ).toEqual(['2024-02-29']);
  });

  it('no empieza antes de la fecha de inicio', () => {
    const rule = monthly(1, { startDate: '2026-10-27' });
    expect(occurrencesBetween(rule, '2026-10-01', '2026-12-31')).toEqual([
      '2026-11-01',
      '2026-12-01',
    ]);
  });

  it('respeta la fecha de fin', () => {
    const rule = monthly(15, { endDate: '2026-03-15' });
    expect(occurrencesBetween(rule, '2026-01-01', '2026-12-31')).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
    ]);
  });

  it('cada 3 meses, contando desde el primer vencimiento', () => {
    const rule = monthly(1, { interval: 3, startDate: '2026-10-27' });
    expect(occurrencesBetween(rule, '2026-10-01', '2027-08-31')).toEqual([
      '2026-11-01',
      '2027-02-01',
      '2027-05-01',
      '2027-08-01',
    ]);
  });

  it('una ventana sin vencimientos devuelve una lista vacía', () => {
    expect(occurrencesBetween(monthly(15), '2026-10-16', '2026-11-14')).toEqual([]);
    expect(occurrencesBetween(monthly(15), '2025-01-01', '2025-12-31')).toEqual([]);
  });
});

describe('occurrencesBetween — anual', () => {
  it('una vez al año en el mismo día', () => {
    const rule: RecurrenceRule = {
      frequency: 'yearly',
      interval: 1,
      dayOfMonth: 15,
      monthOfYear: 3,
      startDate: '2026-01-01',
      endDate: null,
    };
    expect(occurrencesBetween(rule, '2026-01-01', '2028-12-31')).toEqual([
      '2026-03-15',
      '2027-03-15',
      '2028-03-15',
    ]);
  });

  it('el 29 de febrero cae el 28 en los años no bisiestos', () => {
    const rule: RecurrenceRule = {
      frequency: 'yearly',
      interval: 1,
      dayOfMonth: 29,
      monthOfYear: 2,
      startDate: '2024-01-01',
      endDate: null,
    };
    expect(occurrencesBetween(rule, '2024-01-01', '2028-12-31')).toEqual([
      '2024-02-29',
      '2025-02-28',
      '2026-02-28',
      '2027-02-28',
      '2028-02-29',
    ]);
  });

  it('si este año ya pasó, empieza el siguiente', () => {
    const rule: RecurrenceRule = {
      frequency: 'yearly',
      interval: 2,
      dayOfMonth: 15,
      monthOfYear: 3,
      startDate: '2026-10-27',
      endDate: null,
    };
    expect(occurrencesBetween(rule, '2026-01-01', '2031-12-31')).toEqual([
      '2027-03-15',
      '2029-03-15',
      '2031-03-15',
    ]);
  });
});

describe('occurrencesBetween — semanal', () => {
  it('cada semana el mismo día', () => {
    // 2026-10-27 es martes (2); el primer viernes (5) es el 30.
    const rule: RecurrenceRule = {
      frequency: 'weekly',
      interval: 1,
      weekday: 5,
      startDate: '2026-10-27',
      endDate: null,
    };
    expect(occurrencesBetween(rule, '2026-10-01', '2026-11-20')).toEqual([
      '2026-10-30',
      '2026-11-06',
      '2026-11-13',
      '2026-11-20',
    ]);
  });

  it('cada dos semanas', () => {
    const rule: RecurrenceRule = {
      frequency: 'weekly',
      interval: 2,
      weekday: 2,
      startDate: '2026-10-27',
      endDate: null,
    };
    expect(occurrencesBetween(rule, '2026-10-27', '2026-12-31')).toEqual([
      '2026-10-27',
      '2026-11-10',
      '2026-11-24',
      '2026-12-08',
      '2026-12-22',
    ]);
  });

  it('una regla antigua no se salta vencimientos en ventanas lejanas', () => {
    const rule: RecurrenceRule = {
      frequency: 'weekly',
      interval: 1,
      weekday: 1,
      startDate: '2000-01-03',
      endDate: null,
    };
    expect(occurrencesBetween(rule, '2026-10-26', '2026-11-09')).toEqual([
      '2026-10-26',
      '2026-11-02',
      '2026-11-09',
    ]);
  });
});

describe('nextOccurrence', () => {
  it('el siguiente vencimiento a partir de una fecha (incluida)', () => {
    expect(nextOccurrence(monthly(1), '2026-10-27')).toBe('2026-11-01');
    expect(nextOccurrence(monthly(27), '2026-10-27')).toBe('2026-10-27');
  });

  it('null si la regla ya terminó', () => {
    expect(nextOccurrence(monthly(1, { endDate: '2026-06-01' }), '2026-10-27')).toBeNull();
  });
});

describe('reglas no válidas', () => {
  it('rechaza intervalos y días fuera de rango', () => {
    expect(() => occurrencesBetween(monthly(32), '2026-01-01', '2026-02-01')).toThrow();
    expect(() =>
      occurrencesBetween(monthly(1, { interval: 0 }), '2026-01-01', '2026-02-01'),
    ).toThrow();
    expect(() =>
      occurrencesBetween(
        { frequency: 'weekly', interval: 1, weekday: 7, startDate: '2026-01-01', endDate: null },
        '2026-01-01',
        '2026-02-01',
      ),
    ).toThrow();
  });
});

describe('ventanas', () => {
  it('cualquier ventana da los mismos vencimientos que la lista completa', () => {
    const rules: RecurrenceRule[] = [
      { frequency: 'monthly', interval: 1, dayOfMonth: 31, startDate: '2024-01-15', endDate: null },
      { frequency: 'monthly', interval: 5, dayOfMonth: 29, startDate: '2024-03-30', endDate: null },
      {
        frequency: 'yearly',
        interval: 1,
        dayOfMonth: 29,
        monthOfYear: 2,
        startDate: '2024-03-01',
        endDate: null,
      },
      { frequency: 'weekly', interval: 3, weekday: 0, startDate: '2024-01-01', endDate: null },
    ];
    for (const rule of rules) {
      const all = occurrencesBetween(rule, '2024-01-01', '2030-12-31');
      for (let offset = 0; offset < 2400; offset += 37) {
        const from = addDays('2024-01-01', offset);
        const to = addDays(from, 45);
        expect(occurrencesBetween(rule, from, to)).toEqual(all.filter((d) => d >= from && d <= to));
      }
    }
  });
});
