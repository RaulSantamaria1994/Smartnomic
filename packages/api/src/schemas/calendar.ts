import { CALENDAR_STATUSES, isValidMonth } from '@smartnomic/domain';
import { z } from 'zod';
import { centsSchema, dateSchema, uuidV7Schema } from './common';
import { calendarSavingsSchema } from './savings';
import { transactionKindSchema } from './transactions';

/** Mes natural `YYYY-MM` (especificación 002). */
export const monthSchema = z
  .string()
  .refine(isValidMonth, { message: 'Mes no válido: se espera AAAA-MM' });

export const calendarStatusSchema = z.enum(CALENDAR_STATUSES);

/** Un vencimiento en el calendario, con su estado (RF-103, RF-104). */
export const calendarItemSchema = z.object({
  ruleId: uuidV7Schema,
  dueDate: dateSchema,
  status: calendarStatusSchema,
  kind: transactionKindSchema,
  /** Real si está pagado; previsto en los demás casos. */
  amountCents: centsSchema,
  /** Movimiento creado al pagarlo. */
  transactionId: z.uuid().nullable(),
  /** Miembro que lo pagó u omitió; `null` si está pendiente o ya no es miembro. */
  resolvedBy: z.uuid().nullable(),
});

export type CalendarItem = z.infer<typeof calendarItemSchema>;

const totalSchema = z.int().min(0);

/** Respuesta de `GET /api/households/:householdId/calendar/:month`. */
export const calendarResponseSchema = z.object({
  month: monthSchema,
  /** Hoy en la zona horaria del hogar. */
  today: dateSchema,
  /** Primer y último mes que se pueden pedir (RF-105). */
  bounds: z.object({ min: monthSchema, max: monthSchema }),
  items: z.array(calendarItemSchema),
  /** Totales del mes (RF-106): previstos de pagos y cobros y lo que queda por pagar. */
  totals: z.object({
    expenseCents: totalSchema,
    incomeCents: totalSchema,
    pendingExpenseCents: totalSchema,
  }),
  /** Aportaciones de huchas del mes (especificación 005). */
  savings: z.array(calendarSavingsSchema).default([]),
});

export type CalendarResponse = z.infer<typeof calendarResponseSchema>;
