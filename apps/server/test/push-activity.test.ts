import {
  categoriesResponseSchema,
  recurringRuleSchema,
  savingsGoalSchema,
  type Category,
} from '@smartnomic/api';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { pushDevices, sessions } from '../src/db/schema';
import { joinHousehold, me, newId, signUp, useTestServer, type TestUser } from './helpers';

// Avisos de actividad por ruta (especificación 014, RF-1401 a RF-1404). Hoy es 2026-10-27.
const ctx = useTestServer();

let ana: TestUser; // propietaria: recibe los avisos
let juan: TestUser; // editor: es quien apunta
let householdId: string;
let categories: Category[];

const category = (name: string) => categories.find((c) => c.name === name)!;
const token = (n: string) => `ExponentPushToken[${n}]`;
const plain = (text: string) => text.replace(/\u00a0/g, ' ');

async function addDevice(user: TestUser, value: string) {
  const [session] = await ctx.db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, user.id));
  await ctx.db
    .insert(pushDevices)
    .values({ token: value, userId: user.id, sessionId: session!.id });
}

function request(
  user: TestUser,
  method: 'GET' | 'PUT' | 'POST' | 'DELETE',
  path: string,
  payload?: unknown,
) {
  return ctx.app.inject({
    method,
    url: `/api/households/${householdId}${path}`,
    headers: { cookie: user.cookie },
    ...(payload !== undefined && { payload: payload as Record<string, unknown> }),
  });
}

const movement = (overrides: Record<string, unknown> = {}) => ({
  kind: 'expense',
  amountCents: 4530,
  date: '2026-10-27',
  categoryId: category('Supermercado').id,
  note: 'nota privada',
  ...overrides,
});

/** Envía lo pendiente y devuelve lo que ha llegado a los móviles. */
async function delivered() {
  await ctx.push.flush();
  return ctx.push.messages();
}

beforeEach(async () => {
  ana = await signUp(ctx.app, { name: 'Ana' });
  juan = await signUp(ctx.app, { name: 'Juan' });
  await joinHousehold(ctx.db, ana, juan, 'editor');
  householdId = (await me(ctx.app, ana)).household.id;
  categories = categoriesResponseSchema.parse(
    (await request(ana, 'GET', '/categories')).json(),
  ).categories;
  await addDevice(ana, token('ana'));
  await addDevice(juan, token('juan'));
});

