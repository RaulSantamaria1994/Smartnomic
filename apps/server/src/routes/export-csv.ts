import { exportQuerySchema, type CsvExport } from '@smartnomic/api';
import { civilDateIn, csvFile, type CsvLabels } from '@smartnomic/domain';
import { desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Database } from '../db/client';
import { categories, members, transactions, users } from '../db/schema';
import type { HouseholdAccess } from '../plugins/household-access';
import { filtersOf } from './transaction-filters';

const paramsSchema = z.object({ householdId: z.uuid() });

/** Textos del archivo (para Excel en español). */
const LABELS: CsvLabels = {
  headers: ['Fecha', 'Tipo', 'Categoría', 'Importe (€)', 'Nota', 'Apuntado por'],
  expense: 'Gasto',
  income: 'Ingreso',
};
const FORMER_MEMBER = 'Antiguo miembro';

export function registerCsvExportRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess; now: () => Date },
): void {
  const { db, access, now } = deps;

  // Exportación a CSV con los filtros de la búsqueda (especificación 010): todos los
  // movimientos que los cumplen, en el orden de la búsqueda, con la categoría y quien lo apuntó.
  app.get(
    '/api/households/:householdId/transactions/export',
    { preHandler: access.requireMember('household.view') },
    async (request): Promise<CsvExport> => {
      paramsSchema.parse(request.params);
      const query = exportQuerySchema.parse(request.query);
      const { household } = request.membership!;
      const rows = await db
        .select({
          date: transactions.date,
          kind: transactions.kind,
          amountCents: transactions.amountCents,
          note: transactions.note,
          category: categories.name,
          author: users.name,
        })
        .from(transactions)
        .innerJoin(categories, eq(categories.id, transactions.categoryId))
        .leftJoin(members, eq(members.id, transactions.memberId))
        .leftJoin(users, eq(users.id, members.userId))
        .where(filtersOf(household.id, query))
        .orderBy(desc(transactions.date), desc(transactions.createdAt), desc(transactions.id));

      const today = civilDateIn(now(), household.timezone);
      return {
        fileName: `smartnomic-movimientos-${today}.csv`,
        csv: csvFile(
          rows.map((row) => ({ ...row, author: row.author ?? FORMER_MEMBER })),
          LABELS,
        ),
      };
    },
  );
}
