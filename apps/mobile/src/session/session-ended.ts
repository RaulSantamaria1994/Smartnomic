import type { QueryClient } from '@tanstack/react-query';
import { clearCache } from '../cache/query-client';
import { syncReminders } from '../reminders/reminders';
import { authClient } from './auth-client';
import { createSessionEnd } from './session-end';

let queryClient: QueryClient | null = null;

/** La sesión de la app: qué hacer cuando la API dice que ya no vale (401). */
export const sessionEnd = createSessionEnd({
  clearDevice: async () => {
    if (queryClient) await Promise.all([clearCache(queryClient), syncReminders([])]);
  },
  forgetSession: async () => {
    // El servidor ya no la conoce: se borra la guardada y `useSession` vuelve a preguntar,
    // así que las pantallas de dentro llevan a «Entrar».
    await authClient.signOut().catch(() => undefined);
    authClient.$store.notify('$sessionSignal');
  },
});

/** La caché que se borra al terminar la sesión. */
export function bindSessionEnd(client: QueryClient): void {
  queryClient = client;
}
