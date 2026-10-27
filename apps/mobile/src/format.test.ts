import { describe, expect, it } from 'vitest';
import {
  formatAmountInput,
  formatDay,
  formatMoney,
  formatPeriod,
  formatShortDate,
  formatSignedMoney,
  parseShortDate,
} from './format';

// El importe y el símbolo van separados por un espacio duro.
const nbsp = (text: string) => text.replace(/\u00a0/g, ' ');

describe('formatMoney', () => {
  it('formatea céntimos en euros con el formato español', () => {
    expect(nbsp(formatMoney(123456))).toBe('1.234,56 €');
    expect(nbsp(formatMoney(4530))).toBe('45,30 €');
    expect(nbsp(formatMoney(999_999_999_99))).toBe('999.999.999,99 €');
    expect(nbsp(formatMoney(25_000_000))).toBe('250.000,00 €');
    expect(nbsp(formatMoney(0))).toBe('0,00 €');
    expect(nbsp(formatMoney(-56544))).toBe('-565,44 €');
  });

  it('añade el signo según el tipo', () => {
    expect(nbsp(formatSignedMoney(180000, 'income'))).toBe('+1.800,00 €');
    expect(nbsp(formatSignedMoney(4530, 'expense'))).toBe('−45,30 €');
  });
});

describe('formatAmountInput', () => {
  it('da el importe con coma decimal y dos decimales', () => {
    expect(formatAmountInput(4530)).toBe('45,30');
    expect(formatAmountInput(5)).toBe('0,05');
    expect(formatAmountInput(180000)).toBe('1800,00');
  });
});

describe('fechas', () => {
  it('formatea el día', () => {
    expect(formatDay('2026-10-27')).toBe('martes, 27 de octubre');
    expect(formatShortDate('2026-03-09')).toBe('09/03/2026');
  });

  it('lee fechas escritas por el usuario', () => {
    expect(parseShortDate('27/10/2026')).toBe('2026-10-27');
    expect(parseShortDate('9/3/26')).toBe('2026-03-09');
    expect(parseShortDate('29-02-2024')).toBe('2024-02-29');
    expect(parseShortDate('29/02/2026')).toBeNull();
    expect(parseShortDate('mañana')).toBeNull();
  });
});

describe('formatPeriod', () => {
  it('con inicio el día 1, el nombre del mes', () => {
    expect(formatPeriod({ start: '2026-10-01', end: '2026-10-31' }, 1)).toBe('Octubre de 2026');
  });

  it('con otro día de inicio, las dos fechas', () => {
    expect(formatPeriod({ start: '2026-10-25', end: '2026-11-24' }, 25)).toBe('25 oct – 24 nov');
  });
});
