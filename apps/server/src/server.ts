import cors from '@fastify/cors';
import type { HealthResponse } from '@smartnomic/api';
import Fastify, { type FastifyInstance } from 'fastify';

export interface ServerOptions {
  logger?: boolean;
  /**
   * Orígenes a los que se permite llamar a la API desde otro dominio. Solo hace falta en
   * desarrollo, cuando Expo sirve la web en otro puerto; en producción la web y la API
   * comparten origen.
   */
  corsOrigins?: string[];
}

export async function buildServer(options: ServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });

  if (options.corsOrigins && options.corsOrigins.length > 0) {
    await app.register(cors, { origin: options.corsOrigins, credentials: true });
  }

  app.get('/health', async (): Promise<HealthResponse> => ({ ok: true }));

  return app;
}
