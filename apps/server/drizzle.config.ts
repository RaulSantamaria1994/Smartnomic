import { defineConfig } from 'drizzle-kit';

// `pnpm db:generate` crea una migración nueva a partir de src/db/schema.ts.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  casing: 'snake_case',
});
