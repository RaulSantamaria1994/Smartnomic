import { errorResponseSchema, householdSchema, meResponseSchema } from '@smartnomic/api';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { households, members } from '../src/db/schema';
import { ensureHousehold } from '../src/households';
import { signUp, TEST_ORIGIN, TEST_PASSWORD, useTestServer } from './helpers';

const ctx = useTestServer();

describe('registro', () => {
  it('crea un hogar del que el usuario es propietario, con la zona del dispositivo', async () => {
    const user = await signUp(ctx.app, { name: 'Lucía', timezone: 'Atlantic/Canary' });

    const rows = await ctx.db
      .select({ household: households, member: members })
      .from(members)
      .innerJoin(households, eq(households.id, members.householdId))
      .where(eq(members.userId, user.id));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.member.role).toBe('owner');
    expect(rows[0]?.household).toMatchObject({
      name: 'Hogar de Lucía',
      currency: 'EUR',
      monthStartDay: 1,
      timezone: 'Atlantic/Canary',
    });
  });

  it('usa Europe/Madrid si la zona horaria no es válida o no llega', async () => {
    const a = await signUp(ctx.app, { timezone: 'Marte/Olympus' });
    const b = await signUp(ctx.app);

    for (const user of [a, b]) {
      const [row] = await ctx.db
        .select({ timezone: households.timezone })
        .from(members)
        .innerJoin(households, eq(households.id, members.householdId))
        .where(eq(members.userId, user.id));
      expect(row?.timezone).toBe('Europe/Madrid');
    }
  });

  it('no crea dos hogares aunque se pida a la vez', async () => {
    const user = await signUp(ctx.app);
    await ctx.db.delete(households);

    const results = await Promise.all(
      Array.from({ length: 5 }, () => ensureHousehold(ctx.db, user, 'Europe/Madrid')),
    );

    const ids = new Set(results.map((r) => r.household.id));
    expect(ids.size).toBe(1);
    expect(await ctx.db.select().from(households)).toHaveLength(1);
  });
});

describe('GET /api/me', () => {
  it('sin sesión responde 401 con el formato de error', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/me' });

    expect(response.statusCode).toBe(401);
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('unauthenticated');
  });

  it('con sesión devuelve el usuario, su hogar y su rol', async () => {
    const user = await signUp(ctx.app, { name: 'Marcos' });

    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: user.cookie },
    });

    expect(response.statusCode).toBe(200);
    const me = meResponseSchema.parse(response.json());
    expect(me.user).toEqual({ id: user.id, name: 'Marcos', email: user.email });
    expect(me.household.name).toBe('Hogar de Marcos');
    expect(me.member.role).toBe('owner');
  });

  it('crea el hogar si el usuario no tiene', async () => {
    const user = await signUp(ctx.app);
    await ctx.db.delete(households);

    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: user.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(meResponseSchema.parse(response.json()).member.role).toBe('owner');
  });

  it('tras cerrar sesión vuelve a responder 401', async () => {
    const user = await signUp(ctx.app);
    await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/sign-out',
      headers: { cookie: user.cookie, origin: TEST_ORIGIN },
      payload: {},
    });

    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: user.cookie },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('acceso por hogar', () => {
  it('un miembro ve su hogar', async () => {
    const user = await signUp(ctx.app);
    const me = meResponseSchema.parse(
      (
        await ctx.app.inject({ method: 'GET', url: '/api/me', headers: { cookie: user.cookie } })
      ).json(),
    );

    const response = await ctx.app.inject({
      method: 'GET',
      url: `/api/households/${me.household.id}`,
      headers: { cookie: user.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(householdSchema.parse(response.json()).id).toBe(me.household.id);
  });

  it('nadie puede ver el hogar de otro (403)', async () => {
    const lucia = await signUp(ctx.app);
    const intruso = await signUp(ctx.app);
    const hogarDeLucia = meResponseSchema.parse(
      (
        await ctx.app.inject({ method: 'GET', url: '/api/me', headers: { cookie: lucia.cookie } })
      ).json(),
    ).household.id;

    const response = await ctx.app.inject({
      method: 'GET',
      url: `/api/households/${hogarDeLucia}`,
      headers: { cookie: intruso.cookie },
    });

    expect(response.statusCode).toBe(403);
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('forbidden');
  });

  it('sin sesión responde 401', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/households/019a2b3c-4d5e-7f60-8a1b-2c3d4e5f6a7b',
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('restricciones de la base de datos', () => {
  it('un hogar solo puede tener un propietario', async () => {
    const owner = await signUp(ctx.app);
    const other = await signUp(ctx.app);
    const [membership] = await ctx.db.select().from(members).where(eq(members.userId, owner.id));
    await ctx.db.delete(members).where(eq(members.userId, other.id));

    await expect(
      ctx.db
        .insert(members)
        .values({ householdId: membership!.householdId, userId: other.id, role: 'owner' }),
    ).rejects.toThrow();
  });

  it('un usuario solo puede pertenecer a un hogar', async () => {
    const user = await signUp(ctx.app);
    const other = await signUp(ctx.app);
    const [otherMembership] = await ctx.db
      .select()
      .from(members)
      .where(eq(members.userId, other.id));

    await expect(
      ctx.db
        .insert(members)
        .values({ householdId: otherMembership!.householdId, userId: user.id, role: 'editor' }),
    ).rejects.toThrow();
  });
});

describe('errores', () => {
  it('una ruta de la API que no existe responde 404 con el formato de error', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/no-existe' });

    expect(response.statusCode).toBe(404);
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('not_found');
  });

  it('entrar con una contraseña incorrecta responde 401', async () => {
    const user = await signUp(ctx.app);

    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { origin: TEST_ORIGIN },
      payload: { email: user.email, password: `${TEST_PASSWORD}-mal` },
    });

    expect(response.statusCode).toBe(401);
  });
});
