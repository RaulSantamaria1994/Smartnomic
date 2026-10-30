import { SAVINGS_ENTRY_KINDS, SAVINGS_STATUSES } from '@smartnomic/domain';
import { z } from 'zod';
import { centsSchema, dateSchema, uuidV7Schema } from './common';
import { categoryIconSchema } from './transactions';

// Huchas para objetivos de ahorro (especificación 005).

export const SAVINGS_NAME_MAX_LENGTH = 40;

/** Cuerpo de `PUT /api/households/:householdId/savings/:goalId` (crear o editar). */
export const savingsGoalInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Escribe un nombre.')
    .max(SAVINGS_NAME_MAX_LENGTH, `Como mucho ${SAVINGS_NAME_MAX_LENGTH} caracteres.`),
  icon: categoryIconSchema,
  targetCents: centsSchema,
  deadline: dateSchema,
  contributionDay: z.int().min(1).max(31),
});

export type SavingsGoalInput = z.infer<typeof savingsGoalInputSchema>;

export const savingsStatusSchema = z.enum(SAVINGS_STATUSES);

/** Progreso calculado de una hucha (RF-502). */
export const savingsPlanSchema = z.object({
  savedCents: z.int(),
  remainingCents: z.int().min(0),
  quotaCents: z.int().min(0),
  contributionsLeft: z.int().min(0),
  nextDueDate: dateSchema.nullable(),
  percent: z.int().min(0).max(100),
  status: savingsStatusSchema,
  onTrack: z.boolean(),
});

export type SavingsPlanDto = z.infer<typeof savingsPlanSchema>;

/** Hucha tal como se guarda (también en la exportación). */
export const savingsGoalRecordSchema = z.object({
  id: uuidV7Schema,
  name: z.string(),
  icon: z.string(),
  targetCents: centsSchema,
  deadline: dateSchema,
  contributionDay: z.int().min(1).max(31),
  startDate: dateSchema,
  closedAt: z.iso.datetime().nullable(),
});

export const savingsGoalSchema = savingsGoalRecordSchema.extend({ plan: savingsPlanSchema });

export type SavingsGoalDto = z.infer<typeof savingsGoalSchema>;

/** Respuesta de `GET /api/households/:householdId/savings`. */
export const savingsListSchema = z.object({
  today: dateSchema,
  goals: z.array(savingsGoalSchema),
});

/**
 * Cuerpo de `PUT …/savings/:goalId/entries/:entryId`: aportar o sacar. Con `dueDate`, la
 * aportación confirma ese mes. Los meses se saltan con su propia ruta.
 */
export const savingsEntryInputSchema = z
  .object({
    kind: z.enum(['deposit', 'withdrawal']),
    amountCents: centsSchema,
    date: dateSchema,
    dueDate: dateSchema.nullable().default(null),
  })
  .refine((entry) => entry.kind === 'deposit' || entry.dueDate === null, {
    message: 'Solo una aportación puede corresponder a un mes.',
    path: ['dueDate'],
  });

export type SavingsEntryInput = z.input<typeof savingsEntryInputSchema>;

/** Movimiento de una hucha tal como se guarda (también en la exportación). */
export const savingsEntryRecordSchema = z.object({
  id: uuidV7Schema,
  goalId: uuidV7Schema,
  kind: z.enum(SAVINGS_ENTRY_KINDS),
  amountCents: z.int().min(0),
  date: dateSchema,
  dueDate: dateSchema.nullable(),
  createdAt: z.iso.datetime(),
});

export const savingsEntrySchema = savingsEntryRecordSchema.extend({
  /** Quién lo hizo; `null` si ya no es miembro. */
  memberName: z.string().nullable(),
});

export type SavingsEntryDto = z.infer<typeof savingsEntrySchema>;

/** Respuesta de `GET …/savings/:goalId/entries`: del más reciente al más antiguo. */
export const savingsEntriesResponseSchema = z.object({ entries: z.array(savingsEntrySchema) });

/** Aportación pendiente en «próximos pagos» (RF-503). */
export const upcomingSavingsSchema = z.object({
  goalId: uuidV7Schema,
  dueDate: dateSchema,
  overdue: z.boolean(),
  quotaCents: z.int().min(0),
});

export type UpcomingSavings = z.infer<typeof upcomingSavingsSchema>;

/** Aportación de una hucha en el calendario. */
export const calendarSavingsSchema = z.object({
  goalId: uuidV7Schema,
  dueDate: dateSchema,
  status: z.enum(['pending', 'overdue', 'saved', 'skipped']),
  /** Lo apartado si se confirmó; la cuota si está pendiente; 0 si se saltó. */
  amountCents: z.int().min(0),
});

export type CalendarSavings = z.infer<typeof calendarSavingsSchema>;
