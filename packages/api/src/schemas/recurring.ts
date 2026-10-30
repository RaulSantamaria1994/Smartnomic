import { FREQUENCIES, MAX_INTERVAL } from '@smartnomic/domain';
import { z } from 'zod';
import { centsSchema, dateSchema, uuidV7Schema } from './common';
import { upcomingSavingsSchema } from './savings';
import { NOTE_MAX_LENGTH, transactionKindSchema } from './transactions';

export const frequencySchema = z.enum(FREQUENCIES);

/** Antelación con la que se avisa de un vencimiento (especificación 001, RF-029). */
export const REMIND_DAYS_OPTIONS = [0, 1, 3, 7] as const;
export const remindDaysSchema = z.union(REMIND_DAYS_OPTIONS.map((d) => z.literal(d)));

const ruleFields = {
  kind: transactionKindSchema,
  name: z.string().trim().min(1).max(60),
  /** Importe previsto; al pagar se indica el real. */
  amountCents: centsSchema,
  categoryId: z.uuid(),
  frequency: frequencySchema,
  interval: z.int().min(1).max(MAX_INTERVAL),
  dayOfMonth: z.int().min(1).max(31).nullable(),
  monthOfYear: z.int().min(1).max(12).nullable(),
  weekday: z.int().min(0).max(6).nullable(),
  startDate: dateSchema,
  endDate: dateSchema.nullable(),
  remindDaysBefore: remindDaysSchema,
  active: z.boolean(),
};

/** Cada frecuencia usa sus campos de día y deja los demás vacíos. */
function coherentDays(rule: {
  frequency: string;
  dayOfMonth: number | null;
  monthOfYear: number | null;
  weekday: number | null;
  startDate: string;
  endDate: string | null;
}): boolean {
  const days =
    rule.frequency === 'weekly'
      ? rule.weekday !== null && rule.dayOfMonth === null && rule.monthOfYear === null
      : rule.frequency === 'monthly'
        ? rule.dayOfMonth !== null && rule.weekday === null && rule.monthOfYear === null
        : rule.dayOfMonth !== null && rule.monthOfYear !== null && rule.weekday === null;
  return days && (rule.endDate === null || rule.endDate >= rule.startDate);
}

const coherence = {
  message:
    'Los días no encajan con la frecuencia (semanal: día de la semana; mensual: día del mes; anual: día y mes), o la fecha de fin es anterior a la de inicio.',
};

/** Cuerpo de `PUT /api/households/:householdId/recurring/:id` (crear o editar). */
export const recurringInputSchema = z
  .object({
    ...ruleFields,
    dayOfMonth: ruleFields.dayOfMonth.default(null),
    monthOfYear: ruleFields.monthOfYear.default(null),
    weekday: ruleFields.weekday.default(null),
    endDate: ruleFields.endDate.default(null),
    remindDaysBefore: ruleFields.remindDaysBefore.default(1),
    active: ruleFields.active.default(true),
  })
  .refine(coherentDays, coherence);

export type RecurringInput = z.input<typeof recurringInputSchema>;

export const recurringRuleSchema = z
  .object({ id: uuidV7Schema, ...ruleFields })
  .refine(coherentDays, coherence);

export type RecurringRule = z.infer<typeof recurringRuleSchema>;

export const recurringListSchema = z.object({ rules: z.array(recurringRuleSchema) });

/** Vencimiento pendiente (atrasado o próximo). */
export const upcomingOccurrenceSchema = z.object({
  ruleId: uuidV7Schema,
  dueDate: dateSchema,
  overdue: z.boolean(),
});

export type UpcomingOccurrenceDto = z.infer<typeof upcomingOccurrenceSchema>;

/** Respuesta de `GET /api/households/:householdId/upcoming`. */
export const upcomingResponseSchema = z.object({
  today: dateSchema,
  occurrences: z.array(upcomingOccurrenceSchema),
  /** Aportaciones de huchas pendientes (especificación 005). */
  savings: z.array(upcomingSavingsSchema).default([]),
});

export const occurrenceStatusSchema = z.enum(['paid', 'skipped']);

/** Cuerpo de `POST …/recurring/:ruleId/occurrences/:dueDate/pay`. */
export const payOccurrenceSchema = z.object({
  /** UUIDv7 del movimiento que se crea: reintentar no duplica. */
  transactionId: uuidV7Schema,
  /** Importe real (puede diferir del previsto). */
  amountCents: centsSchema,
  /** Fecha en que se pagó o cobró. */
  date: dateSchema,
  note: z.string().trim().max(NOTE_MAX_LENGTH).nullable().optional(),
});

export type PayOccurrenceInput = z.infer<typeof payOccurrenceSchema>;

export const resolvedOccurrenceSchema = z.object({
  ruleId: uuidV7Schema,
  dueDate: dateSchema,
  status: occurrenceStatusSchema,
  transactionId: z.uuid().nullable(),
  resolvedBy: z.uuid().nullable(),
});

export type ResolvedOccurrence = z.infer<typeof resolvedOccurrenceSchema>;
