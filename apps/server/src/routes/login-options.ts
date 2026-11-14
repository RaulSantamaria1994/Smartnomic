import type { LoginOptions } from '@smartnomic/api';
import type { FastifyInstance } from 'fastify';
import type { Auth } from '../auth';

/**
 * Si se puede entrar con Google (especificación 016). Sin sesión: el botón de **Entrar**
 * pregunta esto antes de haber cuenta.
 */
export function registerLoginOptionsRoutes(app: FastifyInstance, auth: Auth): void {
  app.get('/api/login-options', async (): Promise<LoginOptions> => ({
    google: Boolean(auth.options.socialProviders?.google),
  }));
}
