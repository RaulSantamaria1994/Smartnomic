import { realtimeMessageSchema, type RealtimeScope } from '@smartnomic/api';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '../api/queryKeys';
import { API_URL } from '../config';
import { useMe } from '../hooks/data';
import { isForeground, onForegroundChange } from './foreground';
import { openSocket } from './open-socket';
import { createBatcher, keysToRefresh } from './scopes';
import { realtimeUrl, reconnectDelay } from './url';

/** Los avisos que llegan en este tiempo se agrupan en una sola recarga. */
const BATCH_MS = 300;

/**
 * Cambios en tiempo real (especificación 012): con la app a la vista, una conexión con el
 * servidor que avisa de lo que cambian los demás miembros; aquí solo se recargan las consultas
 * afectadas, sin mensajes (RF-1202). Se reconecta sola y, al reconectar, recarga todo lo del
 * hogar por si algo cambió mientras tanto (RF-1204).
 */
export function useRealtime(): void {
  const queryClient = useQueryClient();
  const householdId = useMe().data?.household.id;

  useEffect(() => {
    if (!householdId || typeof WebSocket === 'undefined') return;
    const url = realtimeUrl(
      API_URL,
      typeof window === 'undefined' ? undefined : window.location?.origin,
    );
    const refresh = (scopes: readonly RealtimeScope[] | 'all') => {
      for (const queryKey of keysToRefresh(householdId, scopes)) {
        void queryClient.invalidateQueries({ queryKey });
      }
    };
    const batch = createBatcher<RealtimeScope>(BATCH_MS, refresh);

    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let connectedBefore = false;
    let stopped = false;

    const clearRetry = () => {
      if (retry !== null) clearTimeout(retry);
      retry = null;
    };

    const scheduleRetry = () => {
      if (stopped || !isForeground() || retry !== null) return;
      retry = setTimeout(() => {
        retry = null;
        void connect();
      }, reconnectDelay(attempt++));
    };

    async function connect() {
      if (stopped || socket || !isForeground()) return;
      let next: WebSocket;
      try {
        next = await openSocket(url);
      } catch {
        return scheduleRetry();
      }
      if (stopped || !isForeground()) return next.close();
      socket = next;
      next.onopen = () => {
        attempt = 0;
        // Al volver, ponerse al día con lo que pudo cambiar sin conexión.
        if (connectedBefore) refresh('all');
        connectedBefore = true;
      };
      next.onmessage = (event) => {
        let data: unknown;
        try {
          data = JSON.parse(String(event.data));
        } catch {
          return;
        }
        const message = realtimeMessageSchema.safeParse(data);
        if (message.success && message.data.type === 'changed') batch.push(message.data.scope);
      };
      next.onclose = (event) => {
        if (socket === next) socket = null;
        // 4001: ya no es miembro de este hogar (lo quitaron o se fue): `me` dirá el nuevo.
        if (event.code === 4001) void queryClient.invalidateQueries({ queryKey: queryKeys.me });
        scheduleRetry();
      };
      // Un error siempre llega seguido de `close`, que es quien reintenta.
      next.onerror = () => undefined;
    }

    const disconnect = () => {
      clearRetry();
      batch.cancel();
      const current = socket;
      socket = null;
      current?.close();
    };

    const stopForeground = onForegroundChange((foreground) => {
      if (foreground) {
        attempt = 0;
        void connect();
      } else {
        // En segundo plano no hay tiempo real (RF-1206): se cierra y al volver se pone al día.
        connectedBefore = true;
        disconnect();
      }
    });
    void connect();

    return () => {
      stopped = true;
      stopForeground();
      disconnect();
    };
  }, [householdId, queryClient]);
}
