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
- `/api/auth/*`: registro, inicio y cierre de sesión (Better Auth).
- Variables (ver `apps/server/.env.example`):

  | Variable             | Para qué                                                      |
  | -------------------- | ------------------------------------------------------------- |
  | `DATABASE_URL`       | PostgreSQL. Sin ella, el servidor solo responde `/health`     |
  | `BETTER_AUTH_SECRET` | Firma las sesiones. Obligatoria en producción                 |
  | `BETTER_AUTH_URL`    | URL pública del servidor                                      |
  | `CORS_ORIGINS`       | Orígenes de la web de Expo en desarrollo, separados por comas |
  | `PORT`, `HOST`       | Puerto (3000) e interfaz (`0.0.0.0`)                          |

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

La pantalla inicial dice si el servidor responde.

## Publicar el servidor (Railway)

El repositorio trae un `Dockerfile` y un `railway.json` (comprobación de salud en
`/health`).

1. En [railway.com](https://railway.com), **New Project → Deploy from GitHub repo** con
   este repositorio, en una región de la UE.
2. **New → Database → Add PostgreSQL**, en la misma región.
3. En el servicio del servidor, **Variables**: `PORT` = `3000`, `DATABASE_URL` como
   referencia a la de PostgreSQL, `BETTER_AUTH_SECRET` (`openssl rand -hex 32`) y
   `BETTER_AUTH_URL` con el dominio público.
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
