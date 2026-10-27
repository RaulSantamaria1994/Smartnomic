import { errorResponseSchema, membersResponseSchema, meResponseSchema } from '@smartnomic/api';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { members, transactions } from '../src/db/schema';
import { joinHousehold, me, newId, signUp, useTestServer, type TestUser } from './helpers';

const ctx = useTestServer();

async function household(owner: TestUser, ...others: [TestUser, 'editor' | 'viewer'][]) {
  for (const [user, role] of others) await joinHousehold(ctx.db, owner, user, role);
  return (await me(ctx.app, owner)).household.id;
}

async function memberId(user: TestUser) {
  return (await me(ctx.app, user)).member.id;
}

function call(
  user: TestUser,
  method: 'GET' | 'PATCH' | 'DELETE' | 'POST' | 'PUT',
  url: string,
  payload?: unknown,
) {
  return ctx.app.inject({
    method,
    url,
    headers: { cookie: user.cookie },
    ...(payload !== undefined && { payload: payload as Record<string, unknown> }),
  });
}

describe('lista de miembros', () => {
  it('cualquier miembro ve los nombres y roles, sin emails', async () => {
    const owner = await signUp(ctx.app, { name: 'Lucía' });
    const viewer = await signUp(ctx.app, { name: 'Marcos' });
    const householdId = await household(owner, [viewer, 'viewer']);

    const response = await call(viewer, 'GET', `/api/households/${householdId}/members`);

    expect(response.statusCode).toBe(200);
    const list = membersResponseSchema.parse(response.json()).members;
    expect(list.map((m) => [m.name, m.role, m.isMe])).toEqual([
      ['Lucía', 'owner', false],
      ['Marcos', 'viewer', true],
    ]);
    expect(response.body).not.toContain('@example.com');
  });
});

