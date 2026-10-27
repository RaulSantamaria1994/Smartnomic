import { addDays, compareDates, type DateString } from './dates';
import { occurrencesBetween, type RecurrenceRule } from './recurrence';

export interface UpcomingOccurrence {
  ruleId: string;
  dueDate: DateString;
  /** Ya pasó y no se ha pagado ni omitido. */
  overdue: boolean;
}

/**
 * Vencimientos pendientes: los atrasados desde `overdueSince` y los de los próximos
 * `days` días, ordenados por fecha (especificación 001, RF-023). Los pagados u omitidos
 * (`resolved`) y las reglas desactivadas no aparecen.
 */
export function upcoming(
  rules: readonly (RecurrenceRule & { id: string; active: boolean })[],
  resolved: readonly { ruleId: string; dueDate: DateString }[],
  today: DateString,
  days: number,
  overdueSince: DateString,
): UpcomingOccurrence[] {
  const done = new Set(resolved.map((r) => `${r.ruleId}|${r.dueDate}`));
  const until = addDays(today, days);
  const items: UpcomingOccurrence[] = [];
  for (const rule of rules) {
    if (!rule.active) continue;
    for (const dueDate of occurrencesBetween(rule, overdueSince, until)) {
      if (done.has(`${rule.id}|${dueDate}`)) continue;
      items.push({ ruleId: rule.id, dueDate, overdue: compareDates(dueDate, today) < 0 });
    }
  }
  return items.sort(
    (a, b) => compareDates(a.dueDate, b.dueDate) || a.ruleId.localeCompare(b.ruleId),
  );
}
