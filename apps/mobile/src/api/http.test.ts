import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError, createHttpClient } from './http';

function fakeFetch(response: Response | Error) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    if (response instanceof Error) throw response;
    return response.clone();
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
}

const schema = z.object({ ok: z.literal(true) });

describe('createHttpClient', () => {
  it('pide la ruta con las cabeceras de sesión y valida la respuesta', async () => {
    const { fetch, calls } = fakeFetch(Response.json({ ok: true }));
    const request = createHttpClient({
      baseUrl: 'http://api.test',
      headers: () => ({ cookie: 'sesion=1' }),
      fetch,
    });

    await expect(request('/api/me', { schema })).resolves.toEqual({ ok: true });
    expect(calls[0]?.url).toBe('http://api.test/api/me');
    expect(calls[0]?.init.headers).toMatchObject({
      cookie: 'sesion=1',
      accept: 'application/json',
    });
    expect(calls[0]?.init.credentials).toBeUndefined();
  });

  it('espera a las cabeceras de sesión si son asíncronas (app nativa)', async () => {
    const { fetch, calls } = fakeFetch(Response.json({ ok: true }));
    const request = createHttpClient({
      baseUrl: '',
      headers: async () => ({ cookie: 'sesion=2' }),
      fetch,
    });

    await request('/api/me', { schema });

    expect(calls[0]?.init.headers).toMatchObject({ cookie: 'sesion=2' });
  });

  it('en la web envía la cookie con credentials: include', async () => {
    const { fetch, calls } = fakeFetch(Response.json({ ok: true }));
    const request = createHttpClient({ baseUrl: '', credentials: 'include', fetch });

    await request('/api/me', { schema });

    expect(calls[0]?.url).toBe('/api/me');
    expect(calls[0]?.init.credentials).toBe('include');
  });

  it('envía el cuerpo como JSON', async () => {
    const { fetch, calls } = fakeFetch(Response.json({ ok: true }));
    const request = createHttpClient({ baseUrl: '', fetch });

    await request('/x', { method: 'POST', body: { a: 1 }, schema });

    expect(calls[0]?.init.body).toBe('{"a":1}');
    expect(calls[0]?.init.headers).toMatchObject({ 'content-type': 'application/json' });
  });

  it('convierte las respuestas de error del contrato en ApiError', async () => {
    const { fetch } = fakeFetch(
      Response.json({ error: { code: 'forbidden', message: 'No eres miembro' } }, { status: 403 }),
    );
    const request = createHttpClient({ baseUrl: '', fetch });

    const error = await request('/x', { schema }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'forbidden', status: 403, message: 'No eres miembro' });
  });

  it('un error sin el formato del contrato es internal', async () => {
    const { fetch } = fakeFetch(new Response('<html>', { status: 502 }));
    const request = createHttpClient({ baseUrl: '', fetch });

    await expect(request('/x', { schema })).rejects.toMatchObject({
      code: 'internal',
      status: 502,
    });
  });

  it('sin conexión lanza un ApiError de red', async () => {
    const { fetch } = fakeFetch(new TypeError('Network request failed'));
    const request = createHttpClient({ baseUrl: '', fetch });

    await expect(request('/x', { schema })).rejects.toMatchObject({ code: 'network', status: 0 });
  });

  it('rechaza respuestas que no cumplen el esquema', async () => {
    const { fetch } = fakeFetch(Response.json({ ok: 'sí' }));
    const request = createHttpClient({ baseUrl: '', fetch });

    await expect(request('/x', { schema })).rejects.toThrow();
  });
});
