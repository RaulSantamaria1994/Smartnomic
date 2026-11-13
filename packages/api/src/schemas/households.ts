import { z } from 'zod';
import { monthStartDaySchema, roleSchema, timeOfDaySchema, timeZoneSchema } from './common';

export const householdSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  currency: z.string().length(3),
  monthStartDay: monthStartDaySchema,
  timezone: timeZoneSchema,
});

export type Household = z.infer<typeof householdSchema>;

export const HOUSEHOLD_NAME_MAX_LENGTH = 60;

/** Nombre de un hogar: el mismo al crearlo y al cambiarlo en sus ajustes. */
export const householdNameSchema = z
  .string()
  .trim()
  .min(1, 'Escribe un nombre.')
  .max(HOUSEHOLD_NAME_MAX_LENGTH);

/** Cuerpo de `PATCH /api/households/:householdId` (solo el propietario, RF-003). */
export const updateHouseholdSchema = z
  .object({
    name: householdNameSchema,
    monthStartDay: monthStartDaySchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'No hay nada que cambiar.' });

export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;

export const memberSchema = z.object({
  id: z.uuid(),
  role: roleSchema,
  /** Este miembro recibe avisos de los vencimientos (RF-031). */
  remindersEnabled: z.boolean(),
  /** Hora local `HH:MM` de sus avisos (RF-030). */
  reminderTime: timeOfDaySchema,
  /**
   * Recibe avisos de lo que apuntan los demás miembros de este hogar (especificación 014,
   * RF-1407). Opcional en la respuesta: un servidor anterior no lo envía (art. V.4).
   */
  activityAlertsEnabled: z.boolean().optional(),
});

export type Member = z.infer<typeof memberSchema>;

/** Cuerpo de `PATCH /api/households/:householdId/members/me`. */
export const updateMyMemberSchema = z
  .object({
    remindersEnabled: z.boolean(),
    reminderTime: timeOfDaySchema,
    activityAlertsEnabled: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'No hay nada que cambiar.' });

export type UpdateMyMemberInput = z.infer<typeof updateMyMemberSchema>;

/** Un hogar del usuario y su rol en él. */
export const membershipSchema = z.object({ household: householdSchema, member: memberSchema });

export type Membership = z.infer<typeof membershipSchema>;

/**
 * Respuesta de `GET /api/me`: quién soy y mis hogares, del más antiguo al más nuevo
 * (especificación 013). `household` y `member` repiten el primero para la app instalada antes
 * de varios hogares (constitución, art. V.4); sin hogares son `null`.
 */
export const meResponseSchema = z.object({
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  households: z.array(membershipSchema),
  household: householdSchema.nullable(),
  member: memberSchema.nullable(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

/** Cuerpo de `POST /api/households`: crear un hogar del que se es propietario (RF-1305). */
export const createHouseholdSchema = z.object({ name: householdNameSchema });

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;

/** Cabecera con la zona horaria del dispositivo, que se envía al registrarse. */
export const TIMEZONE_HEADER = 'x-timezone';

/** Zona horaria si el dispositivo no envía una válida. */
export const DEFAULT_TIMEZONE = 'Europe/Madrid';
