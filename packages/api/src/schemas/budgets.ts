import { z } from 'zod';
import { centsSchema, dateSchema } from './common';

/** Cuerpo de `PUT /api/households/:householdId/budgets/:categoryId` (especificación 007). */
export const budgetInputSchema = z.object({ amountCents: centsSchema });

export type BudgetInput = z.infer<typeof budgetInputSchema>;

/** Presupuesto de una categoría en un periodo, con lo gastado en él (RF-703). */
export const periodBudgetSchema = z.object({
  categoryId: z.uuid(),
  amountCents: centsSchema,
  spentCents: z.int().nonnegative(),
});

export type PeriodBudget = z.infer<typeof periodBudgetSchema>;

/** Un cambio de presupuesto, tal como se exporta: `null` es «sin presupuesto desde ahí». */
export const budgetRecordSchema = z.object({
  categoryId: z.uuid(),
  validFrom: dateSchema,
  amountCents: centsSchema.nullable(),
});

export type BudgetRecord = z.infer<typeof budgetRecordSchema>;
