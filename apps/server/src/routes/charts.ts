import { dateSchema, type ChartsResponse } from '@smartnomic/api';
import { chartWindow, isPeriodStart, type Period } from '@smartnomic/domain';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Database } from '../db/client';
import { savingsEntries, transactions } from '../db/schema';
import { ApiError } from '../plugins/errors';
import type { HouseholdAccess } from '../plugins/household-access';

const paramsSchema = z.object({ householdId: z.uuid(), start: dateSchema });

const FIRST_DATE = '0001-01-01';

/** Los periodos de la ventana como lista `VALUES (idx, inicio, fin)` para unir en SQL. */
function windowValues(window: Period[]) {
  return sql.join(
    window.map((p, i) => sql`(${i}::int, ${p.start}::date, ${p.end}::date)`),
    sql`, `,
  );
}

/**
 * Datos de las cuatro gráficas para los 6 periodos que terminan en `start` (especificación
 * 008). Todo se suma en SQL a partir de los movimientos (art. IV.5), nunca se guarda.
 */
async function chartsFor(
  db: Database,
  householdId: string,
  window: Period[],
): Promise<ChartsResponse> {
  const values = windowValues(window);
  const [movements, savings] = await Promise.all([
    // Ingresos y gastos por periodo y categoría, sin borrados (como «Mes»).
    db
      .select({
        idx: sql<number>`w.idx`,
        kind: transactions.kind,
        categoryId: transactions.categoryId,
        total: sql<string>`sum(${transactions.amountCents})`,
      })
      .from(sql`(VALUES ${values}) AS w(idx, start_date, end_date)`)
      .innerJoin(transactions, sql`${transactions.date} BETWEEN w.start_date AND w.end_date`)
      .where(and(eq(transactions.householdId, householdId), isNull(transactions.deletedAt)))
      .groupBy(sql`w.idx`, transactions.kind, transactions.categoryId),
    // Saldo de cada hucha al final de cada periodo: aportado menos retirado hasta ese día.
    db
      .select({
        idx: sql<number>`w.idx`,
        goalId: savingsEntries.goalId,
        total: sql<string>`sum(case ${savingsEntries.kind} when 'deposit' then ${savingsEntries.amountCents} when 'withdrawal' then -${savingsEntries.amountCents} else 0 end)`,
      })
      .from(sql`(VALUES ${values}) AS w(idx, start_date, end_date)`)
      .innerJoin(savingsEntries, sql`${savingsEntries.date} <= w.end_date`)
      .where(and(eq(savingsEntries.householdId, householdId), isNull(savingsEntries.deletedAt)))
      .groupBy(sql`w.idx`, savingsEntries.goalId),
  ]);

  const last = window.length - 1;
  const months = window.map((p) => ({ ...p, incomeCents: 0, expenseCents: 0 }));
  const byCategory = new Map<string, number[]>();
  for (const row of movements) {
    const idx = Number(row.idx);
    const total = Number(row.total);
    if (row.kind === 'income') {
      months[idx]!.incomeCents += total;
      continue;
    }
    months[idx]!.expenseCents += total;
    const series = byCategory.get(row.categoryId) ?? window.map(() => 0);
    series[idx] = total;
    byCategory.set(row.categoryId, series);
  }

  const savingsMonths = window.map(() => 0);
  const goals: { goalId: string; balanceCents: number }[] = [];
  for (const row of savings) {
    const idx = Number(row.idx);
    const total = Number(row.total);
    savingsMonths[idx]! += total;
    if (idx === last && total > 0) goals.push({ goalId: row.goalId, balanceCents: total });
  }
  goals.sort((a, b) => b.balanceCents - a.balanceCents || a.goalId.localeCompare(b.goalId));

  return {
    months,
    categories: [...byCategory].map(([categoryId, monthsCents]) => ({ categoryId, monthsCents })),
    savings: { monthsCents: savingsMonths, goals },
  };
}

export function registerChartRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess },
): void {
  const { db, access } = deps;

  // Gráficas de los 6 periodos que terminan en el que empieza en `:start` (RF-801 a RF-804).
  app.get(
    '/api/households/:householdId/charts/:start',
    { preHandler: access.requireMember('household.view') },
    async (request): Promise<ChartsResponse> => {
      const { start } = paramsSchema.parse(request.params);
      const { household } = request.membership!;
      // Fechas en los extremos del calendario (año 1 o 9999): los 6 meses no caben.
      let window: Period[];
      try {
        if (!isPeriodStart(start, household.monthStartDay)) {
          throw new ApiError(
            'validation_failed',
            `${start} no es el inicio de un periodo: el mes del hogar empieza el día ${household.monthStartDay}.`,
          );
        }
        window = chartWindow(start, household.monthStartDay);
      } catch (error) {
        if (error instanceof RangeError) {
          throw new ApiError('validation_failed', 'Las gráficas no llegan tan lejos.');
        }
        throw error;
      }
      // PostgreSQL no admite el año 0.
      if (window[0]!.start < FIRST_DATE) {
        throw new ApiError('validation_failed', 'Las gráficas no llegan tan lejos.');
      }
      return chartsFor(db, household.id, window);
    },
  );
}
