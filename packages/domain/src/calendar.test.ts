import { describe, expect, it } from 'vitest';
import { isValidMonth, monthGrid, monthOf, monthRange, shiftMonth } from './calendar';

describe('isValidMonth', () => {
  it('acepta YYYY-MM y rechaza lo demás', () => {
    expect(isValidMonth('2026-11')).toBe(true);
    expect(isValidMonth('2026-01')).toBe(true);
    expect(isValidMonth('2026-13')).toBe(false);
    expect(isValidMonth('2026-00')).toBe(false);
    expect(isValidMonth('2026-1')).toBe(false);
    expect(isValidMonth('2026-11-01')).toBe(false);
    expect(isValidMonth('')).toBe(false);
  });
});

describe('monthRange y monthOf', () => {
  it('primer y último día del mes natural', () => {
    expect(monthRange('2026-11')).toEqual({ start: '2026-11-01', end: '2026-11-30' });
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(monthRange('2028-02')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });

  it('mes de una fecha', () => {
    expect(monthOf('2026-10-29')).toBe('2026-10');
    expect(monthOf('2027-01-01')).toBe('2027-01');
  });

  it('lanza con un mes no válido', () => {
    expect(() => monthRange('2026-13')).toThrow();
  });
});

describe('shiftMonth', () => {
  it('avanza y retrocede cruzando años', () => {
    expect(shiftMonth('2026-11', 1)).toBe('2026-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-10', 12)).toBe('2027-10');
    expect(shiftMonth('2026-10', -22)).toBe('2024-12');
    expect(shiftMonth('2026-10', 0)).toBe('2026-10');
  });
});

describe('monthGrid', () => {
  it('semanas de lunes a domingo con huecos fuera del mes', () => {
    // Noviembre de 2026 empieza en domingo: 6 filas.
    const grid = monthGrid('2026-11');
    expect(grid).toHaveLength(6);
    expect(grid[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(grid[1]![0]).toBe('2026-11-02');
    expect(grid[5]).toEqual(['2026-11-30', null, null, null, null, null, null]);
  });

  it('cada fila tiene 7 días y están todos los del mes, en orden', () => {
    for (const month of ['2026-01', '2026-02', '2026-10', '2028-02', '2027-12']) {
      const grid = monthGrid(month);
      expect(grid.every((week) => week.length === 7)).toBe(true);
      const days = grid.flat().filter((d): d is string => d !== null);
      const { start, end } = monthRange(month);
      expect(days[0]).toBe(start);
      expect(days.at(-1)).toBe(end);
      expect(new Set(days).size).toBe(days.length);
      expect([...days].sort()).toEqual(days);
    }
  });

  it('febrero no bisiesto que empieza en lunes ocupa 4 filas', () => {
    // 1 de febrero de 2027: lunes.
    const grid = monthGrid('2027-02');
    expect(grid).toHaveLength(4);
    expect(grid[0]![0]).toBe('2027-02-01');
    expect(grid[3]![6]).toBe('2027-02-28');
  });

  it('febrero bisiesto', () => {
    const days = monthGrid('2028-02').flat().filter(Boolean);
    expect(days).toHaveLength(29);
  });

  it('octubre de 2026 empieza en jueves: 5 filas', () => {
    const grid = monthGrid('2026-10');
    expect(grid).toHaveLength(5);
    expect(grid[0]).toEqual([
      null,
      null,
      null,
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
  });
});
