import { z } from 'zod';
import { householdSchema } from './households';
import { recurringRuleSchema, resolvedOccurrenceSchema } from './recurring';
import { roleSchema, timeZoneSchema } from './common';
import { savingsEntryRecordSchema, savingsGoalRecordSchema } from './savings';
import { categorySchema, transactionSchema } from './transactions';
import { budgetRecordSchema } from './budgets';

/**
 * Respuesta de `GET /api/households/:householdId/export`: todos los datos del hogar en un
 * archivo legible (RF-038, constitución art. VI.6). De los demás miembros solo va el nombre.
 */
export const householdExportSchema = z.object({
  format: z.literal('smartnomic-export'),
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  exportedBy: z.object({ name: z.string(), email: z.string() }),
  /**
   * Las preferencias de avisos de quien exporta en este hogar (especificación 014, RGPD).
   * Opcional: una exportación anterior no la lleva.
   */
  myPreferences: z
    .object({
      remindersEnabled: z.boolean(),
      reminderTime: z.string(),
      activityAlertsEnabled: z.boolean(),
    })
    .optional(),
  household: householdSchema,
  members: z.array(
    z.object({ id: z.uuid(), name: z.string(), role: roleSchema, joinedAt: z.iso.datetime() }),
  ),
  categories: z.array(categorySchema),
  transactions: z.array(transactionSchema),
  recurring: z.array(recurringRuleSchema),
  occurrences: z.array(resolvedOccurrenceSchema),
  savingsGoals: z.array(savingsGoalRecordSchema).default([]),
  savingsEntries: z.array(savingsEntryRecordSchema).default([]),
  /** Cambios de presupuesto (especificación 007). */
  budgets: z.array(budgetRecordSchema).default([]),
});

export type HouseholdExport = z.infer<typeof householdExportSchema>;

/**
 * Cuerpo de `DELETE /api/account`: contraseña si la cuenta tiene; si no (solo Google), el
 * email (especificación 016, RF-1609). El servidor no se fía del campo: mira si hay
 * contraseña.
 */
export const deleteAccountSchema = z
  .object({
    password: z.string().min(1, 'Escribe tu contraseña.').optional(),
    email: z.string().min(1, 'Escribe tu email.').optional(),
  })
  .refine((value) => Boolean(value.password || value.email), {
    message: 'Escribe tu contraseña.',
  });

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/** `GET /api/login-options`: si se puede entrar con Google (especificación 016). */
export const loginOptionsSchema = z.object({ google: z.boolean() });

export type LoginOptions = z.infer<typeof loginOptionsSchema>;

/** `PUT /api/me/timezone`: zona del dispositivo tras entrar con Google. */
export const putTimezoneSchema = z.object({ timezone: timeZoneSchema });

export type PutTimezoneInput = z.infer<typeof putTimezoneSchema>;