describe('movimientos (RF-1401, RF-1402)', () => {
  it('un gasto nuevo avisa a los demás, no a quien lo apunta, con el importe y la categoría', async () => {
    expect((await request(juan, 'PUT', `/transactions/${newId()}`, movement())).statusCode).toBe(
      200,
    );
    const messages = await delivered();
    expect(messages).toHaveLength(1);
    expect(messages[0]!.to).toBe(token('ana'));
    expect(plain(messages[0]!.body)).toBe('Juan ha apuntado 45,30 € en Supermercado');
    expect(messages[0]!.data).toMatchObject({
      type: 'activity',
      householdId,
      target: { kind: 'transaction', date: '2026-10-27' },
    });
  });

  it('un ingreso nuevo lo dice como ingreso', async () => {
    await request(
      juan,
      'PUT',
      `/transactions/${newId()}`,
      movement({ kind: 'income', amountCents: 180000, categoryId: category('Nómina').id }),
    );
    expect(plain((await delivered())[0]!.body)).toBe(
      'Juan ha apuntado un ingreso de 1.800,00 € en Nómina',
    );
  });

  it('el aviso no lleva la nota del movimiento (RF-1402)', async () => {
    await request(juan, 'PUT', `/transactions/${newId()}`, movement());
    expect(JSON.stringify(await delivered())).not.toContain('nota privada');
  });

  it('tampoco avisa a los otros móviles de quien apunta (RF-1403)', async () => {
    await addDevice(juan, token('juan-2'));
    await request(juan, 'PUT', `/transactions/${newId()}`, movement());
    expect((await delivered()).map((m) => m.to)).toEqual([token('ana')]);
  });

  it('un movimiento con fecha futura o pasada avisa igual y no dice la fecha', async () => {
    await request(juan, 'PUT', `/transactions/${newId()}`, movement({ date: '2027-01-15' }));
    await request(ana, 'PUT', `/transactions/${newId()}`, movement({ date: '2025-01-15' }));
    const messages = await delivered();
    expect(messages).toHaveLength(2);
    expect(messages.some((m) => /2027|2025|enero/i.test(m.body))).toBe(false);
  });

  it('editar un movimiento no avisa (RF-1404)', async () => {
    const id = newId();
    await request(juan, 'PUT', `/transactions/${id}`, movement());
    await ctx.push.flush();
    const before = ctx.push.messages().length;
    await request(juan, 'PUT', `/transactions/${id}`, movement({ amountCents: 9999 }));
    await ctx.push.flush();
    expect(ctx.push.messages()).toHaveLength(before);
  });

  it('reenviar el mismo PUT (bandeja sin conexión) no avisa dos veces (011)', async () => {
    const id = newId();
    await request(juan, 'PUT', `/transactions/${id}`, movement());
    await request(juan, 'PUT', `/transactions/${id}`, movement());
    await request(juan, 'PUT', `/transactions/${id}`, movement());
    expect(await delivered()).toHaveLength(1);
  });

  it('borrar y restaurar un movimiento no avisan', async () => {
    const id = newId();
    await request(juan, 'PUT', `/transactions/${id}`, movement());
    await ctx.push.flush();
    const before = ctx.push.messages().length;
    await request(juan, 'DELETE', `/transactions/${id}`);
    await request(juan, 'POST', `/transactions/${id}/restore`);
    await ctx.push.flush();
    expect(ctx.push.messages()).toHaveLength(before);
  });

  it('un movimiento que falla la validación no avisa', async () => {
    const response = await request(
      juan,
      'PUT',
      `/transactions/${newId()}`,
      movement({ categoryId: newId() }),
    );
    expect(response.statusCode).toBe(400);
    expect(await delivered()).toHaveLength(0);
  });

  it('20 movimientos seguidos dan un solo aviso (CE-1404)', async () => {
    for (let i = 0; i < 20; i++) {
      await request(juan, 'PUT', `/transactions/${newId()}`, movement({ amountCents: 100 + i }));
    }
    const messages = await delivered();
    expect(messages).toHaveLength(1);
    expect(messages[0]!.body).toBe('Juan ha apuntado 20 movimientos');
  });

  it('dos miembros distintos dan avisos distintos, cada uno al otro', async () => {
    await request(juan, 'PUT', `/transactions/${newId()}`, movement());
    await request(ana, 'PUT', `/transactions/${newId()}`, movement({ amountCents: 1200 }));
    const messages = await delivered();
    expect(messages.map((m) => m.to).sort()).toEqual([token('ana'), token('juan')].sort());
    expect(messages.find((m) => m.to === token('ana'))!.body).toMatch(/^Juan /);
    expect(messages.find((m) => m.to === token('juan'))!.body).toMatch(/^Ana /);
  });

  it('un miembro de solo lectura recibe los avisos igual (caso límite)', async () => {
    const luis = await signUp(ctx.app, { name: 'Luis' });
    await joinHousehold(ctx.db, ana, luis, 'viewer');
    await addDevice(luis, token('luis'));
    await request(juan, 'PUT', `/transactions/${newId()}`, movement());
    expect((await delivered()).map((m) => m.to)).toContain(token('luis'));
  });

  it('el aviso de un hogar no llega a los miembros de otro (CE-1403)', async () => {
    const otra = await signUp(ctx.app, { name: 'Otra' });
    await addDevice(otra, token('otra'));
    await request(juan, 'PUT', `/transactions/${newId()}`, movement());
    expect((await delivered()).map((m) => m.to)).not.toContain(token('otra'));
  });
});

describe('pagos recurrentes (RF-1401, escenario 2)', () => {
  async function createRule(name = 'Alquiler') {
    const id = newId();
    const response = await request(ana, 'PUT', `/recurring/${id}`, {
      kind: 'expense',
      name,
      amountCents: 75000,
      categoryId: category('Vivienda').id,
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 1,
      startDate: '2026-10-01',
    });
    expect(response.statusCode).toBe(200);
    return recurringRuleSchema.parse(response.json());
  }

  const pay = (user: TestUser, ruleId: string, dueDate: string, transactionId = newId()) =>
    request(user, 'POST', `/recurring/${ruleId}/occurrences/${dueDate}/pay`, {
      transactionId,
      amountCents: 75000,
      date: '2026-10-27',
    });

  it('marcar un pago como pagado avisa con su nombre y el importe', async () => {
    const rule = await createRule();
    expect((await pay(juan, rule.id, '2026-11-01')).statusCode).toBe(200);
    const messages = await delivered();
    expect(messages).toHaveLength(1);
    expect(plain(messages[0]!.body)).toBe('Juan ha pagado Alquiler (750,00 €)');
    expect(messages[0]!.data).toMatchObject({
      target: { kind: 'occurrence', ruleId: rule.id, dueDate: '2026-11-01' },
    });
  });

  it('pagar crea un movimiento pero solo se avisa una vez, del pago', async () => {
    const rule = await createRule();
    await pay(juan, rule.id, '2026-11-01');
    expect(await delivered()).toHaveLength(1);
  });

  it('repetir el mismo pago (mismo movimiento) no avisa otra vez', async () => {
    const rule = await createRule();
    const transactionId = newId();
    await pay(juan, rule.id, '2026-11-01', transactionId);
    await pay(juan, rule.id, '2026-11-01', transactionId);
    expect(await delivered()).toHaveLength(1);
  });

  it('un pago que ya estaba resuelto por otro (conflicto) no avisa', async () => {
    const rule = await createRule();
    await pay(juan, rule.id, '2026-11-01');
    await ctx.push.flush();
    const before = ctx.push.messages().length;
    const conflict = await pay(ana, rule.id, '2026-11-01');
    expect(conflict.statusCode).toBe(409);
    await ctx.push.flush();
    expect(ctx.push.messages()).toHaveLength(before);
  });

  it('omitir un vencimiento no avisa', async () => {
    const rule = await createRule();
    const response = await request(
      juan,
      'POST',
      `/recurring/${rule.id}/occurrences/2026-11-01/skip`,
    );
    expect(response.statusCode).toBe(200);
    expect(await delivered()).toHaveLength(0);
  });

  it('crear o editar la regla no avisa', async () => {
    const rule = await createRule();
    await request(ana, 'PUT', `/recurring/${rule.id}`, {
      kind: 'expense',
      name: 'Alquiler nuevo',
      amountCents: 80000,
      categoryId: category('Vivienda').id,
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 1,
      startDate: '2026-10-01',
    });
    expect(await delivered()).toHaveLength(0);
  });
});

