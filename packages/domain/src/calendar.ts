import { addDays, dayOfWeek, daysInMonth, parseDate, type DateString } from './dates';

/**
 * Calendario de pagos programados (especificación 002). Los meses son naturales, del 1 al
 * último día, como cadenas `YYYY-MM`.
 */
export type Month = string;

/** Hasta cuántos meses después del actual se puede navegar (aclaración de la spec 002). */
export const MAX_MONTHS_AHEAD = 12;

/** Estado de un vencimiento en el calendario (RF-103). */
export const CALENDAR_STATUSES = ['pending', 'overdue', 'paid', 'skipped'] as const;
export type CalendarStatus = (typeof CALENDAR_STATUSES)[number];

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

export function isValidMonth(value: string): value is Month {
  const match = MONTH_PATTERN.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

function parseMonth(month: Month): { year: number; month: number } {
  if (!isValidMonth(month)) throw new RangeError(`Mes no válido: «${month}»`);
  const [year, value] = month.split('-').map(Number) as [number, number];
  return { year, month: value };
}

function formatMonth(year: number, month: number): Month {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

/** Primer y último día del mes. */
export function monthRange(month: Month): { start: DateString; end: DateString } {
  const { year, month: value } = parseMonth(month);
  const start = `${month}-01`;
  return { start, end: `${month}-${String(daysInMonth(year, value)).padStart(2, '0')}` };
}

/** Mes natural al que pertenece una fecha. */
export function monthOf(date: DateString): Month {
  const { year, month } = parseDate(date);
  return formatMonth(year, month);
}

/** El mes `n` meses después (o antes, si es negativo). */
export function shiftMonth(month: Month, n: number): Month {
  const { year, month: value } = parseMonth(month);
  const index = year * 12 + (value - 1) + n;
  return formatMonth(Math.floor(index / 12), (index % 12) + 1);
}

/**
 * Semanas del mes, de lunes a domingo (RF-102). Los huecos antes del día 1 y después del
 * último son `null`. Tiene entre 4 y 6 filas.
 */
export function monthGrid(month: Month): (DateString | null)[][] {
  const { start, end } = monthRange(month);
  // dayOfWeek: 0 = domingo; aquí la semana empieza en lunes.
  const leading = (dayOfWeek(start) + 6) % 7;
  const cells: (DateString | null)[] = Array.from({ length: leading }, () => null);
  for (let day = start; day <= end; day = addDays(day, 1)) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (DateString | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
