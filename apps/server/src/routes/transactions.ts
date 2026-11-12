import { transactionInputSchema, uuidV7Schema, type Transaction } from '@smartnomic/api';
import { and, eq, getTableColumns, isNotNull, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Database } from '../db/client';
import { categories, transactions } from '../db/schema';
import { ApiError } from '../plugins/errors';
import type { HouseholdAccess } from '../plugins/household-access';
import type { ActivityNotifier } from '../push/activity';

type TransactionRow = typeof transactions.$inferSelect;

export function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    kind: row.kind,
    amountCents: row.amountCents,
    date: row.date,
    categoryId: row.categoryId,
    note: row.note,
    memberId: row.memberId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const paramsSchema = z.object({ householdId: z.uuid(), transactionId: uuidV7Schema });

const NOT_FOUND = 'Este movimiento no existe o se ha borrado.';

export function registerTransactionRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess; activity: Pick<ActivityNotifier, 'record'> },
): void {
  const { db, access, activity } = deps;
  const url = '/api/households/:householdId/transactions/:transactionId';

  // Crear o editar. Idempotente por id: reenviar la misma petición no duplica (RF-015).
  app.put(url, { preHandler: access.requireMember('transactions.write') }, async (request) => {
    const { transactionId } = paramsSchema.parse(request.params);
    const input = transactionInputSchema.parse(request.body);
    const { household, member } = request.membership!;

    const [category] = await db
      .select({ id: categories.id, name: categories.name })
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
      amountCents: input.amountCents,
      date: input.date,
      categoryId: input.categoryId,
      note: input.note || null,
    };
    const [row] = await db
      .insert(transactions)
      .values({ id: transactionId, householdId: household.id, memberId: member.id, ...values })
      .onConflictDoUpdate({
        target: transactions.id,
        set: { ...values, updatedAt: new Date() },
        // Nunca se toca un movimiento de otro hogar ni uno borrado.
        setWhere: sql`${transactions.householdId} = ${household.id} AND ${transactions.deletedAt} IS NULL`,
      })
      // `xmax = 0`: la fila se acaba de insertar. Si ya existía (editar o reenviar desde la
      // bandeja sin conexión), cae en la rama de actualizar y no se avisa (especificación 014).
      .returning({ ...getTableColumns(transactions), inserted: sql<boolean>`(xmax = 0)` });
    if (!row) throw new ApiError('not_found', NOT_FOUND);
    if (row.inserted) {
      activity.record({
        householdId: household.id,
        memberId: member.id,
        change: {
          kind: row.kind,
          amountCents: row.amountCents,
          categoryName: category.name,
          date: row.date,
        },
      });
    }
    return toTransaction(row);
  });

  // Borrado lógico (constitución, art. IV.4): se puede deshacer.
  app.delete(
    url,
    { preHandler: access.requireMember('transactions.write') },
    async (request, reply) => {
      const { transactionId } = paramsSchema.parse(request.params);
      const householdId = request.membership!.household.id;
      const mine = and(
        eq(transactions.id, transactionId),
        eq(transactions.householdId, householdId),
      );

      const [deleted] = await db
        .update(transactions)
        .set({ deletedAt: new Date() })
        .where(and(mine, isNull(transactions.deletedAt)))
        .returning({ id: transactions.id });
      if (!deleted) {
        const [alreadyDeleted] = await db
          .select({ id: transactions.id })
          .from(transactions)
          .where(and(mine, isNotNull(transactions.deletedAt)));
        if (!alreadyDeleted) throw new ApiError('not_found', NOT_FOUND);
      }
      return reply.status(204).send();
    },
  );

  app.post(
    `${url}/restore`,
    { preHandler: access.requireMember('transactions.write') },
    async (request) => {
      const { transactionId } = paramsSchema.parse(request.params);
      const householdId = request.membership!.household.id;
      const [row] = await db
        .update(transactions)
        .set({ deletedAt: null })
        .where(and(eq(transactions.id, transactionId), eq(transactions.householdId, householdId)))
        .returning();
      if (!row) throw new ApiError('not_found', NOT_FOUND);
      return toTransaction(row);
    },
  );
}
