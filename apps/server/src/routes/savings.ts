import {
  dateSchema,
  savingsEntryInputSchema,
  savingsGoalInputSchema,
  uuidV7Schema,
  type CalendarSavings,
  type SavingsEntryDto,
  type SavingsGoalDto,
  type UpcomingSavings,
} from '@smartnomic/api';
import {
  addDays,
  addMonths,
  civilDateIn,
  compareDates,
  contributionDates,
  pendingContributions,
  savedCents,
  savingsPlan,
  uuidV7,
  type DateString,
  type SavingsEntry,
  type SavingsGoal,
} from '@smartnomic/domain';
import { randomBytes } from 'node:crypto';
import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Database } from '../db/client';
import { members, savingsEntries, savingsGoals, users } from '../db/schema';
import { ApiError } from '../plugins/errors';
import type { HouseholdAccess } from '../plugins/household-access';

// Huchas para objetivos de ahorro (especificación 005).

type GoalRow = typeof savingsGoals.$inferSelect;
type EntryRow = typeof savingsEntries.$inferSelect;

const GOAL_NOT_FOUND = 'Esta hucha no existe.';
/** Como mucho 30 años de plazo. */
const MAX_DEADLINE_MONTHS = 30 * 12;

const goalParams = z.object({ householdId: z.uuid(), goalId: uuidV7Schema });
const entryParams = goalParams.extend({ entryId: uuidV7Schema });
const dueParams = goalParams.extend({ dueDate: dateSchema });

function goalOf(row: GoalRow): SavingsGoal {
  return {
    targetCents: row.targetCents,
    deadline: row.deadline,
    contributionDay: row.contributionDay,
    startDate: row.startDate,
    closedAt: row.closedAt?.toISOString() ?? null,
  };
}

function toEntryDto(row: EntryRow, memberName: string | null): SavingsEntryDto {
  return {
    id: row.id,
    goalId: row.goalId,
    kind: row.kind,
    amountCents: row.amountCents,
    date: row.date,
    dueDate: row.dueDate,
    createdAt: row.createdAt.toISOString(),
    memberName,
  };
}

/** ¿Choca con el índice único de un mes ya resuelto? */
function isDueConflict(error: unknown): boolean {
  const pg = (error as { cause?: { code?: string; constraint?: string } }).cause ?? error;
  const { code, constraint } = pg as { code?: string; constraint?: string };
  return code === '23505' && constraint === 'savings_entries_due_unique';
}

function toEntry(row: EntryRow): SavingsEntry {
  return { kind: row.kind, amountCents: row.amountCents, date: row.date, dueDate: row.dueDate };
}

