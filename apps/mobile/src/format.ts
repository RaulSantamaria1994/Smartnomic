import type { AmountError, Cents, DateString, Period } from '@smartnomic/domain';
import { parseDate } from '@smartnomic/domain';
import { es } from './i18n/es';

const LOCALE = 'es-ES';

/**
 * «1.234,56 €». El importe solo se formatea en la interfaz (constitución, art. III.2). Se
 * hace a mano para que salga igual en Android y en el navegador, y con punto de miles
 * también en las cifras de cuatro dígitos.
 */
export function formatMoney(cents: Cents, currency = 'EUR'): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const euros = String(Math.trunc(absolute / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimals = String(absolute % 100).padStart(2, '0');
  const symbol = currency === 'EUR' ? '€' : currency;
  return `${sign}${euros},${decimals}\u00a0${symbol}`;
}

/** Con signo: «+1.800,00 €» o «−45,30 €». */
export function formatSignedMoney(cents: Cents, kind: 'income' | 'expense', currency = 'EUR') {
  return `${kind === 'income' ? '+' : '−'}${formatMoney(cents, currency)}`;
}

/** Importe para editarlo en el campo de texto: «45,30». */
export function formatAmountInput(cents: Cents): string {
  const euros = Math.trunc(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `${euros},${rest}`;
}

function toUtcDate(date: DateString): Date {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** «martes, 27 de octubre». */
export function formatDay(date: DateString): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(toUtcDate(date));
}

/** «27/10/2026». */
export function formatShortDate(date: DateString): string {
  const { year, month, day } = parseDate(date);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

/** Lee «27/10/2026» (o «27/10/26», «27-10-2026») como fecha `YYYY-MM-DD`. */
export function parseShortDate(text: string): DateString | null {
  const match = /^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\s*$/.exec(text);
  if (!match) return null;
  const year = match[3]!.length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  const candidate = `${year}-${match[2]!.padStart(2, '0')}-${match[1]!.padStart(2, '0')}`;
  try {
    parseDate(candidate);
    return candidate;
  } catch {
    return null;
  }
}

/**
 * Nombre del periodo: «octubre de 2026» si el mes empieza el día 1, o «25 oct – 24 nov»
 * si empieza otro día.
 */
export function formatPeriod(period: Period, monthStartDay: number): string {
  if (monthStartDay === 1) {
    const month = new Intl.DateTimeFormat(LOCALE, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(toUtcDate(period.start));
    return month.charAt(0).toUpperCase() + month.slice(1);
  }
  const short = (date: DateString) =>
    new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' })
      .format(toUtcDate(date))
      .replace('.', '');
  return `${short(period.start)} – ${short(period.end)}`;
}

export function amountErrorMessage(error: AmountError): string {
  return es.transaction.amountErrors[error];
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

/** 0 = domingo … 6 = sábado. */
export const WEEKDAYS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? '';
}

interface RuleSchedule {
  frequency: 'weekly' | 'monthly' | 'yearly';
  interval: number;
  dayOfMonth: number | null;
  monthOfYear: number | null;
  weekday: number | null;
}

/** «Cada mes, el día 1», «Cada 3 meses, el día 15», «Cada año, el 15 de marzo»… */
export function describeSchedule(rule: RuleSchedule): string {
  const every = (singular: string, plural: string) =>
    rule.interval === 1 ? `Cada ${singular}` : `Cada ${rule.interval} ${plural}`;
  if (rule.frequency === 'weekly') {
    const day = WEEKDAYS[rule.weekday ?? 0]!;
    const plural = day.endsWith('s') ? day : `${day}s`;
    return `${every('semana', 'semanas')}, los ${plural}`;
  }
  if (rule.frequency === 'monthly') return `${every('mes', 'meses')}, el día ${rule.dayOfMonth}`;
  return `${every('año', 'años')}, el ${rule.dayOfMonth} de ${monthName(rule.monthOfYear ?? 1)}`;
}

/** «Hoy», «Mañana», «Ayer» o «1 de noviembre». */
export function formatDueDate(dueDate: DateString, today: DateString): string {
  const days = Math.round(
    (toUtcDate(dueDate).getTime() - toUtcDate(today).getTime()) / (24 * 60 * 60 * 1000),
  );
  if (days === 0) return es.recurring.today;
  if (days === 1) return es.recurring.tomorrow;
  if (days === -1) return es.recurring.yesterday;
  const { day, month } = parseDate(dueDate);
  return `${day} de ${monthName(month)}`;
}
