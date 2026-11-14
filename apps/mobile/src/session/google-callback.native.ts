import { getSetCookie, storageAdapter } from '@better-auth/expo/client';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { authClient } from './auth-client';
import { cookieFromAuthCallbackUrl } from './google-callback-url';

const cookies = storageAdapter(SecureStore);
/** Misma clave que `expoClient({ storagePrefix: 'smartnomic' })`. */
const COOKIE_KEY = 'smartnomic_cookie';

async function applyAuthCallbackUrl(url: string | null): Promise<void> {
  if (!url) return;
  const header = cookieFromAuthCallbackUrl(url);
  if (!header) return;
  const previous = await cookies.getItemAsync(COOKIE_KEY);
  await cookies.setItemAsync(COOKIE_KEY, getSetCookie(header, previous ?? undefined));
  await authClient.getSession();
  authClient.$store.notify('$sessionSignal');
}

/** Arranque en frío: el intent de `smartnomic://…?cookie=` llega aquí. */
export async function captureAuthCallback(): Promise<void> {
  await applyAuthCallbackUrl(await Linking.getInitialURL());
}

/** App ya abierta: Android entrega el callback en un evento, no en AuthSession. */
export function subscribeAuthCallback(): { remove: () => void } {
  return Linking.addEventListener('url', ({ url }) => {
    void applyAuthCallbackUrl(url);
  });
}
