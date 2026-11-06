/**
 * Dirección del WebSocket de tiempo real a partir de la de la API: `http` → `ws`, `https` →
 * `wss`. Sin dirección de la API (la web servida por el propio servidor), la de la página.
 */
export function realtimeUrl(apiUrl: string, pageOrigin: string | undefined): string {
  const base = apiUrl || pageOrigin || '';
  return `${base.replace(/^http/, 'ws').replace(/\/+$/, '')}/api/realtime`;
}

/**
 * Esperas antes de cada reintento de conexión: 1, 2 y luego cada 5 s (RF-1204). Solo se
 * reintenta con la app a la vista, y el tope de 5 s hace que, al volver la conexión, se ponga
 * al día en menos de 10 s (CE-1202).
 */
const RETRY_DELAYS_MS = [1000, 2000, 5000];

export function reconnectDelay(attempt: number): number {
  return RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]!;
}
