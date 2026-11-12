import type { QueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { clearCache } from '../cache/query-client';
import { forgetPushDevice } from '../push/forget';
import { clearRegistration, readRegistration } from '../push/registration-storage';
import { syncReminders } from '../reminders/reminders';
import { authClient } from './auth-client';

/**
 * Cierra la sesión y borra lo que queda en el dispositivo: la caché y los avisos
 * programados, que si no seguirían llegando a quien use el móvil después. Antes da de baja el
 * dispositivo de los avisos push, que necesita la sesión (especificación 014, RF-1409).
 */
export async function signOut(queryClient: QueryClient): Promise<void> {
  await forgetThisPushDevice();
  await authClient.signOut();
  await Promise.all([clearCache(queryClient), syncReminders([])]);
}

/** Tiempo máximo que se espera al servidor para dar de baja el dispositivo al cerrar sesión. */
const UNREGISTER_TIMEOUT_MS = 3000;

/** Da de baja este dispositivo de los avisos push y olvida su registro local. */
export function forgetThisPushDevice(): Promise<void> {
  return forgetPushDevice({
    read: readRegistration,
    clear: clearRegistration,
    unregister: (token) => api.unregisterPushDevice(token),
    timeoutMs: UNREGISTER_TIMEOUT_MS,
  });
}
