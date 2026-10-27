/**
 * Envío de emails transaccionales con Brevo, que guarda los datos en la UE
 * (constitución, art. VI.6). Nunca se escriben las direcciones en los logs (art. VI.4).
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type SendEmail = (message: EmailMessage) => Promise<void>;

export interface EmailSender {
  email: string;
  name?: string;
}

/** Error al enviar. El mensaje solo lleva el estado HTTP, nunca la dirección. */
export class EmailError extends Error {
  constructor(readonly status: number) {
    super(`El proveedor de email respondió ${status}`);
    this.name = 'EmailError';
  }
}

export interface BrevoOptions {
  apiKey: string;
  sender: EmailSender;
  /** Por defecto, la API pública de Brevo. Se cambia para pruebas locales. */
  apiUrl?: string;
  fetch?: typeof globalThis.fetch;
}

const BREVO_API_URL = 'https://api.brevo.com';

export function createBrevoSender(options: BrevoOptions): SendEmail {
  const fetch = options.fetch ?? globalThis.fetch;
  const endpoint = `${(options.apiUrl ?? BREVO_API_URL).replace(/\/+$/, '')}/v3/smtp/email`;

  return async ({ to, subject, text, html }) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'api-key': options.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: options.sender,
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
    });
    // El cuerpo del error puede repetir la dirección: no se lee.
    if (!response.ok) throw new EmailError(response.status);
  };
}

/** Lee el remitente de EMAIL_FROM: «no-reply@dominio» o «Smartnomic <no-reply@dominio>». */
export function parseSender(value: string): EmailSender {
  const match = /^\s*(?:(.*?)\s*<([^<>\s]+@[^<>\s]+)>|([^<>\s]+@[^<>\s]+))\s*$/.exec(value);
  const email = match?.[2] ?? match?.[3];
  if (!email) throw new Error('EMAIL_FROM no es una dirección válida');
  const name = match?.[1];
  return name ? { email, name } : { email };
}

export function resetPasswordEmail(url: string): Omit<EmailMessage, 'to'> {
  const link = escapeHtml(url);
  return {
    subject: 'Restablece tu contraseña de Smartnomic',
    text: [
      'Hola:',
      '',
      'Has pedido restablecer tu contraseña de Smartnomic. Abre este enlace para elegir una nueva:',
      '',
      url,
      '',
      'El enlace caduca en una hora. Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambia.',
    ].join('\n'),
    html: [
      '<p>Hola:</p>',
      '<p>Has pedido restablecer tu contraseña de Smartnomic. Pulsa en el enlace para elegir una nueva:</p>',
      `<p><a href="${link}">Restablecer la contraseña</a></p>`,
      `<p>Si el enlace no funciona, copia esta dirección en el navegador:<br>${link}</p>`,
      '<p>El enlace caduca en una hora. Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambia.</p>',
    ].join('\n'),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
