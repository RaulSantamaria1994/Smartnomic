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
pnpm --filter @smartnomic/server dev   # http://localhost:3000, se recarga al guardar
```

- `GET /health` responde `{"ok":true}`.
- Variables: `PORT` (3000), `HOST` (`0.0.0.0`) y `CORS_ORIGINS` (orígenes permitidos,
  separados por comas; solo hace falta en desarrollo para la web de Expo, por ejemplo
  `http://localhost:8081`).

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
2. **Variables**: `PORT` = `3000`.
3. **Settings → Networking → Generate Domain** con el puerto `3000`.
4. Comprueba `https://<tu-dominio>/health`.

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
