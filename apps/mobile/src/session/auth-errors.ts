import { es } from '../i18n/es';

/** Error que devuelve el cliente de Better Auth. */
export interface AuthClientError {
  code?: string | undefined;
  status: number;
  message?: string | undefined;
}

/** Mensaje en español para un error de autenticación. */
export function authErrorMessage(error: AuthClientError): string {
  if (error.status === 429) return es.auth.errors.tooManyRequests;
  if (error.status === 0) return es.auth.errors.network;
  switch (error.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return es.auth.errors.invalidCredentials;
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return es.auth.errors.emailInUse;
    case 'PASSWORD_TOO_SHORT':
      return es.auth.errors.passwordTooShort;
    case 'PASSWORD_TOO_LONG':
      return es.auth.errors.passwordTooLong;
    case 'INVALID_EMAIL':
      return es.auth.errors.invalidEmail;
    case 'INVALID_TOKEN':
      return es.auth.errors.invalidToken;
    case 'RESET_PASSWORD_DISABLED':
      return es.auth.errors.resetDisabled;
    default:
      return es.auth.errors.unknown;
  }
}
