// Sesión en la web: cookie HttpOnly que pone el servidor (constitución, art. IX.3.3).
// La app nativa usa auth-client.native.ts.
import { createAuthClient } from 'better-auth/react';
import { API_URL } from '../config';

const baseURL = API_URL || (typeof window === 'undefined' ? '' : window.location.origin);

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: { credentials: 'include' },
});

/** En la web la cookie la envía el navegador: no hacen falta cabeceras. */
export function sessionHeaders(): Record<string, string> {
  return {};
}

export const sessionCredentials: RequestCredentials = 'include';

/** Dirección a la que lleva el enlace del email para restablecer la contraseña. */
export function resetPasswordRedirect(): string {
  return `${typeof window === 'undefined' ? '' : window.location.origin}/restablecer`;
}
