import { sessionHeaders } from '../session/auth-client';

/** En Android, la sesión va en la cabecera, como en el resto de peticiones de la app. */
export async function openSocket(url: string): Promise<WebSocket> {
  const headers = await sessionHeaders();
  // El WebSocket de React Native acepta cabeceras como tercer argumento.
  const NativeWebSocket = WebSocket as unknown as new (
    url: string,
    protocols: string[] | null,
    options: { headers: Record<string, string> },
  ) => WebSocket;
  return new NativeWebSocket(url, null, { headers });
}
