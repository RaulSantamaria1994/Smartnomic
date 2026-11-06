import type { OutboxStorage } from './outbox';

/**
 * En el navegador la app necesita conexión (constitución, art. IX.3): no hay bandeja y guardar
 * sin conexión avisa como siempre. Solo la compilación de pruebas de punta a punta
 * (`EXPO_PUBLIC_E2E_OUTBOX=1`) la activa con `localStorage`, para probarla con Playwright.
 */
export const outboxStorage: OutboxStorage | null =
  process.env.EXPO_PUBLIC_E2E_OUTBOX === '1' && typeof localStorage !== 'undefined'
    ? {
        load: async (key) => localStorage.getItem(key),
        save: async (key, value) => localStorage.setItem(key, value),
        remove: async (key) => localStorage.removeItem(key),
      }
    : null;
