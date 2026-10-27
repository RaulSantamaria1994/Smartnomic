import { z } from 'zod';

/**
 * Códigos de error de la API. Todas las respuestas de error tienen el formato
 * `{ "error": { "code", "message" } }` (constitución, art. V.3).
 */
export const ERROR_CODES = {
  /** 400: la petición no cumple el esquema. */
  validation_failed: 400,
  /** 401: falta la sesión o ha caducado. */
  unauthenticated: 401,
  /** 403: el usuario no es miembro del hogar o su rol no lo permite. */
  forbidden: 403,
  /** 404: el recurso no existe (o es de otro hogar). */
  not_found: 404,
  /** 409: la operación choca con el estado actual. */
  conflict: 409,
  /** 429: demasiadas peticiones. */
  rate_limited: 429,
  /** 500: error inesperado del servidor. */
  internal: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

const errorCodes = Object.keys(ERROR_CODES) as [ErrorCode, ...ErrorCode[]];

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.enum(errorCodes),
    message: z.string(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export function errorResponse(code: ErrorCode, message: string): ErrorResponse {
  return { error: { code, message } };
}

export function statusOf(code: ErrorCode): number {
  return ERROR_CODES[code];
}
