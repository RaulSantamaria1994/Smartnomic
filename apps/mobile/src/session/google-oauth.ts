import { cookieFromAuthCallbackUrl } from './google-callback-url';

export const GOOGLE_REDIRECT_SETTLE_MS = 800;

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
 * Espera el deep link con `?cookie=` tras abrir el navegador. Si la persona vuelve a la
 * app y no llega cookie, es un cancelar (RF-1607).
 */
export async function waitForGoogleRedirect(io: {
  subscribeUrl: (handler: (url: string) => void) => { remove: () => void };
  subscribeAppState: (handler: (state: AppLifecycle) => void) => { remove: () => void };
  getInitialURL: () => Promise<string | null>;
  sleep: (ms: number) => Promise<void>;
  settleMs?: number;
}): Promise<string | null> {
  const settleMs = io.settleMs ?? GOOGLE_REDIRECT_SETTLE_MS;
  return new Promise((resolve) => {
    let done = false;
    let sawBackground = false;
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
      if (state === 'background' || state === 'inactive') {
        sawBackground = true;
        return;
      }
      if (state !== 'active' || !sawBackground) return;
      void io.sleep(settleMs).then(async () => {
        if (done) return;
        take(await io.getInitialURL());
        if (!done) finish(null);
      });
    });
  });
}

function isHttpsUrl(value: string): boolean {
  return value.startsWith('https://');
}
