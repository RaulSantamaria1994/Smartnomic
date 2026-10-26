const SERVER_PORT = 3000;

export interface ApiUrlContext {
  /** Valor de EXPO_PUBLIC_API_URL, si se ha configurado. */
  configured: string | undefined;
  /** Dirección de Expo en desarrollo («192.168.1.20:8081»). */
  hostUri: string | undefined;
  isWeb: boolean;
  isDev: boolean;
}

/**
 * Dirección base de la API.
 *
 * - Si se configura EXPO_PUBLIC_API_URL, se usa esa.
 * - En la web publicada, la API está en el mismo origen que la página: dirección vacía.
 * - En desarrollo, el servidor corre en el ordenador que sirve Expo. Se usa la IP de
 *   `hostUri` porque `localhost` en el móvil sería el propio móvil.
 */
export function apiUrl({ configured, hostUri, isWeb, isDev }: ApiUrlContext): string {
  if (configured) return configured.replace(/\/+$/, '');
  if (isWeb && !isDev) return '';
  const host = hostUri?.split(':')[0] || 'localhost';
  return `http://${host}:${SERVER_PORT}`;
}
