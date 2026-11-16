/**
 * Adónde volver tras entrar o crear la cuenta. Solo rutas internas conocidas: invitación
 * o borrar la cuenta (Play, especificación 017). Un enlace no puede llevar a otra web.
 */
export function safeNext(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value === '/delete-account') return value;
  return /^\/invitacion\/[A-Za-z0-9]{1,20}$/.test(value) ? value : null;
}
