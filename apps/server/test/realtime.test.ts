import { realtimeMessageSchema, type RealtimeMessage } from '@smartnomic/api';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { categories } from '../src/db/schema';
import {
  call,
  me,
  newId,
  signUp,
  TEST_ORIGIN,
  TEST_PASSWORD,
  useTestServer,
  type TestUser,
} from './helpers';

// El ping va rápido en los tests para no esperar 25 s.
const ctx = useTestServer({ realtimePingMs: 50 });

let owner: TestUser;
let householdId: string;
let groceries: string;

type TestSocket = Awaited<ReturnType<FastifyInstance['injectWS']>>;

/** Conexión de tiempo real con la sesión de `user` y lo que va recibiendo. */
async function connect(
  user: TestUser | null,
  headers: Record<string, string> = {},
  householdId?: string,
) {
  const received: RealtimeMessage[] = [];
  const ws: TestSocket = await ctx.app.injectWS(
    householdId ? `/api/realtime?householdId=${householdId}` : '/api/realtime',
    { headers: { ...(user && { cookie: user.cookie }), ...headers } },
    {
      onInit: (socket) =>
        socket.on('message', (data: Buffer) =>
          received.push(realtimeMessageSchema.parse(JSON.parse(data.toString()))),
        ),
    },
  );
  const closed = new Promise<void>((resolve) => ws.on('close', () => resolve()));
  return { ws, received, closed, changes: () => received.filter((m) => m.type === 'changed') };
}

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

/** Espera a que llegue un aviso (o falla a los 2 s). */
async function waitFor(received: RealtimeMessage[], count = 1) {
  const start = Date.now();
  while (received.filter((m) => m.type === 'changed').length < count) {
    if (Date.now() - start > 2000) throw new Error('No ha llegado el aviso');
    await tick(10);
  }
}

async function categoryOf(name: string) {
  const [row] = await ctx.db
    .select()
    .from(categories)
    .where(and(eq(categories.householdId, householdId), eq(categories.name, name)));
  return row!.id;
}

async function invite(role: 'editor' | 'viewer' = 'editor') {
  const response = await call(
    ctx.app,
    owner,
    'POST',
    `/api/households/${householdId}/invitations`,
    {
      role,
    },
  );
  return (response.json() as { code: string }).code;
}

async function join(guest: TestUser, role: 'editor' | 'viewer' = 'editor') {
  const response = await call(
    ctx.app,
    guest,
    'POST',
    `/api/invitations/${await invite(role)}/accept`,
    {
      confirmLoseData: true,
    },
  );
  expect(response.statusCode, response.body).toBe(200);
}

beforeEach(async () => {
  owner = await signUp(ctx.app);
  householdId = (await me(ctx.app, owner)).household.id;
  groceries = await categoryOf('Supermercado');
});

describe('conectarse (especificación 012)', () => {
  it('sin sesión, 401; desde otra web, 403', async () => {
    await expect(connect(null)).rejects.toThrow(/401/);
    await expect(connect(owner, { origin: 'https://evil.example' })).rejects.toThrow(/403/);
  });

  it('desde la web propia y desde la app (sin Origin), se conecta', async () => {
    const web = await connect(owner, { origin: TEST_ORIGIN });
    const app = await connect(owner);
    web.ws.close();
    app.ws.close();
  });

  it('al cerrar la sesión en el servidor, la conexión abierta se cierra en el siguiente ping', async () => {
    const { ws, closed } = await connect(owner);
    const codes: number[] = [];
    ws.on('close', (code: number) => codes.push(code));
    const out = await call(ctx.app, owner, 'POST', '/api/auth/sign-out', {});
    expect(out.statusCode, out.body).toBe(200);
    await Promise.race([closed, tick(1000)]);
    expect(codes).toEqual([4001]);
  });

  it('envía un ping para que la conexión no se cierre por estar callada', async () => {
    const { ws, received } = await connect(owner);
    await tick(120);
    expect(received.some((m) => m.type === 'ping')).toBe(true);
    ws.close();
  });
});

