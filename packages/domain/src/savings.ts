import { compareDates, type DateString } from './dates';
import { sumCents, type Cents } from './money';
import { occurrencesBetween, type RecurrenceRule } from './recurrence';

/** Movimientos de una hucha (especificación 005). `skip` es un mes saltado, sin importe. */
export const SAVINGS_ENTRY_KINDS = ['deposit', 'withdrawal', 'skip'] as const;
export type SavingsEntryKind = (typeof SAVINGS_ENTRY_KINDS)[number];

export const SAVINGS_STATUSES = ['active', 'achieved', 'expired', 'closed'] as const;
export type SavingsStatus = (typeof SAVINGS_STATUSES)[number];

/** Lo que el cálculo necesita de una hucha. */
export interface SavingsGoal {
  targetCents: Cents;
  /** Fecha límite (incluida). */
  deadline: DateString;
  /** Día del mes para apartar (1–31; en meses más cortos, el último día). */
  contributionDay: number;
  /** Fecha de creación: no hay aportaciones antes. */
  startDate: DateString;
  closedAt: string | null;
}

/** Movimiento no borrado de una hucha. */
export interface SavingsEntry {
  kind: SavingsEntryKind;
  amountCents: Cents;
  date: DateString;
  /** Mes de aportación que resuelve (aportación confirmada o mes saltado). */
  dueDate: DateString | null;
}

export interface PendingContribution {
  dueDate: DateString;
  /** Ya pasó sin confirmarse ni saltarse. */
  overdue: boolean;
}

export interface SavingsPlan {
  savedCents: Cents;
  /** Lo que falta para el objetivo (0 si se ha llegado). */
  remainingCents: Cents;
  /** Cuánto apartar en cada aportación que queda para llegar a tiempo. */
  quotaCents: Cents;
  /** Aportaciones sin resolver hasta el plazo, atrasadas incluidas. */
  contributionsLeft: number;
  /** La primera aportación sin resolver (puede estar atrasada). */
  nextDueDate: DateString | null;
  /** 0–100, redondeado hacia abajo. */
  percent: number;
  status: SavingsStatus;
  /** Sin aportaciones atrasadas y con lo ahorrado al nivel previsto para hoy. */
  onTrack: boolean;
}

function contributionRule(goal: SavingsGoal): RecurrenceRule {
  return {
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: goal.contributionDay,
    startDate: goal.startDate,
    endDate: goal.deadline,
  };
}

/** Días de apartar entre `from` y `to` (incluidos), dentro de la vida de la hucha. */
export function contributionDates(
  goal: SavingsGoal,
  from: DateString,
  to: DateString,
): DateString[] {
  if (compareDates(from, to) > 0) return [];
  return occurrencesBetween(contributionRule(goal), from, to);
}

/** Aportaciones menos retiradas. */
export function savedCents(entries: readonly SavingsEntry[]): Cents {
  return sumCents(
    entries.map((e) =>
      e.kind === 'deposit' ? e.amountCents : e.kind === 'withdrawal' ? -e.amountCents : 0,
    ),
  );
}

export function savingsStatus(goal: SavingsGoal, saved: Cents, today: DateString): SavingsStatus {
  if (goal.closedAt) return 'closed';
  if (saved >= goal.targetCents) return 'achieved';
  if (compareDates(today, goal.deadline) > 0) return 'expired';
  return 'active';
}

/**
 * Aportaciones sin confirmar ni saltar hasta `until` (como mucho, el plazo). Solo una hucha
 * en curso pide aportaciones: conseguida, vencida o cerrada, ninguna.
 */
export function pendingContributions(
  goal: SavingsGoal,
  entries: readonly SavingsEntry[],
  today: DateString,
  until: DateString,
): PendingContribution[] {
  if (savingsStatus(goal, savedCents(entries), today) !== 'active') return [];
  const resolved = new Set(entries.flatMap((e) => (e.dueDate ? [e.dueDate] : [])));
  return contributionDates(goal, goal.startDate, until)
    .filter((dueDate) => !resolved.has(dueDate))
    .map((dueDate) => ({ dueDate, overdue: compareDates(dueDate, today) < 0 }));
}

/** Progreso, cuota y estado de una hucha a fecha de `today` (RF-502). */
export function savingsPlan(
  goal: SavingsGoal,
  entries: readonly SavingsEntry[],
  today: DateString,
): SavingsPlan {
  const saved = savedCents(entries);
  const status = savingsStatus(goal, saved, today);
  const remaining = Math.max(goal.targetCents - saved, 0);
  const percent = Math.min(100, Math.floor((Math.max(saved, 0) * 100) / goal.targetCents));
  const pending = pendingContributions(goal, entries, today, goal.deadline);

  let quota = 0;
  if (status === 'active') {
    quota = pending.length > 0 ? Math.ceil(remaining / pending.length) : remaining;
  }

  let onTrack = status === 'achieved';
  if (status === 'active') {
    const all = contributionDates(goal, goal.startDate, goal.deadline);
    const passed = all.filter((d) => compareDates(d, today) < 0).length;
    const expected = all.length === 0 ? 0 : Math.ceil((goal.targetCents * passed) / all.length);
    onTrack = !pending.some((p) => p.overdue) && saved >= expected;
  }

  return {
    savedCents: saved,
    remainingCents: status === 'achieved' ? 0 : remaining,
    quotaCents: quota,
    contributionsLeft: pending.length,
    nextDueDate: pending[0]?.dueDate ?? null,
    percent,
    status,
    onTrack,
  };
}
