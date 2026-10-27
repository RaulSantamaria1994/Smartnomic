import { createAuth } from './auth';
import { connectDatabase } from './db/client';
import { createBrevoSender, parseSender, resetPasswordEmail, type SendEmail } from './email';
import { runMigrations } from './db/migrate';
import { buildServer } from './server';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';
const PRODUCTION = process.env.NODE_ENV === 'production';
// Lista separada por comas, por ejemplo «http://localhost:8081».
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const database = databaseUrl ? connectDatabase(databaseUrl) : undefined;

  const sendEmail = emailSender();
  // El logger del servidor se crea después; hasta entonces los errores van a la consola.
  let logEmailError = (error: unknown) => console.error('Error al enviar un email', error);

  let auth;
  if (database) {
    await runMigrations(database.db);
    auth = createAuth({
      db: database.db,
      baseURL: process.env.BETTER_AUTH_URL ?? `http://localhost:${PORT}`,
      secret: requiredSecret(),
      trustedOrigins: CORS_ORIGINS,
      production: PRODUCTION,
      ...(sendEmail && {
        sendResetPassword: ({ to, url }) => sendEmail({ to, ...resetPasswordEmail(url) }),
        onEmailError: (error) => logEmailError(error),
      }),
    });
  }

  const app = await buildServer({
    logger: true,
    corsOrigins: CORS_ORIGINS,
    ...(auth && { auth }),
  });
  logEmailError = (error) => app.log.error({ err: error }, 'Error al enviar un email');
  if (!database) app.log.warn('Sin DATABASE_URL: solo responde /health.');
  if (database && !sendEmail) {
    app.log.warn('Sin BREVO_API_KEY o EMAIL_FROM: recuperar la contraseña no está disponible.');
  }
  app.addHook('onClose', async () => database?.close());

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      app.close().finally(() => process.exit(0));
    });
  }

  await app.listen({ port: PORT, host: HOST });
}

/** Envío de emails con Brevo si están BREVO_API_KEY y EMAIL_FROM. */
function emailSender(): SendEmail | undefined {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return undefined;
  const apiUrl = process.env.BREVO_API_URL;
  return createBrevoSender({ apiKey, sender: parseSender(from), ...(apiUrl && { apiUrl }) });
}

/** En producción el secreto es obligatorio; en desarrollo se usa uno fijo. */
function requiredSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (PRODUCTION) throw new Error('Falta BETTER_AUTH_SECRET.');
  return 'secreto-solo-para-desarrollo-local-no-usar-en-produccion';
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
