import { z } from 'zod';

/**
 * Qué parte del hogar ha cambiado (especificación 012). El aviso no lleva datos: la app solo
 * recarga las consultas de ese ámbito.
 */
export const REALTIME_SCOPES = [
  'transactions',
  'recurring',
  'savings',
  'budgets',
  'categories',
  'household',
  'members',
] as const;

export const realtimeScopeSchema = z.enum(REALTIME_SCOPES);
export type RealtimeScope = z.infer<typeof realtimeScopeSchema>;

/** Mensajes de `GET /api/realtime` (WebSocket), del servidor a la app. */
export const realtimeMessageSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('changed'), scope: realtimeScopeSchema }),
  z.strictObject({ type: z.literal('ping') }),
]);

export type RealtimeMessage = z.infer<typeof realtimeMessageSchema>;
