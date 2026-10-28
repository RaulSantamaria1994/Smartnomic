import {
  categoriesResponseSchema,
  errorResponseSchema,
  householdExportSchema,
  type Category,
} from '@smartnomic/api';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { households, members, sessions, transactions, users } from '../src/db/schema';
import {
  call,
  joinHousehold,
  me,
  newId,
  signUp,
  TEST_ORIGIN,
  TEST_PASSWORD,
  useTestServer,
  type TestUser,
} from './helpers';

const ctx = useTestServer();

async function categoriesOf(user: TestUser, householdId: string): Promise<Category[]> {
  const response = await call(ctx.app, user, 'GET', `/api/households/${householdId}/categories`);
  return categoriesResponseSchema.parse(response.json()).categories;
}

async function addExpense(user: TestUser, householdId: string, note: string) {
  const category = (await categoriesOf(user, householdId)).find((c) => c.kind === 'expense')!;
  const id = newId();
  const response = await call(
    ctx.app,
    user,
    'PUT',
    `/api/households/${householdId}/transactions/${id}`,
    { kind: 'expense', amountCents: 1500, date: '2026-10-20', categoryId: category.id, note },
  );
  expect(response.statusCode).toBe(200);
  return id;
}

const deleteAccount = (user: TestUser, password: string = TEST_PASSWORD) =>
  call(ctx.app, user, 'DELETE', '/api/account', { password });

