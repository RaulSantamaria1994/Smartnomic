import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { pushDevices, sessions } from '../src/db/schema';
import { MAX_DEVICES_PER_USER } from '../src/routes/push-devices';
import { signUp, TEST_ORIGIN, useTestServer, type TestUser } from './helpers';

// Batería de ataques a los avisos push (especificación 014, P023).
const ctx = useTestServer();

const token = (n: string | number) => `ExponentPushToken[${n}]`;

function send(
  user: TestUser | null,
  method: 'PUT' | 'DELETE',
  payload: unknown,
  extraHeaders: Record<string, string> = {},
) {
  return ctx.app.inject({
    method,
    url: '/api/push-device',
    headers: { ...(user && { cookie: user.cookie }), origin: TEST_ORIGIN, ...extraHeaders },
    payload: payload as Record<string, unknown>,
  });
}

const devices = () => ctx.db.select().from(pushDevices);

describe('muchos registros', () => {
  it('una persona no acumula dispositivos sin límite: se conservan los más recientes', async () => {
    const ana = await signUp(ctx.app);
    const total = MAX_DEVICES_PER_USER + 5;
    for (let i = 0; i < total; i++) {
      expect((await send(ana, 'PUT', { token: token(i) })).statusCode).toBe(204);
      // `updated_at` distingue los más recientes: se separan unos milisegundos.
      await new Promise((resolve) => setTimeout(resolve, 3));
    }
    const rows = await devices();
    expect(rows).toHaveLength(MAX_DEVICES_PER_USER);
    const kept = rows.map((d) => d.token);
    expect(kept).toContain(token(total - 1));
    expect(kept).not.toContain(token(0));
  });

  it('el límite es por persona: llenar los de una no borra los de otra', async () => {
    const ana = await signUp(ctx.app);
    const luis = await signUp(ctx.app);
    await send(luis, 'PUT', { token: token('luis') });
    for (let i = 0; i < MAX_DEVICES_PER_USER + 3; i++) {
      await send(ana, 'PUT', { token: token(`ana${i}`) });
    }
    expect((await devices()).map((d) => d.token)).toContain(token('luis'));
  });

  it('repetir el registro de un mismo móvil muchas veces no crea filas', async () => {
    const ana = await signUp(ctx.app);
    for (let i = 0; i < 30; i++) await send(ana, 'PUT', { token: token('movil') });
    expect(await devices()).toHaveLength(1);
  });
});

describe('tokens y cuerpos basura', () => {
  it('ningún cuerpo raro se guarda ni rompe el servidor', async () => {
    const ana = await signUp(ctx.app);
    const garbage: unknown[] = [
      [],
      [{ token: token('a') }],
      'ExponentPushToken[a]',
      { token: [token('a')] },
      { token: { $ne: null } },
      { token: token('a'), extra: true },
      { token: `ExponentPushToken[${'a'.repeat(5000)}]` },
      { token: "ExponentPushToken[a'); DROP TABLE push_devices;--]" },
      { token: 'ExponentPushToken[a\u0000b]' },
      { token: 'ExponentPushToken[ａｂｃ]' },
      { __proto__: { admin: true }, token: token('a'), constructor: 'x' },
    ];
    for (const body of garbage) {
      const response = await send(ana, 'PUT', body);
      expect(response.statusCode, JSON.stringify(body).slice(0, 60)).toBeLessThan(500);
      expect(response.statusCode, JSON.stringify(body).slice(0, 60)).toBeGreaterThanOrEqual(400);
    }
    expect(await devices()).toHaveLength(0);
    // La tabla sigue ahí y el servidor responde.
    expect((await send(ana, 'PUT', { token: token('bien') })).statusCode).toBe(204);
  });

  it('un cuerpo que no es JSON válido responde 400', async () => {
    const ana = await signUp(ctx.app);
    const response = await ctx.app.inject({
      method: 'PUT',
      url: '/api/push-device',
      headers: { cookie: ana.cookie, origin: TEST_ORIGIN, 'content-type': 'application/json' },
      payload: '{"token": ',
    });
    expect(response.statusCode).toBe(400);
  });

  it('sin cuerpo responde 400, no 500', async () => {
    const ana = await signUp(ctx.app);
    const response = await ctx.app.inject({
      method: 'PUT',
      url: '/api/push-device',
      headers: { cookie: ana.cookie, origin: TEST_ORIGIN },
    });
    expect(response.statusCode).toBe(400);
  });

  it('una cookie falsa o ajena no registra nada (401)', async () => {
    expect(
      (await send({ cookie: 'x=y' } as TestUser, 'PUT', { token: token('a') })).statusCode,
    ).toBe(401);
    expect(await devices()).toHaveLength(0);
  });
});

describe('dispositivos de otras personas', () => {
  it('no se puede borrar el de otra persona, ni pasando su id ni su token', async () => {
    const ana = await signUp(ctx.app);
    const luis = await signUp(ctx.app);
    await send(luis, 'PUT', { token: token('luis') });
    expect((await send(ana, 'DELETE', { token: token('luis') })).statusCode).toBe(204);
    expect((await send(ana, 'DELETE', { token: token('luis'), userId: luis.id })).statusCode).toBe(
      400,
    );
    expect(await devices()).toHaveLength(1);
  });

  it('registrar el token de otra persona se lo quita de su sesión (riesgo aceptado y acotado)', async () => {
    // Un token de Expo es un secreto que solo conoce el propio móvil y nuestro servidor: no sale
    // en ninguna respuesta ni en los logs. Si alguien lo conociera, `PUT` lo reasignaría (es lo
    // que permite que otra cuenta entre en el mismo móvil). Se deja escrito para que sea una
    // decisión visible: reasignar mueve el aviso, no da acceso a datos.
    const ana = await signUp(ctx.app);
    const intruso = await signUp(ctx.app);
    await send(ana, 'PUT', { token: token('ana') });
    await send(intruso, 'PUT', { token: token('ana') });
    const [row] = await devices();
    expect(row!.userId).toBe(intruso.id);
  });

  it('ninguna respuesta de la API devuelve tokens de dispositivos', async () => {
    const ana = await signUp(ctx.app);
    await send(ana, 'PUT', { token: token('secreto') });
    for (const url of ['/api/me', '/api/push-device']) {
      const response = await ctx.app.inject({
        method: 'GET',
        url,
        headers: { cookie: ana.cookie },
      });
      expect(response.body).not.toContain('ExponentPushToken');
    }
  });

  it('con la sesión caducada ya no se puede registrar ni dar de baja', async () => {
    const ana = await signUp(ctx.app);
    await ctx.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.userId, ana.id));
    expect((await send(ana, 'PUT', { token: token('a') })).statusCode).toBe(401);
    expect((await send(ana, 'DELETE', { token: token('a') })).statusCode).toBe(401);
  });
});
