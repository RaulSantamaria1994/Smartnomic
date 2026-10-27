import {
  addDays,
  compareDates,
  dayOfWeek,
  daysBetween,
  parseDate,
  withDayClamped,
  type DateString,
} from './dates';

export const FREQUENCIES = ['weekly', 'monthly', 'yearly'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

/** Cada cuánto se repite un pago o un cobro (especificación 001, RF-022). */
export interface RecurrenceRule {
  frequency: Frequency;
  /** Cada cuántas semanas, meses o años (1 = todos). */
  interval: number;
  /** Mensual y anual: día del mes (1–31). Si el mes es más corto, el último día (RF-026). */
  dayOfMonth?: number | null;
  /** Anual: mes (1–12). */
  monthOfYear?: number | null;
  /** Semanal: día de la semana (0 = domingo … 6 = sábado). */
  weekday?: number | null;
  /** Primer día en que puede haber un vencimiento. */
  startDate: DateString;
  /** Último día en que puede haber un vencimiento (incluido). */
  endDate?: DateString | null;
}

export const MAX_INTERVAL = 12;

function inRange(value: number | null | undefined, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

export function assertValidRule(rule: RecurrenceRule): void {
  if (!inRange(rule.interval, 1, MAX_INTERVAL)) throw new RangeError('Intervalo no válido');
  if (rule.frequency === 'weekly' && !inRange(rule.weekday, 0, 6)) {
    throw new RangeError('Día de la semana no válido');
  }
  if (rule.frequency !== 'weekly' && !inRange(rule.dayOfMonth, 1, 31)) {
    throw new RangeError('Día del mes no válido');
  }
  if (rule.frequency === 'yearly' && !inRange(rule.monthOfYear, 1, 12)) {
    throw new RangeError('Mes no válido');
  }
  parseDate(rule.startDate);
  if (rule.endDate && compareDates(rule.endDate, rule.startDate) < 0) {
    throw new RangeError('La fecha de fin es anterior a la de inicio');
  }
}

/** Primer vencimiento de la regla (en su fecha de inicio o después). */
function firstOccurrence(rule: RecurrenceRule): DateString {
  const { year, month } = parseDate(rule.startDate);
  if (rule.frequency === 'weekly') {
    const shift = (rule.weekday! - dayOfWeek(rule.startDate) + 7) % 7;
    return addDays(rule.startDate, shift);
  }
  if (rule.frequency === 'monthly') {
    const thisMonth = withDayClamped(year, month, rule.dayOfMonth!);
    if (compareDates(thisMonth, rule.startDate) >= 0) return thisMonth;
    const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
    return withDayClamped(next.year, next.month, rule.dayOfMonth!);
  }
  const thisYear = withDayClamped(year, rule.monthOfYear!, rule.dayOfMonth!);
  return compareDates(thisYear, rule.startDate) >= 0
    ? thisYear
    : withDayClamped(year + 1, rule.monthOfYear!, rule.dayOfMonth!);
}

/** Vencimiento número `k` (0 = el primero), contando desde el primero. */
function occurrenceAt(rule: RecurrenceRule, first: DateString, k: number): DateString {
  if (rule.frequency === 'weekly') return addDays(first, k * 7 * rule.interval);
  const { year, month } = parseDate(first);
  if (rule.frequency === 'yearly') {
    return withDayClamped(year + k * rule.interval, rule.monthOfYear!, rule.dayOfMonth!);
  }
  const index = year * 12 + (month - 1) + k * rule.interval;
  return withDayClamped(Math.floor(index / 12), (index % 12) + 1, rule.dayOfMonth!);
}

/** Primer índice cuyo vencimiento puede ser >= `from`, sin recorrer desde el principio. */
function firstIndexFrom(rule: RecurrenceRule, first: DateString, from: DateString): number {
  if (compareDates(from, first) <= 0) return 0;
  if (rule.frequency === 'weekly') {
    return Math.floor(daysBetween(first, from) / (7 * rule.interval));
  }
  const a = parseDate(first);
  const b = parseDate(from);
  const months = (b.year - a.year) * 12 + (b.month - a.month);
  const step = rule.frequency === 'yearly' ? 12 * rule.interval : rule.interval;
  // Uno menos para no saltarse un vencimiento ajustado a fin de mes.
  return Math.max(0, Math.floor(months / step) - 1);
}

/** Fechas de vencimiento entre `from` y `to` (ambas incluidas), en orden. */
export function occurrencesBetween(
  rule: RecurrenceRule,
  from: DateString,
  to: DateString,
): DateString[] {
  assertValidRule(rule);
  const first = firstOccurrence(rule);
  const result: DateString[] = [];
  for (let k = firstIndexFrom(rule, first, from); ; k += 1) {
    const date = occurrenceAt(rule, first, k);
    if (compareDates(date, to) > 0) break;
    if (rule.endDate && compareDates(date, rule.endDate) > 0) break;
    if (compareDates(date, from) >= 0) result.push(date);
  }
  return result;
}

/** Siguiente vencimiento en `from` o después, o `null` si la regla ya terminó. */
export function nextOccurrence(rule: RecurrenceRule, from: DateString): DateString | null {
  const horizon = addDays(from, 366 * rule.interval + 7);
  return occurrencesBetween(rule, from, horizon)[0] ?? null;
}

/** ¿Hay un vencimiento de la regla en esa fecha? */
export function isOccurrence(rule: RecurrenceRule, date: DateString): boolean {
  return occurrencesBetween(rule, date, date).length > 0;
}
