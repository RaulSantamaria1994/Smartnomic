/**
 * Fechas de calendario sin hora ni zona horaria, como cadenas `YYYY-MM-DD`
 * (constitución, art. III.3). La aritmética se hace contando días desde 1970-01-01, sin
 * `Date`, así que el cambio de hora no puede afectar.
 */
export type DateString = string;

export interface CivilDate {
  year: number;
  /** 1–12 */
  month: number;
  /** 1–31 */
  day: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isValidDate(value: string): value is DateString {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function parseDate(value: DateString): CivilDate {
  if (!isValidDate(value)) throw new RangeError(`Fecha no válida: «${value}»`);
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return { year, month, day };
}

export function formatDate({ year, month, day }: CivilDate): DateString {
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

/** La fecha con el día pedido o, si el mes es más corto, su último día. */
export function withDayClamped(year: number, month: number, day: number): DateString {
  return formatDate({ year, month, day: Math.min(day, daysInMonth(year, month)) });
}

export function addDays(date: DateString, days: number): DateString {
  return fromEpochDays(toEpochDays(parseDate(date)) + days);
}

/** Suma meses conservando el día; si no existe en el mes de destino, el último día. */
export function addMonths(date: DateString, months: number): DateString {
  const { year, month, day } = parseDate(date);
  const index = year * 12 + (month - 1) + months;
  return withDayClamped(Math.floor(index / 12), (index % 12) + 1, day);
}

/** Negativo si `a` es anterior a `b`, cero si son iguales y positivo si es posterior. */
export function compareDates(a: DateString, b: DateString): number {
  return toEpochDays(parseDate(a)) - toEpochDays(parseDate(b));
}

/** Días que hay que sumar a `from` para llegar a `to`. */
export function daysBetween(from: DateString, to: DateString): number {
  return toEpochDays(parseDate(to)) - toEpochDays(parseDate(from));
}

/** 0 = domingo … 6 = sábado. */
export function dayOfWeek(date: DateString): number {
  // 1970-01-01 fue jueves (4).
  return mod(toEpochDays(parseDate(date)) + 4, 7);
}

/**
 * Fecha de calendario de un instante en una zona horaria IANA. El instante entra como
 * parámetro: el dominio no lee el reloj (constitución, art. II.2).
 */
export function civilDateIn(instant: Date, timeZone: string): DateString {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return formatDate({ year: part('year'), month: part('month'), day: part('day') });
}

// Algoritmo de Howard Hinnant para pasar de fecha civil a días desde 1970-01-01 y vuelta.
function toEpochDays({ year, month, day }: CivilDate): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function fromEpochDays(days: number): DateString {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const mp = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return formatDate({ year, month, day });
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
