import type { FastifyServerOptions } from 'fastify';

/**
 * Qué se escribe en los logs (constitución, art. VI). Nunca importes, notas, emails,
 * códigos de invitación ni tokens: de cada petición solo el método y la ruta sin la
 * consulta, con los secretos de la ruta tapados.
 */
const SECRET_PATHS: [RegExp, string][] = [
  [/^\/api\/invitations\/[^/]+/, '/api/invitations/***'],
  [/^\/api\/auth\/reset-password\/[^/]+/, '/api/auth/reset-password/***'],
  [/^\/invitacion\/[^/]+/, '/invitacion/***'],
];

export function redactUrl(url: string): string {
  const path = url.split('?')[0] ?? '';
  for (const [pattern, replacement] of SECRET_PATHS) {
    if (pattern.test(path)) return path.replace(pattern, replacement);
  }
  return path;
}

/**
 * Error sin su mensaje: el de la base de datos incluye la consulta con sus parámetros
 * (importes, notas, emails). Se quedan el tipo, el código y dónde ocurrió.
 */
export interface SafeError {
  [key: string]: unknown;
  type: string;
  message: string;
  stack: string;
}

export function safeError(error: unknown): SafeError {
  if (!(error instanceof Error)) return { type: typeof error, message: '', stack: '' };
  const code = (error as { code?: unknown }).code;
  const cause = error.cause instanceof Error ? safeError(error.cause) : undefined;
  return {
    type: error.name,
    message: '',
    ...(typeof code === 'string' && { code }),
    // Solo las líneas «at …» de la pila, sin el mensaje.
    stack: (error.stack ?? '')
      .split('\n')
      .filter((line) => line.trim().startsWith('at '))
      .join('\n'),
    ...(cause && { cause }),
  };
}

/** Opciones del logger de Fastify. `stream` sirve para leer los logs en los tests. */
export function loggerOptions(stream?: {
  write: (line: string) => void;
}): NonNullable<FastifyServerOptions['logger']> {
  return {
    ...(stream && { stream }),
    serializers: {
      req: (request: { method: string; url: string }) => ({
        method: request.method,
        url: redactUrl(request.url),
      }),
      err: safeError,
    },
  };
}
