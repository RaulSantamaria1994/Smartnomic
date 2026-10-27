import { updateMyMemberSchema, type Member } from '@smartnomic/api';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/client';
import { members } from '../db/schema';
import type { MemberRow } from '../households';
import type { HouseholdAccess } from '../plugins/household-access';

export function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    role: row.role,
    remindersEnabled: row.remindersEnabled,
    reminderTime: row.reminderTime,
  };
}

export function registerMemberRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess },
): void {
  // Cada miembro decide sus propios avisos (RF-030, RF-031).
  app.patch(
    '/api/households/:householdId/members/me',
    { preHandler: deps.access.requireMember('reminders.manageOwn') },
    async (request): Promise<Member> => {
      const input = updateMyMemberSchema.parse(request.body);
      const [row] = await deps.db
        .update(members)
        .set(input)
        .where(eq(members.id, request.membership!.member.id))
        .returning();
      return toMember(row!);
    },
  );
}
