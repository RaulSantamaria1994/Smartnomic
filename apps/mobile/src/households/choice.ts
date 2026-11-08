/** Dónde se guarda el hogar elegido (AsyncStorage en Android, `localStorage` en la web). */
export interface ChoiceStorage {
  load(): Promise<string | null>;
  save(value: string): Promise<void>;
}

/**
 * El hogar elegido por cada cuenta en este dispositivo (especificación 013, RF-1303). Se lee
 * una vez al abrir la app; si lo guardado está roto o no se puede leer, se empieza de cero.
 */
export function createHouseholdChoice(storage: ChoiceStorage | null) {
  let byUser: Record<string, string> = {};
  const listeners = new Set<() => void>();

  return {
    async load(): Promise<void> {
      try {
        const raw = await storage?.load();
        const parsed: unknown = raw ? JSON.parse(raw) : {};
        byUser =
          parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          Object.values(parsed).every((v) => typeof v === 'string')
            ? (parsed as Record<string, string>)
            : {};
      } catch {
        byUser = {};
      }
    },
    get(userId: string): string | null {
      return byUser[userId] ?? null;
    },
    async set(userId: string, householdId: string): Promise<void> {
      byUser = { ...byUser, [userId]: householdId };
      for (const listener of listeners) listener();
      await storage?.save(JSON.stringify(byUser)).catch(() => undefined);
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