describe('un aviso por cada tipo de cambio (RF-1201)', () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    [
      'movimiento',
      () =>
        call(ctx.app, owner, 'PUT', `/api/households/${householdId}/transactions/${newId()}`, {
          kind: 'expense',
          amountCents: 4530,
          date: '2026-10-27',
          categoryId: groceries,
        }),
      'transactions',
    ],
    [
      'pago recurrente',
      () =>
        call(ctx.app, owner, 'PUT', `/api/households/${householdId}/recurring/${newId()}`, {
          kind: 'expense',
          name: 'Luz',
          amountCents: 6000,
          categoryId: groceries,
          frequency: 'monthly',
          interval: 1,
          dayOfMonth: 15,
          startDate: '2026-10-01',
        }),
      'recurring',
    ],
    [
      'hucha',
      () =>
        call(ctx.app, owner, 'PUT', `/api/households/${householdId}/savings/${newId()}`, {
          name: 'Coche',
          icon: 'car',
          targetCents: 100000,
          deadline: '2027-12-31',
          contributionDay: 1,
        }),
      'savings',
    ],
    [
      'presupuesto',
      () =>
        call(ctx.app, owner, 'PUT', `/api/households/${householdId}/budgets/${groceries}`, {
          amountCents: 40000,
        }),
      'budgets',
    ],
    [
      'categoría',
      () =>
        call(ctx.app, owner, 'POST', `/api/households/${householdId}/categories`, {
          kind: 'expense',
          name: 'Mascotas',
          icon: 'other',
          color: '#1F5FBF',
        }),
      'categories',
    ],
    [
      'ajustes del hogar',
      () => call(ctx.app, owner, 'PATCH', `/api/households/${householdId}`, { name: 'Casa' }),
      'household',
    ],
    [
      'invitación',
      () =>
        call(ctx.app, owner, 'POST', `/api/households/${householdId}/invitations`, {
          role: 'viewer',
        }),
      'members',
    ],
  ];

  for (const [name, change, scope] of cases) {
    it(`${name} → «${scope}», sin datos`, async () => {
      const { ws, received } = await connect(owner);
      const response = (await change()) as { statusCode: number; body: string };
      expect(response.statusCode, response.body).toBeLessThan(300);
      await waitFor(received);
      expect(received.filter((m) => m.type === 'changed')).toEqual([{ type: 'changed', scope }]);
      ws.close();
    });
  }

  it('alguien acepta una invitación → «members» en el hogar al que entra', async () => {
    const { ws, received } = await connect(owner);
    const guest = await signUp(ctx.app);
    await join(guest);
    await waitFor(received);
    expect(received.filter((m) => m.type === 'changed')).toContainEqual({
      type: 'changed',
      scope: 'members',
    });
    ws.close();
  });

  it('un miembro borra su cuenta → «members» en su hogar', async () => {
    const guest = await signUp(ctx.app);
    await join(guest);
    const { ws, received } = await connect(owner);
    const response = await call(ctx.app, guest, 'DELETE', '/api/account', {
      password: TEST_PASSWORD,
    });
    expect(response.statusCode, response.body).toBeLessThan(300);
    await waitFor(received);
    expect(received.filter((m) => m.type === 'changed')).toContainEqual({
      type: 'changed',
      scope: 'members',
    });
    ws.close();
  });

  it('los demás miembros también lo reciben; otro hogar, no', async () => {
    const guest = await signUp(ctx.app);
    await join(guest);
    const stranger = await signUp(ctx.app);
    const mine = await connect(guest, {}, householdId);
    const theirs = await connect(stranger);
    await call(ctx.app, owner, 'PUT', `/api/households/${householdId}/budgets/${groceries}`, {
      amountCents: 1,
    });
    await waitFor(mine.received);
    await tick(80);
    expect(theirs.changes()).toEqual([]);
    mine.ws.close();
    theirs.ws.close();
  });

  it('una consulta o un cambio que falla no avisa', async () => {
    const { ws, received } = await connect(owner);
    await call(ctx.app, owner, 'GET', `/api/households/${householdId}/categories`);
    const bad = await call(
      ctx.app,
      owner,
      'PUT',
      `/api/households/${householdId}/transactions/${newId()}`,
      {
        kind: 'expense',
        amountCents: -1,
      },
    );
    expect(bad.statusCode).toBe(400);
    await tick(80);
    expect(received.filter((m) => m.type === 'changed')).toEqual([]);
    ws.close();
  });
});

