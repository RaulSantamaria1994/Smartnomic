import {
  dateSchema,
  payOccurrenceSchema,
  recurringInputSchema,
  uuidV7Schema,
  type RecurringRule,
  type ResolvedOccurrence,
} from '@smartnomic/api';
import { civilDateIn, compareDates, isOccurrence, upcoming } from '@smartnomic/domain';
import { and, asc, eq, sql, TransactionRollbackError } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Database } from '../db/client';
import {
  categories,
  members,
  occurrences,
  recurringRules,
  transactions,
  users,
} from '../db/schema';
import { ApiError } from '../plugins/errors';
import type { HouseholdAccess } from '../plugins/household-access';

type RuleRow = typeof recurringRules.$inferSelect;
type OccurrenceRow = typeof occurrences.$inferSelect;

export function toRule(row: RuleRow): RecurringRule {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    amountCents: row.amountCents,
    categoryId: row.categoryId,
    frequency: row.frequency,
    interval: row.interval,
    dayOfMonth: row.dayOfMonth,
    monthOfYear: row.monthOfYear,
    weekday: row.weekday,
    startDate: row.startDate,
    endDate: row.endDate,
    remindDaysBefore: row.remindDaysBefore as RecurringRule['remindDaysBefore'],
    active: row.active,
  };
}

export function toResolved(row: OccurrenceRow): ResolvedOccurrence {
  return {
    ruleId: row.recurringId,
    dueDate: row.dueDate,
    status: row.status,
    transactionId: row.transactionId,
    resolvedBy: row.resolvedBy,
  };
}

const ruleParams = z.object({ householdId: z.uuid(), ruleId: uuidV7Schema });
const occurrenceParams = ruleParams.extend({ dueDate: dateSchema });
const upcomingQuery = z.object({ days: z.coerce.number().int().min(0).max(60).default(30) });

const RULE_NOT_FOUND = 'Este pago recurrente no existe.';

/** ¿Cambia el calendario de la regla (y no solo el importe, el nombre o el aviso)? */
function scheduleChanged(
  before: RuleRow,
  after: Omit<RuleRow, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>,
) {
  return (
    before.frequency !== after.frequency ||
    before.interval !== after.interval ||
    before.dayOfMonth !== after.dayOfMonth ||
    before.monthOfYear !== after.monthOfYear ||
    before.weekday !== after.weekday ||
    before.startDate !== after.startDate
  );
}

