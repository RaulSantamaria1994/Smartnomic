import type { TransactionInput } from '@smartnomic/api';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { api, queryKeys } from '../api/client';
import { useMe } from '../hooks/data';
import { createOutbox, type Outbox, type PendingTransaction } from './outbox';
import { outboxStorage } from './outbox-storage';

/** Cada cuánto se reintenta mientras haya pendientes y la app esté abierta. */
const RETRY_EVERY_MS = 30_000;

interface OutboxState {
  /** La bandeja de la cuenta con sesión; `null` en la web o antes de saber la cuenta. */
  outbox: Outbox | null;
  items: PendingTransaction[];
  sending: boolean;
}

const useOutboxState = create<OutboxState>(() => ({ outbox: null, items: [], sending: false }));

/** ¿Se puede guardar para más tarde en esta plataforma? (Android; la web necesita conexión.) */
export const outboxAvailable = outboxStorage !== null;

/**
 * Envía lo pendiente. Devuelve cuántos han llegado; si alguno llega, «Mes», gráficas y
 * búsqueda se recargan (cuelgan de `periods`).
 */
async function flushNow(onSent: (householdIds: Set<string>) => void): Promise<number> {
  const { outbox } = useOutboxState.getState();
  if (!outbox || !outbox.list().some((p) => p.status === 'waiting')) return 0;
  const households = new Set(outbox.list().map((p) => p.householdId));
  useOutboxState.setState({ sending: true });
  try {
    const result = await outbox.flush((householdId, id, input) =>
      api.saveTransaction(householdId, id, input),
    );
    if (result.sent > 0) onSent(households);
    return result.sent;
  } finally {
    useOutboxState.setState({ sending: false });
  }
}

/**
 * Abre la bandeja de la cuenta con sesión y la envía sola (especificación 011, RF-1103): al
 * abrir la app, al volver a primer plano, cada 30 s mientras haya pendientes y después de
 * cualquier petición que salga bien, que indica que vuelve a haber conexión.
 */
export function useOutboxSync(): void {
  const queryClient = useQueryClient();
  const userId = useMe().data?.user.id;
  const items = useOutboxState((s) => s.items);

  const refresh = (households: Set<string>) => {
    for (const id of households) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.periods(id) });
    }
  };

  // La bandeja de esta cuenta: otra cuenta en el mismo móvil no la ve (RF-1107).
  useEffect(() => {
    if (!outboxStorage || !userId) return;
    const outbox = createOutbox(outboxStorage, userId);
    let active = true;
    const stop = outbox.subscribe((list) => active && useOutboxState.setState({ items: list }));
    void outbox.load().then(() => {
      if (!active) return;
      useOutboxState.setState({ outbox, items: outbox.list() });
      void flushNow(refresh);
    });
    return () => {
      active = false;
      stop();
      useOutboxState.setState({ outbox: null, items: [] });
    };
    // `refresh` solo usa `queryClient`, que no cambia.
  }, [userId]);

  const waiting = items.some((p) => p.status === 'waiting');

  // Al volver a primer plano y cada 30 s, mientras haya algo que enviar.
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => void flushNow(refresh), RETRY_EVERY_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushNow(refresh);
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [waiting]);

  // Una petición que sale bien indica que hay conexión: se aprovecha para enviar.
  useEffect(() => {
    if (!waiting) return;
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success') void flushNow(refresh);
    });
  }, [waiting]);
}

/** Lo que las pantallas usan de la bandeja. */
export function useOutbox() {
  const queryClient = useQueryClient();
  const { outbox, items, sending } = useOutboxState();
  const refresh = (households: Set<string>) => {
    for (const id of households) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.periods(id) });
    }
  };
  return {
    /** `true` si se puede guardar para más tarde (Android con la cuenta ya conocida). */
    available: outbox !== null,
    items,
    sending,
    add: (entry: { id: string; householdId: string; input: TransactionInput }) =>
      outbox ? outbox.add(entry) : Promise.resolve(),
    update: async (id: string, input: TransactionInput) => {
      await outbox?.update(id, input);
      void flushNow(refresh);
    },
    discard: (id: string) => outbox?.discard(id) ?? Promise.resolve(),
    clear: () => outbox?.clear() ?? Promise.resolve(),
    sendNow: () => flushNow(refresh),
  };
}
