import { dateSchema, type PeriodResponse } from '@smartnomic/api';
import { isPeriodStart, periodOf } from '@smartnomic/domain';
import { and, between, desc, eq, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Database } from '../db/client';
import { transactions } from '../db/schema';
import { ApiError } from '../plugins/errors';
import type { HouseholdAccess } from '../plugins/household-access';
import { setAsideBetween } from './savings';
import { toTransaction } from './transactions';

const paramsSchema = z.object({ householdId: z.uuid(), start: dateSchema });

export function registerPeriodRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess },
): void {
  const { db, access } = deps;

  // Resumen y movimientos del periodo que empieza en `:start` (RF-016 a RF-019).
  app.get(
    '/api/households/:householdId/periods/:start',
    { preHandler: access.requireMember('household.view') },
    async (request): Promise<PeriodResponse> => {
      const { start } = paramsSchema.parse(request.params);
      const { household } = request.membership!;
      if (!isPeriodStart(start, household.monthStartDay)) {
        throw new ApiError(
          'validation_failed',
          `${start} no es el inicio de un periodo: el mes del hogar empieza el día ${household.monthStartDay}.`,
        );
      }
      const period = periodOf(start, household.monthStartDay);
      const inPeriod = and(
        eq(transactions.householdId, household.id),
        isNull(transactions.deletedAt),
        between(transactions.date, period.start, period.end),
      );

      const [rows, [totals]] = await Promise.all([
        db
          .select()
          .from(transactions)
          .where(inPeriod)
          .orderBy(desc(transactions.date), desc(transactions.createdAt), desc(transactions.id)),
        // Totales en SQL (constitución, art. IV.5), siempre a partir de los movimientos.
        db
          .select({
            income: sql<string>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.kind} = 'income'), 0)`,
            expense: sql<string>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.kind} = 'expense'), 0)`,
          })
          .from(transactions)
          .where(inPeriod),
      ]);

      const incomeCents = Number(totals?.income ?? 0);
      const expenseCents = Number(totals?.expense ?? 0);
      return {
        period,
        summary: {
          incomeCents,
          expenseCents,
          balanceCents: incomeCents - expenseCents,
          setAsideCents: await setAsideBetween(db, household.id, period.start, period.end),
        },
        transactions: rows.map(toTransaction),
      };
    },
  );
}
