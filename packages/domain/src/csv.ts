import type { DateString } from './dates';
import type { Cents } from './money';
import type { TransactionKind } from './summary';

/**
 * Archivo CSV de movimientos para Excel en español (especificación 010): punto y coma entre
 * columnas, coma decimal, fechas dd/mm/aaaa y BOM para que reconozca los acentos.
 */

/** Un movimiento ya resuelto: nombres de categoría y de quien lo apuntó en lugar de ids. */
export interface CsvRow {
  date: DateString;
  kind: TransactionKind;
  category: string;
  amountCents: Cents;
  note: string | null;
  author: string;
}

/** Textos de la interfaz que van en el archivo (el dominio no tiene cadenas de la app). */
export interface CsvLabels {
  headers: readonly [string, string, string, string, string, string];
  expense: string;
  income: string;
}

const BOM = '﻿';
const SEPARATOR = ';';
const NEWLINE = '\r\n';

/** «-45,30» o «1800,00»: con signo, coma decimal y sin miles, con aritmética entera. */
export function csvAmount(amountCents: Cents, kind: TransactionKind): string {
  const units = Math.floor(amountCents / 100);
  const cents = String(amountCents % 100).padStart(2, '0');
  return `${kind === 'expense' ? '-' : ''}${units},${cents}`;
}

/** Lo que Excel tomaría como el principio de una fórmula (OWASP, inyección en CSV). */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Un texto escrito por una persona como campo: con apóstrofo delante si empieza como una
 * fórmula, y entre comillas (con las suyas duplicadas) si lleva separador, comillas o saltos.
 */
export function csvField(text: string): string {
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function csvDate(date: DateString): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

/** El archivo entero: BOM, títulos y una fila por movimiento, en el orden recibido. */
export function csvFile(rows: readonly CsvRow[], labels: CsvLabels): string {
  const lines = [labels.headers.map(csvField).join(SEPARATOR)];
  for (const row of rows) {
    lines.push(
      [
        csvDate(row.date),
        csvField(row.kind === 'expense' ? labels.expense : labels.income),
        csvField(row.category),
        // El importe es un número que escribe la app: sin apóstrofo, aunque empiece por «-».
        csvAmount(row.amountCents, row.kind),
        csvField(row.note ?? ''),
        csvField(row.author),
      ].join(SEPARATOR),
    );
  }
  return BOM + lines.join(NEWLINE) + NEWLINE;
}
