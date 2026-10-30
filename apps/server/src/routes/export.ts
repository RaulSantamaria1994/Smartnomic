import type { HouseholdExport } from '@smartnomic/api';
import { asc, eq, and, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/client';
import {
  categories,
  members,
  occurrences,
  recurringRules,
  transactions,
  users,
} from '../db/schema';
import type { HouseholdAccess } from '../plugins/household-access';
import { toCategory } from './categories';
import { toHousehold } from './households';
import { toResolved, toRule } from './recurring';
import { toTransaction } from './transactions';

/**
 * Exportar todos los datos del hogar en JSON (RF-038, constitución art. VI.6). Lo puede
 * pedir cualquier miembro. De los demás miembros solo va el nombre, nunca el email.
 */
export function registerExportRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess; now: () => Date },
): void {
  const { db, access, now } = deps;

  app.get(
    '/api/households/:householdId/export',
    { preHandler: access.requireMember('data.export') },
    async (request, reply) => {
      const { household } = request.membership!;
      const user = request.user!;
      const id = household.id;
      const [memberRows, categoryRows, transactionRows, ruleRows, occurrenceRows] =
        await Promise.all([
          db
            .select({ member: members, name: users.name })
            .from(members)
            .innerJoin(users, eq(users.id, members.userId))
            .where(eq(members.householdId, id))
            .orderBy(asc(members.joinedAt), asc(members.id)),
          db
            .select()
            .from(categories)
            .where(eq(categories.householdId, id))
            .orderBy(asc(categories.kind), asc(categories.position)),
          db
            .select()
            .from(transactions)
            .where(and(eq(transactions.householdId, id), isNull(transactions.deletedAt)))
            .orderBy(asc(transactions.date), asc(transactions.id)),
          db
            .select()
            .from(recurringRules)
            .where(eq(recurringRules.householdId, id))
            .orderBy(asc(recurringRules.name), asc(recurringRules.id)),
          db
            .select()
            .from(occurrences)
            .where(eq(occurrences.householdId, id))
            .orderBy(asc(occurrences.dueDate), asc(occurrences.recurringId)),
        ]);

      const exportedAt = now();
      const body: HouseholdExport = {
        format: 'smartnomic-export',
        version: 1,
        exportedAt: exportedAt.toISOString(),
        exportedBy: { name: user.name, email: user.email },
        household: toHousehold(household),
        members: memberRows.map(({ member, name }) => ({
          id: member.id,
          name,
          role: member.role,
          joinedAt: member.joinedAt.toISOString(),
        })),
        categories: categoryRows.map(toCategory),
        transactions: transactionRows.map(toTransaction),
        recurring: ruleRows.map(toRule),
        occurrences: occurrenceRows.map(toResolved),
        // Las huchas se exportan con la tarea H019 de la especificación 005.
        savingsGoals: [],
        savingsEntries: [],
      };
      const day = exportedAt.toISOString().slice(0, 10);
      return reply
        .header('content-disposition', `attachment; filename="smartnomic-${day}.json"`)
        .header('cache-control', 'no-store')
        .send(body);
    },
  );
}
