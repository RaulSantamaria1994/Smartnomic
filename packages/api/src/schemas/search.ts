import { rangeError, SEARCH_MAX_CATEGORIES } from '@smartnomic/domain';
import { z } from 'zod';
import { centsSchema, dateSchema } from './common';
import { transactionKindSchema, transactionSchema } from './transactions';

/** Un entero positivo escrito como texto en la URL («5000»). */
const centsParam = z
  .string()
  .regex(/^\d{1,15}$/, { message: 'Importe no válido: se esperan céntimos' })
  .transform(Number)
  .pipe(centsSchema);

/**
 * Filtros de `GET /api/households/:householdId/transactions/search` (especificación 009), tal
 * como llegan en la URL: `categoryId` se puede repetir. Los rangos al revés no valen.
 */
export const searchQuerySchema = z
  .object({
    kind: transactionKindSchema.optional(),
    categoryId: z.union([z.uuid(), z.array(z.uuid()).max(SEARCH_MAX_CATEGORIES)]).optional(),
    minCents: centsParam.optional(),
    maxCents: centsParam.optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    /** `nextCursor` de la página anterior (base64url). */
    cursor: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,200}$/, { message: 'Cursor no válido' })
      .optional(),
  })
  .refine((q) => rangeError(q.minCents, q.maxCents) === null, {
    message: 'El importe «desde» es mayor que el «hasta».',
    path: ['minCents'],
  })
  .refine((q) => rangeError(q.from, q.to) === null, {
    message: 'La fecha «desde» es posterior a la «hasta».',
    path: ['from'],
  })
  .transform(({ categoryId, ...rest }) => ({
    ...rest,
    categoryIds: categoryId === undefined ? [] : [categoryId].flat(),
  }));

export type SearchQuery = z.infer<typeof searchQuerySchema>;

/** Filtros tal como los usa la app (antes de pasarlos a la URL). */
export type SearchFilters = Omit<SearchQuery, 'cursor'>;

/** Respuesta: una página de movimientos y, en la primera, el número y los totales (RF-905). */
export const searchResponseSchema = z.object({
  transactions: z.array(transactionSchema),
  nextCursor: z.string().nullable(),
  totals: z
    .object({
      count: z.int().nonnegative(),
      incomeCents: z.int().nonnegative(),
      expenseCents: z.int().nonnegative(),
    })
    .optional(),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;
