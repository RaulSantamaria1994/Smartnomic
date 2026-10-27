import {
  changeRoleSchema,
  transferOwnershipSchema,
  updateMyMemberSchema,
  type HouseholdMember,
  type Member,
} from '@smartnomic/api';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Database } from '../db/client';
import { members, users } from '../db/schema';
import type { MemberRow } from '../households';
import { ApiError } from '../plugins/errors';
import type { HouseholdAccess } from '../plugins/household-access';
import { meResponse } from './me';

export function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    role: row.role,
    remindersEnabled: row.remindersEnabled,
    reminderTime: row.reminderTime,
  };
}

const memberParams = z.object({ householdId: z.uuid(), memberId: z.uuid() });

const MEMBER_NOT_FOUND = 'Esa persona no es miembro de este hogar.';

export function registerMemberRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess },
): void {
  const { db, access } = deps;
  const base = '/api/households/:householdId';

  // Miembros con su nombre (nunca el email) y rol (RF-009).
  app.get(
    `${base}/members`,
    { preHandler: access.requireMember('household.view') },
    async (request) => {
      const { household, member: me } = request.membership!;
      const rows = await db
        .select({ member: members, name: users.name })
        .from(members)
        .innerJoin(users, eq(users.id, members.userId))
        .where(eq(members.householdId, household.id))
        .orderBy(sql`${members.role} = 'owner' DESC`, asc(members.joinedAt), asc(members.id));
      const list: HouseholdMember[] = rows.map(({ member, name }) => ({
        id: member.id,
        name,
        role: member.role,
        isMe: member.id === me.id,
        joinedAt: member.joinedAt.toISOString(),
      }));
      return { members: list };
    },
  );

  // Cada miembro decide sus propios avisos (RF-030, RF-031).
  app.patch(
    `${base}/members/me`,
    { preHandler: access.requireMember('reminders.manageOwn') },
    async (request): Promise<Member> => {
      const input = updateMyMemberSchema.parse(request.body);
      const [row] = await db
        .update(members)
        .set(input)
        .where(eq(members.id, request.membership!.member.id))
        .returning();
      return toMember(row!);
    },
  );

  /** Otro miembro del mismo hogar; ni uno mismo ni el propietario. */
  async function otherMember(householdId: string, memberId: string, selfId: string) {
    if (memberId === selfId) {
      throw new ApiError('conflict', 'No puedes hacer esto contigo. Pasa antes la propiedad.');
    }
    const [target] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, memberId), eq(members.householdId, householdId)));
    if (!target) throw new ApiError('not_found', MEMBER_NOT_FOUND);
    return target;
  }

  // Cambiar el rol de un miembro (RF-005).
  app.patch(
    `${base}/members/:memberId`,
    { preHandler: access.requireMember('members.manage') },
    async (request): Promise<Member> => {
      const { memberId } = memberParams.parse(request.params);
      const { role } = changeRoleSchema.parse(request.body);
      const { household, member: me } = request.membership!;
      await otherMember(household.id, memberId, me.id);
      const [row] = await db
        .update(members)
        .set({ role })
        .where(eq(members.id, memberId))
        .returning();
      return toMember(row!);
    },
  );

  // Quitar a un miembro: deja de ver el hogar; sus movimientos se conservan (RF-005).
  app.delete(
    `${base}/members/:memberId`,
    { preHandler: access.requireMember('members.manage') },
    async (request, reply) => {
      const { memberId } = memberParams.parse(request.params);
      const { household, member: me } = request.membership!;
      await otherMember(household.id, memberId, me.id);
      await db.delete(members).where(eq(members.id, memberId));
      return reply.status(204).send();
    },
  );

  // Salir del hogar: se crea uno propio vacío (RF-007). El propietario no puede.
  app.post(
    `${base}/leave`,
    { preHandler: access.requireMember('household.leave') },
    async (request) => {
      const { household, member } = request.membership!;
      await db.delete(members).where(eq(members.id, member.id));
      return meResponse(db, request.user!, household.timezone);
    },
  );

  // Pasar la propiedad: el propietario queda como editor (RF-005, RF-039).
  app.post(
    `${base}/transfer-ownership`,
    { preHandler: access.requireMember('members.manage') },
    async (request) => {
      const { memberId } = transferOwnershipSchema.parse(request.body);
      const { household, member: me } = request.membership!;
      await otherMember(household.id, memberId, me.id);
      await db.transaction(async (tx) => {
        // Primero deja de ser propietario: solo puede haber uno.
        await tx.update(members).set({ role: 'editor' }).where(eq(members.id, me.id));
        await tx.update(members).set({ role: 'owner' }).where(eq(members.id, memberId));
      });
      return meResponse(db, request.user!);
    },
  );
}