describe('exportar los datos del hogar', () => {
  it('cualquier miembro, también un lector, descarga todo el hogar en JSON', async () => {
    const owner = await signUp(ctx.app, { name: 'Lucía' });
    const viewer = await signUp(ctx.app, { name: 'Marcos' });
    await joinHousehold(ctx.db, owner, viewer, 'viewer');
    const householdId = (await me(ctx.app, owner)).household.id;
    const txId = await addExpense(owner, householdId, 'Cena');
    const deleted = await addExpense(owner, householdId, 'Borrado');
    await call(ctx.app, owner, 'DELETE', `/api/households/${householdId}/transactions/${deleted}`);
    const vivienda = (await categoriesOf(owner, householdId)).find((c) => c.name === 'Vivienda')!;
    const ruleId = newId();
    await call(ctx.app, owner, 'PUT', `/api/households/${householdId}/recurring/${ruleId}`, {
      kind: 'expense',
      name: 'Alquiler',
      amountCents: 75000,
      categoryId: vivienda.id,
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 1,
      startDate: '2026-10-01',
    });
    await call(
      ctx.app,
      owner,
      'POST',
      `/api/households/${householdId}/recurring/${ruleId}/occurrences/2026-10-01/skip`,
    );

    const response = await call(ctx.app, viewer, 'GET', `/api/households/${householdId}/export`);

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="smartnomic-2026-10-27.json"',
    );
    const data = householdExportSchema.parse(response.json());
    expect(data.exportedBy).toEqual({ name: 'Marcos', email: viewer.email });
    expect(data.household.id).toBe(householdId);
    expect(data.members.map((m) => [m.name, m.role])).toEqual([
      ['Lucía', 'owner'],
      ['Marcos', 'viewer'],
    ]);
    // De los demás miembros no va el email.
    expect(response.body).not.toContain(owner.email);
    expect(data.categories).toHaveLength(13);
    expect(data.transactions.map((t) => [t.id, t.note])).toEqual([[txId, 'Cena']]);
    expect(data.recurring.map((r) => r.id)).toEqual([ruleId]);
    expect(data.occurrences).toMatchObject([{ ruleId, dueDate: '2026-10-01', status: 'skipped' }]);
  });

  it('no incluye nada de otros hogares y no se puede pedir el de otro', async () => {
    const lucia = await signUp(ctx.app);
    const pablo = await signUp(ctx.app);
    const luciaHousehold = (await me(ctx.app, lucia)).household.id;
    const pabloHousehold = (await me(ctx.app, pablo)).household.id;
    await addExpense(lucia, luciaHousehold, 'De Lucía');
    await addExpense(pablo, pabloHousehold, 'De Pablo');

    const own = await call(ctx.app, lucia, 'GET', `/api/households/${luciaHousehold}/export`);
    expect(own.body).toContain('De Lucía');
    expect(own.body).not.toContain('De Pablo');
    const foreign = await call(ctx.app, lucia, 'GET', `/api/households/${pabloHousehold}/export`);
    expect(foreign.statusCode).toBe(403);
  });

  it('sin sesión, 401', async () => {
    const user = await signUp(ctx.app);
    const householdId = (await me(ctx.app, user)).household.id;
    const response = await ctx.app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/export`,
    });
    expect(response.statusCode).toBe(401);
  });
});

describe('borrar la cuenta', () => {
  it('el único miembro borra su cuenta y su hogar con todos los datos', async () => {
    const user = await signUp(ctx.app);
    const householdId = (await me(ctx.app, user)).household.id;
    await addExpense(user, householdId, 'Algo');

    const response = await deleteAccount(user);

    expect(response.statusCode).toBe(204);
    expect(await ctx.db.select().from(users).where(eq(users.id, user.id))).toEqual([]);
    expect(await ctx.db.select().from(households).where(eq(households.id, householdId))).toEqual(
      [],
    );
    expect(await ctx.db.select().from(sessions).where(eq(sessions.userId, user.id))).toEqual([]);
    expect(
      await ctx.db.select().from(transactions).where(eq(transactions.householdId, householdId)),
    ).toEqual([]);
  });

  it('después no puede entrar ni usar la sesión antigua', async () => {
    const user = await signUp(ctx.app);
    await deleteAccount(user);

    expect((await call(ctx.app, user, 'GET', '/api/me')).statusCode).toBe(401);
    const signIn = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { origin: TEST_ORIGIN },
      payload: { email: user.email, password: TEST_PASSWORD },
    });
    expect(signIn.statusCode).toBe(401);
  });

  it('pide la contraseña correcta', async () => {
    const user = await signUp(ctx.app);

    const wrong = await deleteAccount(user, 'otra-contrasena');
    expect(wrong.statusCode).toBe(400);
    expect(errorResponseSchema.parse(wrong.json()).error.message).toBe(
      'La contraseña no es correcta.',
    );
    const missing = await call(ctx.app, user, 'DELETE', '/api/account', {});
    expect(missing.statusCode).toBe(400);
    expect((await call(ctx.app, user, 'GET', '/api/me')).statusCode).toBe(200);
  });

  it('el propietario con más miembros recibe 409 y no se borra nada', async () => {
    const owner = await signUp(ctx.app);
    const editor = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');

    const response = await deleteAccount(owner);

    expect(response.statusCode).toBe(409);
    expect(errorResponseSchema.parse(response.json()).error.message).toContain('propiedad');
    expect(await ctx.db.select().from(users).where(eq(users.id, owner.id))).toHaveLength(1);
  });

  it('un miembro que no es propietario se va; sus movimientos quedan sin autor', async () => {
    const owner = await signUp(ctx.app);
    const editor = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');
    const householdId = (await me(ctx.app, owner)).household.id;
    const txId = await addExpense(editor, householdId, 'Del editor');

    expect((await deleteAccount(editor)).statusCode).toBe(204);

    const [tx] = await ctx.db.select().from(transactions).where(eq(transactions.id, txId));
    expect(tx?.memberId).toBeNull();
    const left = await ctx.db.select().from(members).where(eq(members.householdId, householdId));
    expect(left).toHaveLength(1);
  });

  it('sin sesión, 401', async () => {
    const response = await ctx.app.inject({
      method: 'DELETE',
      url: '/api/account',
      payload: { password: TEST_PASSWORD },
    });
    expect(response.statusCode).toBe(401);
  });
});
