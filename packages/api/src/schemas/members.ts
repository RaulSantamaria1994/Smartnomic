import { z } from 'zod';
import { invitableRoleSchema, roleSchema } from './common';

/** Miembro del hogar tal como lo ven los demás (nombre, nunca el email). */
export const householdMemberSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: roleSchema,
  isMe: z.boolean(),
  joinedAt: z.iso.datetime(),
});

export type HouseholdMember = z.infer<typeof householdMemberSchema>;

export const membersResponseSchema = z.object({ members: z.array(householdMemberSchema) });

/** Cuerpo de `PATCH /api/households/:householdId/members/:memberId`. */
export const changeRoleSchema = z.object({ role: invitableRoleSchema });

/** Cuerpo de `POST /api/households/:householdId/transfer-ownership`. */
export const transferOwnershipSchema = z.object({ memberId: z.uuid() });

/** Código de invitación: 10 caracteres sin letras que se confundan (0/O, 1/I/L). */
export const INVITATION_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const INVITATION_CODE_LENGTH = 10;
export const invitationCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(new RegExp(`^[${INVITATION_CODE_ALPHABET}]{${INVITATION_CODE_LENGTH}}$`), {
    message: 'El código de invitación no es válido.',
  });

/** Días que dura una invitación (especificación 001, RF-004). */
export const INVITATION_DAYS = 7;

export const createInvitationSchema = z.object({ role: invitableRoleSchema });

export const invitationSchema = z.object({
  id: z.uuid(),
  code: invitationCodeSchema,
  role: invitableRoleSchema,
  expiresAt: z.iso.datetime(),
});

export type Invitation = z.infer<typeof invitationSchema>;

export const invitationsResponseSchema = z.object({ invitations: z.array(invitationSchema) });

export const invitationStateSchema = z.enum(['valid', 'expired', 'used', 'revoked']);

/** Respuesta de `GET /api/invitations/:code`: qué pasará si la aceptas. */
export const invitationPreviewSchema = z.object({
  state: invitationStateSchema,
  householdName: z.string(),
  invitedBy: z.string().nullable(),
  role: invitableRoleSchema,
  expiresAt: z.iso.datetime(),
  /** Ya eres miembro de ese hogar. */
  alreadyMember: z.boolean(),
  /**
   * Qué pasa con tu hogar actual al aceptar: `delete` (eres su único miembro y se borra),
   * `leave` (sales de él) o `blocked` (eres su propietario y tiene más miembros: antes
   * tienes que pasar la propiedad).
   */
  currentHousehold: z.enum(['delete', 'leave', 'blocked']),
  /** Tu hogar actual tiene movimientos o pagos recurrentes que se perderían. */
  currentHouseholdHasData: z.boolean(),
});

export type InvitationPreview = z.infer<typeof invitationPreviewSchema>;

/** Cuerpo de `POST /api/invitations/:code/accept`. */
export const acceptInvitationSchema = z.object({
  /** Confirmo que se borre mi hogar actual con sus datos. */
  confirmLoseData: z.boolean().default(false),
});
