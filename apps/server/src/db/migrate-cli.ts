import { connectDatabase } from './client';
import { runMigrations } from './migrate';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL.');
  process.exit(1);
}

const { db, close } = connectDatabase(url);
try {
  await runMigrations(db);
  console.log('Migraciones aplicadas.');
} finally {
  await close();
}
