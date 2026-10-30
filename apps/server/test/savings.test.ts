import {
  calendarResponseSchema,
  errorResponseSchema,
  periodResponseSchema,
  savingsEntriesResponseSchema,
  savingsEntrySchema,
  savingsGoalSchema,
  savingsListSchema,
  upcomingResponseSchema,
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

describe('apartar la cuota el día elegido (historia 2)', () => {
  const entry = (user: TestUser, goalId: string, id: string, body: Record<string, unknown>) =>
    ctx.app.inject({
      method: 'PUT',
      url: `/api/households/${householdId}/savings/${goalId}/entries/${id}`,
      headers: { cookie: user.cookie },
      payload: body,
    });
  const skip = (user: TestUser, goalId: string, dueDate: string) =>
    ctx.app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/savings/${goalId}/due/${dueDate}/skip`,
      headers: { cookie: user.cookie },
    });
  const get = (user: TestUser, url: string) =>
    ctx.app.inject({ method: 'GET', url, headers: { cookie: user.cookie } });
  const confirmNov = {
    kind: 'deposit',
    amountCents: 13334,
    date: '2026-10-27',
    dueDate: '2026-11-01',
  };
  const goalOf = async (id: string) =>
    savingsListSchema.parse((await listGoals(owner)).json()).goals.find((g) => g.id === id)!;

  it('confirmar con la cuota la aparta y pasa al mes siguiente', async () => {
    const goal = await createGoal();
    const response = await entry(owner, goal.id, newId(), confirmNov);

    expect(response.statusCode).toBe(200);
    expect(savingsEntrySchema.parse(response.json())).toMatchObject({
      kind: 'deposit',
      amountCents: 13334,
      dueDate: '2026-11-01',
    });
    expect((await goalOf(goal.id)).plan).toMatchObject({
      savedCents: 13334,
      contributionsLeft: 8,
      nextDueDate: '2026-12-01',
    });
  });

  it('con otro importe la cuota de los meses siguientes se recalcula', async () => {
    const goal = await createGoal();
    await entry(owner, goal.id, newId(), { ...confirmNov, amountCents: 40000 });
    expect((await goalOf(goal.id)).plan.quotaCents).toBe(10000); // 800 € / 8
  });

  it('reenviar la misma confirmación no aparta dos veces', async () => {
    const goal = await createGoal();
    const id = newId();
    expect((await entry(owner, goal.id, id, confirmNov)).statusCode).toBe(200);
    expect((await entry(owner, goal.id, id, confirmNov)).statusCode).toBe(200);
    expect(await ctx.db.select().from(savingsEntries)).toHaveLength(1);
  });

  it('confirmar el mismo mes con otro id da 409 y dice quién lo apartó', async () => {
    const goal = await createGoal();
    await entry(owner, goal.id, newId(), confirmNov);
    const again = await entry(owner, goal.id, newId(), confirmNov);

    expect(again.statusCode).toBe(409);
    expect(errorResponseSchema.parse(again.json()).error.message).toMatch(/ya lo apartó/i);
  });

  it('dos miembros que confirman a la vez apartan una sola vez', async () => {
    const goal = await createGoal();
    const editor = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');

    const statuses = (
      await Promise.all([
        entry(owner, goal.id, newId(), confirmNov),
        entry(editor, goal.id, newId(), confirmNov),
      ])
    ).map((r) => r.statusCode);

    expect(statuses.sort()).toEqual([200, 409]);
    expect(await ctx.db.select().from(savingsEntries)).toHaveLength(1);
  });

  it('solo se confirman días de aportación de la hucha', async () => {
    const goal = await createGoal();
    for (const dueDate of ['2026-11-02', '2026-10-01', '2027-08-01']) {
      const response = await entry(owner, goal.id, newId(), { ...confirmNov, dueDate });
      expect(response.statusCode, dueDate).toBe(400);
    }
  });

  it('saltar un mes no aparta nada y recalcula la cuota; repetirlo no cambia nada', async () => {
    const goal = await createGoal();
    expect((await skip(owner, goal.id, '2026-11-01')).statusCode).toBe(200);
    expect((await skip(owner, goal.id, '2026-11-01')).statusCode).toBe(200);

    expect((await goalOf(goal.id)).plan).toMatchObject({
      savedCents: 0,
      contributionsLeft: 8,
      quotaCents: 15000,
      nextDueDate: '2026-12-01',
    });
    const confirm = await entry(owner, goal.id, newId(), confirmNov);
    expect(confirm.statusCode).toBe(409);
    expect(errorResponseSchema.parse(confirm.json()).error.message).toMatch(/saltó/i);
  });

  it('las pendientes aparecen en próximos pagos, también las atrasadas', async () => {
    const goal = await createGoal();
    const old = newId();
    await ctx.db.insert(savingsGoals).values({
      id: old,
      householdId,
      name: 'Coche',
      icon: 'car',
      targetCents: 60000,
      deadline: '2027-03-31',
      contributionDay: 1,
      startDate: '2026-09-15',
    });

    const body = upcomingResponseSchema.parse(
      (await get(owner, `/api/households/${householdId}/upcoming?days=30`)).json(),
    );

    expect(body.savings).toEqual([
      { goalId: old, dueDate: '2026-10-01', overdue: true, quotaCents: 10000 },
      { goalId: goal.id, dueDate: '2026-11-01', overdue: false, quotaCents: 13334 },
      { goalId: old, dueDate: '2026-11-01', overdue: false, quotaCents: 10000 },
    ]);
    await entry(owner, goal.id, newId(), confirmNov);
    const after = upcomingResponseSchema.parse(
      (await get(owner, `/api/households/${householdId}/upcoming?days=30`)).json(),
    );
    expect(after.savings.map((s) => s.goalId)).toEqual([old, old]);
  });

  it('el calendario muestra la aportación pendiente, apartada o saltada', async () => {
    const goal = await createGoal();
    const calendar = async (month: string) =>
      calendarResponseSchema.parse(
        (await get(owner, `/api/households/${householdId}/calendar/${month}`)).json(),
      ).savings;

    expect(await calendar('2026-11')).toEqual([
      { goalId: goal.id, dueDate: '2026-11-01', status: 'pending', amountCents: 13334 },
    ]);
    await entry(owner, goal.id, newId(), { ...confirmNov, amountCents: 20000 });
    await skip(owner, goal.id, '2026-12-01');
    expect(await calendar('2026-11')).toEqual([
      { goalId: goal.id, dueDate: '2026-11-01', status: 'saved', amountCents: 20000 },
    ]);
    expect((await calendar('2026-12'))[0]).toMatchObject({ status: 'skipped', amountCents: 0 });
  });

  it('lo apartado cuenta en el periodo de su fecha como «apartado para objetivos»', async () => {
    const goal = await createGoal();
    await entry(owner, goal.id, newId(), confirmNov);
    const period = periodResponseSchema.parse(
      (await get(owner, `/api/households/${householdId}/periods/2026-10-01`)).json(),
    );
    expect(period.summary).toMatchObject({ balanceCents: 0, setAsideCents: 13334 });
    const next = periodResponseSchema.parse(
      (await get(owner, `/api/households/${householdId}/periods/2026-11-01`)).json(),
    );
    expect(next.summary.setAsideCents).toBe(0);
  });

  it('un lector no puede confirmar ni saltar; nadie de otro hogar toca sus huchas', async () => {
    const goal = await createGoal();
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');
    expect((await entry(viewer, goal.id, newId(), confirmNov)).statusCode).toBe(403);
    expect((await skip(viewer, goal.id, '2026-11-01')).statusCode).toBe(403);

    const intruso = await signUp(ctx.app);
    const otherHousehold = (await me(ctx.app, intruso)).household.id;
    const cross = await ctx.app.inject({
      method: 'PUT',
      url: `/api/households/${otherHousehold}/savings/${goal.id}/entries/${newId()}`,
      headers: { cookie: intruso.cookie },
      payload: confirmNov,
    });
    expect(cross.statusCode).toBe(404);
    const crossSkip = await ctx.app.inject({
      method: 'POST',
      url: `/api/households/${otherHousehold}/savings/${goal.id}/due/2026-11-01/skip`,
      headers: { cookie: intruso.cookie },
    });
    expect(crossSkip.statusCode).toBe(404);
    expect(await ctx.db.select().from(savingsEntries)).toHaveLength(0);
  });
});

describe('aportar o sacar cuando se quiera (historia 3)', () => {
  const entry = (user: TestUser, goalId: string, id: string, body: Record<string, unknown>) =>
    ctx.app.inject({
      method: 'PUT',
      url: `/api/households/${householdId}/savings/${goalId}/entries/${id}`,
      headers: { cookie: user.cookie },
      payload: body,
    });
  const history = (user: TestUser, goalId: string) =>
    ctx.app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/savings/${goalId}/entries`,
      headers: { cookie: user.cookie },
    });
  const undo = (user: TestUser, goalId: string, id: string) =>
    ctx.app.inject({
      method: 'DELETE',
      url: `/api/households/${householdId}/savings/${goalId}/entries/${id}`,
      headers: { cookie: user.cookie },
    });
  const saved = async (goalId: string) =>
    savingsListSchema.parse((await listGoals(owner)).json()).goals.find((g) => g.id === goalId)!
      .plan.savedCents;
  const deposit = (amountCents: number, date = '2026-10-20') => ({
    kind: 'deposit',
    amountCents,
    date,
  });
  const withdrawal = (amountCents: number, date = '2026-10-25') => ({
    kind: 'withdrawal',
    amountCents,
    date,
  });

  it('aportar con fecha suma a la hucha y cuenta en el periodo de esa fecha', async () => {
    const goal = await createGoal();
    expect((await entry(owner, goal.id, newId(), deposit(30000, '2026-09-15'))).statusCode).toBe(
      200,
    );
    expect(await saved(goal.id)).toBe(30000);
    const september = periodResponseSchema.parse(
      (
        await ctx.app.inject({
          method: 'GET',
          url: `/api/households/${householdId}/periods/2026-09-01`,
          headers: { cookie: owner.cookie },
        })
      ).json(),
    );
    expect(september.summary.setAsideCents).toBe(30000);
  });

  it('sacar resta de la hucha y del apartado del periodo', async () => {
    const goal = await createGoal();
    await entry(owner, goal.id, newId(), deposit(30000));
    expect((await entry(owner, goal.id, newId(), withdrawal(10000))).statusCode).toBe(200);

    expect(await saved(goal.id)).toBe(20000);
    const october = periodResponseSchema.parse(
      (
        await ctx.app.inject({
          method: 'GET',
          url: `/api/households/${householdId}/periods/2026-10-01`,
          headers: { cookie: owner.cookie },
        })
      ).json(),
    );
    expect(october.summary.setAsideCents).toBe(20000);
  });

  it('no se puede sacar más de lo ahorrado', async () => {
    const goal = await createGoal();
    await entry(owner, goal.id, newId(), deposit(5000));
    const response = await entry(owner, goal.id, newId(), withdrawal(5001));

    expect(response.statusCode).toBe(409);
    expect(errorResponseSchema.parse(response.json()).error.message).toMatch(/más de lo que hay/i);
    expect(await saved(goal.id)).toBe(5000);
  });

  it('dos retiradas a la vez nunca dejan la hucha en negativo', async () => {
    const goal = await createGoal();
    await entry(owner, goal.id, newId(), deposit(10000));
    const editor = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');

    const statuses = (
      await Promise.all([
        entry(owner, goal.id, newId(), withdrawal(8000)),
        entry(editor, goal.id, newId(), withdrawal(8000)),
      ])
    ).map((r) => r.statusCode);

    expect(statuses.sort()).toEqual([200, 409]);
    expect(await saved(goal.id)).toBe(2000);
  });

  it('el historial va del más reciente al más antiguo y dice quién hizo cada movimiento', async () => {
    const goal = await createGoal();
    const editor = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, editor, 'editor');
    const ownerName = (await me(ctx.app, owner)).user.name;
    const editorName = (await me(ctx.app, editor)).user.name;
    await entry(owner, goal.id, newId(), deposit(30000, '2026-10-01'));
    await entry(editor, goal.id, newId(), withdrawal(5000, '2026-10-20'));

    const response = await history(owner, goal.id);

    expect(response.statusCode).toBe(200);
    const { entries } = savingsEntriesResponseSchema.parse(response.json());
    expect(entries.map((e) => [e.kind, e.amountCents, e.memberName])).toEqual([
      ['withdrawal', 5000, editorName],
      ['deposit', 30000, ownerName],
    ]);
  });

  it('deshacer el último movimiento lo quita; otro que no sea el último da 409', async () => {
    const goal = await createGoal();
    const first = newId();
    const last = newId();
    await entry(owner, goal.id, first, deposit(30000, '2026-10-01'));
    await entry(owner, goal.id, last, deposit(10000, '2026-10-02'));

    const notLast = await undo(owner, goal.id, first);
    expect(notLast.statusCode).toBe(409);
    expect((await undo(owner, goal.id, last)).statusCode).toBe(204);
    expect(await saved(goal.id)).toBe(30000);
    expect(
      savingsEntriesResponseSchema.parse((await history(owner, goal.id)).json()).entries,
    ).toHaveLength(1);
    // Se borra de forma lógica (constitución, art. IV.4).
    const [row] = await ctx.db.select().from(savingsEntries).where(eq(savingsEntries.id, last));
    expect(row?.deletedAt).not.toBeNull();
    expect((await undo(owner, goal.id, last)).statusCode).toBe(404);
  });

  it('deshacer una aportación del mes la deja otra vez pendiente', async () => {
    const goal = await createGoal();
    const id = newId();
    await entry(owner, goal.id, id, { ...deposit(13334, '2026-10-27'), dueDate: '2026-11-01' });
    expect((await undo(owner, goal.id, id)).statusCode).toBe(204);
    const plan = savingsListSchema.parse((await listGoals(owner)).json()).goals[0]!.plan;
    expect(plan.nextDueDate).toBe('2026-11-01');
    expect(
      (
        await entry(owner, goal.id, newId(), {
          ...deposit(13334, '2026-10-27'),
          dueDate: '2026-11-01',
        })
      ).statusCode,
    ).toBe(200);
  });

  it('un lector ve el historial pero no aporta ni deshace; otro hogar no ve nada', async () => {
    const goal = await createGoal();
    const id = newId();
    await entry(owner, goal.id, id, deposit(1000));
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');
    expect((await history(viewer, goal.id)).statusCode).toBe(200);
    expect((await entry(viewer, goal.id, newId(), deposit(1000))).statusCode).toBe(403);
    expect((await undo(viewer, goal.id, id)).statusCode).toBe(403);

    const intruso = await signUp(ctx.app);
    const other = (await me(ctx.app, intruso)).household.id;
    const peek = await ctx.app.inject({
      method: 'GET',
      url: `/api/households/${other}/savings/${goal.id}/entries`,
      headers: { cookie: intruso.cookie },
    });
    expect(peek.statusCode).toBe(404);
    const remove = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/households/${other}/savings/${goal.id}/entries/${id}`,
      headers: { cookie: intruso.cookie },
    });
    expect(remove.statusCode).toBe(404);
    expect(await saved(goal.id)).toBe(1000);
  });
});

describe('conseguir el objetivo o cambiar de planes (historia 4)', () => {
  const entry = (goalId: string, body: Record<string, unknown>, id = newId()) =>
    ctx.app.inject({
      method: 'PUT',
      url: `/api/households/${householdId}/savings/${goalId}/entries/${id}`,
      headers: { cookie: owner.cookie },
      payload: body,
    });
  const close = (user: TestUser, goalId: string, household = householdId) =>
    ctx.app.inject({
      method: 'POST',
      url: `/api/households/${household}/savings/${goalId}/close`,
      headers: { cookie: user.cookie },
    });
  const goalOf = async (id: string) =>
    savingsListSchema.parse((await listGoals(owner)).json()).goals.find((g) => g.id === id)!;
  const upcomingSavings = async () =>
    upcomingResponseSchema.parse(
      (
        await ctx.app.inject({
          method: 'GET',
          url: `/api/households/${householdId}/upcoming?days=60`,
          headers: { cookie: owner.cookie },
        })
      ).json(),
    ).savings;
  const periodSetAside = async (start: string) =>
    periodResponseSchema.parse(
      (
        await ctx.app.inject({
          method: 'GET',
          url: `/api/households/${householdId}/periods/${start}`,
          headers: { cookie: owner.cookie },
        })
      ).json(),
    ).summary.setAsideCents;

  it('al llegar al objetivo queda conseguida y deja de pedir aportaciones', async () => {
    const goal = await createGoal();
    await entry(goal.id, { kind: 'deposit', amountCents: 120000, date: '2026-10-27' });

    const { plan } = await goalOf(goal.id);
    expect(plan).toMatchObject({ status: 'achieved', quotaCents: 0, contributionsLeft: 0 });
    expect(await upcomingSavings()).toEqual([]);
  });

  it('cerrar devuelve el saldo al mes como retirada y deja de pedir aportaciones', async () => {
    const goal = await createGoal();
    await entry(goal.id, { kind: 'deposit', amountCents: 50000, date: '2026-09-10' });

    const response = await close(owner, goal.id);

    expect(response.statusCode).toBe(200);
    const closed = savingsGoalSchema.parse(response.json());
    expect(closed.closedAt).not.toBeNull();
    expect(closed.plan).toMatchObject({ status: 'closed', savedCents: 0, contributionsLeft: 0 });
    // Septiembre conserva lo apartado; octubre (hoy) lo recupera.
    expect(await periodSetAside('2026-09-01')).toBe(50000);
    expect(await periodSetAside('2026-10-01')).toBe(-50000);
    expect(await upcomingSavings()).toEqual([]);
    const rows = await ctx.db
      .select()
      .from(savingsEntries)
      .where(eq(savingsEntries.goalId, goal.id));
    expect(rows.find((r) => r.kind === 'withdrawal')).toMatchObject({
      amountCents: 50000,
      date: '2026-10-27',
    });
  });

  it('una hucha cerrada no admite aportar, saltar, deshacer, editar ni cerrarse otra vez', async () => {
    const goal = await createGoal();
    const id = newId();
    await entry(goal.id, { kind: 'deposit', amountCents: 1000, date: '2026-10-27' }, id);
    await close(owner, goal.id);

    expect(
      (await entry(goal.id, { kind: 'deposit', amountCents: 1000, date: '2026-10-27' })).statusCode,
    ).toBe(409);
    const skip = await ctx.app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/savings/${goal.id}/due/2026-11-01/skip`,
      headers: { cookie: owner.cookie },
    });
    expect(skip.statusCode).toBe(409);
    const undo = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/households/${householdId}/savings/${goal.id}/entries/${id}`,
      headers: { cookie: owner.cookie },
    });
    expect(undo.statusCode).toBe(409);
    expect((await putGoal(owner, goal.id, { ...vacations, name: 'Otra' })).statusCode).toBe(409);
    expect((await close(owner, goal.id)).statusCode).toBe(409);
  });

  it('cerrar una hucha vacía no crea ninguna retirada', async () => {
    const goal = await createGoal();
    expect((await close(owner, goal.id)).statusCode).toBe(200);
    expect(await ctx.db.select().from(savingsEntries)).toHaveLength(0);
  });

  it('con el plazo vencido sin llegar se indica y se puede ampliar el plazo', async () => {
    const old = newId();
    await ctx.db.insert(savingsGoals).values({
      id: old,
      householdId,
      name: 'Coche',
      icon: 'car',
      targetCents: 60000,
      deadline: '2026-10-20',
      contributionDay: 1,
      startDate: '2026-08-15',
    });
    expect((await goalOf(old)).plan).toMatchObject({ status: 'expired', contributionsLeft: 0 });
    // Cambiar solo el nombre no obliga a cambiar el plazo vencido.
    const rename = await putGoal(owner, old, {
      name: 'Coche nuevo',
      icon: 'car',
      targetCents: 60000,
      deadline: '2026-10-20',
      contributionDay: 1,
    });
    expect(rename.statusCode).toBe(200);

    const extended = await putGoal(owner, old, {
      name: 'Coche nuevo',
      icon: 'car',
      targetCents: 60000,
      deadline: '2027-01-31',
      contributionDay: 1,
    });

    expect(extended.statusCode).toBe(200);
    expect(savingsGoalSchema.parse(extended.json()).plan).toMatchObject({
      status: 'active',
      nextDueDate: '2026-09-01',
    });
  });

  it('editar el día o el objetivo recalcula las pendientes sin tocar lo ya apartado', async () => {
    const goal = await createGoal();
    await entry(goal.id, {
      kind: 'deposit',
      amountCents: 13334,
      date: '2026-10-27',
      dueDate: '2026-11-01',
    });

    const response = await putGoal(owner, goal.id, {
      ...vacations,
      targetCents: 60000,
      contributionDay: 15,
    });

    const { plan } = savingsGoalSchema.parse(response.json());
    expect(plan.savedCents).toBe(13334);
    // Del 15 de noviembre al 15 de julio: 9 fechas; noviembre-1 ya no es día de apartar.
    expect(plan.nextDueDate).toBe('2026-11-15');
    expect(plan.contributionsLeft).toBe(9);
    expect(plan.quotaCents).toBe(5186); // (600 € − 133,34 €) / 9 = 51,85… → 51,86 €
  });

  it('bajar el objetivo por debajo de lo ahorrado la deja conseguida', async () => {
    const goal = await createGoal();
    await entry(goal.id, { kind: 'deposit', amountCents: 50000, date: '2026-10-27' });
    const response = await putGoal(owner, goal.id, { ...vacations, targetCents: 40000 });
    expect(savingsGoalSchema.parse(response.json()).plan.status).toBe('achieved');
  });

  it('un lector no puede cerrar; nadie de otro hogar puede cerrar la hucha', async () => {
    const goal = await createGoal();
    const viewer = await signUp(ctx.app);
    await joinHousehold(ctx.db, owner, viewer, 'viewer');
    expect((await close(viewer, goal.id)).statusCode).toBe(403);
    const intruso = await signUp(ctx.app);
    const other = (await me(ctx.app, intruso)).household.id;
    expect((await close(intruso, goal.id, other)).statusCode).toBe(404);
    expect((await goalOf(goal.id)).closedAt).toBeNull();
  });
});
