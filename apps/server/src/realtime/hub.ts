import type { RealtimeMessage, RealtimeScope } from '@smartnomic/api';

/** Lo mínimo de una conexión WebSocket que usa el hub (así se prueba sin red). */
export interface RealtimeSocket {
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

interface Connection {
  socket: RealtimeSocket;
  userId: string;
  householdId: string;
  sessionId: string;
}

/** Conexiones abiertas por cuenta; las de más cierran las más antiguas. */
export const MAX_CONNECTIONS_PER_USER = 10;

/** Código de cierre cuando la conexión ya no corresponde (salió del hogar, sesión cerrada, demasiadas). */
export const CLOSE_STALE = 4001;

/**
 * Registro en memoria de las conexiones de tiempo real (especificación 012): a cada hogar le
 * llegan solo sus avisos, que dicen qué cambió pero no llevan datos (RF-1203).
 */
export class RealtimeHub {
  private readonly byHousehold = new Map<string, Set<Connection>>();
  private readonly byUser = new Map<string, Connection[]>();

  add(socket: RealtimeSocket, userId: string, householdId: string, sessionId: string): () => void {
    const connection: Connection = { socket, userId, householdId, sessionId };
    const household = this.byHousehold.get(householdId) ?? new Set();
    household.add(connection);
    this.byHousehold.set(householdId, household);
    const mine = [...(this.byUser.get(userId) ?? []), connection];
    this.byUser.set(userId, mine);
    // Más de las permitidas: fuera las más antiguas.
    while (mine.length > MAX_CONNECTIONS_PER_USER) {
      const oldest = mine.shift()!;
      this.remove(oldest);
      oldest.socket.close(CLOSE_STALE, 'Demasiadas conexiones');
    }
    return () => this.remove(connection);
  }

  private remove(connection: Connection): void {
    const household = this.byHousehold.get(connection.householdId);
    household?.delete(connection);
    if (household?.size === 0) this.byHousehold.delete(connection.householdId);
    const mine = (this.byUser.get(connection.userId) ?? []).filter((c) => c !== connection);
    if (mine.length > 0) this.byUser.set(connection.userId, mine);
    else this.byUser.delete(connection.userId);
  }

  publish(householdId: string, scope: RealtimeScope): void {
    const message: RealtimeMessage = { type: 'changed', scope };
    const text = JSON.stringify(message);
    for (const connection of this.byHousehold.get(householdId) ?? []) connection.socket.send(text);
  }

  /** Mensaje a todas las conexiones (el ping). */
  broadcast(message: RealtimeMessage): void {
    const text = JSON.stringify(message);
    for (const household of this.byHousehold.values()) {
      for (const connection of household) connection.socket.send(text);
    }
  }

  /**
   * Cierra las conexiones del hogar cuyo usuario ya no es miembro de él (tras un cambio de
   * miembros). `isMember` lo pregunta a la base de datos.
   */
  async dropStale(
    householdId: string,
    isMember: (userId: string, householdId: string) => Promise<boolean>,
  ): Promise<void> {
    for (const connection of [...(this.byHousehold.get(householdId) ?? [])]) {
      if (await isMember(connection.userId, householdId)) continue;
      this.remove(connection);
      connection.socket.close(CLOSE_STALE, 'Ya no eres miembro de este hogar');
    }
  }

  /**
   * Cierra las conexiones cuya sesión ya no vale (cerrada o caducada): una sesión robada y
   * cerrada no sigue recibiendo avisos. `liveSessions` dice cuáles siguen vivas.
   */
  async dropEndedSessions(
    liveSessions: (sessionIds: string[]) => Promise<Set<string>>,
  ): Promise<void> {
    const all = [...this.byHousehold.values()].flatMap((household) => [...household]);
    if (all.length === 0) return;
    const live = await liveSessions([...new Set(all.map((c) => c.sessionId))]);
    for (const connection of all) {
      if (live.has(connection.sessionId)) continue;
      this.remove(connection);
      connection.socket.close(CLOSE_STALE, 'La sesión ha terminado');
    }
  }

  get size(): number {
    let total = 0;
    for (const household of this.byHousehold.values()) total += household.size;
    return total;
  }
}
