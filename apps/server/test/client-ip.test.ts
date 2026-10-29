import { describe, expect, it } from 'vitest';
import { TEST_ORIGIN, useTestServer } from './helpers';

// En producción la IP del cliente sale de la cabecera que escribe el proxy de Railway
// (X-Real-IP), no de X-Forwarded-For, cuyo principio puede inventárselo el cliente.
const ctx = useTestServer({
  authRateLimit: { max: 3, timeWindow: '1 minute' },
  trustProxy: true,
  clientIpHeader: 'x-real-ip',
});

function signIn(headers: Record<string, string>) {
  return ctx.app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { origin: TEST_ORIGIN, ...headers },
    payload: { email: 'nadie@example.com', password: 'incorrecta-incorrecta' },
  });
}

describe('IP del cliente para el límite de peticiones', () => {
  it('cambiar X-Forwarded-For no salta el límite', async () => {
    const statuses = [];
    for (let i = 0; i < 6; i += 1) {
      const response = await signIn({
        'x-real-ip': '203.0.113.10',
        'x-forwarded-for': `198.51.100.${i + 1}, 203.0.113.10`,
      });
      statuses.push(response.statusCode);
    }
    expect(statuses).toEqual([401, 401, 401, 429, 429, 429]);
  });

  it('cada IP real tiene su propio límite', async () => {
    for (let i = 0; i < 3; i += 1) await signIn({ 'x-real-ip': '203.0.113.20' });
    expect((await signIn({ 'x-real-ip': '203.0.113.20' })).statusCode).toBe(429);
    expect((await signIn({ 'x-real-ip': '203.0.113.21' })).statusCode).toBe(401);
  });
});
