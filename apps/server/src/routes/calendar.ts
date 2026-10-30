import { monthSchema, type CalendarResponse } from '@smartnomic/api';
import {
  calendarBounds,
  calendarMonth,
  calendarTotals,
  civilDateIn,
  monthRange,
} from '@smartnomic/domain';
import { and, between, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Database } from '../db/client';
import { occurrences, recurringRules, transactions } from '../db/schema';
import { ApiError } from '../plugins/errors';
import type { HouseholdAccess } from '../plugins/household-access';

const params = z.object({ householdId: z.uuid(), month: monthSchema });

/**
 * Calendario de pagos programados de un mes natural (especificación 002). Los
 * vencimientos se calculan con el dominio, igual que «Próximos pagos».
 */
export function registerCalendarRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess; now: () => Date },
): void {
  const { db, access, now } = deps;

  app.get(
    '/api/households/:householdId/calendar/:month',
    { preHandler: access.requireMember('household.view') },
    async (request): Promise<CalendarResponse> => {
      const { month } = params.parse(request.params);
      const { household } = request.membership!;
      const today = civilDateIn(now(), household.timezone);

      const rules = await db
        .select()
        .from(recurringRules)
        .where(eq(recurringRules.householdId, household.id));
      const bounds = calendarBounds(rules, today);
      if (month < bounds.min || month > bounds.max) {
        throw new ApiError(
          'validation_failed',
          `Ese mes está fuera del calendario: se puede ver de ${bounds.min} a ${bounds.max}.`,
        );
      }

      const { start, end } = monthRange(month);
      // Los resueltos del mes, con el importe del movimiento si se pagó y no se ha borrado.
      const resolved = await db
        .select({ occurrence: occurrences, paidCents: transactions.amountCents })
        .from(occurrences)
        .leftJoin(
          transactions,
          and(
            eq(transactions.id, occurrences.transactionId),
            eq(transactions.householdId, household.id),
            isNull(transactions.deletedAt),
          ),
        )
        .where(
          and(eq(occurrences.householdId, household.id), between(occurrences.dueDate, start, end)),
        );

      const entries = calendarMonth(
        rules,
        resolved.map(({ occurrence, paidCents }) => ({
          ruleId: occurrence.recurringId,
          dueDate: occurrence.dueDate,
          status: occurrence.status,
          amountCents: paidCents,
        })),
        month,
        today,
      );
      const byKey = new Map(
        resolved.map(({ occurrence }) => [
          `${occurrence.recurringId}|${occurrence.dueDate}`,
          occurrence,
        ]),
      );
      return {
        month,
        today,
        bounds,
        items: entries.map((entry) => {
          const occurrence = byKey.get(`${entry.ruleId}|${entry.dueDate}`);
          return {
            ...entry,
            transactionId: occurrence?.transactionId ?? null,
            resolvedBy: occurrence?.resolvedBy ?? null,
          };
        }),
        totals: calendarTotals(entries),
        // Las huchas llegan con la historia 2 de la especificación 005 (H010).
        savings: [],
      };
    },
  );
}
