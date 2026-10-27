import { errorResponseSchema, type ErrorCode } from '@smartnomic/api';
import type { z } from 'zod';

/** Error de la API, con el código del contrato o `network` si no hubo respuesta. */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode | 'network',
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface HttpClientOptions {
  /** Dirección base de la API ('' = mismo origen). */
  baseUrl: string;
  /** Cabeceras de la sesión (la cookie en la app nativa). */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
  /** `include` en la web, para enviar la cookie de sesión. */
  credentials?: RequestCredentials;
  fetch?: typeof globalThis.fetch;
}

export interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Esquema de la respuesta: lo que llega se valida antes de usarlo. */
  schema: z.ZodType<T>;
}

export type HttpClient = <T>(path: string, options: RequestOptions<T>) => Promise<T>;

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const fetch = options.fetch ?? globalThis.fetch;

  return async (path, { method = 'GET', body, schema }) => {
    const sessionHeaders = await options.headers?.();
    let response: Response;
    try {
      response = await fetch(`${options.baseUrl}${path}`, {
        method,
        headers: {
          accept: 'application/json',
          ...(body !== undefined && { 'content-type': 'application/json' }),
          ...sessionHeaders,
        },
        ...(options.credentials && { credentials: options.credentials }),
        ...(body !== undefined && { body: JSON.stringify(body) }),
      });
    } catch {
      throw new ApiError('network', 0, 'No se puede conectar con el servidor.');
    }

    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const parsed = errorResponseSchema.safeParse(data);
      if (parsed.success) {
        throw new ApiError(parsed.data.error.code, response.status, parsed.data.error.message);
      }
      throw new ApiError('internal', response.status, `Error del servidor (${response.status}).`);
    }
    return schema.parse(data);
  };
}
