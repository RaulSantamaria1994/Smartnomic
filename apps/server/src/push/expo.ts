/**
 * Envío de avisos push con la API HTTP de Expo Push (especificación 014). Sin dependencias:
 * son dos llamadas con `fetch`, el mismo patrón que Brevo en `email.ts`. El texto del aviso
 * sale de la UE hacia Expo y FCM (constitución, art. VI.6, enmienda 1.2.0). Los errores solo
 * llevan el estado HTTP: el cuerpo de una respuesta puede repetir el texto del aviso.
 */

export interface PushMessage {
  /** `ExponentPushToken[…]` del dispositivo. */
  to: string;
  title: string;
  body: string;
  /** Datos para la app al tocar el aviso. Nunca notas ni saldos. */
  data: Record<string, unknown>;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  /** Segundos que Expo guarda el aviso si el móvil no está disponible. */
  ttl?: number;
  sound?: 'default' | null;
}

export type PushTicket = { status: 'ok'; id: string } | { status: 'error'; error?: string };
export type PushReceipt = { status: 'ok' } | { status: 'error'; error?: string };

export interface PushSender {
  /** Un ticket por mensaje, en el mismo orden. */
  send(messages: readonly PushMessage[]): Promise<PushTicket[]>;
  /** Estado de entrega de los tickets `ok`, por id. */
  receipts(ids: readonly string[]): Promise<Record<string, PushReceipt>>;
}

/** Error al llamar a Expo. El mensaje solo lleva el estado HTTP, nunca el cuerpo. */
export class PushError extends Error {
  constructor(readonly status: number) {
    super(`El servicio de avisos respondió ${status}`);
    this.name = 'PushError';
  }
}

export interface ExpoPushOptions {
  /** `EXPO_ACCESS_TOKEN`: opcional, para la seguridad reforzada de Expo Push. */
  accessToken?: string;
  /** Por defecto, la API pública de Expo. Se cambia para pruebas locales. */
  apiUrl?: string;
  fetch?: typeof globalThis.fetch;
}

const EXPO_API_URL = 'https://exp.host';
/** Límites de la API de Expo por petición. */
const SEND_CHUNK = 100;
const RECEIPTS_CHUNK = 1000;

interface ExpoStatus {
  status?: unknown;
  id?: unknown;
  details?: { error?: unknown };
}

export function createExpoPushSender(options: ExpoPushOptions = {}): PushSender {
  const fetch = options.fetch ?? globalThis.fetch;
  const base = (options.apiUrl ?? EXPO_API_URL).replace(/\/+$/, '');
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
    ...(options.accessToken && { authorization: `Bearer ${options.accessToken}` }),
  };

  /** POST con JSON y respuesta JSON; cualquier fallo es un `PushError` sin cuerpo. */
  async function post(path: string, body: unknown): Promise<unknown> {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new PushError(response.status);
    try {
      return await response.json();
    } catch {
      throw new PushError(response.status);
    }
  }

  const failure = (item: ExpoStatus) => {
    const error = item.details?.error;
    return { status: 'error' as const, ...(typeof error === 'string' && { error }) };
  };

  return {
    async send(messages) {
      const tickets: PushTicket[] = [];
      for (let start = 0; start < messages.length; start += SEND_CHUNK) {
        const chunk = messages.slice(start, start + SEND_CHUNK);
        const json = (await post('/--/api/v2/push/send', chunk)) as { data?: unknown };
        const data = json?.data;
        // Un ticket por mensaje: si no cuadra, se falla antes que borrar el token equivocado.
        if (!Array.isArray(data) || data.length !== chunk.length) throw new PushError(200);
        for (const item of data as ExpoStatus[]) {
          tickets.push(
            item?.status === 'ok' && typeof item.id === 'string'
              ? { status: 'ok', id: item.id }
              : failure(item ?? {}),
          );
        }
      }
      return tickets;
    },

    async receipts(ids) {
      const receipts: Record<string, PushReceipt> = {};
      for (let start = 0; start < ids.length; start += RECEIPTS_CHUNK) {
        const chunk = ids.slice(start, start + RECEIPTS_CHUNK);
        const json = (await post('/--/api/v2/push/getReceipts', { ids: chunk })) as {
          data?: Record<string, ExpoStatus>;
        };
        for (const [id, item] of Object.entries(json?.data ?? {})) {
          receipts[id] = item?.status === 'ok' ? { status: 'ok' } : failure(item ?? {});
        }
      }
      return receipts;
    },
  };
}
