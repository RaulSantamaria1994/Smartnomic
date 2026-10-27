import { describe, expect, it } from 'vitest';
import { errorResponse, errorResponseSchema, statusOf } from './errors';

describe('errores de la API', () => {
  it('construye el formato único de error', () => {
    const body = errorResponse('forbidden', 'No eres miembro de este hogar');
    expect(body).toEqual({
      error: { code: 'forbidden', message: 'No eres miembro de este hogar' },
    });
    expect(errorResponseSchema.parse(body)).toEqual(body);
  });

  it('cada código tiene su estado HTTP', () => {
    expect(statusOf('validation_failed')).toBe(400);
    expect(statusOf('unauthenticated')).toBe(401);
    expect(statusOf('forbidden')).toBe(403);
    expect(statusOf('not_found')).toBe(404);
    expect(statusOf('conflict')).toBe(409);
    expect(statusOf('rate_limited')).toBe(429);
  });

  it('rechaza códigos desconocidos', () => {
    expect(errorResponseSchema.safeParse({ error: { code: 'oops', message: '' } }).success).toBe(
      false,
    );
  });
});
