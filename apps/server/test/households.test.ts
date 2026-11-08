import {
  errorResponseSchema,
  householdSchema,
  membershipSchema,
  periodResponseSchema,
  TIMEZONE_HEADER,
} from '@smartnomic/api';
import { describe, expect, it } from 'vitest';
import {
  call,
  joinHousehold,
  me,
  newId,
  signUp,
  TEST_ORIGIN,
  useTestServer,
  type TestUser,
} from './helpers';

const ctx = useTestServer();

async function setup() {
  const owner = await signUp(ctx.app, { name: 'Lucía' });
  const { household } = await me(ctx.app, owner);
  return { owner, householdId: household.id };
}

const patch = (user: TestUser, householdId: string, body: unknown) =>
  call(ctx.app, user, 'PATCH', `/api/households/${householdId}`, body);

describe('ajustes del hogar', () => {
  it('el propietario cambia el nombre y el inicio de mes', async () => {
    const { owner, householdId } = await setup();

    const response = await patch(owner, householdId, { name: '  Casa  ', monthStartDay: 25 });

    expect(response.statusCode).toBe(200);
    const household = householdSchema.parse(response.json());
    expect(household).toMatchObject({ name: 'Casa', monthStartDay: 25 });
    expect((await me(ctx.app, owner)).household.monthStartDay).toBe(25);
  });

  it('el día de inicio va del 1 al 28', async () => {
    const { owner, householdId } = await setup();
    for (const day of [0, 29, 31, 1.5]) {
      const response = await patch(owner, householdId, { monthStartDay: day });
      expect(response.statusCode, `día ${day}`).toBe(400);
      expect(errorResponseSchema.parse(response.json()).error.code).toBe('validation_failed');
    }
    expect((await patch(owner, householdId, { monthStartDay: 28 })).statusCode).toBe(200);
    expect((await patch(owner, householdId, { monthStartDay: 1 })).statusCode).toBe(200);
  });

  it('rechaza un cuerpo vacío o un nombre en blanco', async () => {
    const { owner, householdId } = await setup();
    expect((await patch(owner, householdId, {})).statusCode).toBe(400);
    expect((await patch(owner, householdId, { name: '   ' })).statusCode).toBe(400);
  });

  it('editores y lectores no pueden cambiarlos', async () => {
    const { owner, householdId } = await setup();
    const editor = await signUp(ctx.app);
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');
    await joinHousehold(ctx.db, owner, viewer, 'viewer');

    for (const user of [editor, viewer]) {
      const response = await patch(user, householdId, { monthStartDay: 10 });
      expect(response.statusCode).toBe(403);
    }
    expect((await me(ctx.app, owner)).household.monthStartDay).toBe(1);
  });

  it('nadie cambia un hogar ajeno', async () => {
    const { householdId } = await setup();
    const stranger = await signUp(ctx.app);
    expect((await patch(stranger, householdId, { monthStartDay: 10 })).statusCode).toBe(403);
  });

  it('con inicio el día 25, un gasto del 26 de octubre cuenta en «25 oct – 24 nov»', async () => {
    const { owner, householdId } = await setup();
    const { categories } = (
      await call(ctx.app, owner, 'GET', `/api/households/${householdId}/categories`)
    ).json<{ categories: { id: string; kind: string }[] }>();
    const categoryId = categories.find((c) => c.kind === 'expense')!.id;
    await call(ctx.app, owner, 'PUT', `/api/households/${householdId}/transactions/${newId()}`, {
      kind: 'expense',
      amountCents: 1200,
      date: '2026-10-26',
      categoryId,
    });

    await patch(owner, householdId, { monthStartDay: 25 });

    const period = periodResponseSchema.parse(
      (
        await call(ctx.app, owner, 'GET', `/api/households/${householdId}/periods/2026-10-25`)
      ).json(),
    );
    expect(period.period).toEqual({ start: '2026-10-25', end: '2026-11-24' });
    expect(period.summary.expenseCents).toBe(1200);
    const before = await call(
      ctx.app,
      owner,
      'GET',
      `/api/households/${householdId}/periods/2026-09-25`,
    );
    expect(periodResponseSchema.parse(before.json()).summary.expenseCents).toBe(0);
  });
});

