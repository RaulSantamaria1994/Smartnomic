import type { ChoiceStorage } from './choice';

const KEY = 'smartnomic-household';

/**
 * En la web, el hogar elegido va en `localStorage` (solo un identificador, sin datos del hogar).
 * Si el navegador no lo deja (modo privado), la app funciona igual, sin recordarlo.
 */
export const choiceStorage: ChoiceStorage | null = {
  load: async () => {
    try {
      return globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      return null;
    }
  },
  save: async (value) => {
    try {
      globalThis.localStorage?.setItem(KEY, value);
    } catch {
      // Sin almacenamiento: se recuerda solo mientras la página siga abierta.
    }
  },
};
