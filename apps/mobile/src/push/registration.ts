/** Lo último que se registró en el servidor desde este dispositivo. */
export interface PushRegistration {
  token: string;
  /** Sesión con la que se registró: otra sesión, otro registro. */
  sessionId: string;
}

/**
 * ¿Hay que (volver a) registrar el dispositivo? Sí si nunca se registró, si Android ha cambiado
 * el token o si es otra sesión: cerrar sesión borra el dispositivo en el servidor, así que al
 * entrar de nuevo, aunque el token sea el mismo, hay que registrarlo otra vez (especificación 014,
 * RF-1409, escenarios 3.2 y 3.3).
 */
export function needsRegistration(
  last: PushRegistration | null,
  current: PushRegistration,
): boolean {
  return last === null || last.token !== current.token || last.sessionId !== current.sessionId;
}