describe('crear un hogar (especificación 013, RF-1305)', () => {
  it('se crea con nombre, como propietario, con las categorías de siempre y la zona horaria', async () => {
    const lucia = await signUp(ctx.app);
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { cookie: lucia.cookie, origin: TEST_ORIGIN, [TIMEZONE_HEADER]: 'Atlantic/Canary' },
      payload: { name: '  Piso de la playa ' },
    });
    expect(response.statusCode, response.body).toBe(201);
    const created = membershipSchema.parse(response.json());
    expect(created.household).toMatchObject({
      name: 'Piso de la playa',
      currency: 'EUR',
      monthStartDay: 1,
      timezone: 'Atlantic/Canary',
    });
    expect(created.member.role).toBe('owner');
    const categories = await call(
      ctx.app,
      lucia,
      'GET',
      `/api/households/${created.household.id}/categories`,
    );
    expect(categories.json().categories.length).toBeGreaterThan(5);
    expect((await me(ctx.app, lucia)).households).toHaveLength(2);
  });

  it('el nombre sigue las reglas de siempre; sin sesión, 401', async () => {
    const lucia = await signUp(ctx.app);
    for (const name of ['', '   ', 'x'.repeat(61)]) {
      expect((await call(ctx.app, lucia, 'POST', '/api/households', { name })).statusCode).toBe(
        400,
      );
    }
    const anonymous = await ctx.app.inject({
      method: 'POST',
      url: '/api/households',
      payload: { name: 'X' },
    });
    expect(anonymous.statusCode).toBe(401);
  });

  it('con 5 hogares no se crea otro: 409', async () => {
    const lucia = await signUp(ctx.app);
    for (let i = 0; i < 4; i++) {
      expect(
        (await call(ctx.app, lucia, 'POST', '/api/households', { name: `Hogar ${i}` })).statusCode,
      ).toBe(201);
    }
    const sixth = await call(ctx.app, lucia, 'POST', '/api/households', { name: 'Otro' });
    expect(sixth.statusCode).toBe(409);
    expect(errorResponseSchema.parse(sixth.json()).error.message).toMatch(/5 hogares/);
    expect((await me(ctx.app, lucia)).households).toHaveLength(5);
  });

  it('con 4 hogares, varios a la vez no pasan de 5', async () => {
    const lucia = await signUp(ctx.app);
    for (let i = 0; i < 3; i++)
      await call(ctx.app, lucia, 'POST', '/api/households', { name: `H${i}` });
    const results = await Promise.all(
      [1, 2, 3].map((i) =>
        call(ctx.app, lucia, 'POST', '/api/households', { name: `Carrera ${i}` }),
      ),
    );
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409, 409]);
    expect((await me(ctx.app, lucia)).households).toHaveLength(5);
  });
});

describe('borrar un hogar (especificación 013, RF-1307)', () => {
  it('el propietario y único miembro lo borra con todos sus datos', async () => {
    const lucia = await signUp(ctx.app);
    const created = membershipSchema.parse(
      (await call(ctx.app, lucia, 'POST', '/api/households', { name: 'Pruebas' })).json(),
    );
    const id = created.household.id;
    const response = await call(ctx.app, lucia, 'DELETE', `/api/households/${id}`);
    expect(response.statusCode, response.body).toBe(204);
    expect((await call(ctx.app, lucia, 'GET', `/api/households/${id}`)).statusCode).toBe(403);
    expect((await me(ctx.app, lucia)).households.map((h) => h.household.id)).not.toContain(id);
  });

  it('con más miembros, no: 409 (hay que pasar la propiedad y salir)', async () => {
    const owner = await signUp(ctx.app);
    const editor = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');
    const id = (await me(ctx.app, owner)).household.id;
    const response = await call(ctx.app, owner, 'DELETE', `/api/households/${id}`);
    expect(response.statusCode).toBe(409);
    expect(errorResponseSchema.parse(response.json()).error.message).toMatch(/propiedad/);
    expect((await call(ctx.app, owner, 'GET', `/api/households/${id}`)).statusCode).toBe(200);
  });

  it('quien no es propietario, o no es miembro, no puede borrarlo', async () => {
    const owner = await signUp(ctx.app);
    const editor = await signUp(ctx.app);
    const stranger = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');
    const id = (await me(ctx.app, owner)).household.id;
    expect((await call(ctx.app, editor, 'DELETE', `/api/households/${id}`)).statusCode).toBe(403);
    expect((await call(ctx.app, stranger, 'DELETE', `/api/households/${id}`)).statusCode).toBe(403);
  });
});
