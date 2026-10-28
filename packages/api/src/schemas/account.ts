import { z } from 'zod';
import { householdSchema } from './households';
import { recurringRuleSchema, resolvedOccurrenceSchema } from './recurring';
import { roleSchema } from './common';
import { categorySchema, transactionSchema } from './transactions';

/**
 * Respuesta de `GET /api/households/:householdId/export`: todos los datos del hogar en un
 * archivo legible (RF-038, constitución art. VI.6). De los demás miembros solo va el nombre.
 */
export const householdExportSchema = z.object({
  format: z.literal('smartnomic-export'),
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  exportedBy: z.object({ name: z.string(), email: z.string() }),
  household: householdSchema,
  members: z.array(
    z.object({ id: z.uuid(), name: z.string(), role: roleSchema, joinedAt: z.iso.datetime() }),
  ),
  categories: z.array(categorySchema),
  transactions: z.array(transactionSchema),
  recurring: z.array(recurringRuleSchema),
  occurrences: z.array(resolvedOccurrenceSchema),
});

export type HouseholdExport = z.infer<typeof householdExportSchema>;

/** Cuerpo de `DELETE /api/account`: se pide la contraseña para confirmar (RF-039). */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Escribe tu contraseña.'),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
