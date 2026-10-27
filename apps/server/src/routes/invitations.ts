import { randomInt } from 'node:crypto';
import {
  acceptInvitationSchema,
  createInvitationSchema,
  INVITATION_CODE_ALPHABET,
  INVITATION_CODE_LENGTH,
  INVITATION_DAYS,
  invitationCodeSchema,
  type Invitation,
  type InvitationPreview,
} from '@smartnomic/api';
import { and, asc, count, eq, gt } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AuthRateLimit } from '../auth';
import type { Database } from '../db/client';
import {
  households,
  invitations,
  members,
  recurringRules,
  transactions,
  users,
} from '../db/schema';
import { findMembership } from '../households';
import { ApiError } from '../plugins/errors';
import type { HouseholdAccess } from '../plugins/household-access';
import { meResponse } from './me';

type InvitationRow = typeof invitations.$inferSelect;

function toInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    code: row.code,
    role: row.role as Invitation['role'],
    expiresAt: row.expiresAt.toISOString(),
  };
}

function newCode(): string {
  let code = '';
  for (let i = 0; i < INVITATION_CODE_LENGTH; i += 1) {
    code += INVITATION_CODE_ALPHABET[randomInt(INVITATION_CODE_ALPHABET.length)];
  }
  return code;
}

const codeParams = z.object({ code: invitationCodeSchema });
const invitationParams = z.object({ householdId: z.uuid(), invitationId: z.uuid() });

function stateOf(row: InvitationRow, now: Date): InvitationPreview['state'] {
  if (row.status === 'used') return 'used';
  if (row.status === 'revoked') return 'revoked';
  return row.expiresAt <= now ? 'expired' : 'valid';
}

const STATE_MESSAGES = {
  expired: 'Esta invitación ha caducado. Pide una nueva.',
  used: 'Esta invitación ya se ha usado. Pide una nueva.',
  revoked: 'Esta invitación se ha anulado. Pide una nueva.',
} as const;

