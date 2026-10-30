import { savingsGoalInputSchema, uuidV7Schema, type SavingsGoalDto } from '@smartnomic/api';
import {
  addMonths,
  civilDateIn,
  compareDates,
  savingsPlan,
  type DateString,
  type SavingsEntry,
} from '@smartnomic/domain';
import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Database } from '../db/client';
import { savingsEntries, savingsGoals } from '../db/schema';
import { ApiError } from '../plugins/errors';
import type { HouseholdAccess } from '../plugins/household-access';

// Huchas para objetivos de ahorro (especificación 005).

type GoalRow = typeof savingsGoals.$inferSelect;
type EntryRow = typeof savingsEntries.$inferSelect;

const GOAL_NOT_FOUND = 'Esta hucha no existe.';
/** Como mucho 30 años de plazo. */
const MAX_DEADLINE_MONTHS = 30 * 12;

const goalParams = z.object({ householdId: z.uuid(), goalId: uuidV7Schema });

function toEntry(row: EntryRow): SavingsEntry {
  return { kind: row.kind, amountCents: row.amountCents, date: row.date, dueDate: row.dueDate };
}

export function toGoal(
  row: GoalRow,
  entries: readonly EntryRow[],
  today: DateString,
): SavingsGoalDto {
  const goal = {
    targetCents: row.targetCents,
    deadline: row.deadline,
    contributionDay: row.contributionDay,
    startDate: row.startDate,
    closedAt: row.closedAt?.toISOString() ?? null,
  };
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    ...goal,
    plan: savingsPlan(goal, entries.map(toEntry), today),
  };
}

/** Huchas del hogar con sus movimientos no borrados. */
export async function loadSavings(db: Database, householdId: string) {
  const [goals, entries] = await Promise.all([
    db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.householdId, householdId))
      .orderBy(asc(savingsGoals.deadline), asc(savingsGoals.id)),
    db
      .select()
      .from(savingsEntries)
      .where(and(eq(savingsEntries.householdId, householdId), isNull(savingsEntries.deletedAt))),
  ]);
  const byGoal = new Map<string, EntryRow[]>();
  for (const entry of entries)
    byGoal.set(entry.goalId, [...(byGoal.get(entry.goalId) ?? []), entry]);
  return goals.map((goal) => ({ goal, entries: byGoal.get(goal.id) ?? [] }));
}

export function registerSavingsRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess; now: () => Date },
): void {
  const { db, access, now } = deps;
  const base = '/api/households/:householdId/savings';

  app.get(base, { preHandler: access.requireMember('household.view') }, async (request) => {
    const { household } = request.membership!;
    const today = civilDateIn(now(), household.timezone);
    const savings = await loadSavings(db, household.id);
    return { today, goals: savings.map(({ goal, entries }) => toGoal(goal, entries, today)) };
  });

  // Crear o editar (RF-501). Idempotente por id; nunca toca la hucha de otro hogar.
  app.put(
    `${base}/:goalId`,
    { preHandler: access.requireMember('savings.write') },
    async (request) => {
      const { goalId } = goalParams.parse(request.params);
      const input = savingsGoalInputSchema.parse(request.body);
      const { household } = request.membership!;
      const today = civilDateIn(now(), household.timezone);

      const [existing] = await db.select().from(savingsGoals).where(eq(savingsGoals.id, goalId));
      if (existing && existing.householdId !== household.id) {
        throw new ApiError('not_found', GOAL_NOT_FOUND);
      }
      // Un plazo nuevo no puede estar en el pasado; editar otra cosa de una hucha vencida, sí.
      if (!existing || existing.deadline !== input.deadline) {
        if (compareDates(input.deadline, today) < 0) {
          throw new ApiError('validation_failed', 'La fecha límite no puede estar en el pasado.');
        }
        if (compareDates(input.deadline, addMonths(today, MAX_DEADLINE_MONTHS)) > 0) {
          throw new ApiError(
            'validation_failed',
            'La fecha límite puede ser como mucho dentro de 30 años.',
          );
        }
      }

      const [row] = await db
        .insert(savingsGoals)
        .values({ id: goalId, householdId: household.id, startDate: today, ...input })
        .onConflictDoUpdate({
          target: savingsGoals.id,
          set: { ...input, updatedAt: now() },
          setWhere: sql`${savingsGoals.householdId} = ${household.id}`,
        })
        .returning();
      if (!row) throw new ApiError('not_found', GOAL_NOT_FOUND);
      const entries = await db
        .select()
        .from(savingsEntries)
        .where(and(eq(savingsEntries.goalId, row.id), isNull(savingsEntries.deletedAt)));
      return toGoal(row, entries, today);
    },
  );

  // Borrar solo una hucha sin movimientos: con ellos se cierra, para no cambiar meses pasados.
  app.delete(
    `${base}/:goalId`,
    { preHandler: access.requireMember('savings.write') },
    async (request, reply) => {
      const { goalId } = goalParams.parse(request.params);
      const householdId = request.membership!.household.id;
      const [used] = await db
        .select({ total: count() })
        .from(savingsEntries)
        .where(and(eq(savingsEntries.goalId, goalId), eq(savingsEntries.householdId, householdId)));
      if ((used?.total ?? 0) > 0) {
        throw new ApiError(
          'conflict',
          'Esta hucha tiene movimientos: no se puede borrar, pero sí cerrar.',
        );
      }
      const [deleted] = await db
        .delete(savingsGoals)
        .where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.householdId, householdId)))
        .returning({ id: savingsGoals.id });
      if (!deleted) throw new ApiError('not_found', GOAL_NOT_FOUND);
      return reply.status(204).send();
    },
  );
}
