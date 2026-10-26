import { buildServer } from './server';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';
// Lista separada por comas, por ejemplo «http://localhost:8081».
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

async function main() {
  const app = await buildServer({ logger: true, corsOrigins: CORS_ORIGINS });

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      app.close().finally(() => process.exit(0));
    });
  }

  await app.listen({ port: PORT, host: HOST });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
