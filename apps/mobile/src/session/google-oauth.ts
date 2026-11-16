import { cookieFromAuthCallbackUrl } from './google-callback-url';

/** Tras el selector de cuenta la app puede volver al frente; el OAuth sigue en la pestaña. */
export const GOOGLE_REDIRECT_SETTLE_MS = 8_000;

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
 * Espera el deep link con `?cookie=`. Volver al frente no cancela al instante: el selector
 * nativo de Google reanuda la app mientras el OAuth sigue en la pestaña (G025).
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
