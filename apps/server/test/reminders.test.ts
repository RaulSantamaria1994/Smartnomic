import { errorResponseSchema, memberSchema } from '@smartnomic/api';
import { describe, expect, it } from 'vitest';
import { joinHousehold, me, signUp, useTestServer, type TestUser } from './helpers';

const ctx = useTestServer();

async function patchMe(user: TestUser, body: unknown) {
  const householdId = (await me(ctx.app, user)).household.id;
  return ctx.app.inject({
    method: 'PATCH',
    url: `/api/households/${householdId}/members/me`,
    headers: { cookie: user.cookie },
    payload: body as Record<string, unknown>,
  });
}

describe('avisos de cada miembro', () => {
  it('por defecto, avisos activados a las 09:00', async () => {
    const user = await signUp(ctx.app);

    expect((await me(ctx.app, user)).member).toMatchObject({
      remindersEnabled: true,
      reminderTime: '09:00',
    });
  });

  it('cada miembro cambia sus avisos sin afectar a los demás', async () => {
    const owner = await signUp(ctx.app);
    const editor = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');

    const response = await patchMe(editor, { remindersEnabled: false, reminderTime: '20:30' });

    expect(response.statusCode).toBe(200);
    expect(memberSchema.parse(response.json())).toMatchObject({
      remindersEnabled: false,
      reminderTime: '20:30',
    });
    expect((await me(ctx.app, editor)).member).toMatchObject({
      remindersEnabled: false,
      reminderTime: '20:30',
    });
    expect((await me(ctx.app, owner)).member).toMatchObject({
      remindersEnabled: true,
      reminderTime: '09:00',
    });
  });

  it('un lector también puede cambiar sus propios avisos', async () => {
    const owner = await signUp(ctx.app);
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');

    expect((await patchMe(viewer, { reminderTime: '07:15' })).statusCode).toBe(200);
  });

  it('rechaza horas no válidas y peticiones vacías', async () => {
    const user = await signUp(ctx.app);

    for (const body of [
      { reminderTime: '9:00' },
      { reminderTime: '25:00' },
      {},
      { remindersEnabled: 'sí' },
    ]) {
      const response = await patchMe(user, body);
      expect(response.statusCode).toBe(400);
      expect(errorResponseSchema.parse(response.json()).error.code).toBe('validation_failed');
    }
  });

  it('nadie puede cambiar los avisos en un hogar ajeno', async () => {
    const owner = await signUp(ctx.app);
    const intruso = await signUp(ctx.app);
    const householdId = (await me(ctx.app, owner)).household.id;

    const response = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/households/${householdId}/members/me`,
      headers: { cookie: intruso.cookie },
      payload: { remindersEnabled: false },
    });

    expect(response.statusCode).toBe(403);
  });
});
