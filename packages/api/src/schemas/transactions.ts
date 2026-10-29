import { CATEGORY_ICONS, TRANSACTION_KINDS } from '@smartnomic/domain';
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

export const CATEGORY_NAME_MAX_LENGTH = 40;

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, 'Escribe un nombre.')
  .max(CATEGORY_NAME_MAX_LENGTH, `Como mucho ${CATEGORY_NAME_MAX_LENGTH} caracteres.`);

/** Color `#RRGGBB`. */
export const categoryColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Color no válido: se espera #RRGGBB' });

/** Identificador del catálogo de iconos (especificación 004, RF-406). */
export const categoryIconSchema = z.enum(CATEGORY_ICONS, { message: 'Icono no válido.' });

/** Cuerpo de `POST /api/households/:householdId/categories` (RF-021). */
export const createCategorySchema = z.object({
  kind: transactionKindSchema,
  name: categoryNameSchema,
  icon: categoryIconSchema,
  color: categoryColorSchema,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/** Cuerpo de `PATCH …/categories/:categoryId`: renombrar, cambiar icono o color, archivar. */
export const updateCategorySchema = z
  .object({
    name: categoryNameSchema,
    icon: categoryIconSchema,
    color: categoryColorSchema,
    archived: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'No hay nada que cambiar.' });

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

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
