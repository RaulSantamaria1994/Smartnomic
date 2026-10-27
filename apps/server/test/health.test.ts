import { healthResponseSchema } from '@smartnomic/api';
import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server';

describe('GET /health', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it('responde que el servidor está vivo', async () => {
    app = await buildServer();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json())).toEqual({ ok: true });
  });

  it('permite llamadas desde los orígenes configurados', async () => {
    app = await buildServer({ corsOrigins: ['http://localhost:8081'] });
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:8081' },
    });

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8081');
  });

  it('permite los métodos de la API en la consulta previa del navegador', async () => {
    app = await buildServer({ corsOrigins: ['http://localhost:8081'] });
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/households/x/transactions/y',
      headers: {
        origin: 'http://localhost:8081',
        'access-control-request-method': 'PUT',
        'access-control-request-headers': 'content-type',
      },
    });

    const methods = String(response.headers['access-control-allow-methods']).split(/,\s*/);
    expect(methods).toEqual(expect.arrayContaining(['PUT', 'PATCH', 'DELETE']));
  });

  it('no permite otros orígenes', async () => {
    app = await buildServer({ corsOrigins: ['http://localhost:8081'] });
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://otro.example' },
    });

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
