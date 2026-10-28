import { createCategorySchema, updateCategorySchema, type Category } from '@smartnomic/api';
import type { TransactionKind } from '@smartnomic/domain';
import { and, asc, eq, isNull, max, ne, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Database } from '../db/client';
import { categories } from '../db/schema';
import { ApiError } from '../plugins/errors';
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

const categoryParams = z.object({ householdId: z.uuid(), categoryId: z.uuid() });

const duplicateName = (name: string) =>
  new ApiError('conflict', `Ya hay una categoría «${name}» de este tipo.`);

/** Error de PostgreSQL por romper un índice único (lo que lance drizzle o pg). */
function isUniqueViolation(error: unknown): boolean {
  const code = (e: unknown) => (e as { code?: unknown } | null)?.code;
  return code(error) === '23505' || code((error as { cause?: unknown } | null)?.cause) === '23505';
}

export function registerCategoryRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess; now: () => Date },
): void {
  const { db, access, now } = deps;
  const base = '/api/households/:householdId/categories';

  app.get(
    base,
    { preHandler: access.requireMember('household.view') },
    async (request): Promise<{ categories: Category[] }> => {
      const householdId = request.membership!.household.id;
      const rows = await db
        .select()
        .from(categories)
        .where(eq(categories.householdId, householdId))
        .orderBy(asc(categories.kind), asc(categories.position), asc(categories.name));
      return { categories: rows.map(toCategory) };
    },
  );

  /** ¿Hay otra categoría en uso con ese nombre (sin distinguir mayúsculas) y tipo? */
  async function nameTaken(
    householdId: string,
    kind: TransactionKind,
    name: string,
    exceptId?: string,
  ) {
    const [row] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.householdId, householdId),
          eq(categories.kind, kind),
          isNull(categories.archivedAt),
          sql`lower(${categories.name}) = lower(${name})`,
          exceptId ? ne(categories.id, exceptId) : undefined,
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  // Crear una categoría propia (RF-021). Va al final de las de su tipo.
  app.post(
    base,
    { preHandler: access.requireMember('categories.write') },
    async (request, reply) => {
      const input = createCategorySchema.parse(request.body);
      const householdId = request.membership!.household.id;
      if (await nameTaken(householdId, input.kind, input.name)) throw duplicateName(input.name);
      const [last] = await db
        .select({ position: max(categories.position) })
        .from(categories)
        .where(and(eq(categories.householdId, householdId), eq(categories.kind, input.kind)));
      try {
        const [row] = await db
          .insert(categories)
          .values({ ...input, householdId, position: (last?.position ?? -1) + 1 })
          .returning();
        return reply.status(201).send(toCategory(row!));
      } catch (error) {
        if (isUniqueViolation(error)) throw duplicateName(input.name);
        throw error;
      }
    },
  );

  // Renombrar, cambiar icono o color, archivar o restaurar. Archivar no toca los
  // movimientos que ya la usan: siguen contando en los resúmenes (RF-021).
  app.patch(
    `${base}/:categoryId`,
    { preHandler: access.requireMember('categories.write') },
    async (request): Promise<Category> => {
      const { categoryId } = categoryParams.parse(request.params);
      const { archived, ...changes } = updateCategorySchema.parse(request.body);
      const householdId = request.membership!.household.id;
      const [current] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.householdId, householdId)));
      if (!current) throw new ApiError('not_found', 'Esa categoría no es de este hogar.');

      const name = changes.name ?? current.name;
      const willBeActive = archived === undefined ? current.archivedAt === null : !archived;
      if (willBeActive && (await nameTaken(householdId, current.kind, name, current.id))) {
        throw duplicateName(name);
      }
      const archivedAt =
        archived === undefined
          ? current.archivedAt
          : archived
            ? (current.archivedAt ?? now())
            : null;
      try {
        const [row] = await db
          .update(categories)
          .set({ ...changes, archivedAt })
          .where(eq(categories.id, categoryId))
          .returning();
        return toCategory(row!);
      } catch (error) {
        if (isUniqueViolation(error)) throw duplicateName(name);
        throw error;
      }
    },
  );
}
