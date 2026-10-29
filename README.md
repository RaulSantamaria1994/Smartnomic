# Smartnomic

App para que un hogar apunte sus ingresos y gastos mensuales, entienda en qué se va el
dinero y reciba recordatorios antes de cada pago. Funciona en Android y en el navegador.

- Reglas técnicas: [`docs/CONSTITUTION.md`](docs/CONSTITUTION.md)
- Especificación, plan y tareas de cada funcionalidad: [`docs/specs/`](docs/specs/)
- Forma de trabajar (personas y agentes): [`AGENTS.md`](AGENTS.md)

**Estado:** el MVP (`docs/specs/001-mvp-hogar`) está completo y desplegado en Railway, y el
calendario de pagos programados (`docs/specs/002-calendario`), el diseño visual «Calma»
(`docs/specs/003-diseno-visual`) y los iconos de categoría (`docs/specs/004-iconos-categorias`)
también están terminados.
Queda probarlo en Android con el APK y medir con personas los criterios que lo necesitan
(ver «Resultado de los criterios de éxito» en su `plan.md`).

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
- `PATCH /api/households/:id`: nombre e inicio de mes (solo el propietario).
- `GET|POST /api/households/:id/categories` y `PATCH …/categories/:catId`: categorías del
  hogar; crear, renombrar, archivar y restaurar.
- `GET /api/households/:id/export`: todos los datos del hogar en JSON.
- `DELETE /api/account`: borrar la cuenta, confirmando con la contraseña.
- `PUT|DELETE /api/households/:id/transactions/:txId` y `POST …/restore`: apuntar o
  editar (idempotente por el UUIDv7 que genera la app), borrar y deshacer.
- `GET /api/households/:id/periods/:start`: resumen y movimientos de un periodo.
- `GET|PUT|DELETE /api/households/:id/recurring[/:ruleId]`: pagos y cobros recurrentes.
- `GET /api/households/:id/upcoming?days=30`: vencimientos atrasados y próximos.
- `GET /api/households/:id/calendar/:month` (`YYYY-MM`): vencimientos de un mes natural con
  su estado, importe real de los pagados y totales; desde el pago más antiguo hasta 12
  meses vista.
- `PATCH /api/households/:id/members/me`: mis avisos (activados y hora).
- `GET /api/households/:id/members`, `PATCH|DELETE …/members/:memberId`, `POST …/leave` y
  `POST …/transfer-ownership`: miembros, roles, quitar, salir y pasar la propiedad.
- `GET|POST /api/households/:id/invitations` y `DELETE …/invitations/:invId`: invitaciones
  (caducan a los 7 días). `GET /api/invitations/:code` y `POST …/accept`: ver y aceptar una
  invitación (limitado a 20 peticiones por minuto e IP).
- `POST …/recurring/:ruleId/occurrences/:fecha/pay|skip`: pagar (crea el movimiento con
  el importe real) u omitir un vencimiento.
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
los **próximos pagos** (con los atrasados), la lista de movimientos y el botón
**Apuntar**. Desde «Próximos pagos → Gestionar» se dan de alta los pagos recurrentes.

**Recordatorios**: en Android, la app programa avisos locales (con la antelación de cada
pago y el mismo día, a la hora elegida en **Ajustes**) que llegan aunque no haya conexión;
al tocar uno se abre el vencimiento. En el navegador no hay avisos: la pantalla principal
destaca los pagos atrasados y los que vencen en los próximos 3 días. Los avisos solo se
pueden probar en un APK o en un build de desarrollo, no en Expo Go. En Android los últimos datos se guardan
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

## APK de Android

### Con GitHub Actions

El flujo `.github/workflows/android.yml` compila el APK en las máquinas de GitHub (sin
cuenta de Expo) en cada fusión a `main` y cuando se lanza a mano: **Actions → APK de
Android → Run workflow**. Tarda unos 20 minutos; el APK se descarga en la ejecución, en
**Artifacts** (`smartnomic-<número>`, un zip con `app-release.apk`). Cada ejecución sube el
número de versión, así que se instala encima del anterior.

La dirección del servidor va en el propio flujo (`EXPO_PUBLIC_API_URL`), igual que en
`apps/mobile/eas.json`; si cambias de dominio, cámbiala en los dos.

**Firma.** Sin más, el APK se firma con la clave de depuración de la plantilla de Expo:
vale para probar, no para publicar en Google Play. Para usar una clave propia, créala una
vez y guárdala en **Settings → Secrets and variables → Actions** (nunca en el repositorio):

```sh
keytool -genkeypair -v -keystore smartnomic.jks -alias smartnomic \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 smartnomic.jks   # valor de ANDROID_KEYSTORE_BASE64
```

Secretos: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`
(`smartnomic`) y `ANDROID_KEY_PASSWORD`. Guarda la clave en un sitio seguro: sin ella no se
pueden publicar actualizaciones. Al cambiar de clave hay que desinstalar la app una vez.

### Con EAS Build

El APK se compila en los servidores de Expo, que no ven las variables de tu terminal: la
dirección del servidor va en `apps/mobile/eas.json` (`build.preview.env.EXPO_PUBLIC_API_URL`).

```sh
npm install -g eas-cli
cd apps/mobile
eas login
eas init      # solo la primera vez: enlaza el proyecto y añade su id a app.json
eas build --platform android --profile preview
```

Al terminar, EAS da un enlace y un QR para descargar el APK en el móvil.

## Diseño

El aspecto de la app («Calma»: verde pino, fondo arena, Plus Jakarta Sans) sale de los tokens
y componentes de `apps/mobile/src/design/`. Las pantallas no usan colores ni tamaños de letra
sueltos: ESLint lo impide fuera de esa carpeta. Los tests de `color.test.ts` comprueban el
contraste WCAG de los tokens.

La app no usa emoji (`noEmoji.test.ts` lo comprueba). Las categorías guardan un identificador
del catálogo de `packages/domain/src/categoryIcons.ts`, y la app lo dibuja con Material
Community Icons (`src/design/categoryGlyphs.ts`) y lo nombra en `src/i18n/es.ts`. Para
añadir un icono: identificador en el catálogo, glifo y nombre (el compilador avisa si falta
alguno). La migración `0005` no se toca: ya está aplicada.

## Icono y pantalla de carga

Se generan a partir de la imagen original del icono, `apps/mobile/assets/source/icon.jpg`:
el script quita el fondo crema y compone cada tamaño (necesita Playwright con Chromium):

```sh
node apps/mobile/scripts/make-icons.cjs   # crea apps/mobile/assets/*.png
```

## Estructura

| Carpeta           | Qué contiene                                                    |
| ----------------- | --------------------------------------------------------------- |
| `packages/domain` | Lógica de negocio pura (dinero, periodos, recurrencias, avisos) |
| `packages/api`    | Contrato app ↔ servidor (esquemas zod)                          |
| `apps/server`     | API REST con Fastify                                            |
| `apps/mobile`     | App Expo para Android y web                                     |
| `docs/`           | Constitución y especificaciones                                 |
