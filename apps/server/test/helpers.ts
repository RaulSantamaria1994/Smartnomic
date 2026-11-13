import { randomBytes } from 'node:crypto';
import { meResponseSchema, TIMEZONE_HEADER, type MeResponse } from '@smartnomic/api';
import { uuidV7 } from '@smartnomic/domain';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { createApi, type Api } from '../src/api';
import type { AuthRateLimit } from '../src/auth';
import { connectDatabase, type Database } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';
import { members } from '../src/db/schema';
import type { PushMessage, PushSender } from '../src/push/expo';
import { buildServer } from '../src/server';
import { fakeScheduler, fakeSender } from './push-fakes';

/** Base de datos de los tests: la de docker-compose.yml o la del servicio del CI. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://smartnomic:smartnomic@localhost:5432/smartnomic_test';

export const TEST_ORIGIN = 'http://localhost:3000';
export const TEST_PASSWORD = 'contrasena-de-prueba';

/** Hora fija de los tests: martes 27 de octubre de 2026, 11:00 en Madrid. */
export const TEST_NOW = new Date('2026-10-27T10:00:00Z');

/** Avisos push de la prueba: emisor falso y ventana de agrupación controlada por el test. */
export interface PushHarness {
  /** Todos los avisos enviados hasta ahora, en orden. */
  messages: () => PushMessage[];
  /** Cierra las ventanas abiertas, envía y espera a que acabe. */
  flush: () => Promise<void>;
}

export interface TestContext {
  db: Database;
  app: FastifyInstance;
  api: Api;
  push: PushHarness;
}

/**
 * Prepara un servidor completo contra PostgreSQL real (constitución, art. VII.4). Cada
 * test empieza con la base de datos vacía. Los archivos de test se ejecutan uno detrás
 * de otro (ver vitest.config.ts) porque comparten la base de datos.
 */
export function useTestServer(
  options: {
    authRateLimit?: AuthRateLimit;
    invitationRateLimit?: AuthRateLimit;
    trustProxy?: boolean;
    clientIpHeader?: string;
    now?: () => Date;
    realtimePingMs?: number;
    /** Emisor de avisos push distinto del falso por defecto (por ejemplo, uno que falla). */
    pushSender?: PushSender;
  } = {},
) {
  const context = {} as TestContext;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const connection = connectDatabase(TEST_DATABASE_URL);
    close = connection.close;
    context.db = connection.db;
    await runMigrations(context.db);
  });

  beforeEach(async () => {
    await context.db.execute(sql`TRUNCATE users, households RESTART IDENTITY CASCADE`);
    const fake = fakeSender();
    const scheduler = fakeScheduler();
    context.push = {
      messages: fake.messages,
      flush: async () => {
        // Solo las ventanas de agrupación; los recibos (15 min) no se disparan solos.
        scheduler.jobs.forEach((job, i) => {
          if (job.ms < 60_000 && !job.fired) scheduler.fire(i);
        });
        await context.app.activity.idle();
      },
    };
    context.api = createApi({
      db: context.db,
      baseURL: TEST_ORIGIN,
      secret: 'secreto-de-los-tests-de-integracion-0123456789',
      production: false,
    });
    context.app = await buildServer({
      api: context.api,
      authRateLimit: options.authRateLimit ?? { max: 1000, timeWindow: '1 minute' },
      now: options.now ?? (() => TEST_NOW),
      push: { sender: options.pushSender ?? fake.sender, schedule: scheduler.schedule },
      invitationRateLimit: options.invitationRateLimit ?? { max: 1000, timeWindow: '1 minute' },
      ...(options.trustProxy !== undefined && { trustProxy: options.trustProxy }),
      ...(options.clientIpHeader && { clientIpHeader: options.clientIpHeader }),
      ...(options.realtimePingMs && { realtimePingMs: options.realtimePingMs }),
    });
  });

  afterEach(async () => {
    await context.app.close();
  });

  afterAll(async () => {
    await close();
  });

  return context;
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
  /** Cabecera `cookie` con la sesión. */
  cookie: string;
}

let userCount = 0;

/** Registra un usuario y devuelve su sesión. */
export async function signUp(
  app: FastifyInstance,
  options: { name?: string; email?: string; timezone?: string } = {},
): Promise<TestUser> {
  userCount += 1;
  const name = options.name ?? `Usuario ${userCount}`;
  const email = options.email ?? `usuario${userCount}@example.com`;
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    headers: {
      origin: TEST_ORIGIN,
      ...(options.timezone && { [TIMEZONE_HEADER]: options.timezone }),
    },
    payload: { email, password: TEST_PASSWORD, name },
  });
  if (response.statusCode !== 200) {
    throw new Error(`El registro falló (${response.statusCode}): ${response.body}`);
  }
  const { user } = response.json<{ user: { id: string } }>();
  return { id: user.id, email, name, cookie: sessionCookie(response) };
}

export function sessionCookie(response: LightMyRequestResponse): string {
  const header = response.headers['set-cookie'];
  const cookies = Array.isArray(header) ? header : header ? [header] : [];
  const session = cookies
    .map((cookie) => cookie.split(';')[0])
    .find((c) => c?.includes('session_token'));
  if (!session) throw new Error('La respuesta no trae la cookie de sesión');
  return session;
}

/** `GET /api/me` de alguien que tiene al menos un hogar: `household` y `member`, su primero. */
export type MeWithHousehold = MeResponse & {
  household: NonNullable<MeResponse['household']>;
  member: NonNullable<MeResponse['member']>;
};

/** Hogar y rol del usuario, según `GET /api/me` (falla si no tiene ningún hogar). */
export async function me(app: FastifyInstance, user: TestUser): Promise<MeWithHousehold> {
  const response = await app.inject({
    method: 'GET',
    url: '/api/me',
    headers: { cookie: user.cookie },
  });
  const body = meResponseSchema.parse(response.json());
  if (!body.household || !body.member) throw new Error('El usuario no tiene ningún hogar');
  return body as MeWithHousehold;
}

/** UUIDv7 nuevo, como los que genera la app. */
export function newId(): string {
  return uuidV7(Date.now(), randomBytes(10));
}

/** Mete a `guest` en el hogar de `owner` con el rol indicado. */
export async function joinHousehold(
  db: Database,
  owner: TestUser,
  guest: TestUser,
  role: 'editor' | 'viewer',
): Promise<void> {
  const [ownerMember] = await db.select().from(members).where(eq(members.userId, owner.id));
  await db.delete(members).where(eq(members.userId, guest.id));
  await db
    .insert(members)
    .values({ householdId: ownerMember!.householdId, userId: guest.id, role });
}

/** Petición a la API con la sesión de `user`. */
export function call(
  app: FastifyInstance,
  user: TestUser,
  method: 'GET' | 'PATCH' | 'DELETE' | 'POST' | 'PUT',
  url: string,
  payload?: unknown,
) {
  return app.inject({
    method,
    url,
    headers: { cookie: user.cookie, origin: TEST_ORIGIN },
    ...(payload !== undefined && { payload: payload as Record<string, unknown> }),
  });
}
