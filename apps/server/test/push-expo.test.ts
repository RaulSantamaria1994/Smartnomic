import { describe, expect, it } from 'vitest';
import { createExpoPushSender, PushError, type PushMessage } from '../src/push/expo';

interface Call {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

/** `fetch` falso: apunta cada llamada y responde con lo que decida `reply`. */
function fakeFetch(reply: (call: Call, index: number) => { status?: number; json?: unknown }) {
  const calls: Call[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    const call: Call = {
      url,
      headers: init.headers as Record<string, string>,
      body: JSON.parse(init.body as string),
    };
    calls.push(call);
    const { status = 200, json } = reply(call, calls.length - 1);
    return new Response(JSON.stringify(json ?? {}), { status });
  }) as unknown as typeof globalThis.fetch;
  return { calls, fetch };
}

const message = (n: number): PushMessage => ({
  to: `ExponentPushToken[t${n}]`,
  title: 'Casa',
  body: `Aviso ${n}`,
  data: { type: 'activity' },
  channelId: 'actividad',
  priority: 'high',
  ttl: 86_400,
});

const okTickets = (call: Call) => ({
  json: { data: (call.body as unknown[]).map((_, i) => ({ status: 'ok', id: `id-${i}` })) },
});

describe('createExpoPushSender.send (especificación 014)', () => {
  it('no llama a Expo si no hay nada que enviar', async () => {
    const { calls, fetch } = fakeFetch(okTickets);
    const sender = createExpoPushSender({ fetch });
    expect(await sender.send([])).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('envía los mensajes tal cual a la API de Expo Push', async () => {
    const { calls, fetch } = fakeFetch(okTickets);
    await createExpoPushSender({ fetch }).send([message(1)]);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://exp.host/--/api/v2/push/send');
    expect(calls[0]!.body).toEqual([message(1)]);
    expect(calls[0]!.headers['content-type']).toBe('application/json');
  });

  it('trocea de 100 en 100 y devuelve los tickets en el orden de los mensajes', async () => {
    const { calls, fetch } = fakeFetch((call, index) => ({
      json: {
        data: (call.body as unknown[]).map((_, i) => ({ status: 'ok', id: `l${index}-${i}` })),
      },
    }));
    const tickets = await createExpoPushSender({ fetch }).send(
      Array.from({ length: 250 }, (_, i) => message(i)),
    );
    expect(calls.map((c) => (c.body as unknown[]).length)).toEqual([100, 100, 50]);
    expect(tickets).toHaveLength(250);
    expect(tickets[0]).toEqual({ status: 'ok', id: 'l0-0' });
    expect(tickets[100]).toEqual({ status: 'ok', id: 'l1-0' });
    expect(tickets[249]).toEqual({ status: 'ok', id: 'l2-49' });
  });

  it('envía EXPO_ACCESS_TOKEN solo si existe', async () => {
    const withToken = fakeFetch(okTickets);
    await createExpoPushSender({ fetch: withToken.fetch, accessToken: 'secreto' }).send([
      message(1),
    ]);
    expect(withToken.calls[0]!.headers.authorization).toBe('Bearer secreto');

    const without = fakeFetch(okTickets);
    await createExpoPushSender({ fetch: without.fetch }).send([message(1)]);
    expect(without.calls[0]!.headers.authorization).toBeUndefined();
  });

  it('respeta una dirección distinta, con o sin barra final', async () => {
    const { calls, fetch } = fakeFetch(okTickets);
    await createExpoPushSender({ fetch, apiUrl: 'http://localhost:9999/' }).send([message(1)]);
    expect(calls[0]!.url).toBe('http://localhost:9999/--/api/v2/push/send');
  });

  it('distingue un ticket correcto de un error, con su motivo si lo hay', async () => {
    const { fetch } = fakeFetch(() => ({
      json: {
        data: [
          { status: 'ok', id: 'abc' },
          {
            status: 'error',
            message: 'texto con datos',
            details: { error: 'DeviceNotRegistered' },
          },
          { status: 'error', message: 'otra cosa' },
        ],
      },
    }));
    const tickets = await createExpoPushSender({ fetch }).send([
      message(1),
      message(2),
      message(3),
    ]);
    expect(tickets).toEqual([
      { status: 'ok', id: 'abc' },
      { status: 'error', error: 'DeviceNotRegistered' },
      { status: 'error' },
    ]);
  });

  it('un error HTTP lanza un error que solo lleva el estado, sin el cuerpo', async () => {
    const { fetch } = fakeFetch(() => ({
      status: 503,
      json: { errors: [{ message: 'Casa · Juan ha apuntado 45,30 €' }] },
    }));
    const error = await createExpoPushSender({ fetch })
      .send([message(1)])
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PushError);
    expect((error as PushError).status).toBe(503);
    expect((error as PushError).message).not.toMatch(/Juan|45,30|Casa/);
  });

  it('si Expo no devuelve un ticket por mensaje, falla en lugar de descuadrar los tokens', async () => {
    const { fetch } = fakeFetch(() => ({ json: { data: [{ status: 'ok', id: 'solo-uno' }] } }));
    const error = await createExpoPushSender({ fetch })
      .send([message(1), message(2)])
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PushError);
  });

  it('una respuesta que no es JSON lanza el mismo error', async () => {
    const fetch = (async () => new Response('<html>', { status: 200 })) as typeof globalThis.fetch;
    await expect(createExpoPushSender({ fetch }).send([message(1)])).rejects.toBeInstanceOf(
      PushError,
    );
  });
});

describe('createExpoPushSender.receipts (especificación 014)', () => {
  it('consulta los recibos y los devuelve por id', async () => {
    const { calls, fetch } = fakeFetch(() => ({
      json: {
        data: {
          a: { status: 'ok' },
          b: { status: 'error', message: 'x', details: { error: 'DeviceNotRegistered' } },
          c: { status: 'error', message: 'y' },
        },
      },
    }));
    const receipts = await createExpoPushSender({ fetch }).receipts(['a', 'b', 'c']);
    expect(calls[0]!.url).toBe('https://exp.host/--/api/v2/push/getReceipts');
    expect(calls[0]!.body).toEqual({ ids: ['a', 'b', 'c'] });
    expect(receipts).toEqual({
      a: { status: 'ok' },
      b: { status: 'error', error: 'DeviceNotRegistered' },
      c: { status: 'error' },
    });
  });

  it('sin ids no llama a Expo; con muchos, trocea de 1000 en 1000', async () => {
    const { calls, fetch } = fakeFetch(() => ({ json: { data: {} } }));
    const sender = createExpoPushSender({ fetch });
    expect(await sender.receipts([])).toEqual({});
    expect(calls).toHaveLength(0);
    await sender.receipts(Array.from({ length: 2500 }, (_, i) => `id${i}`));
    expect(calls.map((c) => (c.body as { ids: string[] }).ids.length)).toEqual([1000, 1000, 500]);
  });

  it('un error HTTP lanza un error que solo lleva el estado', async () => {
    const { fetch } = fakeFetch(() => ({ status: 429, json: { errors: ['demasiadas'] } }));
    const error = await createExpoPushSender({ fetch })
      .receipts(['a'])
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PushError);
    expect((error as PushError).status).toBe(429);
  });
});
