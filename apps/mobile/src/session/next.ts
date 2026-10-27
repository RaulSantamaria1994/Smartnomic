/**
 * Adónde volver tras entrar o crear la cuenta. Solo se aceptan rutas de invitación, para
 * que un enlace no pueda llevar a otra web.
 */
export function safeNext(value: unknown): string | null {
  return typeof value === 'string' && /^\/invitacion\/[A-Za-z0-9]{1,20}$/.test(value)
    ? value
    : null;
}
