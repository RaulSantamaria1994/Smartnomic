import { addDays, compareDates, type DateString } from './dates';

/** Vencimiento pendiente con la antelación de aviso de su pago. */
export interface ReminderOccurrence {
  ruleId: string;
  dueDate: DateString;
  /** Días antes del vencimiento (0, 1, 3 o 7). */
  remindDaysBefore: number;
  overdue: boolean;
}

export interface ReminderSettings {
  enabled: boolean;
  /** Hora local `HH:MM`. */
  time: string;
}

/** Aviso que hay que programar en el dispositivo, en su hora local. */
export interface Reminder {
  /** Identificador estable: el mismo aviso tiene siempre el mismo id. */
  id: string;
  ruleId: string;
  dueDate: DateString;
  /** Día del aviso (hora local del dispositivo). */
  date: DateString;
  /** Hora del aviso, `HH:MM` (hora local del dispositivo). */
  time: string;
  /** 0 = el aviso del mismo día. */
  daysBefore: number;
}

/** Tope de avisos programados (iOS admite 64; Android, algo más). */
export const MAX_SCHEDULED_REMINDERS = 50;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Avisos a programar para los vencimientos pendientes (especificación 001, RF-029 a
 * RF-033): uno con la antelación del pago y otro el mismo día, a la hora configurada.
 * No incluye los atrasados ni los que ya han pasado. La fecha y la hora son de reloj
 * local, así el cambio de hora no las mueve. `now` es la fecha y hora local del
 * dispositivo: el dominio no lee el reloj.
 */
export function remindersToSchedule(
  occurrences: readonly ReminderOccurrence[],
  settings: ReminderSettings,
  now: { date: DateString; time: string },
  limit = MAX_SCHEDULED_REMINDERS,
): Reminder[] {
  if (!TIME.test(settings.time)) throw new RangeError(`Hora de aviso no válida: ${settings.time}`);
  if (!settings.enabled) return [];

  const isFuture = (date: DateString) => {
    const order = compareDates(date, now.date);
    return order > 0 || (order === 0 && settings.time > now.time);
  };

  const reminders: Reminder[] = [];
  for (const o of occurrences) {
    if (o.overdue) continue;
    const base = { ruleId: o.ruleId, dueDate: o.dueDate, time: settings.time };
    if (o.remindDaysBefore > 0) {
      const date = addDays(o.dueDate, -o.remindDaysBefore);
      if (isFuture(date)) {
        reminders.push({
          id: `${o.ruleId}|${o.dueDate}|before`,
          ...base,
          date,
          daysBefore: o.remindDaysBefore,
        });
      }
    }
    if (isFuture(o.dueDate)) {
      reminders.push({
        id: `${o.ruleId}|${o.dueDate}|due`,
        ...base,
        date: o.dueDate,
        daysBefore: 0,
      });
    }
  }

  return reminders
    .sort(
      (a, b) =>
        compareDates(a.date, b.date) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}
