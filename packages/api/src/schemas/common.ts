import { isValidDate, MAX_CENTS, ROLES } from '@smartnomic/domain';
import { z } from 'zod';

/** Identificador UUIDv7. Los movimientos lo generan en el cliente para ser idempotentes. */
export const uuidV7Schema = z.uuid({ version: 'v7' });

/** Fecha de calendario sin hora, `YYYY-MM-DD` (constitución, art. III.3). */
export const dateSchema = z
  .string()
  .refine(isValidDate, { message: 'Fecha no válida: se espera AAAA-MM-DD' });

/** Importe positivo en céntimos (constitución, art. III.1). */
export const centsSchema = z.int().positive().max(MAX_CENTS);

export const roleSchema = z.enum(ROLES);

/** Rol que se puede dar al invitar: la propiedad solo se transfiere. */
export const invitableRoleSchema = z.enum(['editor', 'viewer']);

/** Día de inicio del periodo mensual de un hogar. */
export const monthStartDaySchema = z.int().min(1).max(28);

/** Hora local `HH:MM` de los avisos. */
export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Hora no válida: se espera HH:MM' });

/** Zona horaria IANA, por ejemplo «Europe/Madrid». */
export const timeZoneSchema = z.string().refine(isTimeZone, { message: 'Zona horaria no válida' });

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
