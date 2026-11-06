import type { TransactionInput } from '@smartnomic/api';
import { sendOutcome } from '@smartnomic/domain';
import { ApiError } from '../api/http';

/**
 * Bandeja de salida (especificación 011): movimientos nuevos apuntados sin conexión que
 * esperan a enviarse. Sin React ni React Native, para probarla con almacenamiento y envío
 * falsos. Cada movimiento lleva el id creado en el móvil y el servidor guarda por id, así que
 * reenviarlo nunca lo duplica (RF-1104).
 */

export interface PendingTransaction {
  /** El id del movimiento: el mismo en cada reenvío. */
  id: string;
  householdId: string;
  input: TransactionInput;
  /** Cuándo se apuntó: decide el orden de envío. */
  createdAt: string;
  status: 'waiting' | 'rejected';
  /** Motivo del servidor si se rechazó. */
  reason?: string;
}

export interface OutboxStorage {
  load(key: string): Promise<string | null>;
  save(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Envía un movimiento; lanza `ApiError` si no se pudo. */
export type SendTransaction = (
  householdId: string,
  id: string,
  input: TransactionInput,
) => Promise<unknown>;

export interface FlushResult {
  sent: number;
  rejected: number;
  /** `true` si se paró por falta de conexión (o fallo del servidor): queda algo por enviar. */
  stopped: boolean;
}

export interface Outbox {
  load(): Promise<void>;
  list(): PendingTransaction[];
  add(entry: { id: string; householdId: string; input: TransactionInput }): Promise<void>;
  update(id: string, input: TransactionInput): Promise<void>;
  discard(id: string): Promise<void>;
  clear(): Promise<void>;
  flush(send: SendTransaction): Promise<FlushResult>;
  subscribe(listener: (list: PendingTransaction[]) => void): () => void;
}

/** La bandeja de una cuenta: cada cuenta del móvil tiene la suya (RF-1107). */
export function outboxKey(userId: string): string {
  return `smartnomic-outbox:${userId}`;
}

/** Código HTTP de un fallo al enviar: 0 si no hubo respuesta o no se sabe. */
function statusOf(error: unknown): number {
  return error instanceof ApiError ? error.status : 0;
}

export function createOutbox(storage: OutboxStorage, userId: string): Outbox {
  const key = outboxKey(userId);
  let items: PendingTransaction[] = [];
  let running: Promise<FlushResult> | null = null;
  const listeners = new Set<(list: PendingTransaction[]) => void>();

  async function commit(next: PendingTransaction[]) {
    items = next;
    if (items.length === 0) await storage.remove(key);
    else await storage.save(key, JSON.stringify(items));
    const snapshot = [...items];
    listeners.forEach((listener) => listener(snapshot));
  }

  async function runFlush(send: SendTransaction): Promise<FlushResult> {
    const result: FlushResult = { sent: 0, rejected: 0, stopped: false };
    // Se toma la cola en su orden; cada vuelta mira el estado actual por si se corrigió o
    // descartó algo mientras tanto.
    const queue = items.filter((p) => p.status === 'waiting').map((p) => p.id);
    for (const id of queue) {
      const current = items.find((p) => p.id === id);
      if (!current || current.status !== 'waiting') continue;
      let outcome: 'sent' | 'retry' | 'rejected';
      let reason: string | undefined;
      try {
        await send(current.householdId, current.id, current.input);
        outcome = 'sent';
      } catch (error) {
        outcome = sendOutcome(statusOf(error));
        reason = error instanceof Error ? error.message : undefined;
      }
      if (outcome === 'sent') {
        result.sent++;
        await commit(items.filter((p) => p.id !== id));
      } else if (outcome === 'rejected') {
        result.rejected++;
        await commit(
          items.map((p) =>
            p.id === id ? { ...p, status: 'rejected' as const, ...(reason && { reason }) } : p,
          ),
        );
      } else {
        // Sin conexión o fallo del servidor: no tiene sentido seguir ahora.
        result.stopped = true;
        break;
      }
    }
    return result;
  }

  return {
    async load() {
      const text = await storage.load(key);
      items = text ? (JSON.parse(text) as PendingTransaction[]) : [];
    },
    list: () => [...items],
    async add(entry) {
      if (items.some((p) => p.id === entry.id)) return;
      await commit([
        ...items,
        { ...entry, createdAt: new Date().toISOString(), status: 'waiting' },
      ]);
    },
    async update(id, input) {
      await commit(
        items.map((p) => {
          if (p.id !== id) return p;
          // Al corregirlo vuelve a la cola sin el motivo del rechazo.
          const next: PendingTransaction = { ...p, input, status: 'waiting' };
          delete next.reason;
          return next;
        }),
      );
    },
    async discard(id) {
      await commit(items.filter((p) => p.id !== id));
    },
    async clear() {
      await commit([]);
    },
    flush(send) {
      // Un solo envío a la vez: quien llega mientras tanto espera al que está en marcha.
      running ??= runFlush(send).finally(() => {
        running = null;
      });
      return running;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
