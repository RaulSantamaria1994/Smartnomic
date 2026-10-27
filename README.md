# Smartnomic

App para que un hogar apunte sus ingresos y gastos mensuales, entienda en qué se va el
dinero y reciba recordatorios antes de cada pago. Funciona en Android y en el navegador.

- Reglas técnicas: [`docs/CONSTITUTION.md`](docs/CONSTITUTION.md)
- Especificación, plan y tareas de cada funcionalidad: [`docs/specs/`](docs/specs/)
- Forma de trabajar (personas y agentes): [`AGENTS.md`](AGENTS.md)

## Requisitos

- Node.js 22 (`nvm use`)
- pnpm 10 (`corepack enable`)
- Docker, para PostgreSQL en local

## Primeros pasos

```sh
pnpm install
docker compose up -d   # PostgreSQL en localhost:5432 (bases smartnomic y smartnomic_test)
pnpm check             # formato + lint + tipos + tests (lo mismo que el CI)
pnpm test:watch        # tests en modo watch mientras desarrollas
```

## Servidor

```sh
cp apps/server/.env.example apps/server/.env   # la primera vez; pon un BETTER_AUTH_SECRET
pnpm --filter @smartnomic/server dev           # http://localhost:3000, se recarga al guardar
```

Al arrancar con `DATABASE_URL`, el servidor aplica las migraciones pendientes.

- `GET /health` responde `{"ok":true}`.
- `/api/auth/*`: registro, inicio y cierre de sesión y recuperar la contraseña (Better
  Auth). Las peticiones POST tienen un límite de 10 por minuto e IP.
- `GET /api/me`: usuario, hogar y rol. `GET /api/households/:id`: datos del hogar.
- `GET /api/households/:id/categories`: categorías del hogar.
- `PUT|DELETE /api/households/:id/transactions/:txId` y `POST …/restore`: apuntar o
  editar (idempotente por el UUIDv7 que genera la app), borrar y deshacer.
- `GET /api/households/:id/periods/:start`: resumen y movimientos de un periodo.
- Si existe `apps/mobile/dist` (`pnpm --filter @smartnomic/mobile export:web`), sirve la
  web en `/`, en el mismo origen que la API.
- Variables (ver `apps/server/.env.example`):

  | Variable             | Para qué                                                                        |
  | -------------------- | ------------------------------------------------------------------------------- |
  | `DATABASE_URL`       | PostgreSQL. Sin ella, el servidor solo responde `/health`                       |
  | `BETTER_AUTH_SECRET` | Firma las sesiones. Obligatoria en producción                                   |
  | `BETTER_AUTH_URL`    | URL pública (`https://…`). En Railway, si falta, se usa `RAILWAY_PUBLIC_DOMAIN` |
  | `CORS_ORIGINS`       | Orígenes de la web de Expo en desarrollo, separados por comas                   |
  | `BREVO_API_KEY`      | Clave de la API de Brevo para enviar emails                                     |
  | `EMAIL_FROM`         | Remitente verificado en Brevo («Smartnomic <no-reply@…>»)                       |
  | `PORT`, `HOST`       | Puerto (3000) e interfaz (`0.0.0.0`)                                            |

### Emails (Brevo)

Los emails (por ahora, recuperar la contraseña) se envían con [Brevo](https://www.brevo.com),
que guarda los datos en la UE. Sin `BREVO_API_KEY` y `EMAIL_FROM`, el servidor arranca
pero no envía emails.

1. Crea una cuenta en Brevo (el plan gratuito permite unos 300 emails al día).
2. **Senders, Domains & Dedicated IPs → Domains**: añade tu dominio y crea los registros
   DNS que indica (DKIM, DMARC) para que los emails no lleguen como spam.
3. **Senders**: añade el remitente, por ejemplo `no-reply@tudominio.com`.
4. **SMTP & API → API Keys**: crea una clave y ponla en `BREVO_API_KEY`.

### Base de datos

Cambiar el esquema de la base de datos: edita `apps/server/src/db/schema.ts` y ejecuta
`pnpm --filter @smartnomic/server db:generate`. Nunca se edita una migración ya fusionada.

## App (Android y web)

```sh
CORS_ORIGINS=http://localhost:8081 pnpm --filter @smartnomic/server dev   # una terminal
pnpm --filter @smartnomic/mobile start                                    # otra
```

- **Android**: escanea el QR con **Expo Go** (mismo Wi-Fi que el ordenador). La app usa el
  servidor del ordenador que la sirve, en el puerto 3000.
- **Web**: pulsa `w` en Expo o usa `pnpm --filter @smartnomic/mobile web`.
- Para usar otro servidor, copia `apps/mobile/.env.example` como `apps/mobile/.env` y
  define `EXPO_PUBLIC_API_URL`.

Sin sesión, la app abre la pantalla de entrar; desde ahí se puede crear una cuenta o
recuperar la contraseña. Al registrarse se crea el hogar con la zona horaria del
dispositivo.

Con sesión, la pantalla principal es el **mes**: ingresos, gastos y balance del periodo,
la lista de movimientos y el botón **Apuntar**. En Android los últimos datos se guardan
para verlos sin conexión.

## Publicar el servidor (Railway)

El repositorio trae un `Dockerfile` (exporta la web y la sirve junto con la API) y un
`railway.json` (comprobación de salud en `/health`).

1. En [railway.com](https://railway.com), **New Project → Deploy from GitHub repo** con
   este repositorio, en una región de la UE.
2. **New → Database → Add PostgreSQL**, en la misma región.
3. En el servicio del servidor, **Variables**: `PORT` = `3000`, `DATABASE_URL` como
   referencia a la de PostgreSQL, `BETTER_AUTH_SECRET` (`openssl rand -hex 32`) y
   `BETTER_AUTH_URL` con el dominio público. Para los emails, `BREVO_API_KEY` y
   `EMAIL_FROM`.
4. **Settings → Networking → Generate Domain** con el puerto `3000`.
5. Comprueba `https://<tu-dominio>/health`.

## APK de Android (EAS Build)

```sh
npm install -g eas-cli
cd apps/mobile
eas login
eas init      # solo la primera vez: enlaza el proyecto y añade su id a app.json
EXPO_PUBLIC_API_URL=https://<tu-dominio> eas build --platform android --profile preview
```

## Estructura

| Carpeta           | Qué contiene                                                    |
| ----------------- | --------------------------------------------------------------- |
| `packages/domain` | Lógica de negocio pura (dinero, periodos, recurrencias, avisos) |
| `packages/api`    | Contrato app ↔ servidor (esquemas zod)                          |
| `apps/server`     | API REST con Fastify                                            |
| `apps/mobile`     | App Expo para Android y web                                     |
| `docs/`           | Constitución y especificaciones                                 |
