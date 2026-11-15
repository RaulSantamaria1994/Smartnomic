import { TIMEZONE_HEADER } from '@smartnomic/api';
import { AppState, type AppStateStatus } from 'react-native';
import * as Linking from 'expo-linking';
import { API_URL } from '../config';
import { es } from '../i18n/es';
import { googleCallbackURL } from './auth-client';
import { authErrorMessage, type AuthClientError } from './auth-errors';
import { applyAuthCallbackUrl } from './google-callback';
import {
  expoAuthorizationProxyUrl,
  googleSignInUrlFromResponse,
  waitForGoogleRedirect,
  type AppLifecycle,
} from './google-oauth';

export type GoogleSignInResult = 'ok' | 'cancel' | { error: string };
export { applyDeviceTimezone } from './google-timezone';

/**
 * En Android el Custom Tab de Expo se cierra al elegir la cuenta y AuthSession pierde
 * la cookie. Se abre Chrome y se espera el deep link `smartnomic://…?cookie=` (G025).
 */
export async function continueWithGoogle(next: string | null): Promise<GoogleSignInResult> {
  const callbackURL = googleCallbackURL(next);
  const started = await startGoogleInBrowser(callbackURL);
  if (started !== 'ok') return started;
  const url = await waitForGoogleRedirect({
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
  if (!url) return 'cancel';
  await applyAuthCallbackUrl(url);
  return 'ok';
}

async function startGoogleInBrowser(callbackURL: string): Promise<GoogleSignInResult> {
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
  const googleUrl = googleSignInUrlFromResponse(body, location);
  if (!googleUrl) return { error: es.auth.errors.unknown };
  try {
    await Linking.openURL(expoAuthorizationProxyUrl(API_URL, googleUrl));
  } catch {
    return { error: authErrorMessage({ status: 0 } as AuthClientError) };
  }
  return 'ok';
}
