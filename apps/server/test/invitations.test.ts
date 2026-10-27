import {
  errorResponseSchema,
  invitationPreviewSchema,
  invitationSchema,
  invitationsResponseSchema,
  meResponseSchema,
} from '@smartnomic/api';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { households, invitations, members, recurringRules } from '../src/db/schema';
import {
  joinHousehold,
  me,
  newId,
  signUp,
  TEST_NOW,
  useTestServer,
  type TestUser,
} from './helpers';

const ctx = useTestServer();

async function invite(owner: TestUser, role: 'editor' | 'viewer' = 'editor') {
  const householdId = (await me(ctx.app, owner)).household.id;
  const response = await ctx.app.inject({
    method: 'POST',
    url: `/api/households/${householdId}/invitations`,
    headers: { cookie: owner.cookie },
    payload: { role },
  });
  expect(response.statusCode).toBe(200);
  return { householdId, invitation: invitationSchema.parse(response.json()) };
}

function preview(user: TestUser, code: string) {
  return ctx.app.inject({
    method: 'GET',
    url: `/api/invitations/${code}`,
    headers: { cookie: user.cookie },
  });
}

function accept(user: TestUser, code: string, confirmLoseData = false) {
  return ctx.app.inject({
    method: 'POST',
    url: `/api/invitations/${code}/accept`,
    headers: { cookie: user.cookie },
    payload: { confirmLoseData },
  });
}

async function addTransaction(user: TestUser) {
  const { household } = await me(ctx.app, user);
  const categories = (
    await ctx.app.inject({
      method: 'GET',
      url: `/api/households/${household.id}/categories`,
      headers: { cookie: user.cookie },
    })
  ).json().categories as { id: string; kind: string }[];
  const response = await ctx.app.inject({
    method: 'PUT',
    url: `/api/households/${household.id}/transactions/${newId()}`,
    headers: { cookie: user.cookie },
    payload: {
      kind: 'expense',
      amountCents: 100,
      date: '2026-10-27',
      categoryId: categories.find((c) => c.kind === 'expense')!.id,
    },
  });
  expect(response.statusCode).toBe(200);
}

describe('crear invitaciones', () => {
  it('el propietario crea una invitación con código y caducidad de 7 días', async () => {
    const owner = await signUp(ctx.app);
    const { householdId, invitation } = await invite(owner, 'viewer');

    expect(invitation.role).toBe('viewer');
    expect(invitation.code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/);
    expect(Date.parse(invitation.expiresAt) - TEST_NOW.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    const list = invitationsResponseSchema.parse(
      (
        await ctx.app.inject({
          method: 'GET',
          url: `/api/households/${householdId}/invitations`,
          headers: { cookie: owner.cookie },
        })
      ).json(),
    );
    expect(list.invitations.map((i) => i.code)).toEqual([invitation.code]);
  });

  it('solo el propietario puede invitar; no se puede invitar como propietario', async () => {
    const owner = await signUp(ctx.app);
    const editor = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');
    const householdId = (await me(ctx.app, owner)).household.id;

    const asEditor = await ctx.app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/invitations`,
      headers: { cookie: editor.cookie },
      payload: { role: 'editor' },
    });
    const asOwnerRole = await ctx.app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/invitations`,
      headers: { cookie: owner.cookie },
      payload: { role: 'owner' },
    });

    expect(asEditor.statusCode).toBe(403);
    expect(asOwnerRole.statusCode).toBe(400);
  });
});

