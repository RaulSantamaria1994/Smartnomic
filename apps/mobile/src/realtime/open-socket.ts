/** En la web, el navegador envía la cookie de sesión con la conexión (mismo origen). */
export async function openSocket(url: string): Promise<WebSocket> {
  return new WebSocket(url);
}
