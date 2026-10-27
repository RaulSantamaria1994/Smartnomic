import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // Los tests de integración comparten la base de datos: un archivo detrás de otro.
    fileParallelism: false,
  },
});
