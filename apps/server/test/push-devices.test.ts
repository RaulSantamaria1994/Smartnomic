import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { pushDevices, sessions } from '../src/db/schema';
import { signUp, TEST_ORIGIN, TEST_PASSWORD, useTestServer, type TestUser } from './helpers';

// Registro del dispositivo de avisos (especificación 014, RF-1409).
const ctx = useTestServer();

const token = (n: string) => `ExponentPushToken[${n}]`;

function put(user: TestUser | null, payload: unknown) {
  return ctx.app.inject({
    method: 'PUT',
    url: '/api/push-device',
    headers: { ...(user && { cookie: user.cookie }), origin: TEST_ORIGIN },
    payload: payload as Record<string, unknown>,
  });
}

function del(user: TestUser | null, payload: unknown) {
  return ctx.app.inject({
    method: 'DELETE',
    url: '/api/push-device',
    headers: { ...(user && { cookie: user.cookie }), origin: TEST_ORIGIN },
    payload: payload as Record<string, unknown>,
  });
}

const devices = () => ctx.db.select().from(pushDevices);

async function sessionOf(user: TestUser): Promise<string> {
  const [row] = await ctx.db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, user.id));
  return row!.id;
}

describe('PUT /api/push-device', () => {
  it('sin sesión responde 401', async () => {
    expect((await put(null, { token: token('a') })).statusCode).toBe(401);
    expect(await devices()).toHaveLength(0);
  });

  it('un token con formato malo responde 400 y no guarda nada', async () => {
    const ana = await signUp(ctx.app);
    for (const bad of ['', 'abc', 'ExponentPushToken[]', "ExponentPushToken[a'b]", 42, null]) {
      expect((await put(ana, { token: bad })).statusCode, String(bad)).toBe(400);
    }
    expect((await put(ana, {})).statusCode).toBe(400);
    expect(await devices()).toHaveLength(0);
  });

  it('el cuerpo no puede decir de quién es el dispositivo: el usuario sale de la sesión', async () => {
    const ana = await signUp(ctx.app);
    const luis = await signUp(ctx.app);
    expect((await put(ana, { token: token('a'), userId: luis.id })).statusCode).toBe(400);
    expect(await devices()).toHaveLength(0);
  });

  it('da de alta el dispositivo atado al usuario y a la sesión de la petición (204)', async () => {
    const ana = await signUp(ctx.app);
    const response = await put(ana, { token: token('a') });
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    const [row] = await devices();
    expect(row).toMatchObject({
      token: token('a'),
      userId: ana.id,
      sessionId: await sessionOf(ana),
    });
  });

  it('repetir el registro no duplica (idempotente)', async () => {
    const ana = await signUp(ctx.app);
    await put(ana, { token: token('a') });
    await put(ana, { token: token('a') });
    await put(ana, { token: token('a') });
    expect(await devices()).toHaveLength(1);
  });

  it('una persona puede registrar varios móviles', async () => {
    const ana = await signUp(ctx.app);
    await put(ana, { token: token('a') });
    await put(ana, { token: token('b') });
    expect((await devices()).map((d) => d.token).sort()).toEqual([token('a'), token('b')]);
  });

  it('si otra cuenta entra en el mismo móvil, el token pasa a su sesión', async () => {
    const ana = await signUp(ctx.app);
    const luis = await signUp(ctx.app);
    await put(ana, { token: token('movil') });
    expect((await put(luis, { token: token('movil') })).statusCode).toBe(204);
    const rows = await devices();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: luis.id, sessionId: await sessionOf(luis) });
  });

  it('actualiza la fecha del último registro al repetirlo', async () => {
    const ana = await signUp(ctx.app);
    await put(ana, { token: token('a') });
    const [first] = await devices();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await put(ana, { token: token('a') });
    const [second] = await devices();
    expect(second!.updatedAt.getTime()).toBeGreaterThan(first!.updatedAt.getTime());
    expect(second!.createdAt.getTime()).toBe(first!.createdAt.getTime());
  });
});

describe('DELETE /api/push-device', () => {
  it('sin sesión responde 401 y no borra nada', async () => {
    const ana = await signUp(ctx.app);
    await put(ana, { token: token('a') });
    expect((await del(null, { token: token('a') })).statusCode).toBe(401);
    expect(await devices()).toHaveLength(1);
  });

  it('da de baja el dispositivo propio (204)', async () => {
    const ana = await signUp(ctx.app);
    await put(ana, { token: token('a') });
    expect((await del(ana, { token: token('a') })).statusCode).toBe(204);
    expect(await devices()).toHaveLength(0);
  });

  it('un token que no existe también responde 204', async () => {
    const ana = await signUp(ctx.app);
    expect((await del(ana, { token: token('nunca') })).statusCode).toBe(204);
  });

  it('no borra el dispositivo de otra persona aunque se conozca su token', async () => {
    const ana = await signUp(ctx.app);
    const luis = await signUp(ctx.app);
    await put(luis, { token: token('luis') });
    expect((await del(ana, { token: token('luis') })).statusCode).toBe(204);
    expect(await devices()).toHaveLength(1);
  });

  it('un token con formato malo responde 400', async () => {
    const ana = await signUp(ctx.app);
    expect((await del(ana, { token: 'malo' })).statusCode).toBe(400);
  });
});

describe('el dispositivo sigue a la sesión (RF-1409, CE-1403)', () => {
  it('cerrar sesión borra el dispositivo', async () => {
    const ana = await signUp(ctx.app);
    await put(ana, { token: token('a') });
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/sign-out',
      headers: { cookie: ana.cookie, origin: TEST_ORIGIN },
      payload: {},
    });
    expect(response.statusCode).toBe(200);
    expect(await devices()).toHaveLength(0);
  });

  it('cerrar sesión en un móvil no borra los de otra persona', async () => {
    const ana = await signUp(ctx.app);
    const luis = await signUp(ctx.app);
    await put(ana, { token: token('a') });
    await put(luis, { token: token('l') });
    await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/sign-out',
      headers: { cookie: ana.cookie, origin: TEST_ORIGIN },
      payload: {},
    });
    expect((await devices()).map((d) => d.token)).toEqual([token('l')]);
  });

  it('borrar la cuenta borra sus dispositivos', async () => {
    const ana = await signUp(ctx.app);
    const luis = await signUp(ctx.app);
    await put(ana, { token: token('a') });
    await put(luis, { token: token('l') });
    const response = await ctx.app.inject({
      method: 'DELETE',
      url: '/api/account',
      headers: { cookie: ana.cookie, origin: TEST_ORIGIN },
      payload: { password: TEST_PASSWORD },
    });
    expect(response.statusCode).toBe(204);
    expect((await devices()).map((d) => d.token)).toEqual([token('l')]);
  });
});
