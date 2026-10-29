import { TIMEZONE_HEADER } from '@smartnomic/api';
import { createAuth, type Auth } from './auth';
import type { Database } from './db/client';
import { resetPasswordEmail, type SendEmail } from './email';
import { ensureHousehold } from './households';

export interface ApiOptions {
  db: Database;
  baseURL: string;
  secret: string;
  production: boolean;
  trustedOrigins?: string[];
  clientIpHeader?: string;
  /** Sin él, recuperar la contraseña no está disponible. */
  sendEmail?: SendEmail;
  onEmailError?: (error: unknown) => void;
}

/**
 * Autenticación conectada con el resto de la API: al registrarse, cada usuario recibe su
 * hogar (especificación 001, RF-002), con la zona horaria que envía el dispositivo.
 */
export interface Api {
  db: Database;
  auth: Auth;
}

export function createApi(options: ApiOptions): Api {
  const { db, sendEmail, onEmailError } = options;
  const auth = createAuth({
    db,
    baseURL: options.baseURL,
    secret: options.secret,
    production: options.production,
    ...(options.trustedOrigins && { trustedOrigins: options.trustedOrigins }),
    ...(options.clientIpHeader && { clientIpHeader: options.clientIpHeader }),
    ...(sendEmail && {
      sendResetPassword: ({ to, url }) => sendEmail({ to, ...resetPasswordEmail(url) }),
    }),
    ...(onEmailError && { onEmailError }),
    onUserCreated: async (user, headers) => {
      await ensureHousehold(db, user, headers?.get(TIMEZONE_HEADER));
    },
  });
  return { db, auth };
}
