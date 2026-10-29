import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { errorResponseSchema } from '@smartnomic/api';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server';

function webRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'smartnomic-web-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Smartnomic</title>');
  writeFileSync(join(dir, 'app.js'), 'console.log(1)');
  // Expo exporta las fuentes de los paquetes bajo node_modules/.pnpm (carpeta con punto).
  const fonts = join(
    dir,
    'assets',
    '__node_modules',
    '.pnpm',
    'fuente@1',
    'node_modules',
    'fuente',
  );
  mkdirSync(fonts, { recursive: true });
  writeFileSync(join(fonts, 'Fuente.ttf'), 'TTF');
  return dir;
}

describe('web exportada', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it('sirve la página y sus archivos', async () => {
    app = await buildServer({ webRoot: webRoot() });

    const page = await app.inject({ method: 'GET', url: '/' });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('<title>Smartnomic</title>');

    const script = await app.inject({ method: 'GET', url: '/app.js' });
    expect(script.statusCode).toBe(200);
    expect(script.headers['content-type']).toContain('javascript');
  });

  it('sirve los archivos de paquetes que van bajo una carpeta con punto (fuentes, iconos)', async () => {
    app = await buildServer({ webRoot: webRoot() });

    const font = await app.inject({
      method: 'GET',
      url: '/assets/__node_modules/.pnpm/fuente@1/node_modules/fuente/Fuente.ttf',
    });

    expect(font.statusCode).toBe(200);
    expect(font.body).toBe('TTF');
  });

  it('un archivo que no existe da 404, no la página', async () => {
    app = await buildServer({ webRoot: webRoot() });

    for (const url of ['/assets/no-existe.ttf', '/favicon.ico', '/app.css']) {
      const response = await app.inject({ method: 'GET', url });
      expect(response.statusCode, url).toBe(404);
      expect(response.body, url).not.toContain('<title>Smartnomic</title>');
    }
  });

  it('las rutas de la app (por ejemplo, /restablecer) devuelven la página', async () => {
    app = await buildServer({ webRoot: webRoot() });

    const response = await app.inject({ method: 'GET', url: '/restablecer?token=abc' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('<title>Smartnomic</title>');
  });

  it('las rutas de la API que no existen siguen respondiendo 404 en JSON', async () => {
    app = await buildServer({ webRoot: webRoot() });

    const response = await app.inject({ method: 'GET', url: '/api/no-existe' });

    expect(response.statusCode).toBe(404);
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('not_found');
  });

  it('sin la carpeta de la web, todo lo desconocido es 404', async () => {
    app = await buildServer({ webRoot: '/no/existe' });

    expect((await app.inject({ method: 'GET', url: '/' })).statusCode).toBe(404);
  });
});
