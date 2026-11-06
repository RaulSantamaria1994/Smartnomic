import type { RealtimeScope } from '@smartnomic/api';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Auth } from '../auth';
import { and, gt, inArray } from 'drizzle-orm';
import type { Database } from '../db/client';
import { sessions } from '../db/schema';
import { findMembership } from '../households';
import { ApiError } from '../plugins/errors';
import type { RealtimeHub } from '../realtime/hub';

/** Cada cuánto se envía un ping: el proxy de Railway cierra las conexiones calladas. */
export const DEFAULT_PING_MS = 25_000;

/** Cambios que una ruta avisa a mano (las que no llevan el hogar en la URL). */
export interface RealtimeChange {
  householdId: string;
  scope: RealtimeScope;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Avisos de tiempo real que añade la propia ruta, además de los de su URL. */
    realtime?: RealtimeChange[];
  }
}

/** Sección de la URL → ámbito del aviso. */
const SCOPES: Record<string, RealtimeScope> = {
  transactions: 'transactions',
  recurring: 'recurring',
  savings: 'savings',
  budgets: 'budgets',
  categories: 'categories',
  members: 'members',
  leave: 'members',
  'transfer-ownership': 'members',
  invitations: 'members',
};

/** Sesión con la que se abrió cada conexión (para cerrarla si la sesión termina). */
const realtimeSessions = new WeakMap<FastifyRequest, string>();

const HOUSEHOLD_ROUTE = /^\/api\/households\/:householdId(?:\/([^/]+))?/;

/** Qué avisar tras una petición que ha cambiado algo; `null` si nada. */
export function changeOf(request: FastifyRequest, statusCode: number): RealtimeChange[] {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return [];
  }
  if (statusCode < 200 || statusCode >= 300) return [];
  const changes = [...(request.realtime ?? [])];
  const match = HOUSEHOLD_ROUTE.exec(request.routeOptions.url ?? '');
  const householdId = (request.params as { householdId?: string } | undefined)?.householdId;
  if (match && householdId) {
    const section = match[1];
    const scope = section === undefined ? 'household' : SCOPES[section];
    if (scope) changes.push({ householdId, scope });
  }
  return changes;
}

export function registerRealtimeRoutes(
  app: FastifyInstance,
  deps: {
    db: Database;
    auth: Auth;
    hub: RealtimeHub;
    allowedOrigins: string[];
    pingMs?: number;
  },
): void {
  const { db, auth, hub } = deps;
  const isMember = async (userId: string, householdId: string) =>
    (await findMembership(db, userId))?.household.id === householdId;

  // Avisos tras cualquier cambio con éxito (especificación 012): un solo sitio para todas las
  // rutas. Con un cambio de miembros, además, se cierran las conexiones de quien ya no está.
  app.addHook('onResponse', async (request, reply) => {
    for (const { householdId, scope } of changeOf(request, reply.statusCode)) {
      hub.publish(householdId, scope);
      if (scope === 'members') await hub.dropStale(householdId, isMember);
    }
  });

  const liveSessions = async (ids: string[]) => {
    const rows = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(inArray(sessions.id, ids), gt(sessions.expiresAt, new Date())));
    return new Set(rows.map((row) => row.id));
  };

  // Con cada ping, además, fuera las conexiones cuya sesión se ha cerrado o ha caducado.
  const ping = setInterval(() => {
    hub.broadcast({ type: 'ping' });
    hub.dropEndedSessions(liveSessions).catch((error: unknown) => app.log.error(error));
  }, deps.pingMs ?? DEFAULT_PING_MS);
  ping.unref();
  app.addHook('onClose', async () => clearInterval(ping));

  app.get(
    '/api/realtime',
    {
      websocket: true,
      // Sesión y hogar antes de aceptar la conexión: sin ellos no se abre (401/403).
      preValidation: async (request) => {
        const origin = request.headers.origin;
        if (origin && !deps.allowedOrigins.includes(origin)) {
          throw new ApiError('forbidden', 'Origen no permitido.');
        }
        const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
        if (!session) throw new ApiError('unauthenticated', 'Inicia sesión para continuar.');
        const membership = await findMembership(db, session.user.id);
        if (!membership) throw new ApiError('forbidden', 'No eres miembro de ningún hogar.');
        request.user = { id: session.user.id, name: session.user.name, email: session.user.email };
        request.membership = membership;
        realtimeSessions.set(request, session.session.id);
      },
    },
    (socket, request) => {
      const release = hub.add(
        socket,
        request.user!.id,
        request.membership!.household.id,
        realtimeSessions.get(request)!,
      );
      socket.on('close', release);
      // La app no envía nada: lo que llegue se ignora.
      socket.on('message', () => undefined);
    },
  );
}
