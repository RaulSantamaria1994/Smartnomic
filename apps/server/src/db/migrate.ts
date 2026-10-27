import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Database } from './client';

const MIGRATIONS_FOLDER = fileURLToPath(new URL('./migrations', import.meta.url));

/** Aplica las migraciones pendientes (constitución, art. IV.2). */
export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
