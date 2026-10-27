import { TRANSACTION_KINDS } from '@smartnomic/domain';
import { z } from 'zod';
import { centsSchema, dateSchema, uuidV7Schema } from './common';

export const transactionKindSchema = z.enum(TRANSACTION_KINDS);

export const categorySchema = z.object({
  id: z.uuid(),
  kind: transactionKindSchema,
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  archived: z.boolean(),
});

export type Category = z.infer<typeof categorySchema>;

export const categoriesResponseSchema = z.object({ categories: z.array(categorySchema) });

export const NOTE_MAX_LENGTH = 500;

/** Cuerpo de `PUT /api/households/:householdId/transactions/:id` (crear o editar). */
export const transactionInputSchema = z.object({
  kind: transactionKindSchema,
  amountCents: centsSchema,
  date: dateSchema,
  categoryId: z.uuid(),
  note: z.string().trim().max(NOTE_MAX_LENGTH).nullable().optional(),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const transactionSchema = z.object({
  id: uuidV7Schema,
  kind: transactionKindSchema,
  amountCents: centsSchema,
  date: dateSchema,
  categoryId: z.uuid(),
  note: z.string().nullable(),
  /** Miembro que lo apuntó; `null` si ya no está en el hogar. */
  memberId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Transaction = z.infer<typeof transactionSchema>;

export const summarySchema = z.object({
  incomeCents: z.int(),
  expenseCents: z.int(),
  balanceCents: z.int(),
});

/** Respuesta de `GET /api/households/:householdId/periods/:start`. */
export const periodResponseSchema = z.object({
  period: z.object({ start: dateSchema, end: dateSchema }),
  summary: summarySchema,
  /** Del más reciente al más antiguo. */
  transactions: z.array(transactionSchema),
});

export type PeriodResponse = z.infer<typeof periodResponseSchema>;