describe('aceptar invitaciones', () => {
  it('quien acepta pasa a ser miembro con el rol indicado y su hogar vacío se borra', async () => {
    const owner = await signUp(ctx.app, { name: 'Lucía' });
    const marcos = await signUp(ctx.app, { name: 'Marcos' });
    const oldHousehold = (await me(ctx.app, marcos)).household.id;
    const { householdId, invitation } = await invite(owner, 'editor');

    const before = invitationPreviewSchema.parse((await preview(marcos, invitation.code)).json());
    expect(before).toMatchObject({
      state: 'valid',
      householdName: 'Hogar de Lucía',
      invitedBy: 'Lucía',
      role: 'editor',
      alreadyMember: false,
      currentHousehold: 'delete',
      currentHouseholdHasData: false,
    });

    const response = await accept(marcos, invitation.code);

    expect(response.statusCode).toBe(200);
    const after = meResponseSchema.parse(response.json());
    expect(after.household.id).toBe(householdId);
    expect(after.member.role).toBe('editor');
    expect(
      await ctx.db.select().from(households).where(eq(households.id, oldHousehold)),
    ).toHaveLength(0);
    const [row] = await ctx.db.select().from(invitations);
    expect(row?.status).toBe('used');
  });

  it('el código vale en minúsculas y con espacios', async () => {
    const owner = await signUp(ctx.app);
    const guest = await signUp(ctx.app);
    const { invitation } = await invite(owner);

    expect((await accept(guest, ` ${invitation.code.toLowerCase()} `)).statusCode).toBe(200);
  });

  it('si el hogar actual tiene datos, exige confirmación', async () => {
    const owner = await signUp(ctx.app);
    const guest = await signUp(ctx.app);
    await addTransaction(guest);
    const { householdId, invitation } = await invite(owner);

    expect(
      invitationPreviewSchema.parse((await preview(guest, invitation.code)).json())
        .currentHouseholdHasData,
    ).toBe(true);
    const refused = await accept(guest, invitation.code);
    expect(refused.statusCode).toBe(409);
    expect((await me(ctx.app, guest)).household.id).not.toBe(householdId);

    const confirmed = await accept(guest, invitation.code, true);
    expect(confirmed.statusCode).toBe(200);
    expect((await me(ctx.app, guest)).household.id).toBe(householdId);
  });

  it('un miembro (no propietario) de otro hogar sale de él al aceptar, sin borrarlo', async () => {
    const owner = await signUp(ctx.app);
    const otherOwner = await signUp(ctx.app);
    const guest = await signUp(ctx.app);
    await joinHousehold(ctx.db, otherOwner, guest, 'editor');
    const otherHousehold = (await me(ctx.app, otherOwner)).household.id;
    const { householdId, invitation } = await invite(owner);

    expect(
      invitationPreviewSchema.parse((await preview(guest, invitation.code)).json())
        .currentHousehold,
    ).toBe('leave');
    expect((await accept(guest, invitation.code)).statusCode).toBe(200);
    expect((await me(ctx.app, guest)).household.id).toBe(householdId);
    expect(
      await ctx.db.select().from(households).where(eq(households.id, otherHousehold)),
    ).toHaveLength(1);
  });

  it('el propietario de un hogar con más miembros no puede aceptar sin pasar antes la propiedad', async () => {
    const owner = await signUp(ctx.app);
    const guest = await signUp(ctx.app);
    const guestPartner = await signUp(ctx.app);
    await joinHousehold(ctx.db, guest, guestPartner, 'editor');
    const { invitation } = await invite(owner);

    expect(
      invitationPreviewSchema.parse((await preview(guest, invitation.code)).json())
        .currentHousehold,
    ).toBe('blocked');
    const response = await accept(guest, invitation.code, true);
    expect(response.statusCode).toBe(409);
    expect(errorResponseSchema.parse(response.json()).error.message).toMatch(/propiedad/);
  });

  it('una invitación sirve una sola vez', async () => {
    const owner = await signUp(ctx.app);
    const a = await signUp(ctx.app);
    const b = await signUp(ctx.app);
    const { invitation } = await invite(owner);

    const results = await Promise.all([accept(a, invitation.code), accept(b, invitation.code)]);

    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    expect(invitationPreviewSchema.parse((await preview(b, invitation.code)).json()).state).toBe(
      'used',
    );
  });

  it('caducada o anulada no sirve', async () => {
    const owner = await signUp(ctx.app);
    const guest = await signUp(ctx.app);
    const expired = await invite(owner);
    await ctx.db
      .update(invitations)
      .set({ expiresAt: new Date(TEST_NOW.getTime() - 1000) })
      .where(eq(invitations.id, expired.invitation.id));
    const revoked = await invite(owner);
    const del = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/households/${revoked.householdId}/invitations/${revoked.invitation.id}`,
      headers: { cookie: owner.cookie },
    });
    expect(del.statusCode).toBe(204);

    expect(
      invitationPreviewSchema.parse((await preview(guest, expired.invitation.code)).json()).state,
    ).toBe('expired');
    expect(
      invitationPreviewSchema.parse((await preview(guest, revoked.invitation.code)).json()).state,
    ).toBe('revoked');
    expect((await accept(guest, expired.invitation.code)).statusCode).toBe(409);
    expect((await accept(guest, revoked.invitation.code)).statusCode).toBe(409);
  });

  it('quien ya es miembro no cambia nada', async () => {
    const owner = await signUp(ctx.app);
    const { invitation } = await invite(owner);

    expect(
      invitationPreviewSchema.parse((await preview(owner, invitation.code)).json()).alreadyMember,
    ).toBe(true);
    expect((await accept(owner, invitation.code)).statusCode).toBe(409);
    const [row] = await ctx.db.select().from(invitations);
    expect(row?.status).toBe('pending');
  });

  it('un código que no existe responde 404; sin sesión, 401', async () => {
    const guest = await signUp(ctx.app);
    expect((await preview(guest, 'ABCDEFGHJK')).statusCode).toBe(404);
    expect((await preview(guest, 'corto')).statusCode).toBe(400);
    expect(
      (await ctx.app.inject({ method: 'GET', url: '/api/invitations/ABCDEFGHJK' })).statusCode,
    ).toBe(401);
  });

  it('los datos del hogar al que se une siguen ahí', async () => {
    const owner = await signUp(ctx.app);
    const householdId = (await me(ctx.app, owner)).household.id;
    await addTransaction(owner);
    await ctx.db.select().from(recurringRules);
    const guest = await signUp(ctx.app);
    const { invitation } = await invite(owner);
    await accept(guest, invitation.code);

    const period = await ctx.app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/periods/2026-10-01`,
      headers: { cookie: guest.cookie },
    });
    expect(period.statusCode).toBe(200);
    expect(period.json().transactions).toHaveLength(1);
    expect(
      await ctx.db.select().from(members).where(eq(members.householdId, householdId)),
    ).toHaveLength(2);
  });
});
