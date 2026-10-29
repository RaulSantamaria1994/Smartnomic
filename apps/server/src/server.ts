import { existsSync } from 'node:fs';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { errorResponse, type HealthResponse } from '@smartnomic/api';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { registerAuthRoutes, type Auth, type AuthRateLimit } from './auth';
import type { Database } from './db/client';
import { loggerOptions } from './logging';
import { registerErrorHandler } from './plugins/errors';
import { createHouseholdAccess } from './plugins/household-access';
import { registerAccountRoutes } from './routes/account';
import { registerCalendarRoutes } from './routes/calendar';
import { registerCategoryRoutes } from './routes/categories';
import { registerExportRoutes } from './routes/export';
import { registerHouseholdRoutes } from './routes/households';
import { registerInvitationRoutes } from './routes/invitations';
import { registerMeRoutes } from './routes/me';
import { registerMemberRoutes } from './routes/members';
import { registerPeriodRoutes } from './routes/periods';
import { registerRecurringRoutes } from './routes/recurring';
import { registerTransactionRoutes } from './routes/transactions';

export interface ServerOptions {
  /** `true`: logger con los datos sensibles tapados (ver `logging.ts`). */
  logger?: boolean | FastifyServerOptions['logger'];
  /**
   * Orígenes a los que se permite llamar a la API desde otro dominio. Solo hace falta en
   * desarrollo, cuando Expo sirve la web en otro puerto; en producción la web y la API
   * comparten origen.
   */
  corsOrigins?: string[];
  /** Base de datos y autenticación. Sin ellas solo responde `/health` (y la web). */
  api?: { db: Database; auth: Auth };
  /** Límite de peticiones POST a `/api/auth/*` por IP. Por defecto, 10 por minuto. */
  authRateLimit?: AuthRateLimit;
  /**
   * El servidor está detrás de un proxy (Railway) que indica la IP real del cliente en
   * `X-Forwarded-For`. Sin esto, el límite de peticiones vería la IP del proxy.
   */
  trustProxy?: boolean;
  /** Carpeta con la web exportada de Expo. Si existe, se sirve en `/`. */
  webRoot?: string;
  /** Reloj del servidor. Los tests lo fijan (constitución, art. VII.5). */
  now?: () => Date;
  /** Límite para ver y aceptar invitaciones por IP. Por defecto, 20 por minuto. */
  invitationRateLimit?: AuthRateLimit;
}

const DEFAULT_AUTH_RATE_LIMIT: AuthRateLimit = { max: 10, timeWindow: '1 minute' };

export async function buildServer(options: ServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger === true ? loggerOptions() : (options.logger ?? false),
    trustProxy: options.trustProxy ?? false,
  });
  registerErrorHandler(app);

  if (options.corsOrigins && options.corsOrigins.length > 0) {
    await app.register(cors, {
      origin: options.corsOrigins,
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    });
  }
  // Solo se limitan las rutas que lo piden en su configuración.
  await app.register(rateLimit, { global: false });

  app.get('/health', async (): Promise<HealthResponse> => ({ ok: true }));

  if (options.api) {
    const { db, auth } = options.api;
    const access = createHouseholdAccess({ auth, db });
    registerAuthRoutes(app, auth, {
      rateLimit: options.authRateLimit ?? DEFAULT_AUTH_RATE_LIMIT,
    });
    registerMeRoutes(app, { db, access });
    const now = options.now ?? (() => new Date());
    registerHouseholdRoutes(app, { db, access });
    registerMemberRoutes(app, { db, access });
    registerCategoryRoutes(app, { db, access, now });
    registerTransactionRoutes(app, { db, access });
    registerPeriodRoutes(app, { db, access });
    registerExportRoutes(app, { db, access, now });
    registerAccountRoutes(app, {
      db,
      auth,
      access,
      rateLimit: options.authRateLimit ?? DEFAULT_AUTH_RATE_LIMIT,
    });
    registerRecurringRoutes(app, { db, access, now });
    registerCalendarRoutes(app, { db, access, now });
    registerInvitationRoutes(app, {
      db,
      access,
      now,
      rateLimit: options.invitationRateLimit ?? { max: 20, timeWindow: '1 minute' },
    });
  }

  const webRoot = options.webRoot && existsSync(options.webRoot) ? options.webRoot : undefined;
  if (webRoot) {
    // `serveDotFiles`: Expo exporta las fuentes e iconos de los paquetes bajo
    // `assets/__node_modules/.pnpm/…`; la carpeta solo contiene la web compilada.
    await app.register(fastifyStatic, { root: webRoot, wildcard: false, serveDotFiles: true });
  }

  app.setNotFoundHandler((request, reply) => {
    const path = request.url.split('?')[0] ?? '';
    // La web es una sola página: cualquier ruta que no sea de la API ni un archivo
    // (`/assets/x.ttf`) la resuelve la app. Un archivo que falta da 404, no la página.
    const isFile = /\.[a-z0-9]+$/i.test(path);
    if (webRoot && request.method === 'GET' && !path.startsWith('/api/') && !isFile) {
      return reply.sendFile('index.html');
    }
    return reply.status(404).send(errorResponse('not_found', 'No existe esta ruta.'));
  });

  return app;
}
