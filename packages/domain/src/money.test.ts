import { describe, expect, it } from 'vitest';
import { MAX_CENTS, parseAmount, sumCents } from './money';

function cents(input: string): number {
  const result = parseAmount(input);
  if (!result.ok) throw new Error(`«${input}» debería ser válido: ${result.error}`);
  return result.value;
}

function error(input: string): string {
  const result = parseAmount(input);
  if (result.ok) throw new Error(`«${input}» debería ser inválido`);
  return result.error;
}

describe('parseAmount', () => {
  it('acepta enteros', () => {
    expect(cents('45')).toBe(4500);
    expect(cents('1')).toBe(100);
  });

  it('acepta coma decimal (formato español)', () => {
    expect(cents('45,30')).toBe(4530);
    expect(cents('45,3')).toBe(4530);
    expect(cents('0,01')).toBe(1);
    expect(cents('1234,56')).toBe(123456);
  });

  it('acepta punto decimal', () => {
    expect(cents('45.30')).toBe(4530);
    expect(cents('0.5')).toBe(50);
  });

  it('acepta separadores de miles', () => {
    expect(cents('1.234,56')).toBe(123456);
    expect(cents('1,234.56')).toBe(123456);
    expect(cents('1.800')).toBe(180000);
    expect(cents('250.000')).toBe(25000000);
    expect(cents('1.234.567,89')).toBe(123456789);
  });

  it('ignora espacios y el símbolo del euro', () => {
    expect(cents(' 45,30 € ')).toBe(4530);
    expect(cents('€45')).toBe(4500);
    expect(cents('1 234,56')).toBe(123456);
    // Espacio duro, como el que pone Intl.NumberFormat («45,30 €»).
    expect(cents('45,30 €')).toBe(4530);
  });

  it('no pierde precisión con importes que fallan en coma flotante', () => {
    expect(cents('0,29')).toBe(29);
    expect(cents('1,15')).toBe(115);
    expect(cents('4,35')).toBe(435);
  });

  it('acepta importes grandes hasta el máximo', () => {
    expect(cents('250.000,00')).toBe(25_000_000);
    expect(cents('99.999.999,99')).toBe(MAX_CENTS);
  });

  it('rechaza importes vacíos', () => {
    expect(error('')).toBe('empty');
    expect(error('   ')).toBe('empty');
    expect(error('€')).toBe('empty');
  });

  it('rechaza cero', () => {
    expect(error('0')).toBe('zero');
    expect(error('0,00')).toBe('zero');
  });

  it('rechaza negativos', () => {
    expect(error('-5')).toBe('negative');
    expect(error('-0,50')).toBe('negative');
  });

  it('rechaza más de dos decimales', () => {
    expect(error('1,234')).toBe('too_many_decimals');
    expect(error('0,001')).toBe('too_many_decimals');
    expect(error('1.234,567')).toBe('too_many_decimals');
  });

  it('rechaza importes por encima del máximo', () => {
    expect(error('100.000.000')).toBe('too_large');
  });

  it('rechaza texto que no es un importe', () => {
    expect(error('abc')).toBe('invalid');
    expect(error('12a')).toBe('invalid');
    expect(error('1,2,3')).toBe('invalid');
    expect(error('1..5')).toBe('invalid');
    expect(error('1.23.4')).toBe('invalid');
    expect(error(',5')).toBe('invalid');
    expect(error('5,')).toBe('invalid');
    expect(error('1e3')).toBe('invalid');
    expect(error('+5')).toBe('invalid');
  });
});

describe('sumCents', () => {
  it('suma céntimos', () => {
    expect(sumCents([180000, -123456])).toBe(56544);
    expect(sumCents([])).toBe(0);
  });

  it('rechaza valores que no son céntimos enteros', () => {
    expect(() => sumCents([1.5])).toThrow();
  });
});
