# Tareas: MVP del hogar

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/001-mvp-hogar/`
**Requisitos previos**: especificación y plan aprobados.

**Tests**: obligatorios según la constitución (art. VII). En cada historia, los tests se
escriben primero y deben fallar antes de implementar.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]…[US5]**: historia de la especificación a la que pertenece.
- Cada tarea indica los archivos que toca. Se marca `[x]` al terminarla, con `pnpm check`
  en verde.

---

## Fase 1: Preparación (monorepo)

**Objetivo**: un repositorio que compila, pasa el CI y arranca un servidor y una app
vacíos.

- [x] T001 Crear el monorepo: `package.json` (scripts `lint`, `format`, `format:check`,
      `typecheck`, `test`, `check`), `pnpm-workspace.yaml`, `.nvmrc` (22) y `.gitignore`
- [x] T002 [P] Configurar TypeScript estricto en `tsconfig.base.json`
- [x] T003 [P] Configurar ESLint en `eslint.config.js` (prohíbe `any` y `@ts-ignore`) y
      Prettier en `.prettierrc.json` y `.prettierignore`
- [x] T004 [P] Configurar Vitest en `vitest.config.ts` (proyectos por paquete)
- [x] T005 [P] Crear `packages/domain` (`@smartnomic/domain`) con `package.json`,
      `tsconfig.json` y `src/index.ts`; regla de ESLint que le impide importar React,
      Fastify, Drizzle o módulos de Node
- [x] T006 [P] Crear `packages/api` (`@smartnomic/api`) con zod y `src/index.ts`
- [x] T007 [P] Crear `apps/server` (`@smartnomic/server`) con Fastify, `GET /health` en
      `src/index.ts` y script `dev`
- [x] T008 [P] Crear `apps/mobile` (`@smartnomic/mobile`) con Expo, Expo Router y
      soporte web; pantalla inicial en `app/index.tsx` que llama a `/health`
- [x] T009 Añadir `docker-compose.yml` con PostgreSQL 16 para desarrollo y tests
- [x] T010 Crear `.github/workflows/ci.yml`: Node 22, pnpm, servicio PostgreSQL y
      `pnpm check`
- [x] T011 [P] Añadir `Dockerfile` del servidor y `railway.json` con comprobación en
      `/health` (la web exportada se añade a la imagen en T031)
- [x] T012 [P] Añadir `apps/mobile/eas.json` con el perfil `preview` (APK)
- [x] T013 Actualizar `README.md` y la sección de comandos de `AGENTS.md`

**Punto de control**: `pnpm check` pasa en local y en el CI; la app (Android y web)
muestra la respuesta de `/health`.

---

## Fase 2: Base común (bloquea todas las historias)

**Objetivo**: dominio básico, base de datos, autenticación, acceso por hogar y rol, y
cliente de la API en la app.

**⚠️ Ninguna historia puede empezar hasta terminar esta fase.**

### Dominio

- [x] T014 [P] Tests de `parseAmount` (vacío, cero, negativo, más de 2 decimales, comas y
      puntos, importes grandes) en `packages/domain/src/money.test.ts`
- [x] T015 [P] Implementar céntimos y `parseAmount` en `packages/domain/src/money.ts`
- [x] T016 [P] Tests de fechas civiles (sumar días y meses, fin de mes, bisiestos,
      comparar) en `packages/domain/src/dates.test.ts`
- [x] T017 [P] Implementar fechas civiles `YYYY-MM-DD` en `packages/domain/src/dates.ts`
- [x] T018 [P] Tests de `can(role, action)` para propietario, editor y lector en
      `packages/domain/src/permissions.test.ts`
- [x] T019 [P] Implementar roles y permisos en `packages/domain/src/permissions.ts`

### Contrato de la API

- [x] T020 [P] Definir el formato de error y sus códigos en `packages/api/src/errors.ts`
- [x] T021 [P] Definir esquemas zod comunes (ids UUIDv7, fecha, céntimos, rol) en
      `packages/api/src/schemas/common.ts`

### Servidor

- [x] T022 Configurar Drizzle y el esquema de `households` y `members` (un hogar por
      usuario, un solo propietario) en `apps/server/src/db/schema.ts`; primera migración
      en `apps/server/src/db/migrations/`
- [x] T023 Integrar Better Auth (email y contraseña, recuperación, plugin de Expo, cookie
      `HttpOnly`/`Secure`/`SameSite=Lax`) en `apps/server/src/auth.ts` y migración de
      sus tablas
- [x] T024 Configurar el envío de emails (Brevo) en
      `apps/server/src/email.ts`, sin escribir emails en los logs
- [x] T025 Añadir `@fastify/rate-limit` a `/api/auth/*` en `apps/server/src/index.ts`
- [x] T026 Crear el plugin de errores (zod → 400, formato único) en
      `apps/server/src/plugins/errors.ts`
- [x] T027 Crear el plugin `household-access` (sesión, pertenencia y rol mínimo por
      ruta) en `apps/server/src/plugins/household-access.ts`
- [x] T028 Crear el hogar del usuario al registrarse (propietario, EUR, día 1, zona del
      dispositivo) y `GET /api/me` en `apps/server/src/routes/me.ts`
- [x] T029 Preparar los tests de integración (base de datos limpia por test, usuarios y
      hogares de prueba, reloj inyectado) en `apps/server/test/setup.ts`
- [x] T030 Tests de registro, entrada, `GET /api/me` y límite de peticiones en
      `apps/server/test/auth.test.ts`
- [x] T031 Servir la web exportada en `/` desde el servidor en `apps/server/src/index.ts`
      y añadir la exportación de la web al `Dockerfile`

### App

- [x] T032 [P] Crear el cliente HTTP tipado con `@smartnomic/api` en
      `apps/mobile/src/api/client.ts`
- [x] T033 [P] Sesión por plataforma en `apps/mobile/src/session/session.native.ts`
      (`expo-secure-store`) y `apps/mobile/src/session/session.web.ts` (cookie)
- [x] T034 [P] Textos de la interfaz en `apps/mobile/src/i18n/es.ts`
- [x] T035 Pantallas de entrar, registro y recuperar contraseña en `apps/mobile/app/(auth)/`
- [x] T036 Prototipo de sesión en Android y en web de punta a punta (riesgo del plan)

**Punto de control**: un usuario se registra en Android o web, entra con su hogar creado y
las peticiones de otro hogar devuelven 403.

---

## Fase 3: Historia 1 — Apuntar ingresos y gastos y ver cómo va el mes (P1) 🎯 MVP

**Objetivo**: apuntar, editar y borrar movimientos y ver el resumen exacto de cada
periodo.

**Prueba independiente**: crear una cuenta, apuntar un ingreso y varios gastos, y
comprobar que el resumen cuadra al céntimo y que se puede navegar entre periodos.

### Tests de la historia 1

- [x] T037 [P] [US1] Tests de `periodOf` y `shiftPeriod` (inicio 1 y 25, 28 en febrero,
      cambio de año) en `packages/domain/src/periods.test.ts`
- [x] T038 [P] [US1] Tests de `summarize` (1.800 € − 1.234,56 € = 565,44 €; vacío; solo
      ingresos) en `packages/domain/src/summary.test.ts`
- [x] T039 [P] [US1] Tests de movimientos: crear, editar, borrar, restaurar, idempotencia
      por `id`, importes inválidos, categoría de otro hogar, lector sin permiso y acceso
      desde otro hogar en `apps/server/test/transactions.test.ts`
- [x] T040 [P] [US1] Tests del resumen de periodo (totales en SQL iguales a la suma de la
      lista, movimientos borrados excluidos) en `apps/server/test/periods.test.ts`

### Implementación de la historia 1

- [x] T041 [P] [US1] Implementar `periodOf` y `shiftPeriod` en
      `packages/domain/src/periods.ts`
- [x] T042 [P] [US1] Implementar `summarize` en `packages/domain/src/summary.ts`
- [x] T043 [P] [US1] Esquemas zod de categorías, movimientos y periodo en
      `packages/api/src/schemas/`
- [x] T044 [US1] Tablas `categories` y `transactions` (índice `(household_id, date)`,
      `amount_cents > 0`, `deleted_at`) y migración en `apps/server/src/db/schema.ts`
- [x] T045 [US1] Crear las categorías predefinidas al crear un hogar en
      `apps/server/src/routes/me.ts`
- [x] T046 [US1] `GET /api/households/:id/categories` en
      `apps/server/src/routes/categories.ts`
- [x] T047 [US1] `PUT` y `DELETE /transactions/:txId` y `POST …/restore` en
      `apps/server/src/routes/transactions.ts`
- [x] T048 [US1] `GET /api/households/:id/periods/:start` con totales en SQL en
      `apps/server/src/routes/periods.ts`
- [x] T049 [US1] Pantalla "Mes" (resumen, lista, cambiar de periodo, estado vacío) en
      `apps/mobile/app/(app)/index.tsx`
- [x] T050 [US1] Apuntar en 3 toques (importe → categoría → guardar, fecha de hoy, id
      UUIDv7, conserva lo escrito si falla) en `apps/mobile/app/(app)/new.tsx`
- [x] T051 [US1] Editar y borrar con "Deshacer" en
      `apps/mobile/app/(app)/transaction/[id].tsx`
- [x] T052 [US1] Caché persistida de TanStack Query solo en nativo en
      `apps/mobile/src/cache/cache.native.ts` y `cache.web.ts`; aviso de "sin conexión" al
      guardar

**Punto de control**: la historia 1 funciona sola en Android y web; RF-011…RF-020 y
RF-037 cubiertos.

---

## Fase 4: Historia 2 — Pagos recurrentes (P2)

**Objetivo**: dar de alta pagos y cobros que se repiten, ver los próximos y marcarlos como
pagados u omitidos.

**Prueba independiente**: crear un pago mensual el día 31 y uno anual, ver sus
vencimientos y pagar uno con un importe distinto del previsto.

### Tests de la historia 2

- [x] T053 [P] [US2] Tests de `occurrencesBetween` (semanal, mensual, cada N meses,
      anual, día 31 en meses cortos, 29 de febrero, inicio y fin) en
      `packages/domain/src/recurrence.test.ts`
- [x] T054 [P] [US2] Tests de `upcoming` (30 días, atrasados, resueltos excluidos) en
      `packages/domain/src/upcoming.test.ts`
- [x] T055 [P] [US2] Tests de pagos recurrentes: crear, editar (solo futuros), desactivar,
      borrar conservando movimientos, pagar con importe real, omitir, doble pago
      simultáneo crea un solo gasto, permisos y otro hogar en
      `apps/server/test/recurring.test.ts`

### Implementación de la historia 2

- [x] T056 [P] [US2] Implementar `occurrencesBetween` en
      `packages/domain/src/recurrence.ts`
- [x] T057 [P] [US2] Implementar `upcoming` en `packages/domain/src/upcoming.ts`
- [x] T058 [P] [US2] Esquemas zod de pagos recurrentes y vencimientos en
      `packages/api/src/schemas/recurring.ts`
- [x] T059 [US2] Tablas `recurring_rules` (con `CHECK` por frecuencia) y `occurrences`
      (clave `(recurring_id, due_date)`) y migración en `apps/server/src/db/schema.ts`
- [x] T060 [US2] Rutas de pagos recurrentes en `apps/server/src/routes/recurring.ts`
- [x] T061 [US2] `GET /upcoming` y `pay`/`skip` en una transacción en
      `apps/server/src/routes/recurring.ts`
- [x] T062 [US2] Pantallas de lista, alta y edición en
      `apps/mobile/app/(app)/recurring/`
- [x] T063 [US2] "Próximos pagos" en la pantalla "Mes" en
      `apps/mobile/app/(app)/index.tsx`
- [x] T064 [US2] Pagar u omitir un vencimiento en
      `apps/mobile/app/(app)/occurrence/[ruleId]/[dueDate].tsx`

**Punto de control**: historias 1 y 2 funcionan; RF-022…RF-028 cubiertos.

---

## Fase 5: Historia 3 — Recordatorios de pagos (P3)

**Objetivo**: avisos locales en Android que llegan sin conexión y vencimientos destacados
en web.

**Prueba independiente**: un pago que vence mañana genera el aviso a la hora configurada
con el móvil en modo avión, y al tocarlo se abre el vencimiento.

### Tests de la historia 3

- [x] T065 [P] [US3] Tests de `remindersToSchedule` (antelación 0/1/3/7, mismo día,
      resueltos excluidos, hora configurada, cambio de hora, tope de 50, avisos
      desactivados) en `packages/domain/src/reminders.test.ts`
- [x] T066 [P] [US3] Tests de `reminder_time` y de activar o desactivar avisos por
      miembro en `apps/server/test/reminders.test.ts`

### Implementación de la historia 3

- [x] T067 [P] [US3] Implementar `remindersToSchedule` en
      `packages/domain/src/reminders.ts`
- [x] T068 [US3] Campos `reminders_enabled` y `reminder_time` en `members` (cada miembro
      elige su hora) y `PATCH /members/me` en `apps/server/src/routes/members.ts`
- [x] T069 [US3] Programar avisos con `expo-notifications` (al abrir, al volver a primer
      plano y tras cada cambio; cancelar los anteriores) en
      `apps/mobile/src/reminders/reminders.native.ts`, y no-op en `reminders.web.ts`
- [x] T070 [US3] Pedir permisos de notificaciones (y declarar el de alarmas exactas), y
      mostrar aviso si faltan, en `apps/mobile/src/reminders/reminders.native.ts`
- [x] T071 [US3] Abrir el vencimiento al tocar el aviso en
      `apps/mobile/src/hooks/useReminderSync.ts`
- [x] T072 [US3] Destacar vencimientos próximos y atrasados en la pantalla principal en
      web en `apps/mobile/app/(app)/index.tsx`
- [x] T073 [US3] Antelación del aviso en el formulario del pago y hora de avisos en los
      ajustes en `apps/mobile/app/(app)/recurring/` y `apps/mobile/app/(app)/account.tsx`

**Punto de control**: RF-029…RF-036 cubiertos; prueba manual en Android con y sin conexión.

---

## Fase 6: Historia 4 — Compartir el hogar (P4)

**Objetivo**: invitar miembros, aceptar invitaciones y aplicar los roles.

**Prueba independiente**: un propietario invita a otra cuenta como editor, esta acepta en
otro dispositivo, las dos ven los mismos datos y un lector no puede editar.

### Tests de la historia 4

- [x] T074 [P] [US4] Tests de invitaciones: crear, caducada, usada, anulada, ya miembro,
      aceptar con y sin datos en el hogar actual, límite de peticiones en
      `apps/server/test/invitations.test.ts`
- [x] T075 [P] [US4] Tests de miembros: cambiar rol, quitar, salir (crea hogar vacío),
      pasar la propiedad, editor sin permisos de propietario, movimientos de un miembro
      quitado como "antiguo miembro" en `apps/server/test/members.test.ts`

### Implementación de la historia 4

- [x] T076 [P] [US4] Esquemas zod de invitaciones y miembros en
      `packages/api/src/schemas/members.ts`
- [x] T077 [US4] Tabla `invitations` y migración en `apps/server/src/db/schema.ts`
- [x] T078 [US4] Rutas de invitaciones en `apps/server/src/routes/invitations.ts`
- [x] T079 [US4] Rutas de miembros (rol, quitar, salir, pasar la propiedad) en
      `apps/server/src/routes/members.ts`
- [x] T080 [US4] Mostrar quién apuntó cada movimiento en `apps/mobile/app/(app)/index.tsx`
      ("un antiguo miembro" si ya no está). Quién resolvió un vencimiento se dice en el
      error del servidor si otro intenta pagarlo u omitirlo de nuevo
- [x] T081 [US4] Pantalla de miembros e invitar (enlace, código, compartir) en
      `apps/mobile/app/(app)/household/members.tsx`
- [x] T082 [US4] Aceptar una invitación por enlace o código, con aviso y confirmación si
      se pierden datos, en `apps/mobile/app/invitacion/[code].tsx` (sin sesión, manda a
      entrar o registrarse y vuelve). Ofrecer exportar antes de aceptar llega con T090
- [x] T083 [US4] Ocultar o desactivar acciones según el rol con `can()` (`useCan` en
      `apps/mobile/src/hooks/data.ts`)
- [x] T084 [US4] Refrescar los datos al volver a primer plano en
      `apps/mobile/src/cache/focus.native.ts`

**Punto de control**: RF-004…RF-010 y RF-040 cubiertos; dos cuentas comparten hogar en
Android y web.

---

## Fase 7: Historia 5 — Ajustar el hogar y las categorías (P5)

**Objetivo**: inicio de mes configurable, categorías propias, exportar datos y borrar la
cuenta.

**Prueba independiente**: cambiar el inicio de mes al 25 y ver los periodos recalculados;
crear y archivar una categoría; exportar y borrar una cuenta de prueba.

### Tests de la historia 5

- [ ] T085 [P] [US5] Tests de ajustes del hogar (solo propietario, día 1–28) en
      `apps/server/test/households.test.ts`
- [ ] T086 [P] [US5] Tests de categorías (crear, renombrar, archivar sin afectar a
      movimientos, nombres duplicados) en `apps/server/test/categories.test.ts`
- [ ] T087 [P] [US5] Tests de exportación (todo el hogar, nada de otros hogares) y de
      borrado de cuenta (único miembro borra el hogar; propietario con miembros recibe
      409; sesiones invalidadas) en `apps/server/test/account.test.ts`

### Implementación de la historia 5

- [ ] T088 [US5] `PATCH /api/households/:id` en `apps/server/src/routes/households.ts`
- [ ] T089 [US5] `POST` y `PATCH` de categorías en `apps/server/src/routes/categories.ts`
- [ ] T090 [US5] `GET /export` en `apps/server/src/routes/export.ts`; ofrecerlo también en
      `apps/mobile/app/invitacion/[code].tsx` antes de aceptar si se pierden datos (RF-008)
- [ ] T091 [US5] `DELETE /api/account` en `apps/server/src/routes/account.ts`
- [ ] T092 [US5] Pantalla de ajustes del hogar en
      `apps/mobile/app/(app)/household/settings.tsx`
- [ ] T093 [US5] Pantalla de categorías en
      `apps/mobile/app/(app)/household/categories.tsx`
- [ ] T094 [US5] Exportar y borrar la cuenta (con confirmación y paso de propiedad) en
      `apps/mobile/app/(app)/account.tsx`

**Punto de control**: RF-003, RF-021, RF-038 y RF-039 cubiertos; las cinco historias
funcionan.

---

## Fase 8: Cierre

- [ ] T095 [P] Revisar accesibilidad (etiquetas, tamaño de texto, contraste) en todas las
      pantallas de `apps/mobile/app/`
- [ ] T096 [P] Revisar que ningún log del servidor contiene importes, notas ni emails
- [ ] T097 Comprobar los criterios de éxito medibles (CE-001…CE-009) y anotar el
      resultado en `docs/specs/001-mvp-hogar/plan.md`
- [ ] T098 Recorrer la guía de validación de `plan.md` de punta a punta en Android y web
- [ ] T099 Desplegar en Railway (región UE) y generar el APK con EAS
- [ ] T100 Actualizar `README.md` y `AGENTS.md` con el estado final

---

## Dependencias y orden

### Entre fases

- **Preparación (fase 1)**: sin dependencias.
- **Base común (fase 2)**: depende de la fase 1 y **bloquea todas las historias**.
- **Historia 1 (fase 3)**: depende de la fase 2.
- **Historia 2 (fase 4)**: depende de la fase 2 y usa las categorías y movimientos de
  la historia 1.
- **Historia 3 (fase 5)**: depende de la historia 2.
- **Historia 4 (fase 6)**: depende de la fase 2; puede hacerse en paralelo a las
  historias 2 y 3.
- **Historia 5 (fase 7)**: depende de la historia 1.
- **Cierre (fase 8)**: depende de todas las historias.

### Dentro de cada historia

1. Tests (deben fallar).
2. Dominio.
3. Esquemas de `packages/api`.
4. Base de datos y migración.
5. Rutas del servidor (los tests pasan).
6. Pantallas.

### En paralelo

- En la fase 1, T002–T008 y T011–T012.
- En la fase 2, todo el dominio (T014–T019) y el contrato (T020–T021) a la vez.
- Dentro de cada historia, todas las tareas de tests `[P]` a la vez, y el dominio en
  paralelo con los esquemas.

## Estrategia de implementación

### MVP primero

1. Fases 1 y 2.
2. Fase 3 (historia 1).
3. **Parar y validar**: la historia 1 ya es una app útil; desplegar una versión de
   prueba.

### Entrega incremental

Cada historia se añade, se prueba por separado y se despliega antes de empezar la
siguiente: US1 → US2 → US3 → US4 → US5. Un PR por fase o por historia.

## Notas

- `[P]` = archivos distintos y sin dependencias pendientes.
- Hacer commit después de cada tarea o grupo lógico, con `pnpm check` en verde.
- Si una tarea obliga a cambiar `spec.md` o `plan.md`, se actualizan primero y se avisa.
