/**
 * Extrae la cabecera Set-Cookie que Better Auth pone en el deep link tras Google.
 * En Android Chrome a menudo abre la app de cero y hay que leerla aquí, no en
 * `openAuthSessionAsync` (especificación 016, G025).
 */
export function cookieFromAuthCallbackUrl(url: string): string | null {
  const queryStart = url.indexOf('?');
  if (queryStart < 0) return null;
  const cookie = new URLSearchParams(url.slice(queryStart + 1)).get('cookie');
  return cookie && cookie.length > 0 ? cookie : null;
}
