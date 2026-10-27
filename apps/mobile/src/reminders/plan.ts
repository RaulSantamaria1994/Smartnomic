import type { Member, RecurringRule, UpcomingOccurrenceDto } from '@smartnomic/api';
import { formatDate, remindersToSchedule, type Reminder } from '@smartnomic/domain';
import { formatDayMonth, formatMoney } from '../format';
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

/** Avisos que hay que programar con los datos que conoce el dispositivo (RF-033). */
export function planReminders(
  occurrences: readonly UpcomingOccurrenceDto[],
  rules: readonly RecurringRule[],
  member: Pick<Member, 'remindersEnabled' | 'reminderTime'>,
  now: Date,
): PlannedReminder[] {
  const byId = new Map(rules.map((r) => [r.id, r]));
  const local = localNow(now);
  const reminders = remindersToSchedule(
    occurrences.flatMap((o) => {
      const rule = byId.get(o.ruleId);
      return rule ? [{ ...o, remindDaysBefore: rule.remindDaysBefore }] : [];
    }),
    { enabled: member.remindersEnabled, time: member.reminderTime },
    local,
  );
  return reminders.map((reminder) => {
    const rule = byId.get(reminder.ruleId)!;
    return { reminder, ...reminderText(reminder, rule) };
  });
}

/** «Mañana vence Alquiler» · «750,00 € · 1 de noviembre». */
export function reminderText(
  reminder: Reminder,
  rule: Pick<RecurringRule, 'name' | 'amountCents' | 'kind'>,
): { title: string; body: string } {
  const verb = rule.kind === 'income' ? es.reminders.collect : es.reminders.pay;
  const when =
    reminder.daysBefore === 0
      ? es.reminders.today
      : reminder.daysBefore === 1
        ? es.reminders.tomorrow
        : es.reminders.inDays(reminder.daysBefore);
  const due = reminder.daysBefore === 0 ? es.reminders.dueToday : formatDayMonth(reminder.dueDate);
  return {
    title: `${when} ${verb} ${rule.name}`,
    body: `${formatMoney(rule.amountCents)} · ${due}`,
  };
}
