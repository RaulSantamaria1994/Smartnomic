import { defineConfig } from 'vitest/config';

// Solo se testea la lógica sin React Native (configuración, red, reglas de la interfaz).
export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
