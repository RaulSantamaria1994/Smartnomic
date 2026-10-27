import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance } from 'fastify';
import type { Database } from './db/client';
import { accounts, sessions, users, verifications } from './db/schema';

export const AUTH_BASE_PATH = '/api/auth';

/** Envía el enlace para restablecer la contraseña. Lo implementa el proveedor de email. */
export type SendResetPassword = (params: { to: string; url: string }) => Promise<void>;

export interface AuthOptions {
  db: Database;
  /** URL pública del servidor, por ejemplo «https://smartnomic.up.railway.app». */
  baseURL: string;
  /** Secreto para firmar sesiones (BETTER_AUTH_SECRET). */
  secret: string;
  /** Orígenes de la web en desarrollo, además del esquema de la app nativa. */
  trustedOrigins?: string[];
  /** En producción las cookies solo viajan por HTTPS. */
  production: boolean;
  /** Sin él, recuperar la contraseña no está disponible. */
  sendResetPassword?: SendResetPassword;
  /** Se llama si falla un envío. Nunca recibe la dirección del destinatario. */
  onEmailError?: (error: unknown) => void;
}

/** Validez del enlace para restablecer la contraseña, en segundos. */
export const RESET_PASSWORD_EXPIRES_IN = 60 * 60;

export function createAuth(options: AuthOptions) {
  const { sendResetPassword, onEmailError } = options;
  return betterAuth({
    baseURL: options.baseURL,
    basePath: AUTH_BASE_PATH,
    secret: options.secret,
    database: drizzleAdapter(options.db, {
      provider: 'pg',
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      ...(sendResetPassword && {
        // Sin esperar al envío: la respuesta tarda lo mismo exista o no la cuenta.
        sendResetPassword: async ({ user, url }) => {
          sendResetPassword({ to: user.email, url }).catch((error: unknown) =>
            onEmailError?.(error),
          );
        },
        resetPasswordTokenExpiresIn: RESET_PASSWORD_EXPIRES_IN,
        revokeSessionsOnPasswordReset: true,
      }),
    },
    // La app nativa entra con el esquema «smartnomic://»; en desarrollo, Expo Go usa «exp://».
    trustedOrigins: [
      'smartnomic://',
      ...(options.production ? [] : ['exp://']),
      ...(options.trustedOrigins ?? []),
    ],
    plugins: [expo()],
    advanced: {
      useSecureCookies: options.production,
      // Constitución, art. IX.3.3: cookie HttpOnly, Secure y SameSite en la web.
      defaultCookieAttributes: {
        httpOnly: true,
        secure: options.production,
        sameSite: 'lax',
      },
      database: { generateId: () => crypto.randomUUID() },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Monta Better Auth en Fastify, traduciendo la petición a la API Fetch y de vuelta. */
export function registerAuthRoutes(app: FastifyInstance, auth: Auth): void {
  app.route({
    method: ['GET', 'POST'],
    url: `${AUTH_BASE_PATH}/*`,
    async handler(request, reply) {
      const url = new URL(request.url, `${request.protocol}://${request.host}`);
      const body =
        request.body === undefined || request.body === null
          ? undefined
          : JSON.stringify(request.body);
      const response = await auth.handler(
        new Request(url, {
          method: request.method,
          headers: fromNodeHeaders(request.headers),
          ...(body !== undefined && { body }),
        }),
      );

      reply.status(response.status);
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'set-cookie') reply.header(key, value);
      });
      // Varias cookies no se pueden unir en una sola cabecera.
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) reply.header('set-cookie', cookies);
      return reply.send(response.body ? await response.text() : null);
    },
  });
}
