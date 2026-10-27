import { errorResponseSchema } from '@smartnomic/api';
import { describe, expect, it } from 'vitest';
import { signUp, TEST_ORIGIN, useTestServer } from './helpers';

const ctx = useTestServer({ authRateLimit: { max: 3, timeWindow: '1 minute' }, trustProxy: true });

function signIn(ip: string, email: string) {
  return ctx.app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { origin: TEST_ORIGIN, 'x-forwarded-for': ip },
    payload: { email, password: 'incorrecta-incorrecta' },
  });
}

describe('límite de peticiones en /api/auth', () => {
  it('a partir del límite responde 429 con el formato de error', async () => {
    const statuses = [];
    for (let i = 0; i < 4; i += 1)
      statuses.push((await signIn('203.0.113.1', 'a@example.com')).statusCode);

    expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
    expect(statuses[3]).toBe(429);
    const last = await signIn('203.0.113.1', 'a@example.com');
    expect(errorResponseSchema.parse(last.json()).error.code).toBe('rate_limited');
  });

  it('cuenta por IP real del cliente (detrás del proxy)', async () => {
    for (let i = 0; i < 3; i += 1) await signIn('203.0.113.2', 'b@example.com');

    expect((await signIn('203.0.113.2', 'b@example.com')).statusCode).toBe(429);
    expect((await signIn('203.0.113.3', 'b@example.com')).statusCode).toBe(401);
  });

  it('consultar la sesión (GET) no cuenta para el límite', async () => {
    const user = await signUp(ctx.app);
    for (let i = 0; i < 5; i += 1) {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/api/auth/get-session',
        headers: { cookie: user.cookie, 'x-forwarded-for': '203.0.113.4' },
      });
      expect(response.statusCode).toBe(200);
    }
  });
});
