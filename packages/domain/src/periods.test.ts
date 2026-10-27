import { describe, expect, it } from 'vitest';
import { isPeriodStart, periodOf, shiftPeriod } from './periods';

describe('periodOf', () => {
  it('con inicio el día 1, el periodo es el mes natural', () => {
    expect(periodOf('2026-10-27', 1)).toEqual({ start: '2026-10-01', end: '2026-10-31' });
    expect(periodOf('2026-10-01', 1)).toEqual({ start: '2026-10-01', end: '2026-10-31' });
    expect(periodOf('2026-02-14', 1)).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(periodOf('2024-02-29', 1)).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });

  it('con inicio el día 25, va del 25 al 24 del mes siguiente', () => {
    expect(periodOf('2026-10-26', 25)).toEqual({ start: '2026-10-25', end: '2026-11-24' });
    expect(periodOf('2026-10-25', 25)).toEqual({ start: '2026-10-25', end: '2026-11-24' });
    expect(periodOf('2026-10-24', 25)).toEqual({ start: '2026-09-25', end: '2026-10-24' });
  });

  it('cruza el cambio de año', () => {
    expect(periodOf('2027-01-10', 25)).toEqual({ start: '2026-12-25', end: '2027-01-24' });
    expect(periodOf('2026-12-31', 25)).toEqual({ start: '2026-12-25', end: '2027-01-24' });
    expect(periodOf('2026-12-31', 1)).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });

  it('con inicio el 28, febrero no deja huecos ni solapes', () => {
    expect(periodOf('2026-02-27', 28)).toEqual({ start: '2026-01-28', end: '2026-02-27' });
    expect(periodOf('2026-02-28', 28)).toEqual({ start: '2026-02-28', end: '2026-03-27' });
    expect(periodOf('2026-03-27', 28)).toEqual({ start: '2026-02-28', end: '2026-03-27' });
  });

  it('rechaza días de inicio fuera de 1–28', () => {
    expect(() => periodOf('2026-10-27', 0)).toThrow();
    expect(() => periodOf('2026-10-27', 29)).toThrow();
    expect(() => periodOf('2026-10-27', 1.5)).toThrow();
  });
});

describe('shiftPeriod', () => {
  it('pasa al periodo anterior y al siguiente', () => {
    const october = periodOf('2026-10-27', 1);
    expect(shiftPeriod(october, -1, 1)).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(shiftPeriod(october, 1, 1)).toEqual({ start: '2026-11-01', end: '2026-11-30' });
    expect(shiftPeriod(october, 0, 1)).toEqual(october);
  });

  it('salta varios periodos y cruza años', () => {
    const current = periodOf('2026-10-26', 25);
    expect(shiftPeriod(current, 3, 25)).toEqual({ start: '2027-01-25', end: '2027-02-24' });
    expect(shiftPeriod(current, -10, 25)).toEqual({ start: '2025-12-25', end: '2026-01-24' });
  });

  it('los periodos consecutivos son contiguos', () => {
    let period = periodOf('2026-01-15', 28);
    for (let i = 0; i < 24; i += 1) {
      const next = shiftPeriod(period, 1, 28);
      const [y, m, d] = period.end.split('-').map(Number) as [number, number, number];
      const dayAfter = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
      expect(next.start).toBe(dayAfter);
      period = next;
    }
  });
});

describe('isPeriodStart', () => {
  it('solo el día de inicio abre un periodo', () => {
    expect(isPeriodStart('2026-10-25', 25)).toBe(true);
    expect(isPeriodStart('2026-10-26', 25)).toBe(false);
    expect(isPeriodStart('2026-10-01', 1)).toBe(true);
    expect(isPeriodStart('2026-02-30', 1)).toBe(false);
  });
});
