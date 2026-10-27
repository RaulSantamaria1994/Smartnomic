import type { Category } from '@smartnomic/api';
import { asc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/client';
import { categories } from '../db/schema';
import type { HouseholdAccess } from '../plugins/household-access';

type CategoryRow = typeof categories.$inferSelect;

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    icon: row.icon,
    color: row.color,
    archived: row.archivedAt !== null,
  };
}

export function registerCategoryRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess },
): void {
  app.get(
    '/api/households/:householdId/categories',
    { preHandler: deps.access.requireMember('household.view') },
    async (request): Promise<{ categories: Category[] }> => {
      const householdId = request.membership!.household.id;
      const rows = await deps.db
        .select()
        .from(categories)
        .where(eq(categories.householdId, householdId))
        .orderBy(asc(categories.kind), asc(categories.position), asc(categories.name));
      return { categories: rows.map(toCategory) };
    },
  );
}