export function registerInvitationRoutes(
  app: FastifyInstance,
  deps: { db: Database; access: HouseholdAccess; now: () => Date; rateLimit: AuthRateLimit },
): void {
  const { db, access, now } = deps;
  const base = '/api/households/:householdId/invitations';

  app.get(base, { preHandler: access.requireMember('members.manage') }, async (request) => {
    const rows = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.householdId, request.membership!.household.id),
          eq(invitations.status, 'pending'),
          gt(invitations.expiresAt, now()),
        ),
      )
      .orderBy(asc(invitations.createdAt));
    return { invitations: rows.map(toInvitation) };
  });

  // Invitar como editor o lector, con un código que caduca a los 7 días (RF-004).
  app.post(base, { preHandler: access.requireMember('members.manage') }, async (request) => {
    const { role } = createInvitationSchema.parse(request.body);
    const { household, member } = request.membership!;
    const expiresAt = new Date(now().getTime() + INVITATION_DAYS * 24 * 60 * 60 * 1000);
    const [row] = await db
      .insert(invitations)
      .values({ householdId: household.id, role, code: newCode(), expiresAt, createdBy: member.id })
      .returning();
    return toInvitation(row!);
  });

  app.delete(
    `${base}/:invitationId`,
    { preHandler: access.requireMember('members.manage') },
    async (request, reply) => {
      const { invitationId } = invitationParams.parse(request.params);
      const [row] = await db
        .update(invitations)
        .set({ status: 'revoked' })
        .where(
          and(
            eq(invitations.id, invitationId),
            eq(invitations.householdId, request.membership!.household.id),
            eq(invitations.status, 'pending'),
          ),
        )
        .returning({ id: invitations.id });
      if (!row)
        throw new ApiError('not_found', 'Esta invitación no existe o ya no está pendiente.');
      return reply.status(204).send();
    },
  );

  async function findInvitation(code: string) {
    const [row] = await db
      .select({
        invitation: invitations,
        householdName: households.name,
        invitedBy: users.name,
      })
      .from(invitations)
      .innerJoin(households, eq(households.id, invitations.householdId))
      .leftJoin(members, eq(members.id, invitations.createdBy))
      .leftJoin(users, eq(users.id, members.userId))
      .where(eq(invitations.code, code));
    if (!row) throw new ApiError('not_found', 'No hay ninguna invitación con ese código.');
    return row;
  }

  /** Qué pasará con el hogar actual de quien acepta (RF-008). */
  async function currentHouseholdImpact(userId: string) {
    const current = await findMembership(db, userId);
    if (!current) return { current, impact: 'leave' as const, hasData: false };
    if (current.member.role !== 'owner')
      return { current, impact: 'leave' as const, hasData: false };
    const householdId = current.household.id;
    const [[people], [moves], [rules]] = await Promise.all([
      db.select({ total: count() }).from(members).where(eq(members.householdId, householdId)),
      db
        .select({ total: count() })
        .from(transactions)
        .where(eq(transactions.householdId, householdId)),
      db
        .select({ total: count() })
        .from(recurringRules)
        .where(eq(recurringRules.householdId, householdId)),
    ]);
    const hasData = (moves?.total ?? 0) + (rules?.total ?? 0) > 0;
    if ((people?.total ?? 0) > 1) return { current, impact: 'blocked' as const, hasData };
    return { current, impact: 'delete' as const, hasData };
  }

  // Ver a qué hogar invita un código antes de aceptarlo. Con límite: impide probar códigos.
  app.get(
    '/api/invitations/:code',
    { preHandler: access.requireSession, config: { rateLimit: deps.rateLimit } },
    async (request): Promise<InvitationPreview> => {
      const { code } = codeParams.parse(request.params);
      const { invitation, householdName, invitedBy } = await findInvitation(code);
      const { current, impact, hasData } = await currentHouseholdImpact(request.user!.id);
      return {
        state: stateOf(invitation, now()),
        householdName,
        invitedBy,
        role: invitation.role as InvitationPreview['role'],
        expiresAt: invitation.expiresAt.toISOString(),
        alreadyMember: current?.household.id === invitation.householdId,
        currentHousehold: impact,
        currentHouseholdHasData: hasData,
      };
    },
  );

  // Aceptar: una sola vez, aunque dos personas lo intenten a la vez (RF-004, RF-008).
  app.post(
    '/api/invitations/:code/accept',
    { preHandler: access.requireSession, config: { rateLimit: deps.rateLimit } },
    async (request) => {
      const { code } = codeParams.parse(request.params);
      const { confirmLoseData } = acceptInvitationSchema.parse(request.body ?? {});
      const user = request.user!;
      const { invitation } = await findInvitation(code);

      const state = stateOf(invitation, now());
      if (state !== 'valid') throw new ApiError('conflict', STATE_MESSAGES[state]);
      const { current, impact, hasData } = await currentHouseholdImpact(user.id);
      if (current?.household.id === invitation.householdId) {
        throw new ApiError('conflict', 'Ya eres miembro de este hogar.');
      }
      if (impact === 'blocked') {
        throw new ApiError(
          'conflict',
          'Tu hogar actual tiene más miembros: antes de unirte a otro, pasa la propiedad a uno de ellos.',
        );
      }
      if (impact === 'delete' && hasData && !confirmLoseData) {
        throw new ApiError(
          'conflict',
          'Tu hogar actual tiene datos que se borrarán. Confirma que quieres unirte.',
        );
      }

      await db.transaction(async (tx) => {
        const [used] = await tx
          .update(invitations)
          .set({ status: 'used', usedBy: user.id, usedAt: now() })
          .where(
            and(
              eq(invitations.id, invitation.id),
              eq(invitations.status, 'pending'),
              gt(invitations.expiresAt, now()),
            ),
          )
          .returning({ id: invitations.id });
        if (!used) throw new ApiError('conflict', STATE_MESSAGES.used);

        if (current && impact === 'delete') {
          await tx.delete(households).where(eq(households.id, current.household.id));
        } else if (current) {
          await tx.delete(members).where(eq(members.id, current.member.id));
        }
        await tx
          .insert(members)
          .values({ householdId: invitation.householdId, userId: user.id, role: invitation.role });
      });
      return meResponse(db, user);
    },
  );
}
