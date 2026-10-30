import type {
  Member,
  RecurringRule,
  UpcomingOccurrenceDto,
  UpcomingSavings,
} from '@smartnomic/api';
import { formatDate, remindersToSchedule, type Reminder } from '@smartnomic/domain';
import { formatDayMonth } from '../format';
import { es } from '../i18n/es';

/** Fecha y hora locales del dispositivo (`YYYY-MM-DD`, `HH:MM`). */
export function localNow(instant: Date): { date: string; time: string } {
  const date = formatDate({
    year: instant.getFullYear(),
    month: instant.getMonth() + 1,
    day: instant.getDate(),
  });
  const time = `${String(instant.getHours()).padStart(2, '0')}:${String(instant.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

/** Momento del aviso en la hora local del dispositivo (respeta el cambio de hora). */
export function reminderInstant(reminder: Reminder): Date {
  const [y, m, d] = reminder.date.split('-').map(Number) as [number, number, number];
  const [h, min] = reminder.time.split(':').map(Number) as [number, number];
  return new Date(y, m - 1, d, h, min, 0, 0);
}

export interface PlannedReminder {
  reminder: Reminder;
  title: string;
  body: string;
}

/** Los avisos de huchas usan este prefijo en lugar del id de un pago recurrente. */
const SAVINGS_PREFIX = 'savings:';

/** Aportaciones pendientes de huchas y sus nombres (especificación 005). */
export interface SavingsReminders {
  pending: readonly UpcomingSavings[];
  goals: readonly { id: string; name: string }[];
}

/**
 * Avisos que hay que programar con los datos que conoce el dispositivo (RF-033). Las
 * huchas avisan solo el día de apartar (especificación 005, RF-503).
 */
export function planReminders(
  occurrences: readonly UpcomingOccurrenceDto[],
  rules: readonly RecurringRule[],
  member: Pick<Member, 'remindersEnabled' | 'reminderTime'>,
  now: Date,
  savings: SavingsReminders = { pending: [], goals: [] },
): PlannedReminder[] {
  const byId = new Map(rules.map((r) => [r.id, r]));
  const goalName = new Map(savings.goals.map((g) => [g.id, g.name]));
  const local = localNow(now);
  const reminders = remindersToSchedule(
    [
      ...occurrences.flatMap((o) => {
        const rule = byId.get(o.ruleId);
        return rule ? [{ ...o, remindDaysBefore: rule.remindDaysBefore }] : [];
      }),
      ...savings.pending.flatMap((s) =>
        goalName.has(s.goalId)
          ? [
              {
                ruleId: `${SAVINGS_PREFIX}${s.goalId}`,
                dueDate: s.dueDate,
                overdue: s.overdue,
                remindDaysBefore: 0,
              },
            ]
          : [],
      ),
    ],
    { enabled: member.remindersEnabled, time: member.reminderTime },
    local,
  );
  return reminders.map((reminder) => {
    if (reminder.ruleId.startsWith(SAVINGS_PREFIX)) {
      const name = goalName.get(reminder.ruleId.slice(SAVINGS_PREFIX.length))!;
      return { reminder, ...savingsReminderText(reminder, name) };
    }
    const rule = byId.get(reminder.ruleId)!;
    return { reminder, ...reminderText(reminder, rule) };
  });
}

/** Pantalla que abre un aviso al tocarlo: el vencimiento o la aportación de la hucha. */
export function reminderRoute(ruleId: string, dueDate: string): string {
  return ruleId.startsWith(SAVINGS_PREFIX)
    ? `/savings/${ruleId.slice(SAVINGS_PREFIX.length)}/due/${dueDate}`
    : `/occurrence/${ruleId}/${dueDate}`;
}

/** «Hoy apartas para Vacaciones» · «Toca para ver el importe», también sin el importe. */
function savingsReminderText(reminder: Reminder, name: string): { title: string; body: string } {
  const when = reminder.daysBefore === 0 ? es.reminders.today : es.reminders.tomorrow;
  return { title: `${when} ${es.reminders.setAside} ${name}`, body: es.reminders.seeAmount };
}

/**
 * «Mañana vence Alquiler» · «1 de noviembre · Toca para ver el importe». Sin el importe:
 * el aviso se ve en la pantalla de bloqueo, y quien coja el móvil no debe leerlo.
 */
export function reminderText(
  reminder: Reminder,
  rule: Pick<RecurringRule, 'name' | 'kind'>,
): { title: string; body: string } {
  const verb = rule.kind === 'income' ? es.reminders.collect : es.reminders.pay;
  const when =
    reminder.daysBefore === 0
      ? es.reminders.today
      : reminder.daysBefore === 1
        ? es.reminders.tomorrow
        : es.reminders.inDays(reminder.daysBefore);
  return {
    title: `${when} ${verb} ${rule.name}`,
    body:
      reminder.daysBefore === 0
        ? es.reminders.seeAmount
        : `${formatDayMonth(reminder.dueDate)} · ${es.reminders.seeAmount}`,
  };
}
