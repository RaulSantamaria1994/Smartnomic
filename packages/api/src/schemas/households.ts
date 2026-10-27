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

export const memberSchema = z.object({
  id: z.uuid(),
  role: roleSchema,
  /** Este miembro recibe avisos de los vencimientos (RF-031). */
  remindersEnabled: z.boolean(),
  /** Hora local `HH:MM` de sus avisos (RF-030). */
  reminderTime: timeOfDaySchema,
});

export type Member = z.infer<typeof memberSchema>;

/** Cuerpo de `PATCH /api/households/:householdId/members/me`. */
export const updateMyMemberSchema = z
  .object({ remindersEnabled: z.boolean(), reminderTime: timeOfDaySchema })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'No hay nada que cambiar.' });

export type UpdateMyMemberInput = z.infer<typeof updateMyMemberSchema>;

/** Respuesta de `GET /api/me`: quién soy, mi hogar y mi rol en él. */
export const meResponseSchema = z.object({
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  household: householdSchema,
  member: memberSchema,
});

export type MeResponse = z.infer<typeof meResponseSchema>;

/** Cabecera con la zona horaria del dispositivo, que se envía al registrarse. */
export const TIMEZONE_HEADER = 'x-timezone';

/** Zona horaria si el dispositivo no envía una válida. */
export const DEFAULT_TIMEZONE = 'Europe/Madrid';
