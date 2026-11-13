import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Database } from '../db/client';
import { households, members, pushDevices, sessions, users } from '../db/schema';
import { safeError } from '../logging';
import { PushError, type PushMessage, type PushSender } from './expo';
import { activityNotification, type ActivityChange } from './messages';

/**
 * Avisos push de actividad (especificación 014). Las rutas apuntan aquí lo que ha hecho un
 * miembro con `record`, que es síncrono y no toca la base de datos ni la red (RF-1411): un fallo
 * o un retraso del servicio de envío nunca llega a la petición que provocó el aviso.
 *
 * Los cambios se agrupan por hogar y miembro en una ventana FIJA de 5 s: el primero la abre y no
 * se alarga con los siguientes, para que el aviso nunca pase de unos 10 s (CE-1401). Al cerrarla,
 * se buscan los dispositivos de los demás miembros con los avisos activados y con la sesión
 * viva, se compone un único texto y se envía. Los fallos solo se registran, con ids y recuentos
 * (constitución, art. VI.4); un aviso perdido no se reintenta.
 *
 * Vive en memoria y en una sola instancia, como el hub del tiempo real: con varias, cada una
 * agruparía lo suyo y podría salir un aviso de más.
 */

export interface ActivityEvent {
  householdId: string;
  /** Miembro que hizo el cambio: se le excluye a él y a todos sus dispositivos (RF-1403). */
  memberId: string;
  change: ActivityChange;
}

export interface ActivityNotifier {
  /** Apunta un cambio. Síncrono y sin E/S. */
  record(event: ActivityEvent): void;
  /** Envía lo pendiente ahora (cierre del servidor: un despliegue no pierde avisos). */
  flushAll(): Promise<void>;
  /** Espera a que acaben los envíos en curso. Para los tests. */
  idle(): Promise<void>;
}

/** Pone una tarea para dentro de `ms` y devuelve cómo cancelarla. */
export type Schedule = (task: () => void, ms: number) => () => void;

export interface ActivityLog {
  warn(object: object, message: string): void;
  error(object: object, message: string): void;
}

/** Sin avisos: para un servidor sin servicio de envío configurado. */
export const noActivityNotifier: ActivityNotifier = {
  record: () => undefined,
  flushAll: async () => undefined,
  idle: async () => undefined,
};

export interface ActivityNotifierOptions {
  db: Database;
  sender: PushSender;
  log: ActivityLog;
  /** Reloj del servidor: decide qué sesiones han caducado (constitución, art. VII.5). */
  now: () => Date;
  /** Ventana de agrupación. Por defecto, 5 s. */
  windowMs?: number;
  /** Cuánto se espera para consultar los recibos de entrega. Por defecto, 15 min. */
  receiptDelayMs?: number;
  schedule?: Schedule;
}

const WINDOW_MS = 5000;
const RECEIPT_DELAY_MS = 15 * 60_000;
const DEVICE_NOT_REGISTERED = 'DeviceNotRegistered';

/** Temporizador real que no mantiene vivo el proceso. */
const realSchedule: Schedule = (task, ms) => {
  const timer = setTimeout(task, ms);
  timer.unref();
  return () => clearTimeout(timer);
};

interface Window {
  householdId: string;
  memberId: string;
  changes: ActivityChange[];
  cancel: () => void;
}

