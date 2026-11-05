import { CHART_MONTHS } from '@smartnomic/domain';
import { z } from 'zod';
import { dateSchema } from './common';

const sumSchema = z.int().nonnegative();
const seriesSchema = z.array(sumSchema).length(CHART_MONTHS);

/** Respuesta de `GET /api/households/:householdId/charts/:start` (especificación 008). */
export const chartsResponseSchema = z.object({
  /** Del más antiguo al más reciente; el último empieza en `:start`. */
  months: z
    .array(
      z.object({
        start: dateSchema,
        end: dateSchema,
        incomeCents: sumSchema,
        expenseCents: sumSchema,
      }),
    )
    .length(CHART_MONTHS),
  /** Categorías de gasto con algún gasto en los 6 meses, archivadas incluidas. */
  categories: z.array(z.object({ categoryId: z.uuid(), monthsCents: seriesSchema })),
  savings: z.object({
    /** Apartado en todas las huchas al final de cada mes. */
    monthsCents: seriesSchema,
    /** Huchas con saldo al final del último mes. */
    goals: z.array(z.object({ goalId: z.uuid(), balanceCents: z.int().positive() })),
  }),
});

export type ChartsResponse = z.infer<typeof chartsResponseSchema>;
