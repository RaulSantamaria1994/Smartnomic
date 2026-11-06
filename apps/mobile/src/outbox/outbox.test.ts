import type { TransactionInput } from '@smartnomic/api';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/http';
import { createOutbox, type OutboxStorage, type PendingTransaction } from './outbox';

/** Almacenamiento en memoria que sobrevive a «reiniciar» (crear otra bandeja con él). */
function memoryStorage(): OutboxStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    load: async (key) => data.get(key) ?? null,
    save: async (key, value) => void data.set(key, value),
    remove: async (key) => void data.delete(key),
  };
}

const input = (amountCents: number): TransactionInput => ({
  kind: 'expense',
  amountCents,
  date: '2026-10-27',
  categoryId: '0190a3f2-7b1c-7d3e-8f4a-123456789abc',
});

let n = 0;
const entry = (amountCents: number, householdId = 'h1') => ({
  id: `0190a3f2-7b1c-7d3e-8f4a-${String(++n).padStart(12, '0')}`,
  householdId,
  input: input(amountCents),
});

/** Servidor falso: guarda por id (como el PUT idempotente) y falla cuando se le pide. */
function fakeServer() {
  const saved = new Map<string, TransactionInput>();
  const calls: string[] = [];
  let fail: ((id: string) => Error | null) | null = null;
  return {
    saved,
    calls,
    failWith(f: ((id: string) => Error | null) | null) {
      fail = f;
    },
    send: async (_householdId: string, id: string, body: TransactionInput) => {
      calls.push(id);
      const error = fail?.(id);
      if (error) throw error;
      saved.set(id, body);
    },
  };
}

const offline = () => new ApiError('network', 0, 'sin conexión');

