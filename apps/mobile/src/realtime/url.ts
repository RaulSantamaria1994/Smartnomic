/**
 * Dirección del WebSocket de tiempo real a partir de la de la API: `http` → `ws`, `https` →
 * `wss`. Sin dirección de la API (la web servida por el propio servidor), la de la página.
 */
export function realtimeUrl(apiUrl: string, pageOrigin: string | undefined): string {
  const base = apiUrl || pageOrigin || '';
  return `${base.replace(/^http/, 'ws').replace(/\/+$/, '')}/api/realtime`;
}

/** Esperas antes de cada reintento de conexión: 1, 2, 5, 10 y luego cada 30 s (RF-1204). */
const RETRY_DELAYS_MS = [1000, 2000, 5000, 10_000, 30_000];

export function reconnectDelay(attempt: number): number {
  return RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]!;
}
