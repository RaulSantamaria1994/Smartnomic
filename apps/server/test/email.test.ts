import { describe, expect, it } from 'vitest';
import { createBrevoSender, EmailError, parseSender, resetPasswordEmail } from '../src/email';

interface Call {
  url: string;
  init: RequestInit;
}

function fakeFetch(response: Response) {
  const calls: Call[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return response.clone();
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
}

const message = {
  to: 'lucia@example.com',
  subject: 'Asunto',
  text: 'Texto',
  html: '<p>Texto</p>',
};

describe('createBrevoSender', () => {
  it('envía el email con la API transaccional de Brevo', async () => {
    const { fetch, calls } = fakeFetch(new Response('{"messageId":"1"}', { status: 201 }));
    const send = createBrevoSender({
      apiKey: 'clave',
      sender: { email: 'no-reply@smartnomic.app', name: 'Smartnomic' },
      fetch,
    });

    await send(message);

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(call?.init.method).toBe('POST');
    expect(call?.init.headers).toMatchObject({
      'api-key': 'clave',
      'content-type': 'application/json',
    });
    expect(JSON.parse(String(call?.init.body))).toEqual({
      sender: { email: 'no-reply@smartnomic.app', name: 'Smartnomic' },
      to: [{ email: 'lucia@example.com' }],
      subject: 'Asunto',
      textContent: 'Texto',
      htmlContent: '<p>Texto</p>',
    });
  });

  it('usa otra URL de la API si se configura', async () => {
    const { fetch, calls } = fakeFetch(new Response('{}', { status: 201 }));
    const send = createBrevoSender({
      apiKey: 'clave',
      sender: { email: 'no-reply@smartnomic.app' },
      apiUrl: 'http://localhost:4010/',
      fetch,
    });

    await send(message);

    expect(calls[0]?.url).toBe('http://localhost:4010/v3/smtp/email');
  });

  it('lanza un error con el estado, sin la dirección del destinatario', async () => {
    const { fetch } = fakeFetch(
      new Response('{"code":"unauthorized","message":"Key not found lucia@example.com"}', {
        status: 401,
      }),
    );
    const send = createBrevoSender({
      apiKey: 'mala',
      sender: { email: 'no-reply@smartnomic.app' },
      fetch,
    });

    const error = await send(message).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(EmailError);
    expect((error as EmailError).status).toBe(401);
    expect((error as EmailError).message).toContain('401');
    expect((error as EmailError).message).not.toContain('lucia@example.com');
  });
});

describe('parseSender', () => {
  it('acepta una dirección sola', () => {
    expect(parseSender('no-reply@smartnomic.app')).toEqual({ email: 'no-reply@smartnomic.app' });
  });

  it('acepta «Nombre <dirección>»', () => {
    expect(parseSender('Smartnomic <no-reply@smartnomic.app>')).toEqual({
      email: 'no-reply@smartnomic.app',
      name: 'Smartnomic',
    });
  });

  it('rechaza lo que no es una dirección', () => {
    expect(() => parseSender('Smartnomic')).toThrow();
    expect(() => parseSender('')).toThrow();
  });
});

describe('resetPasswordEmail', () => {
  it('incluye el enlace en texto y en HTML', () => {
    const url = 'https://smartnomic.app/api/auth/reset-password/abc?callbackURL=%2Freset';
    const email = resetPasswordEmail(url);

    expect(email.subject).toBe('Restablece tu contraseña de Smartnomic');
    expect(email.text).toContain(url);
    expect(email.html).toContain(
      'href="https://smartnomic.app/api/auth/reset-password/abc?callbackURL=%2Freset"',
    );
  });

  it('escapa el enlace en el HTML', () => {
    const email = resetPasswordEmail('https://x.example/?a=1&b="><script>');

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&amp;b=&quot;&gt;&lt;script&gt;');
  });
});
