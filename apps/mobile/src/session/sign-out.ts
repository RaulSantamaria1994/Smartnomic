import type { QueryClient } from '@tanstack/react-query';
import { clearCache } from '../cache/query-client';
import { syncReminders } from '../reminders/reminders';
import { authClient } from './auth-client';

/**
 * Cierra la sesión y borra lo que queda en el dispositivo: la caché y los avisos
 * programados, que si no seguirían llegando a quien use el móvil después.
 */
export async function signOut(queryClient: QueryClient): Promise<void> {
  await authClient.signOut();
  await Promise.all([clearCache(queryClient), syncReminders([])]);
}
