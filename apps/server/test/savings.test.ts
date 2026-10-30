import {
  errorResponseSchema,
  savingsGoalSchema,
  savingsListSchema,
  type SavingsGoalInput,
} from '@smartnomic/api';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { savingsEntries, savingsGoals } from '../src/db/schema';
import { joinHousehold, me, newId, signUp, useTestServer, type TestUser } from './helpers';

// Hoy es 2026-10-27 (TEST_NOW).
const ctx = useTestServer();

let owner: TestUser;
let householdId: string;

const vacations: SavingsGoalInput = {
  name: 'Vacaciones',
  icon: 'travel',
  targetCents: 120000,
  deadline: '2027-07-31',
  contributionDay: 1,
};

function putGoal(user: TestUser, id: string, body: unknown, household = householdId) {
  return ctx.app.inject({
    method: 'PUT',
    url: `/api/households/${household}/savings/${id}`,
    headers: { cookie: user.cookie },
    payload: body as Record<string, unknown>,
  });
}

function listGoals(user: TestUser, household = householdId) {
  return ctx.app.inject({
    method: 'GET',
    url: `/api/households/${household}/savings`,
    headers: { cookie: user.cookie },
  });
}

async function createGoal(body: SavingsGoalInput = vacations, user = owner) {
  const id = newId();
  const response = await putGoal(user, id, body);
  expect(response.statusCode).toBe(200);
  return savingsGoalSchema.parse(response.json());
}

beforeEach(async () => {
  owner = await signUp(ctx.app);
  householdId = (await me(ctx.app, owner)).household.id;
});

describe('crear y listar huchas', () => {
  it('crea una hucha con su plan calculado y aparece en la lista', async () => {
    const goal = await createGoal();

    expect(goal).toMatchObject({ ...vacations, startDate: '2026-10-27', closedAt: null });
    expect(goal.plan).toMatchObject({
      savedCents: 0,
      remainingCents: 120000,
      contributionsLeft: 9,
      quotaCents: 13334,
      nextDueDate: '2026-11-01',
      percent: 0,
      status: 'active',
      onTrack: true,
    });
    const list = savingsListSchema.parse((await listGoals(owner)).json());
    expect(list.today).toBe('2026-10-27');
    expect(list.goals.map((g) => g.id)).toEqual([goal.id]);
  });

  it('es idempotente por id', async () => {
    const id = newId();
    expect((await putGoal(owner, id, vacations)).statusCode).toBe(200);
    expect((await putGoal(owner, id, vacations)).statusCode).toBe(200);
    expect(savingsListSchema.parse((await listGoals(owner)).json()).goals).toHaveLength(1);
  });

  it('editar recalcula la cuota y conserva la fecha de inicio', async () => {
    const goal = await createGoal();
    const response = await putGoal(owner, goal.id, {
      ...vacations,
      name: 'Viaje',
      targetCents: 90000,
    });

    expect(response.statusCode).toBe(200);
    const edited = savingsGoalSchema.parse(response.json());
    expect(edited).toMatchObject({ name: 'Viaje', targetCents: 90000, startDate: '2026-10-27' });
    expect(edited.plan.quotaCents).toBe(10000);
  });

  it('el plazo no puede estar en el pasado ni a más de 30 años', async () => {
    for (const deadline of ['2026-10-26', '2056-10-28']) {
      const response = await putGoal(owner, newId(), { ...vacations, deadline });
      expect(response.statusCode, deadline).toBe(400);
      expect(errorResponseSchema.parse(response.json()).error.code).toBe('validation_failed');
    }
    expect(
      (await putGoal(owner, newId(), { ...vacations, deadline: '2026-10-27' })).statusCode,
    ).toBe(200);
  });

  it('valida nombre, icono, objetivo y día', async () => {
    for (const bad of [
      { name: '' },
      { icon: 'cerdito' },
      { targetCents: 0 },
      { contributionDay: 32 },
    ]) {
      expect((await putGoal(owner, newId(), { ...vacations, ...bad })).statusCode).toBe(400);
    }
  });
});

describe('permisos y aislamiento', () => {
  it('un lector las ve pero no puede crearlas ni borrarlas', async () => {
    const goal = await createGoal();
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');

    expect((await listGoals(viewer)).statusCode).toBe(200);
    expect((await putGoal(viewer, newId(), vacations)).statusCode).toBe(403);
    const del = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/households/${householdId}/savings/${goal.id}`,
      headers: { cookie: viewer.cookie },
    });
    expect(del.statusCode).toBe(403);
  });

  it('un editor puede crearlas', async () => {
    const editor = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');
    expect((await putGoal(editor, newId(), vacations)).statusCode).toBe(200);
  });

  it('nadie de otro hogar puede verlas ni crearlas en él', async () => {
    await createGoal();
    const intruso = await signUp(ctx.app);
    expect((await listGoals(intruso)).statusCode).toBe(403);
    expect((await putGoal(intruso, newId(), vacations)).statusCode).toBe(403);
  });

  it('no se puede sobrescribir la hucha de otro hogar con su id', async () => {
    const goal = await createGoal();
    const intruso = await signUp(ctx.app);
    const otherHousehold = (await me(ctx.app, intruso)).household.id;

    const response = await putGoal(intruso, goal.id, { ...vacations, name: 'Mía' }, otherHousehold);

    expect(response.statusCode).toBe(404);
    const [row] = await ctx.db.select().from(savingsGoals).where(eq(savingsGoals.id, goal.id));
    expect(row?.name).toBe('Vacaciones');
    expect(
      savingsListSchema.parse((await listGoals(intruso, otherHousehold)).json()).goals,
    ).toEqual([]);
  });
});

describe('borrar', () => {
  const del = (user: TestUser, id: string) =>
    ctx.app.inject({
      method: 'DELETE',
      url: `/api/households/${householdId}/savings/${id}`,
      headers: { cookie: user.cookie },
    });

  it('se borra si no tiene movimientos', async () => {
    const goal = await createGoal();
    expect((await del(owner, goal.id)).statusCode).toBe(204);
    expect(savingsListSchema.parse((await listGoals(owner)).json()).goals).toEqual([]);
    expect((await del(owner, goal.id)).statusCode).toBe(404);
  });

  it('con movimientos no se borra: 409, para no cambiar los meses pasados', async () => {
    const goal = await createGoal();
    await ctx.db.insert(savingsEntries).values({
      id: newId(),
      householdId,
      goalId: goal.id,
      kind: 'deposit',
      amountCents: 5000,
      date: '2026-10-27',
    });

    const response = await del(owner, goal.id);

    expect(response.statusCode).toBe(409);
    expect(errorResponseSchema.parse(response.json()).error.message).toMatch(/cerrar/i);
  });
});
