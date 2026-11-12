import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { households, members, pushDevices, sessions } from '../src/db/schema';
import { PushError, type PushSender } from '../src/push/expo';
import { createActivityNotifier, type ActivityEvent } from '../src/push/activity';
import { joinHousehold, signUp, TEST_NOW, useTestServer, type TestUser } from './helpers';
import { fakeLog, fakeScheduler, fakeSender } from './push-fakes';

const ctx = useTestServer();

function setup(sender: ReturnType<typeof fakeSender>, options: { windowMs?: number } = {}) {
  const scheduler = fakeScheduler();
  const logger = fakeLog();
  const notifier = createActivityNotifier({
    db: ctx.db,
    sender: sender.sender,
    log: logger.log,
    now: () => TEST_NOW,
    schedule: scheduler.schedule,
    ...options,
  });
  return { notifier, scheduler, logger };
}

async function sessionOf(userId: string): Promise<string> {
  const [row] = await ctx.db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, userId));
  return row!.id;
}

async function addDevice(user: TestUser, token: string) {
  await ctx.db
    .insert(pushDevices)
    .values({ token, userId: user.id, sessionId: await sessionOf(user.id) });
}

const token = (n: string) => `ExponentPushToken[${n}]`;

async function memberOf(user: TestUser) {
  const [row] = await ctx.db.select().from(members).where(eq(members.userId, user.id));
  return row!;
}

/** Hogar con una autora (`ana`) y dos miembros más, cada uno con un móvil. */
async function household() {
  const ana = await signUp(ctx.app, { name: 'Ana' });
  const juan = await signUp(ctx.app, { name: 'Juan' });
  const luis = await signUp(ctx.app, { name: 'Luis' });
  await joinHousehold(ctx.db, ana, juan, 'editor');
  await joinHousehold(ctx.db, ana, luis, 'viewer');
  const anaMember = await memberOf(ana);
  await addDevice(ana, token('ana'));
  await addDevice(juan, token('juan'));
  await addDevice(luis, token('luis'));
  return { ana, juan, luis, householdId: anaMember.householdId, anaMemberId: anaMember.id };
}

const expense = (amountCents = 4530) =>
  ({ kind: 'expense', amountCents, categoryName: 'Supermercado', date: '2026-10-27' }) as const;

const event = (
  householdId: string,
  memberId: string,
  change: ActivityEvent['change'] = expense(),
): ActivityEvent => ({
  householdId,
  memberId,
  change,
});

const tokensOf = (sender: ReturnType<typeof fakeSender>) =>
  sender
    .messages()
    .map((m) => m.to)
    .sort();

describe('agrupador (especificación 014, RF-1405, CE-1404)', () => {
  it('record es síncrono y no hace E/S: no envía nada hasta que cierra la ventana', async () => {
    const { householdId, anaMemberId } = await household();
    const sender = fakeSender();
    const { notifier, scheduler } = setup(sender);
    const result = notifier.record(event(householdId, anaMemberId));
    expect(result).toBeUndefined();
    expect(sender.sent).toHaveLength(0);
    expect(scheduler.jobs).toHaveLength(1);
  });

  it('la ventana es fija, de 5 s, y no se alarga con cada evento', async () => {
    const { householdId, anaMemberId } = await household();
    const { notifier, scheduler } = setup(fakeSender());
    notifier.record(event(householdId, anaMemberId));
    notifier.record(event(householdId, anaMemberId));
    notifier.record(event(householdId, anaMemberId));
    expect(scheduler.jobs).toHaveLength(1);
    expect(scheduler.jobs[0]!.ms).toBe(5000);
  });

  it('20 eventos del mismo miembro dan un solo envío por dispositivo', async () => {
    const { householdId, anaMemberId } = await household();
    const sender = fakeSender();
    const { notifier, scheduler } = setup(sender);
    for (let i = 0; i < 20; i++) notifier.record(event(householdId, anaMemberId));
    scheduler.fire(0);
    await notifier.idle();
    expect(sender.sent).toHaveLength(1);
    expect(sender.messages()).toHaveLength(2); // Juan y Luis
    expect(sender.messages()[0]!.body).toBe('Ana ha apuntado 20 movimientos');
  });

  it('dos autores distintos dan avisos distintos', async () => {
    const { householdId, anaMemberId, juan } = await household();
    const juanMember = await memberOf(juan);
    const sender = fakeSender();
    const { notifier, scheduler } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    notifier.record(event(householdId, juanMember.id));
    expect(scheduler.jobs).toHaveLength(2);
    scheduler.fire(0);
    scheduler.fire(1);
    await notifier.idle();
    const bodies = sender.messages().map((m) => m.body);
    expect(bodies.some((b) => b.startsWith('Ana '))).toBe(true);
    expect(bodies.some((b) => b.startsWith('Juan '))).toBe(true);
  });

  it('pasada la ventana, un evento nuevo abre otra', async () => {
    const { householdId, anaMemberId } = await household();
    const sender = fakeSender();
    const { notifier, scheduler } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    scheduler.fire(0);
    await notifier.idle();
    notifier.record(event(householdId, anaMemberId));
    expect(scheduler.jobs.filter((j) => j.ms === 5000)).toHaveLength(2);
  });

  it('flushAll envía lo pendiente y cancela la ventana (cierre del servidor)', async () => {
    const { householdId, anaMemberId } = await household();
    const sender = fakeSender();
    const { notifier, scheduler } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    await notifier.flushAll();
    expect(sender.messages()).toHaveLength(2);
    expect(scheduler.jobs[0]!.cancelled).toBe(true);
  });
});