describe('cambiar el rol y quitar', () => {
  it('el propietario cambia el rol de un miembro', async () => {
    const owner = await signUp(ctx.app);
    const editor = await signUp(ctx.app);
    const householdId = await household(owner, [editor, 'editor']);

    const response = await call(
      owner,
      'PATCH',
      `/api/households/${householdId}/members/${await memberId(editor)}`,
      {
        role: 'viewer',
      },
    );

    expect(response.statusCode).toBe(200);
    expect((await me(ctx.app, editor)).member.role).toBe('viewer');
  });

  it('un editor no puede cambiar roles ni quitar miembros', async () => {
    const owner = await signUp(ctx.app);
    const editor = await signUp(ctx.app);
    const viewer = await signUp(ctx.app);
    const householdId = await household(owner, [editor, 'editor'], [viewer, 'viewer']);
    const target = await memberId(viewer);

    expect(
      (
        await call(editor, 'PATCH', `/api/households/${householdId}/members/${target}`, {
          role: 'editor',
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (await call(editor, 'DELETE', `/api/households/${householdId}/members/${target}`)).statusCode,
    ).toBe(403);
  });

  it('el propietario no puede cambiarse el rol ni quitarse a sí mismo', async () => {
    const owner = await signUp(ctx.app);
    const householdId = await household(owner);
    const self = await memberId(owner);

    expect(
      (
        await call(owner, 'PATCH', `/api/households/${householdId}/members/${self}`, {
          role: 'editor',
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (await call(owner, 'DELETE', `/api/households/${householdId}/members/${self}`)).statusCode,
    ).toBe(409);
  });

  it('quitar a alguien le deja sin acceso; sus movimientos se quedan como «antiguo miembro»', async () => {
    const owner = await signUp(ctx.app);
    const editor = await signUp(ctx.app);
    const householdId = await household(owner, [editor, 'editor']);
    const categories = (
      await call(editor, 'GET', `/api/households/${householdId}/categories`)
    ).json().categories;
    const txId = newId();
    await call(editor, 'PUT', `/api/households/${householdId}/transactions/${txId}`, {
      kind: 'expense',
      amountCents: 500,
      date: '2026-10-27',
      categoryId: categories.find((c: { kind: string }) => c.kind === 'expense').id,
    });

    const response = await call(
      owner,
      'DELETE',
      `/api/households/${householdId}/members/${await memberId(editor)}`,
    );

    expect(response.statusCode).toBe(204);
    expect((await call(editor, 'GET', `/api/households/${householdId}`)).statusCode).toBe(403);
    const [tx] = await ctx.db.select().from(transactions).where(eq(transactions.id, txId));
    expect(tx?.memberId).toBeNull();
    // Al volver a abrir la app recibe un hogar propio vacío.
    expect((await me(ctx.app, editor)).household.id).not.toBe(householdId);
  });

  it('nada de esto funciona sobre un miembro de otro hogar', async () => {
    const owner = await signUp(ctx.app);
    const stranger = await signUp(ctx.app);
    const householdId = await household(owner);

    const response = await call(
      owner,
      'DELETE',
      `/api/households/${householdId}/members/${await memberId(stranger)}`,
    );

    expect(response.statusCode).toBe(404);
    expect(await ctx.db.select().from(members).where(eq(members.userId, stranger.id))).toHaveLength(
      1,
    );
  });
});

describe('salir del hogar', () => {
  it('un miembro sale y recibe un hogar propio vacío', async () => {
    const owner = await signUp(ctx.app);
    const viewer = await signUp(ctx.app);
    const householdId = await household(owner, [viewer, 'viewer']);

    const response = await call(viewer, 'POST', `/api/households/${householdId}/leave`);

    expect(response.statusCode).toBe(200);
    const after = meResponseSchema.parse(response.json());
    expect(after.household.id).not.toBe(householdId);
    expect(after.member.role).toBe('owner');
    expect(
      await ctx.db.select().from(members).where(eq(members.householdId, householdId)),
    ).toHaveLength(1);
  });

  it('el propietario no puede salir', async () => {
    const owner = await signUp(ctx.app);
    const householdId = await household(owner);

    const response = await call(owner, 'POST', `/api/households/${householdId}/leave`);

    expect(response.statusCode).toBe(403);
  });
});

describe('pasar la propiedad', () => {
  it('el propietario la pasa a otro miembro y queda como editor', async () => {
    const owner = await signUp(ctx.app);
    const editor = await signUp(ctx.app);
    const householdId = await household(owner, [editor, 'editor']);

    const response = await call(
      owner,
      'POST',
      `/api/households/${householdId}/transfer-ownership`,
      {
        memberId: await memberId(editor),
      },
    );

    expect(response.statusCode).toBe(200);
    expect((await me(ctx.app, editor)).member.role).toBe('owner');
    expect((await me(ctx.app, owner)).member.role).toBe('editor');
    // Ahora el antiguo propietario sí puede salir.
    expect((await call(owner, 'POST', `/api/households/${householdId}/leave`)).statusCode).toBe(
      200,
    );
  });

  it('no se puede pasar a uno mismo, a alguien de fuera ni sin ser propietario', async () => {
    const owner = await signUp(ctx.app);
    const editor = await signUp(ctx.app);
    const stranger = await signUp(ctx.app);
    const householdId = await household(owner, [editor, 'editor']);
    const url = `/api/households/${householdId}/transfer-ownership`;

    expect((await call(owner, 'POST', url, { memberId: await memberId(owner) })).statusCode).toBe(
      409,
    );
    expect(
      (await call(owner, 'POST', url, { memberId: await memberId(stranger) })).statusCode,
    ).toBe(404);
    const asEditor = await call(editor, 'POST', url, { memberId: await memberId(editor) });
    expect(asEditor.statusCode).toBe(403);
    expect(errorResponseSchema.parse(asEditor.json()).error.code).toBe('forbidden');
  });
});

describe('quién resolvió un vencimiento', () => {
  it('el segundo en pagar ve quién lo pagó', async () => {
    const owner = await signUp(ctx.app, { name: 'Lucía' });
    const editor = await signUp(ctx.app, { name: 'Marcos' });
    const householdId = await household(owner, [editor, 'editor']);
    const categories = (
      await call(owner, 'GET', `/api/households/${householdId}/categories`)
    ).json().categories;
    const ruleId = newId();
    await ctx.app.inject({
      method: 'PUT',
      url: `/api/households/${householdId}/recurring/${ruleId}`,
      headers: { cookie: owner.cookie },
      payload: {
        kind: 'expense',
        name: 'Alquiler',
        amountCents: 75000,
        categoryId: categories.find((c: { name: string }) => c.name === 'Vivienda').id,
        frequency: 'monthly',
        interval: 1,
        dayOfMonth: 1,
        startDate: '2026-10-27',
      },
    });
    const pay = (user: TestUser) =>
      call(
        user,
        'POST',
        `/api/households/${householdId}/recurring/${ruleId}/occurrences/2026-11-01/pay`,
        {
          transactionId: newId(),
          amountCents: 75000,
          date: '2026-11-01',
        },
      );

    expect((await pay(owner)).statusCode).toBe(200);
    const second = await pay(editor);

    expect(second.statusCode).toBe(409);
    expect(errorResponseSchema.parse(second.json()).error.message).toBe(
      'Este vencimiento ya lo pagó Lucía.',
    );
  });
});
