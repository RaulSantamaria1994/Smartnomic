import { TIMEZONE_HEADER } from '@smartnomic/api';
import { api } from '../api/client';
import { authClient, googleCallbackURL } from './auth-client';
import { authErrorMessage, isAuthCancelled, type AuthClientError } from './auth-errors';
import { sessionFromGoogleCallback } from './google-callback';

export type GoogleSignInResult = 'ok' | 'cancel' | { error: string };

/**
 * Abre Google y, si entra, aplica la zona del dispositivo. Cancelar no es un error
 * (especificación 016, RF-1607).
 */
export async function continueWithGoogle(next: string | null): Promise<GoogleSignInResult> {
  const callbackURL = googleCallbackURL(next);
  const { error } = await authClient.signIn.social({
    provider: 'google',
    callbackURL,
    errorCallbackURL: callbackURL,
    newUserCallbackURL: callbackURL,
    fetchOptions: {
      headers: { [TIMEZONE_HEADER]: Intl.DateTimeFormat().resolvedOptions().timeZone },
    },
  });
  if (error) {
    if (isAuthCancelled(error as AuthClientError)) {
      // Android da por cancelado el Custom Tab cuando la app vuelve al frente, a veces
      // un instante antes de entregar `?cookie=`. Si ya hay sesión, el login sí acabó.
      return (await sessionFromGoogleCallback()) ? 'ok' : 'cancel';
    }
    return { error: authErrorMessage(error as AuthClientError) };
  }
  return 'ok';
}

/** Tras entrar (también si Google redirige a `/` en la web), aplica la zona si el hogar es nuevo. */
export async function applyDeviceTimezone(): Promise<void> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  await api.putTimezone(timezone).catch(() => undefined);
}
