import { errorResponse, statusOf, type ErrorCode } from '@smartnomic/api';
import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

/** Error esperado de la API: se responde con su código y mensaje. */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Todas las respuestas de error con el formato `{ error: { code, message } }`
 * (constitución, art. V.3). Los errores inesperados no muestran detalles internos.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | ApiError | ZodError, request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(statusOf(error.code)).send(errorResponse(error.code, error.message));
    }
    if (error instanceof ZodError) {
      const message = error.issues
        .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ` : '') + issue.message)
        .join('; ');
      return reply.status(400).send(errorResponse('validation_failed', message));
    }
    if (error.statusCode === 429) {
      return reply
        .status(429)
        .send(errorResponse('rate_limited', 'Demasiados intentos. Espera un minuto.'));
    }
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      const code: ErrorCode =
        error.statusCode === 404
          ? 'not_found'
          : error.statusCode === 401
            ? 'unauthenticated'
            : 'validation_failed';
      return reply.status(error.statusCode).send(errorResponse(code, error.message));
    }

    request.log.error({ err: error }, 'Error inesperado');
    return reply.status(500).send(errorResponse('internal', 'Error interno del servidor.'));
  });
}
