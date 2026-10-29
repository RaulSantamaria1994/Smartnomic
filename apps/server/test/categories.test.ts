import {
  categoriesResponseSchema,
  categorySchema,
  errorResponseSchema,
  periodResponseSchema,
} from '@smartnomic/api';
import { describe, expect, it } from 'vitest';
import { call, joinHousehold, me, newId, signUp, useTestServer, type TestUser } from './helpers';

const ctx = useTestServer();

const PET = { kind: 'expense', name: 'Mascotas', icon: 'pet', color: '#AA5500' };

async function setup() {
  const owner = await signUp(ctx.app);
  const { household } = await me(ctx.app, owner);
  return { owner, householdId: household.id };
}

const url = (householdId: string, id?: string) =>
  `/api/households/${householdId}/categories${id ? `/${id}` : ''}`;

async function list(user: TestUser, householdId: string) {
  return categoriesResponseSchema.parse((await call(ctx.app, user, 'GET', url(householdId))).json())
    .categories;
}

async function create(user: TestUser, householdId: string, body: unknown = PET) {
  return call(ctx.app, user, 'POST', url(householdId), body);
}

describe('crear categorías', () => {
  it('un editor crea una categoría y todos los miembros la ven, al final de su tipo', async () => {
    const { owner, householdId } = await setup();
    const editor = await signUp(ctx.app);
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');
    await joinHousehold(ctx.db, owner, viewer, 'viewer');

    const response = await create(editor, householdId);

    expect(response.statusCode).toBe(201);
    const created = categorySchema.parse(response.json());
    expect(created).toMatchObject({ ...PET, archived: false });
    const expenses = (await list(viewer, householdId)).filter((c) => c.kind === 'expense');
    expect(expenses.at(-1)?.id).toBe(created.id);
  });

  it('un lector no puede crear categorías', async () => {
    const { owner, householdId } = await setup();
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');
    expect((await create(viewer, householdId)).statusCode).toBe(403);
  });

  it('no deja repetir un nombre del mismo tipo, sin distinguir mayúsculas', async () => {
    const { owner, householdId } = await setup();
    await create(owner, householdId);

    const again = await create(owner, householdId, { ...PET, name: ' mascotas ' });
    expect(again.statusCode).toBe(409);
    expect(errorResponseSchema.parse(again.json()).error.message).toMatch(/mascotas/i);
    const preset = await create(owner, householdId, { ...PET, name: 'ROPA' });
    expect(preset.statusCode).toBe(409);
    // De otro tipo sí.
    expect((await create(owner, householdId, { ...PET, kind: 'income' })).statusCode).toBe(201);
  });

  it('valida nombre, icono y color', async () => {
    const { owner, householdId } = await setup();
    for (const body of [
      { ...PET, name: '' },
      { ...PET, name: 'x'.repeat(41) },
      { ...PET, icon: '' },
      { ...PET, color: 'rojo' },
      { ...PET, kind: 'otro' },
    ]) {
      expect((await create(owner, householdId, body)).statusCode, JSON.stringify(body)).toBe(400);
    }
  });
});

describe('renombrar y archivar', () => {
  it('renombra y cambia el icono', async () => {
    const { owner, householdId } = await setup();
    const { id } = categorySchema.parse((await create(owner, householdId)).json());

    const response = await call(ctx.app, owner, 'PATCH', url(householdId, id), {
      name: 'Perro',
      icon: 'kids',
    });

    expect(response.statusCode).toBe(200);
    expect(categorySchema.parse(response.json())).toMatchObject({ name: 'Perro', icon: 'kids' });
  });

  it('renombrar a un nombre en uso da 409', async () => {
    const { owner, householdId } = await setup();
    const { id } = categorySchema.parse((await create(owner, householdId)).json());
    const response = await call(ctx.app, owner, 'PATCH', url(householdId, id), { name: 'Ocio' });
    expect(response.statusCode).toBe(409);
  });

  it('archivar no toca los movimientos que ya la usan', async () => {
    const { owner, householdId } = await setup();
    const ropa = (await list(owner, householdId)).find((c) => c.name === 'Ropa')!;
    const txId = newId();
    await call(ctx.app, owner, 'PUT', `/api/households/${householdId}/transactions/${txId}`, {
      kind: 'expense',
      amountCents: 3000,
      date: '2026-10-10',
      categoryId: ropa.id,
    });

    const response = await call(ctx.app, owner, 'PATCH', url(householdId, ropa.id), {
      archived: true,
    });

    expect(response.statusCode).toBe(200);
    expect(categorySchema.parse(response.json()).archived).toBe(true);
    const period = periodResponseSchema.parse(
      (
        await call(ctx.app, owner, 'GET', `/api/households/${householdId}/periods/2026-10-01`)
      ).json(),
    );
    expect(period.summary.expenseCents).toBe(3000);
    expect(period.transactions.find((t) => t.id === txId)?.categoryId).toBe(ropa.id);
    // Se puede editar el movimiento antiguo sin cambiarle la categoría.
    const edit = await call(
      ctx.app,
      owner,
      'PUT',
      `/api/households/${householdId}/transactions/${txId}`,
      { kind: 'expense', amountCents: 3500, date: '2026-10-10', categoryId: ropa.id },
    );
    expect(edit.statusCode).toBe(200);
  });

  it('con la archivada se puede crear otra con el mismo nombre; restaurarla choca', async () => {
    const { owner, householdId } = await setup();
    const ropa = (await list(owner, householdId)).find((c) => c.name === 'Ropa')!;
    await call(ctx.app, owner, 'PATCH', url(householdId, ropa.id), { archived: true });

    expect((await create(owner, householdId, { ...PET, name: 'Ropa' })).statusCode).toBe(201);
    const restore = await call(ctx.app, owner, 'PATCH', url(householdId, ropa.id), {
      archived: false,
    });
    expect(restore.statusCode).toBe(409);
  });

  it('restaurar una archivada la vuelve a ofrecer', async () => {
    const { owner, householdId } = await setup();
    const ropa = (await list(owner, householdId)).find((c) => c.name === 'Ropa')!;
    await call(ctx.app, owner, 'PATCH', url(householdId, ropa.id), { archived: true });
    const response = await call(ctx.app, owner, 'PATCH', url(householdId, ropa.id), {
      archived: false,
    });
    expect(categorySchema.parse(response.json()).archived).toBe(false);
  });

  it('no se puede tocar una categoría de otro hogar', async () => {
    const { owner, householdId } = await setup();
    const other = await setup();
    const foreign = (await list(other.owner, other.householdId))[0]!;
    const response = await call(ctx.app, owner, 'PATCH', url(householdId, foreign.id), {
      name: 'Mía',
    });
    expect(response.statusCode).toBe(404);
    expect((await list(other.owner, other.householdId))[0]!.name).toBe(foreign.name);
  });

  it('un lector no puede archivar', async () => {
    const { owner, householdId } = await setup();
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');
    const ropa = (await list(owner, householdId)).find((c) => c.name === 'Ropa')!;
    const response = await call(ctx.app, viewer, 'PATCH', url(householdId, ropa.id), {
      archived: true,
    });
    expect(response.statusCode).toBe(403);
  });
});
