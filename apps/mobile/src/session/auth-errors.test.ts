import { describe, expect, it } from 'vitest';
import { es } from '../i18n/es';
import { authErrorMessage, isAuthCancelled } from './auth-errors';

describe('authErrorMessage', () => {
  it('traduce los errores conocidos', () => {
    expect(authErrorMessage({ code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 })).toBe(
      es.auth.errors.invalidCredentials,
    );
    expect(authErrorMessage({ code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', status: 422 })).toBe(
      es.auth.errors.emailInUse,
    );
    expect(authErrorMessage({ code: 'UNABLE_TO_LINK_ACCOUNT', status: 422 })).toBe(
      es.auth.errors.emailInUse,
    );
    expect(authErrorMessage({ code: 'PASSWORD_TOO_SHORT', status: 400 })).toBe(
      es.auth.errors.passwordTooShort,
    );
    expect(authErrorMessage({ code: 'INVALID_TOKEN', status: 400 })).toBe(
      es.auth.errors.invalidToken,
    );
  });

  it('el límite de peticiones tiene su propio mensaje', () => {
    expect(authErrorMessage({ code: 'rate_limited', status: 429 })).toBe(
      es.auth.errors.tooManyRequests,
    );
  });

  it('cancelar en Google no se trata como un fallo alarmante', () => {
    expect(isAuthCancelled({ code: 'USER_CANCELLED', status: 400 })).toBe(true);
    expect(isAuthCancelled({ message: 'The user dismissed the prompt', status: 400 })).toBe(true);
    expect(isAuthCancelled({ code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 })).toBe(false);
  });

  it('cualquier otro error da un mensaje genérico, nunca el texto en inglés', () => {
    expect(authErrorMessage({ code: 'SOMETHING_NEW', status: 500, message: 'Boom' })).toBe(
      es.auth.errors.unknown,
    );
  });
});
