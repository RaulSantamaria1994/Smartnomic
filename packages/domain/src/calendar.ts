import { addDays, compareDates, dayOfWeek, daysInMonth, parseDate, type DateString } from './dates';
import { occurrencesBetween, type RecurrenceRule } from './recurrence';
import type { TransactionKind } from './summary';

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

/** Pago o cobro recurrente tal como lo necesita el calendario. */
export interface CalendarRule extends RecurrenceRule {
  id: string;
  kind: TransactionKind;
  /** Importe previsto. */
  amountCents: number;
  active: boolean;
}

/** Vencimiento ya pagado u omitido. */
export interface ResolvedForCalendar {
  ruleId: string;
  dueDate: DateString;
  status: 'paid' | 'skipped';
  /** Importe del movimiento creado al pagarlo; `null` si se omitió o se borró. */
  amountCents: number | null;
}

export interface CalendarEntry {
  ruleId: string;
  dueDate: DateString;
  status: CalendarStatus;
  kind: TransactionKind;
  /** Real si está pagado (y su movimiento sigue ahí); previsto en los demás casos. */
  amountCents: number;
}

/**
 * Vencimientos de un mes con su estado (RF-103). Los pendientes salen de
 * `occurrencesBetween`, igual que en «Próximos pagos» y en los recordatorios (CE-102); de
 * las reglas desactivadas solo se ven los resueltos. Un resuelto se muestra en su fecha
 * aunque la regla se haya editado después.
 */
export function calendarMonth(
  rules: readonly CalendarRule[],
  resolved: readonly ResolvedForCalendar[],
  month: Month,
  today: DateString,
): CalendarEntry[] {
  const { start, end } = monthRange(month);
  const byId = new Map(rules.map((rule) => [rule.id, rule]));
  const order = new Map(rules.map((rule, index) => [rule.id, index]));
  const key = (ruleId: string, dueDate: DateString) => `${ruleId}|${dueDate}`;
  const done = new Map<string, ResolvedForCalendar>();
  for (const item of resolved) {
    if (
      byId.has(item.ruleId) &&
      compareDates(item.dueDate, start) >= 0 &&
      compareDates(item.dueDate, end) <= 0
    ) {
      done.set(key(item.ruleId, item.dueDate), item);
    }
  }

  const entries: CalendarEntry[] = [];
  for (const item of done.values()) {
    const rule = byId.get(item.ruleId)!;
    entries.push({
      ruleId: item.ruleId,
      dueDate: item.dueDate,
      status: item.status,
      kind: rule.kind,
      amountCents:
        item.status === 'paid' && item.amountCents !== null ? item.amountCents : rule.amountCents,
    });
  }
  for (const rule of rules) {
    if (!rule.active) continue;
    for (const dueDate of occurrencesBetween(rule, start, end)) {
      if (done.has(key(rule.id, dueDate))) continue;
      entries.push({
        ruleId: rule.id,
        dueDate,
        status: compareDates(dueDate, today) < 0 ? 'overdue' : 'pending',
        kind: rule.kind,
        amountCents: rule.amountCents,
      });
    }
  }
  return entries.sort(
    (a, b) => compareDates(a.dueDate, b.dueDate) || order.get(a.ruleId)! - order.get(b.ruleId)!,
  );
}

/**
 * Totales del mes (RF-106): previsto de pagos y de cobros (con el importe real de los
 * pagados y sin los omitidos) y lo que queda por pagar.
 */
export function calendarTotals(entries: readonly CalendarEntry[]): {
  expenseCents: number;
  incomeCents: number;
  pendingExpenseCents: number;
} {
  let expenseCents = 0;
  let incomeCents = 0;
  let pendingExpenseCents = 0;
  for (const entry of entries) {
    if (entry.status === 'skipped') continue;
    if (entry.kind === 'income') {
      incomeCents += entry.amountCents;
      continue;
    }
    expenseCents += entry.amountCents;
    if (entry.status !== 'paid') pendingExpenseCents += entry.amountCents;
  }
  return { expenseCents, incomeCents, pendingExpenseCents };
}

/**
 * Meses que se pueden ver (RF-105): desde el de inicio del pago más antiguo (o el actual,
 * si es anterior) hasta `MAX_MONTHS_AHEAD` meses después del actual.
 */
export function calendarBounds(
  rules: readonly Pick<RecurrenceRule, 'startDate'>[],
  today: DateString,
): { min: Month; max: Month } {
  const current = monthOf(today);
  const earliest = rules.reduce<Month>((min, rule) => {
    const month = monthOf(rule.startDate);
    return month < min ? month : min;
  }, current);
  return { min: earliest, max: shiftMonth(current, MAX_MONTHS_AHEAD) };
}