describe('quien deja de ser miembro deja de recibir (RF-1203)', () => {
  it('al quitarlo del hogar, su conexión se cierra', async () => {
    const guest = await signUp(ctx.app);
    await join(guest);
    const guestMember = (await me(ctx.app, guest)).households.find(
      (h) => h.household.id === householdId,
    )!.member.id;
    const { closed } = await connect(guest, {}, householdId);
    const removed = await call(
      ctx.app,
      owner,
      'DELETE',
      `/api/households/${householdId}/members/${guestMember}`,
    );
    expect(removed.statusCode, removed.body).toBeLessThan(300);
    await Promise.race([closed, tick(2000).then(() => Promise.reject(new Error('no se cerró')))]);
  });

  it('al salir por su cuenta, también', async () => {
    const guest = await signUp(ctx.app);
    await join(guest);
    const { closed } = await connect(guest, {}, householdId);
    const left = await call(ctx.app, guest, 'POST', `/api/households/${householdId}/leave`, {});
    expect(left.statusCode, left.body).toBeLessThan(300);
    await Promise.race([closed, tick(2000).then(() => Promise.reject(new Error('no se cerró')))]);
  });
});

describe('varios hogares (especificación 013)', () => {
  it('se conecta al hogar que pide; a uno ajeno o mal escrito, 403', async () => {
    const stranger = await signUp(ctx.app);
    await expect(connect(stranger, {}, householdId)).rejects.toThrow(/403/);
    await expect(connect(owner, {}, 'no-es-un-id')).rejects.toThrow(/403/);
    const { ws } = await connect(owner, {}, householdId);
    ws.close();
  });

  it('cada conexión recibe solo los avisos de su hogar', async () => {
    const guest = await signUp(ctx.app);
    await join(guest);
    const own = (await me(ctx.app, guest)).households[0]!.household.id;
    const there = await connect(guest, {}, householdId);
    const home = await connect(guest, {}, own);
    await call(ctx.app, owner, 'PUT', `/api/households/${householdId}/budgets/${groceries}`, {
      amountCents: 1,
    });
    await waitFor(there.received);
    await tick(80);
    expect(home.changes()).toEqual([]);
    there.ws.close();
    home.ws.close();
  });

  it('al borrar un hogar, se cierran sus conexiones', async () => {
    const created = await call(ctx.app, owner, 'POST', '/api/households', { name: 'Pruebas' });
    const id = created.json().household.id as string;
    const { closed } = await connect(owner, {}, id);
    expect((await call(ctx.app, owner, 'DELETE', `/api/households/${id}`)).statusCode).toBe(204);
    await Promise.race([closed, tick(2000).then(() => Promise.reject(new Error('no se cerró')))]);
  });

  it('al quitarle de un hogar solo se cierra la conexión de ese hogar', async () => {
    const guest = await signUp(ctx.app);
    await join(guest);
    const list = (await me(ctx.app, guest)).households;
    const own = list[0]!.household.id;
    const guestMember = list.find((h) => h.household.id === householdId)!.member.id;
    const there = await connect(guest, {}, householdId);
    const home = await connect(guest, {}, own);
    let homeClosed = false;
    home.ws.on('close', () => (homeClosed = true));
    await call(ctx.app, owner, 'DELETE', `/api/households/${householdId}/members/${guestMember}`);
    await Promise.race([
      there.closed,
      tick(2000).then(() => Promise.reject(new Error('no se cerró'))),
    ]);
    await tick(80);
    expect(homeClosed).toBe(false);
    home.ws.close();
  });
});

describe('límites', () => {
  it('más de 10 conexiones de una cuenta cierran las más antiguas', async () => {
    const all = [];
    for (let i = 0; i < 11; i++) all.push(await connect(owner));
    await Promise.race([
      all[0]!.closed,
      tick(2000).then(() => Promise.reject(new Error('no se cerró'))),
    ]);
    for (const c of all.slice(1)) expect(c.ws.readyState).toBe(c.ws.OPEN);
    for (const c of all) c.ws.close();
  });
});
