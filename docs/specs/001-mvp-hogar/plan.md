# Plan de implementación: MVP del hogar

**Rama**: `001-mvp-hogar` | **Fecha**: 2026-10-26 | **Especificación**: [`spec.md`](spec.md)
**Entrada**: especificación de la funcionalidad en `docs/specs/001-mvp-hogar/spec.md`

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`, que
> divide este plan en tareas.

## Resumen

Primer entregable de Smartnomic: un hogar (una o varias personas) apunta ingresos y
gastos, ve el balance de cada periodo, da de alta pagos recurrentes, recibe recordatorios
en Android y comparte el hogar con invitaciones y roles. Funciona en Android y navegador.

Enfoque técnico: monorepo TypeScript con cuatro paquetes. Toda la lógica de dinero,
periodos, recurrencias y avisos vive en un dominio puro y probado (`packages/domain`). Un
servidor Fastify con PostgreSQL es la fuente de verdad y comprueba hogar y rol en cada
petición. Una única app Expo sirve Android y web; en Android programa notificaciones
locales a partir de los vencimientos que calcula el dominio.

Como el repositorio aún no tiene código, este plan incluye también las fundaciones
(monorepo, CI, base de datos y despliegue).

## Contexto técnico

| Campo                        | Valor                                                                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Node 22                                                                                                                                              |
| **Dependencias principales** | Expo + Expo Router, TanStack Query, Zustand, expo-notifications, expo-secure-store; Fastify, Drizzle ORM, Better Auth, zod                                                  |
| **Almacenamiento**           | PostgreSQL 16 (Railway, región UE). En el móvil, caché de TanStack Query persistida                                                                                         |
| **Tests**                    | Vitest. Servidor contra PostgreSQL real en Docker                                                                                                                           |
| **Plataformas**              | Android 10+ (APK con EAS Build) y navegadores actuales (Chrome, Firefox, Safari, Edge) de escritorio y móvil                                                                |
| **Tipo de proyecto**         | App móvil y web + API REST                                                                                                                                                  |
| **Objetivos de rendimiento** | Resumen del periodo en menos de 1 s con 500 movimientos (CE-003); respuestas de la API p95 < 300 ms; cambios visibles para otros miembros en < 5 s tras actualizar (CE-009) |
| **Restricciones**            | Importes en céntimos enteros; fechas sin hora; Android consultable sin conexión; avisos locales sin conexión; datos en la UE; nada personal en los logs                     |
| **Escala**                   | Hasta unos pocos miles de hogares, ~5 miembros por hogar, ~500 movimientos al mes por hogar; unas 15 pantallas                                                              |

## Comprobación de la constitución

_Puerta: debe pasar antes de la investigación y volver a revisarse tras el diseño._

| Artículo                   | Cómo lo cumple este plan                                                                                                                                                          | Estado |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Solo piezas del stack. Dependencias nuevas justificadas en [Seguimiento de complejidad](#seguimiento-de-complejidad): proveedor de email y `@fastify/rate-limit`.                 | ✅     |
| II. Arquitectura por capas | `apps/*` → `packages/api` → `packages/domain`. Periodos, recurrencias, resúmenes y avisos solo en el dominio; la app y el servidor lo reutilizan.                                 | ✅     |
| III. Dinero y fechas       | `amount_cents bigint`, fechas `date` (`YYYY-MM-DD`), `timestamptz` para instantes. Totales calculados con `SUM` sobre movimientos; sin saldos guardados.                          | ✅     |
| IV. Datos y persistencia   | `household_id` en todas las tablas de datos; migraciones de Drizzle; `deleted_at` en movimientos; agregaciones en SQL.                                                            | ✅     |
| V. API                     | Esquemas zod en `packages/api`; validación de toda entrada; formato de error único; idempotencia con id generado en el cliente.                                                   | ✅     |
| VI. Seguridad y privacidad | Comprobación de miembro y rol en un `preHandler` común; sesión en `expo-secure-store` (Android) y cookie segura (web); límite de peticiones en auth; exportar y borrar cuenta.    | ✅     |
| VII. Tests                 | Tests del dominio con casos límite; tests de aislamiento entre hogares y de roles en cada endpoint; servidor contra PostgreSQL real; reloj inyectado.                             | ✅     |
| VIII. Calidad y CI         | `pnpm check` en GitHub Actions; TypeScript `strict`; ESLint y Prettier; textos de la interfaz centralizados.                                                                      | ✅     |
| IX. App y plataformas      | Diferencias en `*.native.ts` / `*.web.ts`; Android con caché persistida y avisos locales; web con vencimientos destacados y cookie `HttpOnly`/`Secure`/`SameSite`; accesibilidad. | ✅     |

Sin incumplimientos. Revisado de nuevo tras el diseño: ✅.

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
docs/specs/001-mvp-hogar/
├── spec.md   # Qué y por qué
├── plan.md   # Este archivo: cómo
└── tasks.md  # Tareas (siguiente paso)
```

La investigación, el modelo de datos, los contratos y la guía de validación van como
secciones de este plan para tenerlo todo en un sitio.

### Código fuente (raíz del repositorio)

```text
package.json                 # scripts: lint, format, typecheck, test, check
pnpm-workspace.yaml
tsconfig.base.json
eslint.config.js
.prettierrc.json
docker-compose.yml           # PostgreSQL para desarrollo y tests
.github/workflows/ci.yml     # pnpm check con servicio PostgreSQL

packages/
├── domain/                  # @smartnomic/domain — puro, sin dependencias de runtime
│   └── src/
│       ├── money.ts         # céntimos: parseo de entrada, suma, validación
│       ├── dates.ts         # fechas civiles YYYY-MM-DD: sumar días/meses, fin de mes
│       ├── periods.ts       # periodo de una fecha según month_start_day
│       ├── recurrence.ts    # vencimientos de una regla entre dos fechas
│       ├── summary.ts       # ingresos, gastos y balance de un periodo
│       ├── reminders.ts     # avisos a programar en una ventana
│       ├── permissions.ts   # qué puede hacer cada rol
│       └── *.test.ts
└── api/                     # @smartnomic/api — contrato app ↔ servidor
    └── src/
        ├── schemas/         # zod: households, members, invitations, categories,
        │                    #      transactions, recurring, occurrences, export
        ├── errors.ts        # códigos de error y formato { error: { code, message } }
        └── routes.ts        # rutas y métodos, compartidos por cliente y servidor

apps/
├── server/                  # @smartnomic/server — Fastify
│   ├── src/
│   │   ├── index.ts         # arranque, /health, estáticos de la web
│   │   ├── auth.ts          # Better Auth (email + contraseña, recuperación)
│   │   ├── db/
│   │   │   ├── schema.ts    # tablas Drizzle
│   │   │   └── migrations/
│   │   ├── plugins/
│   │   │   ├── household-access.ts  # miembro + rol en cada ruta
│   │   │   └── errors.ts            # errores → formato único
│   │   └── routes/          # households, members, invitations, categories,
│   │                        # transactions, recurring, occurrences, export, account
│   └── test/                # integración contra PostgreSQL real
└── mobile/                  # @smartnomic/mobile — Expo (Android + web)
    ├── app/                 # Expo Router
    │   ├── (auth)/          # entrar, registro, recuperar contraseña
    │   ├── (app)/
    │   │   ├── index.tsx            # Mes: resumen, próximos pagos, lista
    │   │   ├── new.tsx              # apuntar movimiento (3 toques)
    │   │   ├── transaction/[id].tsx
    │   │   ├── recurring/           # lista, alta, edición
    │   │   ├── occurrence/[id].tsx  # pagar / omitir
    │   │   ├── household/           # miembros, invitar, ajustes, categorías
    │   │   └── account.tsx          # exportar, borrar cuenta, avisos
    │   └── invite/[code].tsx        # aceptar invitación (enlace)
    └── src/
        ├── api/             # cliente HTTP tipado con packages/api
        ├── session/         # session.native.ts (secure store) / session.web.ts (cookie)
        ├── reminders/       # reminders.native.ts (expo-notifications) / reminders.web.ts (no-op)
        ├── cache/           # persistencia de TanStack Query (solo nativo)
        ├── i18n/es.ts       # textos de la interfaz
        └── components/
```

**Decisión de estructura**: monorepo con dos paquetes compartidos y dos apps, tal como
fija el artículo II. Una sola app Expo para Android y web; lo específico de cada
plataforma vive en `src/session`, `src/reminders` y `src/cache`.

## Fase 0: Investigación y decisiones

| Tema                                | Decisión                                                                                                                                                                                                                                                                                          | Alternativas descartadas                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Fechas civiles                      | Utilidades propias en `domain/dates.ts` sobre cadenas `YYYY-MM-DD` (aritmética de días y meses, último día del mes). El "hoy" del hogar se calcula fuera del dominio con `Intl.DateTimeFormat` y la zona horaria del hogar.                                                                       | `Date` (arrastra hora y zona); date-fns-tz (dependencia para algo pequeño); Temporal (aún no disponible en Node 22 sin flag)              |
| Recurrencias                        | Implementación propia en `domain/recurrence.ts` para semanal, mensual, cada N meses y anual, con ajuste al último día del mes.                                                                                                                                                                    | `rrule` (cubre mucho más de lo necesario y trabaja con `Date`)                                                                            |
| Vencimientos                        | Se calculan al vuelo con el dominio. Solo se guarda una fila en `occurrences` cuando se pagan u omiten, con clave única `(recurring_id, due_date)`.                                                                                                                                               | Generar filas por adelantado (quedan obsoletas al editar la regla)                                                                        |
| Editar una regla                    | Cambiar el importe, el nombre o el aviso no toca el calendario. Cambiar el día, la frecuencia o el inicio hace que la regla empiece hoy (si empezaba antes): así los vencimientos ya pagados con el día anterior no reaparecen como pendientes.                                                   | Versionar las reglas (más tablas y lógica para el MVP)                                                                                    |
| Reloj del servidor                  | `buildServer({ now })`: los tests fijan la hora (art. VII.5); en producción, `new Date()`.                                                                                                                                                                                                        | Leer el reloj en cada ruta (tests dependientes de la fecha real)                                                                          |
| Idempotencia (RF-015)               | El cliente genera el `id` (UUIDv7) de cada movimiento; el servidor inserta con `ON CONFLICT (id) DO NOTHING` y devuelve el existente. Pagar un vencimiento usa la clave única de `occurrences` dentro de una transacción.                                                                         | Cabecera `Idempotency-Key` con tabla aparte (más piezas para el mismo resultado)                                                          |
| Ediciones simultáneas               | Gana el último cambio. La respuesta de cada escritura devuelve el registro actualizado y la app invalida la caché.                                                                                                                                                                                | Bloqueo optimista con versión (más fricción para el usuario en el MVP)                                                                    |
| Autenticación                       | Better Auth con email y contraseña, recuperación por email y el plugin de Expo: token en `expo-secure-store` en Android y cookie `HttpOnly`/`Secure`/`SameSite=Lax` en web.                                                                                                                       | Auth propia (riesgo); proveedores externos (Auth0, Clerk) (coste y datos fuera)                                                           |
| Web y API en el mismo origen        | El servidor Fastify sirve la web exportada (`expo export -p web`) en `/` y la API en `/api`. Así la cookie es del mismo sitio y no hace falta CORS.                                                                                                                                               | Servicio aparte para la web (CORS y cookies entre dominios)                                                                               |
| Envío de emails                     | **Brevo** (empresa francesa, datos en la UE, plan gratuito) con su API transaccional, llamada con `fetch` sin SDK. El enlace caduca en una hora y el envío no se espera, para que la respuesta tarde lo mismo exista o no la cuenta.                                                              | Resend (guarda los datos en EE. UU.: choca con el art. VI.6); SMTP propio (entregabilidad); sin recuperación (la especificación la exige) |
| Recordatorios en Android            | `expo-notifications` con disparador de fecha. Ventana de 60 días, con tope de 50 avisos programados; se reprograma todo al abrir la app, al volver a primer plano y tras cada cambio. Hora del aviso en la zona local del dispositivo. Se pide el permiso de alarmas exactas para cumplir CE-005. | Push desde el servidor (necesita conexión; queda para más adelante)                                                                       |
| Avisos tras pagos de otros miembros | Al reprogramar se descartan los vencimientos pagados u omitidos conocidos. Se refresca al abrir la app y al volver a primer plano.                                                                                                                                                                | Tiempo real con WebSocket (fuera del MVP según la especificación)                                                                         |
| Sin conexión (Android)              | TanStack Query con persistencia en AsyncStorage de los datos consultados (nunca la sesión). Las escrituras sin conexión se rechazan con aviso y el formulario conserva lo escrito.                                                                                                                | Cola de escrituras sin conexión (fuera del MVP)                                                                                           |
| Exportación (RF-038)                | `GET /api/households/:id/export` devuelve un JSON con hogar, miembros (solo nombres), categorías, movimientos, pagos recurrentes y vencimientos resueltos.                                                                                                                                        | CSV por tabla en un ZIP (más trabajo; queda para una funcionalidad posterior)                                                             |
| Borrado de cuenta (RF-039)          | Borra usuario, sesiones y membresía. Los movimientos que apuntó se conservan con `member_id = NULL` ("antiguo miembro"). Si es el único miembro, se borra el hogar entero. Si es propietario con más miembros, el servidor lo rechaza hasta que pase la propiedad.                                | Anonimizar en lugar de borrar (no basta para el RGPD)                                                                                     |
| Límite de peticiones                | `@fastify/rate-limit` en `/api/auth/*` (10 por minuto e IP) y en aceptar invitaciones.                                                                                                                                                                                                            | Sin límite (lo prohíbe el art. VI)                                                                                                        |
| Despliegue                          | Railway: un servicio Docker con el servidor y la web, y PostgreSQL gestionado, en región UE. APK con EAS Build (perfil `preview`).                                                                                                                                                                | —                                                                                                                                         |

## Fase 1: Diseño

### Modelo de datos

Todas las tablas de datos del hogar llevan `household_id`. Importes en `bigint` (céntimos),
fechas de calendario en `date` e instantes en `timestamptz` (UTC).

| Tabla                                            | Campos                                                                                                                                                                                                                                                               | Restricciones                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `users`, `sessions`, `accounts`, `verifications` | Gestionadas por Better Auth (email, nombre, hash de contraseña, sesiones)                                                                                                                                                                                            | Email único                                                                              |
| `households`                                     | `id`, `name`, `currency` (`'EUR'`), `month_start_day` (1–28), `timezone` (IANA), `created_at`                                                                                                                                                                        | `month_start_day BETWEEN 1 AND 28`                                                       |
| `members`                                        | `id`, `household_id`, `user_id`, `role` (`owner`/`editor`/`viewer`), `reminders_enabled`, `reminder_time` (`'09:00'`), `joined_at`                                                                                                                                   | `user_id` único (un hogar por usuario); un solo `owner` por hogar (índice único parcial) |
| `invitations`                                    | `id`, `household_id`, `role` (`editor`/`viewer`), `code` (8 caracteres), `token` (para el enlace), `status` (`pending`/`used`/`revoked`), `expires_at`, `created_by`, `used_by`                                                                                      | `code` y `token` únicos; caducan a los 7 días                                            |
| `categories`                                     | `id`, `household_id`, `kind` (`income`/`expense`), `name`, `icon`, `color`, `archived_at`                                                                                                                                                                            | Nombre único por hogar y tipo entre las no archivadas                                    |
| `transactions`                                   | `id` (UUIDv7 del cliente), `household_id`, `kind`, `amount_cents` (> 0), `date`, `category_id`, `member_id` (nullable), `note`, `recurring_id`, `occurrence_due_date`, `created_at`, `updated_at`, `deleted_at`                                                      | `amount_cents > 0`; categoría del mismo hogar y tipo; índice `(household_id, date)`      |
| `recurring_rules`                                | `id`, `household_id`, `kind`, `name`, `amount_cents`, `category_id`, `frequency` (`weekly`/`monthly`/`yearly`), `interval` (≥ 1), `day_of_month` (1–31), `weekday` (0–6), `month_of_year` (1–12), `start_date`, `end_date`, `remind_days_before` (0/1/3/7), `active` | Campos de día coherentes con la frecuencia (`CHECK`)                                     |
| `occurrences`                                    | `recurring_id`, `household_id`, `due_date`, `status` (`paid`/`skipped`), `transaction_id`, `resolved_by` (member, nullable), `resolved_at`                                                                                                                           | Clave primaria `(recurring_id, due_date)`                                                |

Estados y transiciones:

- **Vencimiento**: _pendiente_ (calculado, sin fila) → _pagado_ (fila + movimiento) u
  _omitido_ (fila sin movimiento). Un vencimiento resuelto no vuelve a pendiente en el MVP.
- **Invitación**: _pendiente_ → _usada_ o _anulada_; _caducada_ se deduce de `expires_at`.
- **Movimiento**: activo → borrado (`deleted_at`) → restaurado (deshacer) o borrado
  definitivo al borrar el hogar.

### Contratos de la API

Todas las rutas bajo `/api`. Las de hogar exigen sesión y pertenencia; la columna "Rol"
indica el mínimo. Errores: `{ "error": { "code", "message" } }` con 400 (validación),
401 (sin sesión), 403 (rol o hogar ajeno), 404, 409 (conflicto) y 429 (límite).

| Método y ruta                                                       | Rol             | Uso                                                              | RF            |
| ------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------- | ------------- |
| `POST /api/auth/*`                                                  | —               | Registro, entrar, salir, recuperar contraseña (Better Auth)      | 001           |
| `GET /api/me`                                                       | sesión          | Usuario, hogar y rol actuales                                    | 002           |
| `GET /api/households/:id`                                           | lector          | Datos y ajustes del hogar                                        | —             |
| `PATCH /api/households/:id`                                         | propietario     | Nombre y `month_start_day`                                       | 003           |
| `GET /api/households/:id/members`                                   | lector          | Miembros y roles                                                 | 009           |
| `PATCH /api/households/:id/members/:memberId`                       | propietario     | Cambiar rol                                                      | 005           |
| `DELETE /api/households/:id/members/:memberId`                      | propietario     | Quitar miembro                                                   | 005           |
| `POST /api/households/:id/transfer-ownership`                       | propietario     | Pasar la propiedad                                               | 005, 039      |
| `POST /api/households/:id/leave`                                    | editor/lector   | Salir del hogar (se crea uno propio vacío)                       | 007           |
| `PATCH /api/households/:id/members/me`                              | lector          | Activar o desactivar mis avisos                                  | 031           |
| `GET/POST /api/households/:id/invitations`                          | propietario     | Listar y crear invitaciones                                      | 004           |
| `DELETE /api/households/:id/invitations/:invId`                     | propietario     | Anular invitación                                                | 005           |
| `GET /api/invitations/:code`                                        | sesión          | Ver a qué hogar invita y si el usuario perdería datos            | 008           |
| `POST /api/invitations/:code/accept`                                | sesión          | Aceptar (con `confirmLeaveCurrent` si hay datos)                 | 004, 008      |
| `GET/POST /api/households/:id/categories`                           | lector / editor | Listar y crear categorías                                        | 020, 021      |
| `PATCH /api/households/:id/categories/:catId`                       | editor          | Renombrar, archivar o restaurar                                  | 021           |
| `GET /api/households/:id/periods/:start`                            | lector          | Resumen y movimientos del periodo que empieza en `:start`        | 016–019       |
| `PUT /api/households/:id/transactions/:txId`                        | editor          | Crear o editar (idempotente por `id`)                            | 011, 013, 015 |
| `DELETE /api/households/:id/transactions/:txId`                     | editor          | Borrado lógico                                                   | 011, 014      |
| `POST /api/households/:id/transactions/:txId/restore`               | editor          | Deshacer el borrado                                              | 014           |
| `GET /api/households/:id/recurring`                                 | lector          | Listar pagos recurrentes                                         | 022           |
| `PUT/DELETE /api/households/:id/recurring/:ruleId`                  | editor          | Crear o editar (idempotente por UUIDv7), desactivar o borrar     | 022, 027      |
| `GET /api/households/:id/upcoming?days`                             | lector          | Vencimientos pendientes: atrasados y de los próximos días (0–60) | 023, 036      |
| `POST /api/households/:id/recurring/:ruleId/occurrences/:date/pay`  | editor          | Pagar con importe y fecha reales (crea movimiento)               | 024, 015      |
| `POST /api/households/:id/recurring/:ruleId/occurrences/:date/skip` | editor          | Omitir                                                           | 025           |
| `GET /api/households/:id/export`                                    | lector          | Exportación completa en JSON                                     | 038           |
| `DELETE /api/account`                                               | sesión          | Borrar la cuenta (409 si es propietario con más miembros)        | 039           |

### Funciones del dominio

| Función                                                         | Devuelve                                                     | Cubre            |
| --------------------------------------------------------------- | ------------------------------------------------------------ | ---------------- |
| `parseAmount(input: string): Result<Cents>`                     | Céntimos o error (vacío, cero, negativo, más de 2 decimales) | RF-013           |
| `periodOf(date, monthStartDay): Period`                         | `{ start, end }` del periodo que contiene la fecha           | RF-019           |
| `shiftPeriod(period, n, monthStartDay): Period`                 | Periodo anterior o siguiente                                 | RF-017           |
| `summarize(transactions): Summary`                              | Ingresos, gastos y balance en céntimos                       | RF-016, 018      |
| `occurrencesBetween(rule, from, to): DateString[]`              | Fechas de vencimiento, con ajuste a fin de mes               | RF-026           |
| `upcoming(rules, resolved, today, days): Occurrence[]`          | Pendientes y atrasados en la ventana                         | RF-023, 036      |
| `remindersToSchedule(occurrences, settings, today): Reminder[]` | Avisos (antelación y mismo día) a la hora indicada, con tope | RF-029, 030, 033 |
| `can(role, action): boolean`                                    | Permisos por rol                                             | RF-006           |

### Guía de validación (quickstart)

Para comprobar el MVP de punta a punta:

1. `docker compose up -d` y `pnpm install`.
2. `pnpm --filter @smartnomic/server db:migrate` y `pnpm --filter @smartnomic/server dev`.
3. `pnpm --filter @smartnomic/mobile web` en el navegador, y en un Android con Expo
   (`pnpm --filter @smartnomic/mobile start`) o con el APK.
4. Recorrer en orden las historias de la especificación:
   1. Registrarse y apuntar un ingreso de 1.800 € y gastos por 1.234,56 €: el balance es
      565,44 €.
   2. Crear "Alquiler" el día 31 y comprobar el vencimiento de febrero; pagar "Luz" con
      67,12 €.
   3. Crear un pago para mañana con aviso de 1 día y hora dentro de 2 minutos; poner el
      móvil en modo avión y comprobar que llega el aviso.
   4. Invitar a una segunda cuenta como editor desde el navegador; aceptar en Android;
      apuntar un gasto en cada lado y verlo en el otro al actualizar; probar que un lector
      no puede editar.
   5. Cambiar el inicio de mes al 25, archivar una categoría, exportar y borrar la cuenta
      de prueba.

## Orden de implementación

Cada bloque termina con `pnpm check` en verde y algo demostrable. `tasks.md` lo detallará.

1. **Fundaciones**: monorepo, TypeScript, ESLint, Prettier, Vitest, CI con PostgreSQL,
   `docker-compose.yml`, esqueletos de los cuatro paquetes, `/health`, Dockerfile y
   despliegue en Railway.
2. **Base común**: dominio (`money`, `dates`, `periods`, `permissions`) con tests;
   esquema y primera migración; Better Auth; plugin de acceso por hogar y rol; formato
   de errores; creación del hogar al registrarse; cliente de API y sesión en la app.
3. **Historia 1 (P1)**: categorías predefinidas, movimientos, resumen del periodo,
   navegación entre periodos, deshacer borrado, caché sin conexión en Android.
4. **Historia 2 (P2)**: recurrencias en el dominio, pagos recurrentes, próximos pagos,
   pagar y omitir.
5. **Historia 3 (P3)**: `remindersToSchedule`, avisos locales en Android, permisos,
   abrir el vencimiento desde el aviso, vencimientos destacados en web.
6. **Historia 4 (P4)**: invitaciones, aceptar con aviso de pérdida de datos, roles,
   quitar, salir y pasar la propiedad, autor de cada movimiento.
7. **Historia 5 (P5)**: ajustes del hogar, categorías propias, exportar, borrar cuenta.
8. **Cierre**: guía de validación completa, accesibilidad, APK de prueba y despliegue.

## Riesgos

| Riesgo                                                | Mitigación                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Android retrasa o descarta avisos (ahorro de batería) | Alarmas exactas con permiso, reprogramar al abrir, aviso en la app si faltan permisos         |
| Better Auth con Expo web y nativo a la vez            | Prototipo de sesión en ambas plataformas en el bloque 2, antes de las historias               |
| Datos de la caché sin cifrar en el móvil              | Solo se guardan datos consultados, nunca la sesión; cifrado de la caché como mejora posterior |
| Cálculo de periodos y recurrencias con fechas límite  | Tests exhaustivos en el dominio (fin de mes, bisiestos, `month_start_day` 28)                 |

## Seguimiento de complejidad

No hay incumplimientos de la constitución. Dependencias nuevas fuera de la tabla del
stack, justificadas según el artículo I.2:

| Dependencia                | Por qué hace falta                                | Alternativa descartada                                                          |
| -------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Proveedor de email (Brevo) | Recuperar la contraseña (RF-001)                  | Resend (datos en EE. UU.); SMTP propio: peor entregabilidad y más mantenimiento |
| `@fastify/rate-limit`      | Límite de peticiones en autenticación (art. VI.5) | Implementarlo a mano                                                            |
| `@better-auth/expo`        | Sesión de Better Auth en la app nativa            | Gestionar tokens a mano                                                         |
| `uuid` (v7)                | Ids generados en el cliente para la idempotencia  | `crypto.randomUUID` (v4, sin orden temporal)                                    |

## Decisiones confirmadas

- **Recordatorios (2026-10-27):** la hora de los avisos es de cada miembro
  (`members.reminder_time`, junto a `reminders_enabled`) y no del hogar: cada persona elige
  la suya (RF-031). El permiso de alarmas exactas se declara en `app.json`; si Android no
  lo concede, los avisos pueden llegar con algunos minutos de retraso.

- **Pagos recurrentes (2026-10-27):** crear y editar con `PUT` e id generado en la app,
  igual que los movimientos (art. V.5), en lugar de `POST` + `PATCH`. Los vencimientos
  pendientes se piden con `GET /upcoming` en lugar de `GET /occurrences?from&to`, que el
  MVP no necesita. La relación movimiento ↔ vencimiento se guarda en
  `occurrences.transaction_id` (sin `recurring_id` en `transactions`).

- **Proveedor de email (2026-10-27):** Brevo. Se descartó Resend porque guarda en EE. UU.
  los destinatarios y los registros de envío. Antes de publicar, revisar la lista de
  subencargados y el DPA de Brevo.
