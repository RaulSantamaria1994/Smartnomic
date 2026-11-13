import {
  householdExportSchema,
  invitationSchema,
  memberSchema,
  type Category,
} from '@smartnomic/api';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { pushDevices, sessions } from '../src/db/schema';
import { call, joinHousehold, me, newId, signUp, useTestServer, type TestUser } from './helpers';

// Preferencia de avisos de actividad por hogar (especificación 014, RF-1407, RF-1408).
const ctx = useTestServer();

async function household(owner: TestUser, ...others: [TestUser, 'editor' | 'viewer'][]) {
  for (const [user, role] of others) await joinHousehold(ctx.db, owner, user, role);
  return (await me(ctx.app, owner)).household.id;
}

const patch = (user: TestUser, householdId: string, payload: unknown) =>
  call(ctx.app, user, 'PATCH', `/api/households/${householdId}/members/me`, payload);

/** El miembro de `user` en `householdId`, según `GET /api/me`. */
async function memberIn(user: TestUser, householdId: string) {
  const body = await me(ctx.app, user);
  return body.households.find((h) => h.household.id === householdId)!.member;
}

async function secondHousehold(user: TestUser, name = 'Piso de la playa') {
  const response = await call(ctx.app, user, 'POST', '/api/households', { name });
  expect(response.statusCode).toBe(201);
  const body = await me(ctx.app, user);
  return body.households.find((h) => h.household.name === name)!.household.id;
}

async function invitationTo(owner: TestUser, householdId: string) {
  const response = await call(
    ctx.app,
    owner,
    'POST',
    `/api/households/${householdId}/invitations`,
    {
      role: 'editor',
    },
  );
  return invitationSchema.parse(response.json());
}

describe('valor por defecto', () => {
  it('al entrar en un hogar, creándolo o aceptando una invitación, los avisos están activados', async () => {
    const owner = await signUp(ctx.app);
    const own = (await me(ctx.app, owner)).household.id;
    expect((await memberIn(owner, own)).activityAlertsEnabled).toBe(true);

    const nuevo = await secondHousehold(owner);
    expect((await memberIn(owner, nuevo)).activityAlertsEnabled).toBe(true);

    const guest = await signUp(ctx.app);
    const invitation = await invitationTo(owner, own);
    const accepted = await call(
      ctx.app,
      guest,
      'POST',
      `/api/invitations/${invitation.code}/accept`,
      {
        confirmLoseData: true,
      },
    );
    expect(accepted.statusCode).toBe(200);
    expect((await memberIn(guest, own)).activityAlertsEnabled).toBe(true);
  });
});

describe('PATCH members/me con activityAlertsEnabled', () => {
  it('cada persona activa o desactiva los suyos y queda guardado', async () => {
    const owner = await signUp(ctx.app);
    const householdId = (await me(ctx.app, owner)).household.id;
    const response = await patch(owner, householdId, { activityAlertsEnabled: false });
    expect(response.statusCode).toBe(200);
    expect(memberSchema.parse(response.json()).activityAlertsEnabled).toBe(false);
    expect((await memberIn(owner, householdId)).activityAlertsEnabled).toBe(false);
    await patch(owner, householdId, { activityAlertsEnabled: true });
    expect((await memberIn(owner, householdId)).activityAlertsEnabled).toBe(true);
  });

  it('es independiente de los recordatorios de pagos (RF-1408)', async () => {
    const owner = await signUp(ctx.app);
    const householdId = (await me(ctx.app, owner)).household.id;
    await patch(owner, householdId, { activityAlertsEnabled: false });
    expect(await memberIn(owner, householdId)).toMatchObject({
      activityAlertsEnabled: false,
      remindersEnabled: true,
    });
    await patch(owner, householdId, { remindersEnabled: false });
    expect(await memberIn(owner, householdId)).toMatchObject({
      activityAlertsEnabled: false,
      remindersEnabled: false,
    });
  });

  it('solo cambia el del propio miembro, no el de los demás', async () => {
    const owner = await signUp(ctx.app);
    const guest = await signUp(ctx.app);
    const householdId = await household(owner, [guest, 'editor']);
    await patch(owner, householdId, { activityAlertsEnabled: false });
    expect((await memberIn(guest, householdId)).activityAlertsEnabled).toBe(true);
  });

  it('la preferencia es de cada hogar: apagar uno no apaga el otro', async () => {
    const owner = await signUp(ctx.app);
    const casa = (await me(ctx.app, owner)).household.id;
    const playa = await secondHousehold(owner);
    await patch(owner, playa, { activityAlertsEnabled: false });
    expect((await memberIn(owner, playa)).activityAlertsEnabled).toBe(false);
    expect((await memberIn(owner, casa)).activityAlertsEnabled).toBe(true);
  });

  it('un lector también puede cambiar la suya', async () => {
    const owner = await signUp(ctx.app);
    const viewer = await signUp(ctx.app);
    const householdId = await household(owner, [viewer, 'viewer']);
    const response = await patch(viewer, householdId, { activityAlertsEnabled: false });
    expect(response.statusCode).toBe(200);
    expect((await memberIn(viewer, householdId)).activityAlertsEnabled).toBe(false);
  });

  it('no se puede cambiar en un hogar ajeno (403)', async () => {
    const owner = await signUp(ctx.app);
    const stranger = await signUp(ctx.app);
    const householdId = (await me(ctx.app, owner)).household.id;
    expect((await patch(stranger, householdId, { activityAlertsEnabled: false })).statusCode).toBe(
      403,
    );
    expect((await memberIn(owner, householdId)).activityAlertsEnabled).toBe(true);
  });

  it('un valor que no es booleano o un cuerpo vacío responden 400', async () => {
    const owner = await signUp(ctx.app);
    const householdId = (await me(ctx.app, owner)).household.id;
    expect((await patch(owner, householdId, { activityAlertsEnabled: 'no' })).statusCode).toBe(400);
    expect((await patch(owner, householdId, {})).statusCode).toBe(400);
  });
});