describe('destinatarios (RF-1403, RF-1409, CE-1403)', () => {
  it('reciben los demás miembros del hogar, no quien hizo el cambio', async () => {
    const { householdId, anaMemberId } = await household();
    const sender = fakeSender();
    const { notifier } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    await notifier.flushAll();
    expect(tokensOf(sender)).toEqual([token('juan'), token('luis')]);
  });

  it('el aviso lleva el hogar como título, quién lo hizo y los datos para abrirlo', async () => {
    const { householdId, anaMemberId } = await household();
    const [row] = await ctx.db
      .select({ name: households.name })
      .from(households)
      .where(eq(households.id, householdId));
    const name = row!.name;
    const sender = fakeSender();
    const { notifier } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    await notifier.flushAll();
    const message = sender.messages()[0]!;
    expect(message.title).toBe(name);
    expect(message.body.replace(/\u00a0/g, ' ')).toBe('Ana ha apuntado 45,30 € en Supermercado');
    expect(message.data).toMatchObject({ type: 'activity', householdId });
    expect(message.channelId).toBe('actividad');
  });

  it('tampoco los otros móviles de quien hizo el cambio', async () => {
    const { householdId, anaMemberId, ana } = await household();
    await addDevice(ana, token('ana-segundo'));
    const sender = fakeSender();
    const { notifier } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    await notifier.flushAll();
    expect(tokensOf(sender)).not.toContain(token('ana'));
    expect(tokensOf(sender)).not.toContain(token('ana-segundo'));
  });

  it('una persona con dos móviles recibe el aviso en los dos', async () => {
    const { householdId, anaMemberId, juan } = await household();
    await addDevice(juan, token('juan-2'));
    const sender = fakeSender();
    const { notifier } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    await notifier.flushAll();
    expect(tokensOf(sender)).toEqual([token('juan'), token('juan-2'), token('luis')].sort());
  });

  it('un miembro de otro hogar no recibe nada', async () => {
    const { householdId, anaMemberId } = await household();
    const otra = await signUp(ctx.app, { name: 'Otra' });
    await addDevice(otra, token('otra'));
    const sender = fakeSender();
    const { notifier } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    await notifier.flushAll();
    expect(tokensOf(sender)).not.toContain(token('otra'));
  });

  it('con la preferencia de ese hogar apagada no recibe, y el resto sí (CE-1402)', async () => {
    const { householdId, anaMemberId, juan } = await household();
    await ctx.db
      .update(members)
      .set({ activityAlertsEnabled: false })
      .where(eq(members.userId, juan.id));
    const sender = fakeSender();
    const { notifier } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    await notifier.flushAll();
    expect(tokensOf(sender)).toEqual([token('luis')]);
  });

  it('la preferencia es por hogar: apagada en uno, sigue recibiendo los del otro', async () => {
    const { householdId, anaMemberId, juan } = await household();
    // Juan está también en otro hogar, con los avisos activados.
    const [otro] = await ctx.db.select().from(households).where(eq(households.id, householdId));
    const [segundo] = await ctx.db
      .insert(households)
      .values({
        name: 'Piso',
        currency: otro!.currency,
        monthStartDay: 1,
        timezone: otro!.timezone,
      })
      .returning();
    const [juanEnSegundo] = await ctx.db
      .insert(members)
      .values({ householdId: segundo!.id, userId: juan.id, role: 'owner' })
      .returning();
    const lola = await signUp(ctx.app, { name: 'Lola' });
    const [lolaEnSegundo] = await ctx.db
      .insert(members)
      .values({ householdId: segundo!.id, userId: lola.id, role: 'editor' })
      .returning();
    await ctx.db
      .update(members)
      .set({ activityAlertsEnabled: false })
      .where(and(eq(members.userId, juan.id), eq(members.householdId, householdId)));

    const sender = fakeSender();
    const { notifier } = setup(sender);
    notifier.record(event(householdId, anaMemberId)); // hogar apagado para Juan
    notifier.record(event(segundo!.id, lolaEnSegundo!.id)); // hogar activado para Juan
    await notifier.flushAll();
    const toJuan = sender.messages().filter((m) => m.to === token('juan'));
    expect(toJuan).toHaveLength(1);
    expect(toJuan[0]!.data).toMatchObject({ householdId: segundo!.id });
    expect(juanEnSegundo).toBeDefined();
  });

  it('un móvil con la sesión cerrada o caducada no recibe (RF-1409)', async () => {
    const { householdId, anaMemberId, juan, luis } = await household();
    // Caducada: la hora de la prueba es posterior a su caducidad.
    await ctx.db
      .update(sessions)
      .set({ expiresAt: new Date(TEST_NOW.getTime() - 86_400_000) })
      .where(eq(sessions.userId, juan.id));
    // Cerrada: borrar la sesión borra el dispositivo en cascada.
    await ctx.db.delete(sessions).where(eq(sessions.userId, luis.id));
    const sender = fakeSender();
    const { notifier } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    await notifier.flushAll();
    expect(sender.sent).toHaveLength(0);
  });

  it('quien ha salido del hogar o lo han quitado no recibe', async () => {
    const { householdId, anaMemberId, juan } = await household();
    await ctx.db.delete(members).where(eq(members.userId, juan.id));
    const sender = fakeSender();
    const { notifier } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    await notifier.flushAll();
    expect(tokensOf(sender)).toEqual([token('luis')]);
  });

  it('un rol de solo lectura recibe los avisos igual', async () => {
    const { householdId, anaMemberId } = await household();
    const sender = fakeSender();
    const { notifier } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    await notifier.flushAll();
    expect(tokensOf(sender)).toContain(token('luis')); // Luis es lector
  });

  it('sin destinatarios no se llama al servicio de envío', async () => {
    const solo = await signUp(ctx.app, { name: 'Sola' });
    await addDevice(solo, token('sola'));
    const m = await memberOf(solo);
    const sender = fakeSender();
    const { notifier } = setup(sender);
    notifier.record(event(m.householdId, m.id));
    await notifier.flushAll();
    expect(sender.sent).toHaveLength(0);
  });

  it('si el autor ya no existe, el aviso sale sin nombre y llega a los demás', async () => {
    const { householdId, anaMemberId, ana } = await household();
    await ctx.db.delete(members).where(eq(members.userId, ana.id));
    const sender = fakeSender();
    const { notifier } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    await notifier.flushAll();
    expect(sender.messages()).toHaveLength(2);
    expect(sender.messages()[0]!.body.replace(/\u00a0/g, ' ')).toBe(
      'Se ha apuntado 45,30 € en Supermercado',
    );
  });

  it('un hogar que ya no existe no envía nada ni falla', async () => {
    const { householdId, anaMemberId } = await household();
    const sender = fakeSender();
    const { notifier, logger } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    await ctx.db.delete(households).where(eq(households.id, householdId));
    await notifier.flushAll();
    expect(sender.sent).toHaveLength(0);
    expect(logger.lines).toHaveLength(0);
  });
});

