import { budgetInputSchema, type BudgetRecord } from '@smartnomic/api';
import { civilDateIn, periodOf } from '@smartnomic/domain';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Database } from '../db/client';
import { budgets, categories } from '../db/schema';
import { ApiError } from '../plugins/errors';
import type { Membership } from '../households';
import type { HouseholdAccess } from '../plugins/household-access';

const paramsSchema = z.object({ householdId: z.uuid(), categoryId: z.uuid() });
const NOT_FOUND = 'No existe esa categoría.';

export function registerBudgetRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess; now: () => Date },
): void {
  const { db, access, now } = deps;
  const base = '/api/households/:householdId/budgets/:categoryId';

  /** Inicio del periodo en curso del hogar: desde ahí vale el cambio (RF-702). */
  const currentPeriodStart = ({ household }: Membership) =>
    periodOf(civilDateIn(now(), household.timezone), household.monthStartDay).start;

  /** La categoría de gasto en uso del hogar, o el error que toque. */
  async function expenseCategory(membership: Membership, categoryId: string) {
    const [category] = await db.select().from(categories).where(eq(categories.id, categoryId));
    if (!category || category.householdId !== membership.household.id) {
      throw new ApiError('not_found', NOT_FOUND);
    }
    if (category.kind !== 'expense') {
      throw new ApiError('conflict', 'Solo las categorías de gasto llevan presupuesto.');
    }
    if (category.archivedAt) {
      throw new ApiError(
        'conflict',
        'Esta categoría está archivada: restáurala para ponerle presupuesto.',
      );
    }
    return category;
  }

  /** Escribe el presupuesto del periodo en curso: repetir el mismo cambio no crea filas. */
  async function write(membership: Membership, categoryId: string, amountCents: number | null) {
    const validFrom = currentPeriodStart(membership);
    await db
      .insert(budgets)
      .values({
        householdId: membership.household.id,
        categoryId,
        validFrom,
        amountCents,
        memberId: membership.member.id,
      })
      .onConflictDoUpdate({
        target: [budgets.categoryId, budgets.validFrom],
        set: { amountCents, memberId: membership.member.id, updatedAt: now() },
      });
    return validFrom;
  }

  // Poner o cambiar el presupuesto desde el periodo en curso (RF-701, RF-702).
  app.put(base, { preHandler: access.requireMember('budgets.write') }, async (request) => {
    const { categoryId } = paramsSchema.parse(request.params);
    const { amountCents } = budgetInputSchema.parse(request.body);
    const membership = request.membership!;
    await expenseCategory(membership, categoryId);
    const validFrom = await write(membership, categoryId, amountCents);
    return { categoryId, validFrom, amountCents } satisfies BudgetRecord;
  });

  // Quitarlo desde el periodo en curso; los pasados conservan el suyo.
  app.delete(
    base,
    { preHandler: access.requireMember('budgets.write') },
    async (request, reply) => {
      const { categoryId } = paramsSchema.parse(request.params);
      const membership = request.membership!;
      await expenseCategory(membership, categoryId);
      await write(membership, categoryId, null);
      return reply.status(204).send();
    },
  );
}
