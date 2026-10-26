import { z } from 'zod';

/** Respuesta de `GET /health`: el servidor está vivo. */
export const healthResponseSchema = z.object({ ok: z.literal(true) });

export type HealthResponse = z.infer<typeof healthResponseSchema>;