export function toGoal(
  row: GoalRow,
  entries: readonly EntryRow[],
  today: DateString,
): SavingsGoalDto {
  const goal = goalOf(row);
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

/** Aportaciones de huchas pendientes hasta dentro de `days` días, atrasadas incluidas (RF-503). */
export async function upcomingSavings(
  db: Database,
  householdId: string,
  today: DateString,
  days: number,
): Promise<UpcomingSavings[]> {
  const until = addDays(today, days);
  return (await loadSavings(db, householdId))
    .flatMap(({ goal, entries }) => {
      const plain = entries.map(toEntry);
      const { quotaCents } = savingsPlan(goalOf(goal), plain, today);
      return pendingContributions(goalOf(goal), plain, today, until).map((p) => ({
        goalId: goal.id,
        dueDate: p.dueDate,
        overdue: p.overdue,
        quotaCents,
      }));
    })
    .sort((a, b) => compareDates(a.dueDate, b.dueDate) || a.goalId.localeCompare(b.goalId));
}

/** Aportaciones de huchas entre `start` y `end` con su estado, para el calendario. */
export async function calendarSavings(
  db: Database,
  householdId: string,
  today: DateString,
  start: DateString,
  end: DateString,
): Promise<CalendarSavings[]> {
  const items: CalendarSavings[] = [];
  for (const { goal, entries } of await loadSavings(db, householdId)) {
    const plain = entries.map(toEntry);
    const plan = savingsPlan(goalOf(goal), plain, today);
    const byDue = new Map(plain.flatMap((e) => (e.dueDate ? [[e.dueDate, e] as const] : [])));
    for (const dueDate of contributionDates(goalOf(goal), start, end)) {
      const resolved = byDue.get(dueDate);
      if (resolved) {
        items.push({
          goalId: goal.id,
          dueDate,
          status: resolved.kind === 'skip' ? 'skipped' : 'saved',
          amountCents: resolved.amountCents,
        });
      } else if (plan.status === 'active') {
        items.push({
          goalId: goal.id,
          dueDate,
          status: compareDates(dueDate, today) < 0 ? 'overdue' : 'pending',
          amountCents: plan.quotaCents,
        });
      }
    }
  }
  return items.sort(
    (a, b) => compareDates(a.dueDate, b.dueDate) || a.goalId.localeCompare(b.goalId),
  );
}

/** Apartado para objetivos en un periodo: aportado menos sacado, en SQL (RF-506). */
export async function setAsideBetween(
  db: Database,
  householdId: string,
  start: DateString,
  end: DateString,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(case ${savingsEntries.kind} when 'deposit' then ${savingsEntries.amountCents} when 'withdrawal' then -${savingsEntries.amountCents} else 0 end), 0)`,
    })
    .from(savingsEntries)
    .where(
      and(
        eq(savingsEntries.householdId, householdId),
        isNull(savingsEntries.deletedAt),
        sql`${savingsEntries.date} BETWEEN ${start} AND ${end}`,
      ),
    );
  return Number(row?.total ?? 0);
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
      if (existing?.closedAt) throw new ApiError('conflict', 'Esta hucha está cerrada.');
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

  async function memberName(memberId: string | null): Promise<string | null> {
    if (!memberId) return null;
    const [row] = await db
      .select({ name: users.name })
      .from(members)
      .innerJoin(users, eq(users.id, members.userId))
      .where(eq(members.id, memberId));
    return row?.name ?? null;
  }

  /** Mensaje cuando un mes ya está resuelto: quién lo apartó, o que se saltó. */
  async function alreadyResolved(goalId: string, dueDate: DateString): Promise<string> {
    const [existing] = await db
      .select()
      .from(savingsEntries)
      .where(
        and(
          eq(savingsEntries.goalId, goalId),
          eq(savingsEntries.dueDate, dueDate),
          isNull(savingsEntries.deletedAt),
        ),
      );
    if (existing?.kind === 'skip') return 'Este mes ya se saltó.';
    const name = (await memberName(existing?.memberId ?? null)) ?? 'un antiguo miembro';
    return `Este mes ya lo apartó ${name}.`;
  }

  async function loadGoal(householdId: string, goalId: string): Promise<GoalRow> {
    const [goal] = await db
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.householdId, householdId)));
    if (!goal) throw new ApiError('not_found', GOAL_NOT_FOUND);
    return goal;
  }

  function assertContributionDate(goal: GoalRow, dueDate: DateString) {
    if (contributionDates(goalOf(goal), dueDate, dueDate).length !== 1) {
      throw new ApiError('validation_failed', 'Esa fecha no es un día de apartar de esta hucha.');
    }
  }

  // Aportar o sacar (RF-504, RF-505). Con `dueDate`, confirma la aportación de ese mes.
  // Idempotente por id; sacar nunca deja la hucha en negativo, aunque sea a la vez.
  app.put(
    `${base}/:goalId/entries/:entryId`,
    { preHandler: access.requireMember('savings.write') },
    async (request): Promise<SavingsEntryDto> => {
      const { goalId, entryId } = entryParams.parse(request.params);
      const input = savingsEntryInputSchema.parse(request.body);
      const { household, member } = request.membership!;
      const goal = await loadGoal(household.id, goalId);

      const [repeated] = await db
        .select()
        .from(savingsEntries)
        .where(eq(savingsEntries.id, entryId));
      if (repeated) {
        if (repeated.householdId !== household.id || repeated.goalId !== goalId) {
          throw new ApiError('not_found', GOAL_NOT_FOUND);
        }
        return toEntryDto(repeated, await memberName(repeated.memberId));
      }
      if (goal.closedAt) throw new ApiError('conflict', 'Esta hucha está cerrada.');
      if (input.dueDate) assertContributionDate(goal, input.dueDate);

      try {
        const row = await db.transaction(async (tx) => {
          // La hucha bloqueada: dos retiradas a la vez ven el saldo de la otra.
          await tx
            .select({ id: savingsGoals.id })
            .from(savingsGoals)
            .where(eq(savingsGoals.id, goalId))
            .for('update');
          if (input.kind === 'withdrawal') {
            const entries = await tx
              .select()
              .from(savingsEntries)
              .where(and(eq(savingsEntries.goalId, goalId), isNull(savingsEntries.deletedAt)));
            const saved = savedCents(entries.map(toEntry));
            if (input.amountCents > saved) {
              throw new ApiError('conflict', 'No puedes sacar más de lo que hay en la hucha.');
            }
          }
          const [inserted] = await tx
            .insert(savingsEntries)
            .values({
              id: entryId,
              householdId: household.id,
              goalId,
              memberId: member.id,
              kind: input.kind,
              amountCents: input.amountCents,
              date: input.date,
              dueDate: input.dueDate,
            })
            .returning();
          return inserted!;
        });
        return toEntryDto(row, request.user!.name);
      } catch (error) {
        if (input.dueDate && isDueConflict(error)) {
          throw new ApiError('conflict', await alreadyResolved(goalId, input.dueDate));
        }
        throw error;
      }
    },
  );

  // Saltar la aportación de un mes (RF-504). Repetirlo no cambia nada.
  app.post(
    `${base}/:goalId/due/:dueDate/skip`,
    { preHandler: access.requireMember('savings.write') },
    async (request): Promise<SavingsEntryDto> => {
      const { goalId, dueDate } = dueParams.parse(request.params);
      const { household, member } = request.membership!;
      const goal = await loadGoal(household.id, goalId);
      if (goal.closedAt) throw new ApiError('conflict', 'Esta hucha está cerrada.');
      assertContributionDate(goal, dueDate);

      const [row] = await db
        .insert(savingsEntries)
        .values({
          id: uuidV7(now().getTime(), randomBytes(10)),
          householdId: household.id,
          goalId,
          memberId: member.id,
          kind: 'skip',
          amountCents: 0,
          date: dueDate,
          dueDate,
        })
        .onConflictDoNothing()
        .returning();
      if (row) return toEntryDto(row, request.user!.name);

      const [existing] = await db
        .select()
        .from(savingsEntries)
        .where(
          and(
            eq(savingsEntries.goalId, goalId),
            eq(savingsEntries.dueDate, dueDate),
            isNull(savingsEntries.deletedAt),
          ),
        );
      if (existing?.kind === 'skip')
        return toEntryDto(existing, await memberName(existing.memberId));
      throw new ApiError('conflict', await alreadyResolved(goalId, dueDate));
    },
  );

  // Historial de una hucha (RF-505): del más reciente al más antiguo, con quién lo hizo.
  app.get(
    `${base}/:goalId/entries`,
    { preHandler: access.requireMember('household.view') },
    async (request) => {
      const { goalId } = goalParams.parse(request.params);
      const householdId = request.membership!.household.id;
      await loadGoal(householdId, goalId);
      const rows = await db
        .select({ entry: savingsEntries, name: users.name })
        .from(savingsEntries)
        .leftJoin(members, eq(members.id, savingsEntries.memberId))
        .leftJoin(users, eq(users.id, members.userId))
        .where(
          and(
            eq(savingsEntries.goalId, goalId),
            eq(savingsEntries.householdId, householdId),
            isNull(savingsEntries.deletedAt),
          ),
        )
        .orderBy(desc(savingsEntries.createdAt), desc(savingsEntries.id));
      return { entries: rows.map(({ entry, name }) => toEntryDto(entry, name)) };
    },
  );

  // Deshacer el último movimiento (RF-505). Borrado lógico (constitución, art. IV.4).
  app.delete(
    `${base}/:goalId/entries/:entryId`,
    { preHandler: access.requireMember('savings.write') },
    async (request, reply) => {
      const { goalId, entryId } = entryParams.parse(request.params);
      const householdId = request.membership!.household.id;
      const goal = await loadGoal(householdId, goalId);
      if (goal.closedAt) throw new ApiError('conflict', 'Esta hucha está cerrada.');

      await db.transaction(async (tx) => {
        await tx
          .select({ id: savingsGoals.id })
          .from(savingsGoals)
          .where(eq(savingsGoals.id, goalId))
          .for('update');
        const [last] = await tx
          .select()
          .from(savingsEntries)
          .where(and(eq(savingsEntries.goalId, goalId), isNull(savingsEntries.deletedAt)))
          .orderBy(desc(savingsEntries.createdAt), desc(savingsEntries.id))
          .limit(1);
        if (last?.id !== entryId) {
          const [target] = await tx
            .select({ id: savingsEntries.id })
            .from(savingsEntries)
            .where(
              and(
                eq(savingsEntries.id, entryId),
                eq(savingsEntries.goalId, goalId),
                isNull(savingsEntries.deletedAt),
              ),
            );
          if (!target) throw new ApiError('not_found', 'Este movimiento no existe.');
          throw new ApiError('conflict', 'Solo se puede deshacer el último movimiento.');
        }
        await tx
          .update(savingsEntries)
          .set({ deletedAt: now() })
          .where(eq(savingsEntries.id, entryId));
      });
      return reply.status(204).send();
    },
  );

  // Cerrar (RF-507): lo ahorrado vuelve hoy al mes como retirada, para que los gastos que se
  // paguen con ese dinero no cuenten dos veces. Después no pide más aportaciones.
  app.post(
    `${base}/:goalId/close`,
    { preHandler: access.requireMember('savings.write') },
    async (request): Promise<SavingsGoalDto> => {
      const { goalId } = goalParams.parse(request.params);
      const { household, member } = request.membership!;
      const today = civilDateIn(now(), household.timezone);
      await loadGoal(household.id, goalId);

      const closed = await db.transaction(async (tx) => {
        const [goal] = await tx
          .select()
          .from(savingsGoals)
          .where(eq(savingsGoals.id, goalId))
          .for('update');
        if (goal!.closedAt) throw new ApiError('conflict', 'Esta hucha ya está cerrada.');
        const entries = await tx
          .select()
          .from(savingsEntries)
          .where(and(eq(savingsEntries.goalId, goalId), isNull(savingsEntries.deletedAt)));
        const saved = savedCents(entries.map(toEntry));
        if (saved > 0) {
          await tx.insert(savingsEntries).values({
            id: uuidV7(now().getTime(), randomBytes(10)),
            householdId: household.id,
            goalId,
            memberId: member.id,
            kind: 'withdrawal',
            amountCents: saved,
            date: today,
          });
        }
        const [row] = await tx
          .update(savingsGoals)
          .set({ closedAt: now() })
          .where(eq(savingsGoals.id, goalId))
          .returning();
        return row!;
      });
      const entries = await db
        .select()
        .from(savingsEntries)
        .where(and(eq(savingsEntries.goalId, goalId), isNull(savingsEntries.deletedAt)));
      return toGoal(closed, entries, today);
    },
  );
}
