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
    expoClient({ scheme: 'smartnomic', storagePrefix: 'smartnomic', storage: SecureStore }),
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
