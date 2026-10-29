import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server';

function webRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'smartnomic-web-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Smartnomic</title>');
  return dir;
}

describe('cabeceras de seguridad', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it('la web no se puede meter en un iframe ni cargar scripts de fuera', async () => {
    app = await buildServer({ webRoot: webRoot() });
    for (const url of ['/', '/entrar', '/invitacion/ABCDE23456']) {
      const page = await app.inject({ method: 'GET', url });
      const csp = page.headers['content-security-policy'] as string;
      expect(csp, url).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(page.headers['x-frame-options']).toBe('DENY');
      expect(page.headers['x-content-type-options']).toBe('nosniff');
      // Las invitaciones llevan el código en la URL: no se manda a otros sitios.
      expect(page.headers['referrer-policy']).toBe('no-referrer');
      expect(page.headers['permissions-policy']).toContain('camera=()');
    }
  });

  it('las respuestas de la API no se guardan en caché y llevan nosniff', async () => {
    app = await buildServer();
    const response = await app.inject({ method: 'GET', url: '/api/me' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('HSTS solo cuando se pide (producción, detrás de HTTPS)', async () => {
    app = await buildServer({ webRoot: webRoot() });
    expect(
      (await app.inject({ method: 'GET', url: '/' })).headers['strict-transport-security'],
    ).toBeUndefined();
    await app.close();
    app = await buildServer({ webRoot: webRoot(), hsts: true });
    expect(
      (await app.inject({ method: 'GET', url: '/' })).headers['strict-transport-security'],
    ).toBe('max-age=31536000; includeSubDomains');
  });
});
