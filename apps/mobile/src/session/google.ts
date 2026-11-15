import { TIMEZONE_HEADER } from '@smartnomic/api';
import { authClient, googleCallbackURL } from './auth-client';
import { authErrorMessage, isAuthCancelled, type AuthClientError } from './auth-errors';

export type GoogleSignInResult = 'ok' | 'cancel' | { error: string };
export { applyDeviceTimezone } from './google-timezone';

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
    if (isAuthCancelled(error as AuthClientError)) return 'cancel';
    return { error: authErrorMessage(error as AuthClientError) };
  }
  return 'ok';
}
