import { loginOptionsSchema, meResponseSchema } from '@smartnomic/api';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { accounts, users } from '../src/db/schema';
import { insertGoogleUser, signUp, TEST_ORIGIN, TEST_PASSWORD, useTestServer } from './helpers';

const GOOGLE = {
  clientId: 'test-google-client.apps.googleusercontent.com',
  clientSecret: 'test-google-secret',
};

const ctx = useTestServer({ google: GOOGLE });

describe('entrar con Google (especificación 016)', () => {
  it('con claves, GET /api/login-options dice que el botón está', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/login-options' });
    expect(response.statusCode).toBe(200);
    expect(loginOptionsSchema.parse(response.json())).toEqual({ google: true });
  });

  it('POST /api/auth/sign-in/social responde una URL de cuentas de Google', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/social',
      headers: { origin: TEST_ORIGIN },
      payload: { provider: 'google', callbackURL: '/' },
    });
    expect(response.statusCode).toBeLessThan(500);
    const body = typeof response.body === 'string' ? response.body : '';
    const location = response.headers.location;
    const hayGoogle =
      body.includes('accounts.google.com') ||
      (typeof location === 'string' && location.includes('accounts.google.com'));
    expect(hayGoogle).toBe(true);
  });

  it('acepta el esquema de la app como callback (G025)', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/social',
      headers: { origin: 'smartnomic://', 'expo-origin': 'smartnomic://' },
      payload: { provider: 'google', callbackURL: 'smartnomic:///' },
    });
    expect(response.statusCode).toBeLessThan(500);
    const body = typeof response.body === 'string' ? response.body : '';
    const location = response.headers.location;
    const hayGoogle =
      body.includes('accounts.google.com') ||
      (typeof location === 'string' && location.includes('accounts.google.com'));
    expect(hayGoogle).toBe(true);
  });

  it('una cuenta solo Google no tiene contraseña', async () => {
    const user = await insertGoogleUser(ctx.app, ctx.db, { name: 'Lucía' });
    const me = meResponseSchema.parse(
      (
        await ctx.app.inject({ method: 'GET', url: '/api/me', headers: { cookie: user.cookie } })
      ).json(),
    );
    expect(me.user.hasPassword).toBe(false);
  });

  it('no se crea otra cuenta con el mismo email (RF-1605)', async () => {
    const user = await insertGoogleUser(ctx.app, ctx.db, { email: 'lucia@example.com' });
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { origin: TEST_ORIGIN },
      payload: { email: user.email, password: TEST_PASSWORD, name: 'Otra Lucía' },
    });
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(await ctx.db.select().from(users).where(eq(users.email, user.email))).toHaveLength(1);
  });

  it('con contraseña y fila de Google, hasPassword sigue true y se entra con email', async () => {
    const user = await signUp(ctx.app, { email: 'juan@example.com' });
    await ctx.db.insert(accounts).values({
      id: crypto.randomUUID(),
      accountId: `google-test-${user.id}`,
      providerId: 'google',
      userId: user.id,
    });
    const me = meResponseSchema.parse(
      (
        await ctx.app.inject({ method: 'GET', url: '/api/me', headers: { cookie: user.cookie } })
      ).json(),
    );
    expect(me.user.hasPassword).toBe(true);
    const signIn = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { origin: TEST_ORIGIN },
      payload: { email: user.email, password: TEST_PASSWORD },
    });
    expect(signIn.statusCode).toBe(200);
  });
});
