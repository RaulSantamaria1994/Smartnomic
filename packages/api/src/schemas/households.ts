import { z } from 'zod';
import { monthStartDaySchema, roleSchema, timeZoneSchema } from './common';

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
});

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