export function registerRecurringRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess; now: () => Date },
): void {
  const { db, access, now } = deps;
  const base = '/api/households/:householdId/recurring';

  app.get(base, { preHandler: access.requireMember('household.view') }, async (request) => {
    const householdId = request.membership!.household.id;
    const rows = await db
      .select()
      .from(recurringRules)
      .where(eq(recurringRules.householdId, householdId))
      .orderBy(asc(recurringRules.name), asc(recurringRules.id));
    return { rules: rows.map(toRule) };
  });

  // Crear o editar (RF-022, RF-027). Idempotente por id.
  app.put(
    `${base}/:ruleId`,
    { preHandler: access.requireMember('recurring.write') },
    async (request) => {
      const { ruleId } = ruleParams.parse(request.params);
      const input = recurringInputSchema.parse(request.body);
      const { household } = request.membership!;

      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, input.categoryId),
            eq(categories.householdId, household.id),
            eq(categories.kind, input.kind),
          ),
        );
      if (!category) {
        throw new ApiError('validation_failed', 'La categoría no es de este hogar o de este tipo.');
      }

      const values = {
        kind: input.kind,
        name: input.name,
        amountCents: input.amountCents,
        categoryId: input.categoryId,
        frequency: input.frequency,
        interval: input.interval,
        dayOfMonth: input.dayOfMonth,
        monthOfYear: input.monthOfYear,
        weekday: input.weekday,
        startDate: input.startDate,
        endDate: input.endDate,
        remindDaysBefore: input.remindDaysBefore,
        active: input.active,
      };

      const [existing] = await db
        .select()
        .from(recurringRules)
        .where(eq(recurringRules.id, ruleId));
      if (existing && existing.householdId !== household.id) {
        throw new ApiError('not_found', RULE_NOT_FOUND);
      }
      if (existing && scheduleChanged(existing, values)) {
        // Un nuevo calendario empieza hoy: los vencimientos pasados ya pagados con el día
        // anterior no deben reaparecer como pendientes (RF-027).
        const today = civilDateIn(now(), household.timezone);
        if (compareDates(values.startDate, today) < 0) values.startDate = today;
        if (values.endDate && compareDates(values.endDate, values.startDate) < 0) {
          throw new ApiError('validation_failed', 'La fecha de fin no puede ser anterior a hoy.');
        }
      }

      const [row] = await db
        .insert(recurringRules)
        .values({ id: ruleId, householdId: household.id, ...values })
        .onConflictDoUpdate({
          target: recurringRules.id,
          set: { ...values, updatedAt: now() },
          setWhere: sql`${recurringRules.householdId} = ${household.id}`,
        })
        .returning();
      if (!row) throw new ApiError('not_found', RULE_NOT_FOUND);
      return toRule(row);
    },
  );

  // Borrar la regla y sus vencimientos; los movimientos ya creados se conservan (RF-027).
  app.delete(
    `${base}/:ruleId`,
    { preHandler: access.requireMember('recurring.write') },
    async (request, reply) => {
      const { ruleId } = ruleParams.parse(request.params);
      const householdId = request.membership!.household.id;
      const [deleted] = await db
        .delete(recurringRules)
        .where(and(eq(recurringRules.id, ruleId), eq(recurringRules.householdId, householdId)))
        .returning({ id: recurringRules.id });
      if (!deleted) throw new ApiError('not_found', RULE_NOT_FOUND);
      return reply.status(204).send();
    },
  );

  // Vencimientos pendientes: atrasados y de los próximos días (RF-023).
  app.get(
    '/api/households/:householdId/upcoming',
    { preHandler: access.requireMember('household.view') },
    async (request) => {
      const { days } = upcomingQuery.parse(request.query);
      const { household } = request.membership!;
      const today = civilDateIn(now(), household.timezone);

      const [rules, resolved] = await Promise.all([
        db.select().from(recurringRules).where(eq(recurringRules.householdId, household.id)),
        db.select().from(occurrences).where(eq(occurrences.householdId, household.id)),
      ]);
      const earliest = rules.reduce<string>(
        (min, r) => (compareDates(r.startDate, min) < 0 ? r.startDate : min),
        today,
      );
      return {
        today,
        occurrences: upcoming(
          rules,
          resolved.map((r) => ({ ruleId: r.recurringId, dueDate: r.dueDate })),
          today,
          days,
          earliest,
        ),
      };
    },
  );

  async function loadRule(householdId: string, ruleId: string, dueDate: string): Promise<RuleRow> {
    const [rule] = await db
      .select()
      .from(recurringRules)
      .where(and(eq(recurringRules.id, ruleId), eq(recurringRules.householdId, householdId)));
    if (!rule) throw new ApiError('not_found', RULE_NOT_FOUND);
    if (!rule.active) {
      throw new ApiError('validation_failed', 'Este pago recurrente está desactivado.');
    }
    if (!isOccurrence(rule, dueDate)) {
      throw new ApiError('validation_failed', `${dueDate} no es un vencimiento de este pago.`);
    }
    return rule;
  }

  async function existingResolution(ruleId: string, dueDate: string) {
    const [row] = await db
      .select()
      .from(occurrences)
      .where(and(eq(occurrences.recurringId, ruleId), eq(occurrences.dueDate, dueDate)));
    return row;
  }

  /** «Este vencimiento ya lo pagó Lucía.» (RF-009, caso límite de dos pagos a la vez). */
  async function alreadyResolvedMessage(row: OccurrenceRow | undefined): Promise<string> {
    const [resolver] = row?.resolvedBy
      ? await db
          .select({ name: users.name })
          .from(members)
          .innerJoin(users, eq(users.id, members.userId))
          .where(eq(members.id, row.resolvedBy))
      : [];
    if (row?.status === 'skipped') {
      return resolver
        ? `Este vencimiento ya lo omitió ${resolver.name}.`
        : 'Este vencimiento ya está omitido.';
    }
    return resolver
      ? `Este vencimiento ya lo pagó ${resolver.name}.`
      : 'Este vencimiento ya está pagado.';
  }

  // Pagar: crea el movimiento con el importe real (RF-024). Un vencimiento solo se
  // resuelve una vez, aunque dos miembros lo paguen a la vez (RF-015).
  app.post(
    `${base}/:ruleId/occurrences/:dueDate/pay`,
    { preHandler: access.requireMember('occurrences.resolve') },
    async (request) => {
      const { ruleId, dueDate } = occurrenceParams.parse(request.params);
      const input = payOccurrenceSchema.parse(request.body);
      const { household, member } = request.membership!;
      const rule = await loadRule(household.id, ruleId, dueDate);

      const resolved = await db
        .transaction(async (tx) => {
          await tx
            .insert(transactions)
            .values({
              id: input.transactionId,
              householdId: household.id,
              kind: rule.kind,
              amountCents: input.amountCents,
              date: input.date,
              categoryId: rule.categoryId,
              memberId: member.id,
              note: input.note || rule.name,
            })
            .onConflictDoNothing({ target: transactions.id });
          const [row] = await tx
            .insert(occurrences)
            .values({
              recurringId: rule.id,
              householdId: household.id,
              dueDate,
              status: 'paid',
              transactionId: input.transactionId,
              resolvedBy: member.id,
            })
            .onConflictDoNothing()
            .returning();
          // Otro miembro lo resolvió antes: se deshace el movimiento recién creado.
          if (!row) tx.rollback();
          return row;
        })
        .catch((error: unknown) => {
          if (error instanceof TransactionRollbackError) return undefined;
          throw error;
        });
      if (resolved) return toResolved(resolved);

      const existing = await existingResolution(rule.id, dueDate);
      // El mismo pago reenviado (mismo movimiento): no es un error.
      if (existing?.status === 'paid' && existing.transactionId === input.transactionId) {
        return toResolved(existing);
      }
      throw new ApiError('conflict', await alreadyResolvedMessage(existing));
    },
  );

  // Omitir: ese vencimiento no se paga y no crea movimiento (RF-025).
  app.post(
    `${base}/:ruleId/occurrences/:dueDate/skip`,
    { preHandler: access.requireMember('occurrences.resolve') },
    async (request) => {
      const { ruleId, dueDate } = occurrenceParams.parse(request.params);
      const { household, member } = request.membership!;
      const rule = await loadRule(household.id, ruleId, dueDate);

      const [row] = await db
        .insert(occurrences)
        .values({
          recurringId: rule.id,
          householdId: household.id,
          dueDate,
          status: 'skipped',
          resolvedBy: member.id,
        })
        .onConflictDoNothing()
        .returning();
      if (row) return toResolved(row);

      const existing = await existingResolution(rule.id, dueDate);
      if (existing?.status === 'skipped') return toResolved(existing);
      throw new ApiError('conflict', await alreadyResolvedMessage(existing));
    },
  );
}
