import {
  addDays,
  addMonths,
  isValidDate,
  parseDate,
  withDayClamped,
  type DateString,
} from './dates';

/**
 * El "mes" de un hogar: del día de inicio (`monthStartDay`, 1–28) hasta el día anterior
 * del mes siguiente. Con inicio el día 25, el periodo de octubre va del 25 de octubre al
 * 24 de noviembre. Se calcula, no se guarda (especificación 001).
 */
export interface Period {
  start: DateString;
  /** Último día incluido. */
  end: DateString;
}

export const MIN_MONTH_START_DAY = 1;
export const MAX_MONTH_START_DAY = 28;

function assertMonthStartDay(monthStartDay: number): void {
  if (
    !Number.isInteger(monthStartDay) ||
    monthStartDay < MIN_MONTH_START_DAY ||
    monthStartDay > MAX_MONTH_START_DAY
  ) {
    throw new RangeError(`Día de inicio de mes no válido: ${monthStartDay}`);
  }
}

function periodStartingAt(start: DateString): Period {
  return { start, end: addDays(addMonths(start, 1), -1) };
}

/** Periodo que contiene la fecha. */
export function periodOf(date: DateString, monthStartDay: number): Period {
  assertMonthStartDay(monthStartDay);
  const { year, month, day } = parseDate(date);
  const thisMonth = withDayClamped(year, month, monthStartDay);
  return periodStartingAt(day >= monthStartDay ? thisMonth : addMonths(thisMonth, -1));
}

/** Periodo `n` posiciones antes (negativo) o después (positivo). */
export function shiftPeriod(period: Period, n: number, monthStartDay: number): Period {
  assertMonthStartDay(monthStartDay);
  return periodStartingAt(addMonths(period.start, n));
}

/** ¿Empieza un periodo en esta fecha? */
export function isPeriodStart(date: string, monthStartDay: number): boolean {
  return isValidDate(date) && periodOf(date, monthStartDay).start === date;
}
