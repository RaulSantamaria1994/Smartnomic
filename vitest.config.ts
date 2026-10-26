import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/server', 'apps/mobile'],
    // Mientras un paquete no tenga tests, no debe romper `pnpm test`.
    passWithNoTests: true,
  },
});
