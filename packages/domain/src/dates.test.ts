import { describe, expect, it } from 'vitest';
import {
  addDays,
  civilDateIn,
  addMonths,
  compareDates,
  dayOfWeek,
  daysBetween,
  daysInMonth,
  formatDate,
  isLeapYear,
  isValidDate,
  parseDate,
  withDayClamped,
} from './dates';

describe('isValidDate', () => {
  it('acepta fechas de calendario reales', () => {
    expect(isValidDate('2026-10-27')).toBe(true);
    expect(isValidDate('2024-02-29')).toBe(true);
    expect(isValidDate('2026-12-31')).toBe(true);
  });

  it('rechaza fechas que no existen', () => {
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2026-04-31')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('2026-00-10')).toBe(false);
    expect(isValidDate('2026-01-00')).toBe(false);
  });

  it('rechaza otros formatos', () => {
    expect(isValidDate('2026-1-5')).toBe(false);
    expect(isValidDate('27/10/2026')).toBe(false);
    expect(isValidDate('2026-10-27T10:00:00Z')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });
});

describe('parseDate y formatDate', () => {
  it('ida y vuelta', () => {
    expect(parseDate('2026-03-09')).toEqual({ year: 2026, month: 3, day: 9 });
    expect(formatDate({ year: 2026, month: 3, day: 9 })).toBe('2026-03-09');
  });

  it('parseDate lanza con fechas inválidas', () => {
    expect(() => parseDate('2026-02-30')).toThrow();
  });
});

describe('isLeapYear y daysInMonth', () => {
  it('años bisiestos', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });

  it('días de cada mes', () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe('addDays', () => {
  it('suma y resta días cruzando meses y años', () => {
    expect(addDays('2026-10-27', 1)).toBe('2026-10-28');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2026-01-01', 365)).toBe('2027-01-01');
  });

  it('no se ve afectado por el cambio de hora', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });
});

describe('addMonths', () => {
  it('suma meses conservando el día', () => {
    expect(addMonths('2026-01-15', 1)).toBe('2026-02-15');
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
    expect(addMonths('2026-01-15', 12)).toBe('2027-01-15');
  });

  it('ajusta al último día cuando el mes es más corto', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-03-31', 1)).toBe('2026-04-30');
    expect(addMonths('2024-02-29', 12)).toBe('2025-02-28');
  });
});

describe('withDayClamped', () => {
  it('pone el día pedido o el último del mes', () => {
    expect(withDayClamped(2026, 2, 31)).toBe('2026-02-28');
    expect(withDayClamped(2024, 2, 30)).toBe('2024-02-29');
    expect(withDayClamped(2026, 4, 31)).toBe('2026-04-30');
    expect(withDayClamped(2026, 5, 15)).toBe('2026-05-15');
  });
});

describe('compareDates y daysBetween', () => {
  it('compara fechas', () => {
    expect(compareDates('2026-01-01', '2026-01-02')).toBeLessThan(0);
    expect(compareDates('2026-01-02', '2026-01-01')).toBeGreaterThan(0);
    expect(compareDates('2026-01-01', '2026-01-01')).toBe(0);
  });

  it('cuenta días entre fechas', () => {
    expect(daysBetween('2026-10-27', '2026-10-28')).toBe(1);
    expect(daysBetween('2026-10-28', '2026-10-27')).toBe(-1);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
    expect(daysBetween('2024-01-01', '2025-01-01')).toBe(366);
  });
});

describe('dayOfWeek', () => {
  it('0 es domingo y 6 sábado', () => {
    expect(dayOfWeek('2026-10-27')).toBe(2); // martes
    expect(dayOfWeek('2026-11-01')).toBe(0); // domingo
    expect(dayOfWeek('2000-01-01')).toBe(6); // sábado
  });
});

describe('civilDateIn', () => {
  it('da la fecha de calendario en la zona horaria indicada', () => {
    const instant = new Date('2026-10-31T23:30:00Z');
    expect(civilDateIn(instant, 'UTC')).toBe('2026-10-31');
    expect(civilDateIn(instant, 'Europe/Madrid')).toBe('2026-11-01');
    expect(civilDateIn(instant, 'Atlantic/Canary')).toBe('2026-10-31');
    expect(civilDateIn(instant, 'America/New_York')).toBe('2026-10-31');
  });

  it('un gasto a las 23:50 del último día cuenta en ese día', () => {
    expect(civilDateIn(new Date('2026-10-31T22:50:00Z'), 'Europe/Madrid')).toBe('2026-10-31');
  });
});
