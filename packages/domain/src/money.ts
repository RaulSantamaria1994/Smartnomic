import { err, ok, type Result } from './result';

/**
 * Importe en céntimos de euro, siempre entero (constitución, art. III.1). Nunca se opera
 * con decimales en coma flotante.
 */
export type Cents = number;

/** Importe máximo de un movimiento: 99.999.999,99 €. */
export const MAX_CENTS: Cents = 9_999_999_999;

export type AmountError =
  'empty' | 'invalid' | 'zero' | 'negative' | 'too_many_decimals' | 'too_large';

export function isCents(value: unknown): value is Cents {
  return Number.isSafeInteger(value);
}

/** Suma importes en céntimos. Lanza si alguno no es un entero. */
export function sumCents(values: readonly Cents[]): Cents {
  let total = 0;
  for (const value of values) {
    if (!isCents(value)) throw new TypeError(`No es un importe en céntimos: ${value}`);
    total += value;
  }
  return total;
}

/**
 * Convierte lo que escribe el usuario en céntimos. Acepta coma o punto decimal y
 * separadores de miles («1.234,56», «1,234.56», «1.800», «45,3», «45 €»). Con un solo
 * separador, la coma es decimal; el punto también, salvo que agrupe miles («1.800»).
 */
export function parseAmount(input: string): Result<Cents, AmountError> {
  const text = input.replace(/[\s€]/g, '');
  if (text === '') return err('empty');

  if (text.startsWith('-')) {
    const rest = parseUnsigned(text.slice(1));
    return rest.ok || rest.error === 'zero' ? err('negative') : rest;
  }
  return parseUnsigned(text);
}

function parseUnsigned(text: string): Result<Cents, AmountError> {
  if (!/^[0-9.,]+$/.test(text)) return err('invalid');

  const split = splitNumber(text);
  if (!split) return err('invalid');
  const { integer, decimals } = split;

  if (decimals.length > 2) return err('too_many_decimals');
  // Más de 8 cifras enteras ya supera el máximo; así no se pierde precisión al convertir.
  if (integer.replace(/^0+/, '').length > 8) return err('too_large');

  const cents = Number(integer) * 100 + Number(decimals.padEnd(2, '0'));
  if (cents === 0) return err('zero');
  if (cents > MAX_CENTS) return err('too_large');
  return ok(cents);
}

/** Separa la parte entera (sin separadores de miles) y los decimales. */
function splitNumber(text: string): { integer: string; decimals: string } | null {
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  const commas = count(text, ',');
  const dots = count(text, '.');

  let decimalSeparator: ',' | '.' | null;
  if (commas > 0 && dots > 0) {
    decimalSeparator = lastComma > lastDot ? ',' : '.';
  } else if (commas === 1) {
    decimalSeparator = ',';
  } else if (dots === 1) {
    decimalSeparator = isThousands(text, '.') ? null : '.';
  } else {
    decimalSeparator = null;
  }

  let integerPart = text;
  let decimals = '';
  if (decimalSeparator) {
    const index = text.lastIndexOf(decimalSeparator);
    integerPart = text.slice(0, index);
    decimals = text.slice(index + 1);
    if (decimals === '' || !/^\d+$/.test(decimals)) return null;
  }

  if (integerPart === '') return null;
  if (/^\d+$/.test(integerPart)) return { integer: integerPart, decimals };

  const thousands = integerPart.includes(',') ? ',' : '.';
  if (!isThousands(integerPart, thousands)) return null;
  return { integer: integerPart.split(thousands).join(''), decimals };
}

/** «1.234.567» o «1,234»: grupos de tres cifras, sin empezar por cero. */
function isThousands(text: string, separator: ',' | '.'): boolean {
  const group = separator === '.' ? '\\.' : ',';
  return new RegExp(`^[1-9]\\d{0,2}(${group}\\d{3})+$`).test(text);
}

function count(text: string, char: string): number {
  return text.split(char).length - 1;
}
