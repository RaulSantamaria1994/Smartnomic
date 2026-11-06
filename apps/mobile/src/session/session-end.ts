import { ApiError } from '../api/http';

/** La API responde 401 cuando la sesión ha caducado o se ha cerrado en otro sitio. */
export function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export interface SessionEndDeps {
  /** Borra la caché y los recordatorios, como al cerrar sesión (no la bandeja de salida). */
  clearDevice: () => Promise<void>;
  /** Olvida la sesión guardada; con ella a `null`, la app lleva a «Entrar». */
  forgetSession: () => Promise<void>;
}

/**
 * Sesión terminada fuera de la app (caducada o cerrada en otro dispositivo): ante el primer
 * 401 se limpia el dispositivo como al cerrar sesión y «Entrar» lo explica. Los movimientos sin
 * enviar se conservan para enviarlos al volver a entrar con la misma cuenta (especificación
 * 011). Cerrar sesión o borrar la cuenta a propósito no cuenta.
 */
export function createSessionEnd(deps: SessionEndDeps) {
  let state: 'signedOut' | 'active' | 'leaving' | 'ended' = 'signedOut';
  let notice = false;

  return {
    /** Con sesión (al montar las pantallas de dentro). */
    started() {
      state = 'active';
    },
    /** Se cierra sesión o se borra la cuenta a propósito: sus 401 no son una sesión caducada. */
    leaving() {
      state = 'leaving';
    },
    async onError(error: unknown): Promise<void> {
      if (state !== 'active' || !isUnauthenticated(error)) return;
      state = 'ended';
      notice = true;
      await deps.clearDevice().catch(() => undefined);
      await deps.forgetSession().catch(() => undefined);
    },
    /** ¿Hay que decir en «Entrar» que la sesión terminó? Solo una vez. */
    takeNotice(): boolean {
      const shown = notice;
      notice = false;
      return shown;
    },
  };
}
