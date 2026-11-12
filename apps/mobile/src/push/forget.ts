import type { PushRegistration } from './registration';

/**
 * Da de baja este dispositivo en el servidor y olvida el registro local. Se llama antes de cerrar
 * sesión, porque la baja necesita la sesión (especificación 014, RF-1409, escenario 3.3). Nunca
 * lanza ni retiene el cierre de sesión más de `timeoutMs`: sin conexión no se espera, y el
 * servidor borra el dispositivo igualmente al terminar la sesión (clave foránea en cascada).
 */
export async function forgetPushDevice(deps: {
  read: () => Promise<PushRegistration | null>;
  clear: () => Promise<void>;
  unregister: (token: string) => Promise<unknown>;
  timeoutMs: number;
}): Promise<void> {
  let registration: PushRegistration | null = null;
  try {
    registration = await deps.read();
  } catch {
    // Un registro ilegible equivale a no tenerlo.
  }
  if (registration) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, deps.timeoutMs);
    });
    try {
      await Promise.race([deps.unregister(registration.token), timeout]);
    } catch {
      // Sin conexión o con el servidor caído: la sesión que termina se lleva el dispositivo.
    } finally {
      clearTimeout(timer);
    }
  }
  try {
    await deps.clear();
  } catch {
    // Nada más que hacer: el siguiente registro lo sobrescribe.
  }
}
