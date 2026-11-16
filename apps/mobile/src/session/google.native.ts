import { TIMEZONE_HEADER } from '@smartnomic/api';
import { AppState, type AppStateStatus } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { API_URL } from '../config';
import { es } from '../i18n/es';
import { googleCallbackURL } from './auth-client';
import { authErrorMessage, type AuthClientError } from './auth-errors';
import { applyAuthCallbackUrl, sessionFromGoogleCallback } from './google-callback';
import {
  expoAuthorizationProxyUrl,
  googleSignInUrlFromResponse,
  waitForGoogleRedirect,
  type AppLifecycle,
} from './google-oauth';

export type GoogleSignInResult = 'ok' | 'cancel' | { error: string };
export { applyDeviceTimezone } from './google-timezone';

/**
 * La huella y el 2FA de Google son otra actividad. Con `createTask: false` (misma
 * tarea que la APK, `singleTask`) Android destruye el Custom Tab y el OAuth muere.
 * La pestaña va en otra tarea, visible en recientes, sin la actividad proxy que
 * relanza el icono (G025).
 */
export async function continueWithGoogle(next: string | null): Promise<GoogleSignInResult> {
  const callbackURL = googleCallbackURL(next);
  const googleUrl = await requestGoogleUrl(callbackURL);
  if (typeof googleUrl !== 'string') return googleUrl;
  // La cookie puede llegar mientras Chrome sigue abierto (huella). Hay que escuchar ya.
  const waiting = waitForGoogleRedirect({
    subscribeUrl: (handler) =>
      Linking.addEventListener('url', ({ url }) => {
        handler(url);
      }),
    subscribeAppState: (handler) =>
      AppState.addEventListener('change', (state: AppStateStatus) => {
        if (state === 'active' || state === 'background' || state === 'inactive') {
          handler(state as AppLifecycle);
        }
      }),
    getInitialURL: () => Linking.getInitialURL(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  });
  try {
    await WebBrowser.openBrowserAsync(expoAuthorizationProxyUrl(API_URL, googleUrl), {
      // Otra tarea + recientes: la huella no mata la pestaña. Sin proxy: no relanza el icono.
      createTask: true,
      useProxyActivity: false,
      showInRecents: true,
    });
  } catch {
    return { error: authErrorMessage({ status: 0 } as AuthClientError) };
  }
  const url = await waiting;
  if (url) {
    await applyAuthCallbackUrl(url);
    return 'ok';
  }
  if (await sessionFromGoogleCallback()) return 'ok';
  return 'cancel';
}

async function requestGoogleUrl(callbackURL: string): Promise<string | GoogleSignInResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'expo-origin': Linking.createURL('', { scheme: 'smartnomic' }),
        'x-skip-oauth-proxy': 'true',
        [TIMEZONE_HEADER]: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      body: JSON.stringify({
        provider: 'google',
        callbackURL,
        errorCallbackURL: callbackURL,
        newUserCallbackURL: callbackURL,
      }),
    });
  } catch {
    return { error: authErrorMessage({ status: 0 } as AuthClientError) };
  }
  const location = response.headers.get('location') ?? undefined;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body as { code?: string; message?: string } | null;
    return {
      error: authErrorMessage({
        status: response.status,
        code: error?.code,
        message: error?.message,
      }),
    };
  }
  return googleSignInUrlFromResponse(body, location) ?? { error: es.auth.errors.unknown };
}