describe('huchas (RF-1401, escenario 3)', () => {
  async function createGoal() {
    const id = newId();
    const response = await request(ana, 'PUT', `/savings/${id}`, {
      name: 'Vacaciones',
      icon: 'travel',
      targetCents: 120000,
      deadline: '2027-07-31',
      contributionDay: 1,
    });
    expect(response.statusCode).toBe(200);
    return savingsGoalSchema.parse(response.json());
  }

  const entry = (
    user: TestUser,
    goalId: string,
    body: Record<string, unknown>,
    entryId = newId(),
  ) => request(user, 'PUT', `/savings/${goalId}/entries/${entryId}`, body);

  it('aportar avisa con el importe y el nombre de la hucha', async () => {
    const goal = await createGoal();
    expect(
      (await entry(juan, goal.id, { kind: 'deposit', amountCents: 5000, date: '2026-10-27' }))
        .statusCode,
    ).toBe(200);
    const messages = await delivered();
    expect(messages).toHaveLength(1);
    expect(plain(messages[0]!.body)).toBe('Juan ha aportado 50,00 € a Vacaciones');
    expect(messages[0]!.data).toMatchObject({ target: { kind: 'savings', goalId: goal.id } });
  });

  it('sacar avisa también', async () => {
    const goal = await createGoal();
    await entry(juan, goal.id, { kind: 'deposit', amountCents: 10000, date: '2026-10-27' });
    await ctx.push.flush();
    const before = ctx.push.messages().length;
    await entry(juan, goal.id, { kind: 'withdrawal', amountCents: 5000, date: '2026-10-27' });
    await ctx.push.flush();
    const sent = ctx.push.messages().slice(before);
    expect(sent).toHaveLength(1);
    expect(plain(sent[0]!.body)).toBe('Juan ha sacado 50,00 € de Vacaciones');
  });

  it('reenviar la misma aportación (mismo id) no avisa otra vez', async () => {
    const goal = await createGoal();
    const entryId = newId();
    const body = { kind: 'deposit', amountCents: 5000, date: '2026-10-27' };
    await entry(juan, goal.id, body, entryId);
    await entry(juan, goal.id, body, entryId);
    expect(await delivered()).toHaveLength(1);
  });

  it('saltar la aportación de un mes no avisa', async () => {
    const goal = await createGoal();
    const response = await request(juan, 'POST', `/savings/${goal.id}/due/2026-11-01/skip`);
    expect(response.statusCode).toBe(200);
    expect(await delivered()).toHaveLength(0);
  });

  it('una retirada que no cabe (error) no avisa', async () => {
    const goal = await createGoal();
    const response = await entry(juan, goal.id, {
      kind: 'withdrawal',
      amountCents: 5000,
      date: '2026-10-27',
    });
    expect(response.statusCode).toBe(409);
    expect(await delivered()).toHaveLength(0);
  });

  it('crear o editar la hucha no avisa', async () => {
    await createGoal();
    expect(await delivered()).toHaveLength(0);
  });
});

describe('otros cambios no avisan (RF-1404)', () => {
  it('categorías, presupuestos y ajustes del miembro no avisan', async () => {
    await request(ana, 'POST', '/categories', {
      kind: 'expense',
      name: 'Mascotas',
      icon: 'pets',
      color: '#1F5FBF',
    });
    await ctx.app.inject({
      method: 'PATCH',
      url: `/api/households/${householdId}/members/me`,
      headers: { cookie: ana.cookie },
      payload: { remindersEnabled: false },
    });
    expect(await delivered()).toHaveLength(0);
  });
});