describe('tickets, recibos y fallos del servicio de envío (RF-1411)', () => {
  it('DeviceNotRegistered en un ticket borra ese token y no los demás', async () => {
    const { householdId, anaMemberId } = await household();
    const sender = fakeSender({
      ticket: (m, i) =>
        m.to === token('juan')
          ? { status: 'error', error: 'DeviceNotRegistered' }
          : { status: 'ok', id: `ok-${i}` },
    });
    const { notifier } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    await notifier.flushAll();
    const left = (await ctx.db.select({ token: pushDevices.token }).from(pushDevices)).map(
      (d) => d.token,
    );
    expect(left).not.toContain(token('juan'));
    expect(left).toContain(token('luis'));
    expect(left).toContain(token('ana'));
  });

  it('otro error de un ticket no borra el token', async () => {
    const { householdId, anaMemberId } = await household();
    const sender = fakeSender({
      ticket: () => ({ status: 'error', error: 'MessageRateExceeded' }),
    });
    const { notifier } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    await notifier.flushAll();
    expect(await ctx.db.select().from(pushDevices)).toHaveLength(3);
  });

  it('a los 15 minutos consulta los recibos, una vez, y borra los DeviceNotRegistered', async () => {
    const { householdId, anaMemberId } = await household();
    const sender = fakeSender({
      ticket: (m) => ({ status: 'ok', id: `id-${m.to}` }),
      receipts: {
        [`id-${token('luis')}`]: { status: 'error', error: 'DeviceNotRegistered' },
        [`id-${token('juan')}`]: { status: 'ok' },
      },
    });
    const { notifier, scheduler } = setup(sender);
    notifier.record(event(householdId, anaMemberId));
    scheduler.fire(0);
    await notifier.idle();
    const receiptJob = scheduler.jobs.findIndex((j) => j.ms === 15 * 60_000);
    expect(receiptJob).toBeGreaterThan(0);
    scheduler.fire(receiptJob);
    await notifier.idle();
    expect(sender.receiptCalls).toHaveLength(1);
    expect(sender.receiptCalls[0]!.sort()).toEqual([`id-${token('juan')}`, `id-${token('luis')}`]);
    const left = (await ctx.db.select({ token: pushDevices.token }).from(pushDevices)).map(
      (d) => d.token,
    );
    expect(left).not.toContain(token('luis'));
    expect(left).toContain(token('juan'));
  });

  it('si el servicio de envío falla, el aviso se pierde sin lanzar y solo se registra con ids', async () => {
    const { householdId, anaMemberId } = await household();
    const sender = fakeSender({ fail: true });
    const { notifier, scheduler, logger } = setup(sender);
    notifier.record(event(householdId, anaMemberId, expense(4530)));
    scheduler.fire(0);
    await expect(notifier.idle()).resolves.toBeUndefined();
    expect(logger.lines.length).toBeGreaterThan(0);
    const text = JSON.stringify(logger.lines);
    expect(text).not.toMatch(/45,30|4530|Supermercado|Ana|Juan|Luis|ExponentPushToken/);
    expect(text).toContain(householdId);
    expect(await ctx.db.select().from(pushDevices)).toHaveLength(3);
  });

  it('un fallo al consultar los recibos tampoco lanza ni registra textos', async () => {
    const { householdId, anaMemberId } = await household();
    const base = fakeSender();
    const sender: PushSender = {
      send: base.sender.send,
      receipts: async () => {
        throw new PushError(500);
      },
    };
    const scheduler = fakeScheduler();
    const logger = fakeLog();
    const notifier = createActivityNotifier({
      db: ctx.db,
      sender,
      log: logger.log,
      now: () => TEST_NOW,
      schedule: scheduler.schedule,
    });
    notifier.record(event(householdId, anaMemberId));
    scheduler.fire(0);
    await notifier.idle();
    scheduler.fire(scheduler.jobs.findIndex((j) => j.ms === 15 * 60_000));
    await expect(notifier.idle()).resolves.toBeUndefined();
    expect(JSON.stringify(logger.lines)).not.toMatch(/45,30|Ana|ExponentPushToken/);
  });

  it('los temporizadores no mantienen vivo el proceso (unref)', () => {
    // El temporizador por defecto está probado en el arranque del servidor; aquí solo se
    // comprueba que crear el notificador sin `schedule` no lanza.
    const notifier = createActivityNotifier({
      db: ctx.db,
      sender: fakeSender().sender,
      log: fakeLog().log,
      now: () => TEST_NOW,
    });
    expect(notifier.record).toBeTypeOf('function');
  });
});