describe('efecto en los avisos (CE-1402)', () => {
  it('con los avisos de un hogar apagados no llegan los de ese hogar y sí los del otro', async () => {
    const ana = await signUp(ctx.app, { name: 'Ana' });
    const juan = await signUp(ctx.app, { name: 'Juan' });
    const lola = await signUp(ctx.app, { name: 'Lola' });
    const casa = await household(ana, [juan, 'editor']);
    const playa = await secondHousehold(ana);
    const invitation = await invitationTo(ana, playa);
    await call(ctx.app, lola, 'POST', `/api/invitations/${invitation.code}/accept`, {
      confirmLoseData: true,
    });
    const [session] = await ctx.db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, ana.id));
    await ctx.db
      .insert(pushDevices)
      .values({ token: 'ExponentPushToken[ana]', userId: ana.id, sessionId: session!.id });
    await patch(ana, casa, { activityAlertsEnabled: false });

    const expenseCategory = async (user: TestUser, id: string) =>
      (
        (await call(ctx.app, user, 'GET', `/api/households/${id}/categories`)).json() as {
          categories: Category[];
        }
      ).categories.find((c) => c.kind === 'expense')!.id;
    const spend = async (user: TestUser, id: string) =>
      call(ctx.app, user, 'PUT', `/api/households/${id}/transactions/${newId()}`, {
        kind: 'expense',
        amountCents: 1000,
        date: '2026-10-27',
        categoryId: await expenseCategory(user, id),
      });

    expect((await spend(juan, casa)).statusCode).toBe(200); // hogar apagado para Ana
    await ctx.push.flush();
    expect(ctx.push.messages()).toHaveLength(0);

    expect((await spend(lola, playa)).statusCode).toBe(200); // hogar activado para Ana
    await ctx.push.flush();
    expect(ctx.push.messages().map((m) => m.to)).toEqual(['ExponentPushToken[ana]']);
  });
});

describe('exportación de datos (RGPD)', () => {
  it('incluye la preferencia de la persona en ese hogar', async () => {
    const owner = await signUp(ctx.app);
    const householdId = (await me(ctx.app, owner)).household.id;
    const exported = async () =>
      householdExportSchema.parse(
        (await call(ctx.app, owner, 'GET', `/api/households/${householdId}/export`)).json(),
      );
    expect((await exported()).myPreferences).toEqual({
      remindersEnabled: true,
      reminderTime: '09:00',
      activityAlertsEnabled: true,
    });
    await patch(owner, householdId, { activityAlertsEnabled: false });
    expect((await exported()).myPreferences?.activityAlertsEnabled).toBe(false);
  });
});