describe('bandeja de salida (especificación 011)', () => {
  it('añadir, corregir y descartar, y se guarda en el almacenamiento', async () => {
    const storage = memoryStorage();
    const outbox = createOutbox(storage, 'user-1');
    await outbox.load();
    const a = entry(100);
    await outbox.add(a);
    expect(outbox.list().map((p) => p.input.amountCents)).toEqual([100]);
    await outbox.update(a.id, input(250));
    expect(outbox.list()[0]).toMatchObject({
      id: a.id,
      status: 'waiting',
      input: { amountCents: 250 },
    });
    const again = createOutbox(storage, 'user-1');
    await again.load();
    expect(again.list()[0]!.input.amountCents).toBe(250);
    await again.discard(a.id);
    expect(again.list()).toEqual([]);
  });

  it('envía en el orden en que se apuntaron y los quita al llegar', async () => {
    const outbox = createOutbox(memoryStorage(), 'user-1');
    await outbox.load();
    const [a, b, c] = [entry(1), entry(2), entry(3)];
    for (const e of [a, b, c]) await outbox.add(e);
    const server = fakeServer();
    expect(await outbox.flush(server.send)).toEqual({ sent: 3, rejected: 0, stopped: false });
    expect(server.calls).toEqual([a.id, b.id, c.id]);
    expect(outbox.list()).toEqual([]);
  });

  it('sin conexión para la cola y no pierde nada', async () => {
    const outbox = createOutbox(memoryStorage(), 'user-1');
    await outbox.load();
    for (const e of [entry(1), entry(2)]) await outbox.add(e);
    const server = fakeServer();
    server.failWith(offline);
    expect(await outbox.flush(server.send)).toEqual({ sent: 0, rejected: 0, stopped: true });
    expect(server.calls).toHaveLength(1);
    expect(outbox.list().map((p) => p.status)).toEqual(['waiting', 'waiting']);
  });

  it('un fallo del servidor o de la sesión también es reintentar', async () => {
    const outbox = createOutbox(memoryStorage(), 'user-1');
    await outbox.load();
    await outbox.add(entry(1));
    for (const status of [401, 429, 500, 503]) {
      const server = fakeServer();
      server.failWith(
        () => new ApiError(status === 401 ? 'unauthenticated' : 'internal', status, 'x'),
      );
      expect((await outbox.flush(server.send)).stopped, String(status)).toBe(true);
      expect(outbox.list()[0]!.status).toBe('waiting');
    }
  });

  it('un rechazo guarda el motivo y sigue con los demás; corregirlo lo devuelve a la cola', async () => {
    const outbox = createOutbox(memoryStorage(), 'user-1');
    await outbox.load();
    const [a, b] = [entry(1), entry(2)];
    await outbox.add(a);
    await outbox.add(b);
    const server = fakeServer();
    server.failWith((id) =>
      id === a.id ? new ApiError('conflict', 409, 'La categoría está archivada.') : null,
    );
    expect(await outbox.flush(server.send)).toEqual({ sent: 1, rejected: 1, stopped: false });
    expect(outbox.list()).toEqual([
      expect.objectContaining({
        id: a.id,
        status: 'rejected',
        reason: 'La categoría está archivada.',
      }),
    ]);
    // Un rechazado no se reintenta solo.
    server.failWith(null);
    expect(await outbox.flush(server.send)).toEqual({ sent: 0, rejected: 0, stopped: false });
    await outbox.update(a.id, input(5));
    expect(outbox.list()[0]).toMatchObject({ status: 'waiting' });
    expect(outbox.list()[0]!.reason).toBeUndefined();
    await outbox.flush(server.send);
    expect(server.saved.get(a.id)?.amountCents).toBe(5);
  });

  it('CE-1102: cortes a mitad del envío no pierden ni duplican', async () => {
    const outbox = createOutbox(memoryStorage(), 'user-1');
    await outbox.load();
    const entries = Array.from({ length: 10 }, (_, i) => entry(i + 1));
    for (const e of entries) await outbox.add(e);
    const server = fakeServer();
    // El servidor guarda, pero la respuesta se pierde (el móvil cree que falló).
    let cut = 0;
    const send = async (h: string, id: string, body: TransactionInput) => {
      await server.send(h, id, body);
      if (++cut % 3 === 0) throw offline();
    };
    for (let i = 0; i < 20 && outbox.list().length > 0; i++) await outbox.flush(send);
    expect(outbox.list()).toEqual([]);
    expect(server.saved.size).toBe(10);
    for (const e of entries) expect(server.saved.get(e.id)?.amountCents).toBe(e.input.amountCents);
  });

  it('CE-1101: tras «reiniciar» con pendientes, siguen ahí y se envían una vez', async () => {
    const storage = memoryStorage();
    const first = createOutbox(storage, 'user-1');
    await first.load();
    const entries = Array.from({ length: 20 }, (_, i) => entry(i + 1));
    for (const e of entries.slice(0, 10)) await first.add(e);
    const second = createOutbox(storage, 'user-1');
    await second.load();
    for (const e of entries.slice(10)) await second.add(e);
    const third = createOutbox(storage, 'user-1');
    await third.load();
    expect(third.list()).toHaveLength(20);
    const server = fakeServer();
    await third.flush(server.send);
    expect(server.calls).toEqual(entries.map((e) => e.id));
  });

  it('dos envíos a la vez no se pisan: cada uno sale una sola vez', async () => {
    const outbox = createOutbox(memoryStorage(), 'user-1');
    await outbox.load();
    for (const e of [entry(1), entry(2), entry(3)]) await outbox.add(e);
    const server = fakeServer();
    const slow = async (h: string, id: string, b: TransactionInput) => {
      await new Promise((r) => setTimeout(r, 5));
      await server.send(h, id, b);
    };
    await Promise.all([outbox.flush(slow), outbox.flush(slow), outbox.flush(slow)]);
    expect(server.calls).toHaveLength(3);
    expect(outbox.list()).toEqual([]);
  });

  it('cada cuenta tiene su bandeja; vaciarla la borra del almacenamiento', async () => {
    const storage = memoryStorage();
    const lucia = createOutbox(storage, 'lucia');
    await lucia.load();
    await lucia.add(entry(1));
    const juan = createOutbox(storage, 'juan');
    await juan.load();
    expect(juan.list()).toEqual([]);
    await lucia.clear();
    expect(storage.data.size).toBe(0);
  });

  it('avisa a quien escucha de cada cambio', async () => {
    const outbox = createOutbox(memoryStorage(), 'user-1');
    await outbox.load();
    const seen: PendingTransaction[][] = [];
    const stop = outbox.subscribe((list) => seen.push(list));
    await outbox.add(entry(1));
    await outbox.flush(fakeServer().send);
    stop();
    await outbox.add(entry(2));
    expect(seen.map((l) => l.length)).toEqual([1, 0]);
  });
});