export function createActivityNotifier(options: ActivityNotifierOptions): ActivityNotifier {
  const { db, sender, log, now } = options;
  const windowMs = options.windowMs ?? WINDOW_MS;
  const receiptDelayMs = options.receiptDelayMs ?? RECEIPT_DELAY_MS;
  const schedule = options.schedule ?? realSchedule;
  const open = new Map<string, Window>();
  const inFlight = new Set<Promise<void>>();

  /** Lanza una tarea asíncrona sin que su fallo escape: solo se registra. */
  function track(task: Promise<void>, householdId: string, what: string, counts: object): void {
    const wrapped = task.catch((error: unknown) => {
      log.warn(
        { householdId, ...counts, ...errorInfo(error) },
        `No se pudo ${what}: el aviso se pierde`,
      );
    });
    inFlight.add(wrapped);
    void wrapped.finally(() => inFlight.delete(wrapped));
  }

  async function deleteTokens(tokens: readonly string[]): Promise<void> {
    if (tokens.length === 0) return;
    await db.delete(pushDevices).where(inArray(pushDevices.token, [...tokens]));
  }

  /** Dispositivos de los demás miembros, con el nombre del autor y los datos del hogar. */
  async function recipients(window: Window) {
    const author = alias(members, 'author');
    const authorUser = alias(users, 'author_user');
    return db
      .select({
        token: pushDevices.token,
        householdName: households.name,
        currency: households.currency,
        authorName: authorUser.name,
      })
      .from(members)
      .innerJoin(households, eq(households.id, members.householdId))
      .innerJoin(pushDevices, eq(pushDevices.userId, members.userId))
      .innerJoin(sessions, eq(sessions.id, pushDevices.sessionId))
      .leftJoin(author, eq(author.id, window.memberId))
      .leftJoin(authorUser, eq(authorUser.id, author.userId))
      .where(
        and(
          eq(members.householdId, window.householdId),
          eq(members.activityAlertsEnabled, true),
          gt(sessions.expiresAt, now()),
          // Distinto del autor; si el autor ya no existe, `author.user_id` es NULL y pasan todos.
          sql`${members.userId} IS DISTINCT FROM ${author.userId}`,
        ),
      );
  }

  async function deliver(window: Window): Promise<void> {
    const rows = await recipients(window);
    const first = rows[0];
    if (!first) return;
    const template = activityNotification({
      householdId: window.householdId,
      householdName: first.householdName,
      currency: first.currency,
      authorName: first.authorName,
      changes: window.changes,
    });
    const tokens = [...new Set(rows.map((r) => r.token))];
    const messages: PushMessage[] = tokens.map((to) => ({ ...template, to }));
    const tickets = await sender.send(messages);

    const gone: string[] = [];
    const pending = new Map<string, string>(); // id del ticket -> token
    tickets.forEach((ticket, index) => {
      const to = tokens[index]!;
      if (ticket.status === 'ok') pending.set(ticket.id, to);
      else if (ticket.error === DEVICE_NOT_REGISTERED) gone.push(to);
    });
    await deleteTokens(gone);
    if (pending.size > 0) {
      schedule(() => {
        track(checkReceipts(pending), window.householdId, 'consultar los recibos', {
          devices: pending.size,
        });
      }, receiptDelayMs);
    }
  }

  async function checkReceipts(pending: Map<string, string>): Promise<void> {
    const receipts = await sender.receipts([...pending.keys()]);
    const gone = Object.entries(receipts)
      .filter(([, r]) => r.status === 'error' && r.error === DEVICE_NOT_REGISTERED)
      .map(([id]) => pending.get(id))
      .filter((token): token is string => token !== undefined);
    await deleteTokens(gone);
  }

  function flush(key: string): Promise<void> {
    const window = open.get(key);
    if (!window) return Promise.resolve();
    open.delete(key);
    window.cancel();
    const task = deliver(window);
    track(task, window.householdId, 'enviar el aviso', { changes: window.changes.length });
    return task.catch(() => undefined);
  }

  return {
    record(event) {
      const key = `${event.householdId}:${event.memberId}`;
      const existing = open.get(key);
      if (existing) {
        existing.changes.push(event.change);
        return;
      }
      const window: Window = {
        householdId: event.householdId,
        memberId: event.memberId,
        changes: [event.change],
        cancel: () => undefined,
      };
      window.cancel = schedule(() => void flush(key), windowMs);
      open.set(key, window);
    },

    async flushAll() {
      await Promise.all([...open.keys()].map(flush));
      await Promise.all([...inFlight]);
    },

    async idle() {
      while (inFlight.size > 0) await Promise.all([...inFlight]);
    },
  };
}

/** De un error, solo lo que no puede llevar datos: el estado HTTP o el tipo y el código. */
function errorInfo(error: unknown): object {
  if (error instanceof PushError) return { status: error.status };
  const { type, code } = safeError(error);
  return { errorType: type, ...(typeof code === 'string' && { code }) };
}
