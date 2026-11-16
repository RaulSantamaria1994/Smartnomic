import { cookieFromAuthCallbackUrl } from './google-callback-url';

/** Tope si no llega el deep link (huella / 2FA pueden tardar). */
export const GOOGLE_REDIRECT_TIMEOUT_MS = 90_000;

/** URL de cuentas de Google que devuelve POST /api/auth/sign-in/social. */
export function googleSignInUrlFromResponse(
  body: unknown,
  location: string | undefined,
): string | null {
  if (typeof location === 'string' && isHttpsUrl(location)) return location;
  if (
    body &&
    typeof body === 'object' &&
    'url' in body &&
    typeof body.url === 'string' &&
    isHttpsUrl(body.url)
  ) {
    return body.url;
  }
  return null;
}

/** El proxy de Better Auth pone la cookie de estado en el navegador y manda a Google. */
export function expoAuthorizationProxyUrl(apiUrl: string, authorizationURL: string): string {
  const base = apiUrl.replace(/\/$/, '');
  return `${base}/api/auth/expo-authorization-proxy?${new URLSearchParams({ authorizationURL }).toString()}`;
}

export type AppLifecycle = 'active' | 'background' | 'inactive';

/**
 * Espera `?cookie=`. La huella o el 2FA reanudan la app: eso no cancela. Solo se
 * cancela al agotar el tiempo sin cookie (G025).
 */
export async function waitForGoogleRedirect(io: {
  subscribeUrl: (handler: (url: string) => void) => { remove: () => void };
  subscribeAppState: (handler: (state: AppLifecycle) => void) => { remove: () => void };
  getInitialURL: () => Promise<string | null>;
  sleep: (ms: number) => Promise<void>;
  timeoutMs?: number;
}): Promise<string | null> {
  const timeoutMs = io.timeoutMs ?? GOOGLE_REDIRECT_TIMEOUT_MS;
  return new Promise((resolve) => {
    let done = false;
    const finish = (url: string | null) => {
      if (done) return;
      done = true;
      urlSub.remove();
      appSub.remove();
      resolve(url);
    };
    const take = (url: string | null) => {
      if (url && cookieFromAuthCallbackUrl(url)) finish(url);
    };
    const urlSub = io.subscribeUrl(take);
    const appSub = io.subscribeAppState((state) => {
      if (state !== 'active') return;
      void io.getInitialURL().then(take);
    });
    void io.getInitialURL().then(take);
    void io.sleep(timeoutMs).then(() => {
      if (!done) finish(null);
    });
  });
}

function isHttpsUrl(value: string): boolean {
  return value.startsWith('https://');
}
