// Sesión en la app nativa: el token se guarda cifrado con expo-secure-store, nunca en
// AsyncStorage (constitución, art. VI.2).
import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: 'smartnomic',
      storagePrefix: 'smartnomic',
      storage: SecureStore,
      // Si Google abre Chrome (selector de cuenta), la pestaña no se pierde al ir a 2FA.
      webBrowserOptions: { showInRecents: true },
    }),
  ],
});

/** La cookie de sesión guardada, para las llamadas a la API. */
export async function sessionHeaders(): Promise<Record<string, string>> {
  const cookie = await authClient.getCookie();
  return cookie ? { cookie } : {};
}

export const sessionCredentials: RequestCredentials = 'omit';

/** El enlace del email abre la app («smartnomic://restablecer» o, en Expo Go, «exp://…»). */
export function resetPasswordRedirect(): string {
  return Linking.createURL('/restablecer');
}

/**
 * Tras Google, el servidor redirige aquí. Tiene que ser el esquema de la app: si mandamos
 * `/`, Chrome se queda en la web de Railway y la APK nunca recibe la sesión.
 */
export function googleCallbackURL(next: string | null): string {
  // `/entrar`: si Android abre la app de cero, cae en la pila de auth, que redirige al
  // haber sesión. `/` pintaría «Mes» sin cookie y volvería a Entrar.
  return Linking.createURL(next ?? '/entrar', { scheme: 'smartnomic' });
}
