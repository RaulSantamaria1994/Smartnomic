# Plan de implementación: Avisos push de cambios de otros miembros

**Rama**: `feat/014-avisos-push` | **Fecha**: 2026-11-07 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Cuando una ruta hace un cambio que avisa (movimiento nuevo, pago marcado, miembros, presupuesto
superado), el servidor guarda un **evento** en una tabla, en la misma transacción. Un proceso
del servidor recoge los eventos cada 30 s y los agrupa por hogar, por quien hizo el cambio y por
tipo. Los envía cuando llevan 60 s sin cambios nuevos, o a los 3 min como mucho.

Para cada envío decide los destinatarios en ese momento: los miembros del hogar menos quien hizo
el cambio, con sus ajustes y horas de silencio. Luego manda los avisos a **Expo Push**, que los
entrega por Firebase Cloud Messaging.

La app de Android registra su token de avisos al entrar y lo borra al cerrar sesión. Si el
servicio no está configurado, no se envía nada y todo lo demás sigue igual (RF-1408).

## Contexto técnico

| Campo                        | Valor                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Node 22, Fastify 5, Expo 58, Drizzle — igual que ahora                                                         |
| **Dependencias nuevas**      | Ninguna: el servidor llama a la API HTTP de Expo Push con `fetch`; la app ya tiene `expo-notifications` y `expo-constants`            |
| **Almacenamiento**           | Migración `0009`: dispositivos, preferencias, eventos pendientes y avisos de presupuesto ya enviados; una columna en `members`        |
| **Tests**                    | Vitest: eventos de cada ruta, agrupar, filtros, horas de silencio y envío con un **servicio de avisos falso** y el reloj de los tests |
| **Plataformas**              | Avisos en Android; ajustes también visibles en la web (son de la cuenta), con la nota de que allí no llegan                           |
| **Objetivos de rendimiento** | El envío no va en la petición (CE-1405); aviso en < 1 min más lo que se agrupe (CE-1404)                                              |
| **Restricciones**            | Sin importes, notas ni emails en los avisos (RF-1402) ni en los logs (art. VI.4); claves solo como secretos (art. VI.3)               |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                                                                                                                                            | Estado |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Expo Push en el servidor, como dice la tabla del stack. Sin dependencias nuevas.                                                                                                                                                    | ✅     |
| II. Arquitectura por capas | Agrupar, aplicar ajustes, horas de silencio, textos y «presupuesto superado» son funciones puras de `packages/domain` (`push.ts`), probadas. El servidor solo guarda eventos y envía.                                               | ✅     |
| III. Dinero y fechas       | «Presupuesto superado» compara céntimos enteros en SQL. Las horas de silencio se calculan en la zona del hogar con las funciones de fechas del dominio.                                                                             | ✅     |
| IV. Datos y persistencia   | Migración nueva. Los eventos y los avisos de presupuesto llevan `household_id`. Los dispositivos y las preferencias son de la **cuenta**, no de un hogar (como `sessions`): llevan `user_id` y se borran con ella. Ver «Excepción». | ⚠️     |
| V. API                     | Esquemas zod nuevos en `packages/api`: dispositivos y preferencias. Las rutas existentes no cambian de contrato.                                                                                                                    | ✅     |
| VI. Seguridad y privacidad | El aviso lleva solo nombres (persona, categoría, pago, hogar). Los destinatarios salen de los miembros del hogar en el momento del envío. Logs sin tokens ni textos. Token de Expo y archivo de Firebase como secretos.             | ✅     |
| VII. Tests                 | Tests primero: cada tipo de evento, nada para quien lo hizo, agrupado, cada ajuste, silencio, quitar a un miembro antes del envío, token inválido, servicio caído.                                                                  | ✅     |
| VIII. Calidad y CI         | `pnpm check`.                                                                                                                                                                                                                       | ✅     |
| IX. App y plataformas      | Avisos push solo en la app nativa. La app no los muestra si está a la vista (ya lo ve por tiempo real, especificación 012).                                                                                                         | ✅     |

### Excepción (art. IV.1)

`push_devices` y `push_preferences` guardan datos de la **cuenta**, no de un hogar: un token de
dispositivo y unos ajustes valen para todos sus hogares. Es el mismo caso que `users`, `sessions`
o `accounts`. Llevan `user_id` con borrado en cascada, y solo se consultan por el usuario de la
sesión. El ajuste por hogar va en `members.push_enabled`, que sí es de un hogar.

## Datos (migración `0009`)

- `push_devices`:
  - `id`, `user_id` (cascada), `token` (único) y `created_at` / `updated_at`.
  - El mismo token registrado por otra cuenta pasa a la nueva: un móvil, una sesión.
- `push_preferences`:
  - `user_id` como clave primaria, `enabled`, uno por tipo (`transactions`, `occurrences`,
    `members`, `budgets`), `quiet_start` y `quiet_end` (`HH:MM` o nulos).
  - Sin fila, todo activado y sin silencio (RF-1406).
- `members.push_enabled`, `boolean`, por defecto `true`: el ajuste por hogar.
- `push_events`:
  - `id`, `household_id` (cascada), `actor_user_id` (nulo si la cuenta se borra) y `type`.
  - `payload` en `jsonb`, solo nombres e ids, nunca importes.
  - `target_user_id`, solo para «te han cambiado el rol».
  - `created_at` y `sent_at`.
  - Índice por (`sent_at` nulo, `household_id`).
- `push_deferred`: lo que no se avisó por las horas de silencio de cada persona, para
  resumirlo al terminar (`user_id` y `household_id`, ambos en cascada).
- `budget_alerts`:
  - (`household_id`, `category_id`, `period_start`), único.
  - Avisar una sola vez por categoría y periodo.

## Contrato (`packages/api`, `schemas/push.ts`)

- `PUT /api/push/devices` `{ token }` → `204`. Valida el formato de los tokens de Expo
  (`ExponentPushToken[...]`).
- `DELETE /api/push/devices` `{ token }` → `204`. Al cerrar sesión.
- `GET /api/push/preferences` → `{ enabled, types: { transactions, occurrences, members, budgets },
quietStart, quietEnd }`.
- `PATCH /api/push/preferences` con lo mismo, parcial. Las horas van en formato `HH:MM`: ninguna
  de las dos o las dos.
- El ajuste por hogar va con el de recordatorios, en `PATCH /api/households/:id/members/me`:
  `pushEnabled`. `memberSchema` lo añade (opcional en la lectura, para la app instalada).

## Qué genera eventos

En la misma transacción que el cambio, desde un ayudante `recordPushEvent(tx, …)`:

| Ruta                                               | Evento                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| `PUT …/transactions/:id`, solo si **se crea**      | `transaction` (`kind`, categoría)                                       |
| `POST …/occurrences/:dueDate/pay` y `…/skip`       | `occurrence` (nombre del pago, `paid` u `skipped`)                      |
| Aceptar una invitación                             | `member_joined` (nombre)                                                |
| `POST …/leave` y `DELETE …/members/:id`            | `member_left` (nombre)                                                  |
| `PATCH …/members/:id` (cambio de rol)              | `role_changed` (rol nuevo), solo para la persona a la que se lo cambian |
| Movimiento nuevo de gasto que pasa del presupuesto | `budget_exceeded` (categoría), una vez por categoría y periodo          |

Notas:

- «Se crea» se sabe con `RETURNING (xmax = 0)` en el `INSERT … ON CONFLICT`. Reenviar el mismo
  movimiento sin conexión es una actualización y no avisa.
- Pagar un vencimiento crea un movimiento, pero avisa solo como `occurrence`, no dos veces.
- «Presupuesto superado»: tras crear el gasto, se suma en SQL lo gastado en esa categoría en el
  periodo del movimiento y se compara con el presupuesto. Si antes no pasaba y ahora sí, y
  `budget_alerts` no tiene la fila, se inserta y se registra el evento. La comparación es
  `domain.budgetCrossed`.

## Envío (`src/push/`)

- `PushSender`:
  - una interfaz `send(messages) → [{ token, ok | invalid | error }]`;
  - `createExpoSender(accessToken?)` hace `POST https://exp.host/--/api/v2/push/send` en lotes
    de 100;
  - en los tests, un falso que guarda los mensajes;
  - sin configuración (`PUSH_ENABLED` distinto de `1`), un emisor que no hace nada.
- `processPushQueue(now)`:
  1. Toma, con `FOR UPDATE SKIP LOCKED`, los eventos sin enviar.
  2. Los agrupa con `domain.groupPushEvents`: grupos por (hogar, quien lo hizo, tipo; o
     destinatario para `role_changed`) listos si el último tiene ≥ 60 s o el primero ≥ 3 min.
  3. Para cada grupo, calcula los destinatarios:
     - miembros actuales del hogar menos quien lo hizo;
     - con `members.push_enabled` y las preferencias de cada uno;
     - con `domain.inQuietHours(prefs, now, household.timezone)`: en silencio, el grupo queda
       sin enviar para esa persona hasta que acabe.
  4. Escribe el texto con `domain.pushText(group, { multipleHouseholds })`.
  5. Envía, marca `sent_at` y borra los tokens que Expo da por no válidos
     (`DeviceNotRegistered`).
- Se arranca con un `setInterval` de 30 s en el servidor, como el `ping` del tiempo real, y se
  para al cerrar.
- Los eventos enviados se borran a los 7 días.
- Horas de silencio (RF-1407):
  - Si al enviar un grupo un destinatario está en silencio, en vez de enviarle se suma a
    `push_deferred` (`user_id`, `household_id`, `type`, `actor_name`, `count`), una fila por
    cada combinación.
  - En cada vuelta, a quien ya no está en silencio se le envía un aviso por hogar que lo resume
    («Mientras tanto en Casa: Juan apuntó 5 movimientos y Marta marcó 1 pago») y se borran sus
    filas.

## App

- `app.json` pasa a `app.config.ts`, que lee:
  - `EAS_PROJECT_ID` (→ `extra.eas.projectId`);
  - `GOOGLE_SERVICES_JSON` (→ `android.googleServicesFile`).
- Sin esas variables, la app no registra avisos push y los recordatorios siguen igual.
- El flujo del APK (`android.yml`) escribe `google-services.json` desde un secreto de GitHub
  antes de `prebuild`.
- `src/push/usePushRegistration.native.ts`:
  - con sesión y el permiso concedido (el de los recordatorios), `getExpoPushTokenAsync({ projectId })`
    y `PUT /api/push/devices`;
  - al cerrar sesión, `DELETE` antes de `signOut`;
  - en la web no hace nada.
- Aviso tocado:
  - los datos del aviso llevan `householdId` y la pantalla;
  - el mismo manejador que los recordatorios elige el hogar y navega (especificación 013).
- Con la app a la vista no se enseñan los avisos push (`setNotificationHandler`). Los
  recordatorios locales siguen enseñándose.
- «Ajustes» (`app/(app)/(tabs)/account.tsx`), sección «Avisos de cambios de otros»:
  - interruptor general y uno por tipo;
  - uno por cada hogar (`members.pushEnabled`);
  - horas de silencio desde y hasta, como la hora de los recordatorios;
  - el aviso de permisos que ya existe.
  - En la web, una nota de que solo llegan en Android.

## Investigación y decisiones

| Decisión         | Elegido                                      | Alternativas descartadas                                                               |
| ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| Servicio         | Expo Push (constitución)                     | Firebase directo: otra clave de servicio en el servidor y se aparta de la constitución |
| Cliente de Expo  | `fetch` a su API HTTP                        | `expo-server-sdk`: una dependencia para un `POST` y leer el resultado                  |
| Cuándo se envía  | Proceso cada 30 s sobre una tabla de eventos | Enviar en la petición: más lenta y sin poder agrupar; una cola externa: otro servicio  |
| Destinatarios    | Al enviar, con los miembros de ese momento   | Al guardar el evento: quien sale en esos segundos seguiría recibiendo                  |
| Agrupar          | 60 s sin cambios nuevos, 3 min como mucho    | Ventana fija: o tarda siempre o no agrupa las ráfagas                                  |
| Ajuste por hogar | Columna en `members`                         | Tabla aparte: `members` ya es (persona, hogar) y guarda los ajustes de recordatorios   |
| App a la vista   | No se enseña (manejador de la app)           | Que el servidor lo sepa: necesitaría saber qué hay en pantalla                         |

## Riesgos

- **Cuentas externas**:
  - sin el proyecto de Expo y el de Firebase no llegan avisos;
  - todo se prueba con el servicio falso, y CE-1404 queda para el APK;
  - el README explica los pasos.
- **Una sola instancia**: el proceso de envío vive en el servidor (Railway, una instancia).
  `SKIP LOCKED` evita dobles envíos si algún día hay dos.
- **Cuotas de Expo**: muy por encima del uso esperado; los lotes van de 100 en 100.

## Pruebas y cierre

- Servidor:
  - cada tipo de evento y el texto;
  - nada para quien lo hizo;
  - reenvío sin conexión sin aviso;
  - agrupar (CE-1402);
  - cada ajuste y el silencio (CE-1403);
  - quitar a alguien antes del envío;
  - token inválido borrado;
  - Expo caído sin romper nada;
  - sin configuración no se envía;
  - las rutas no tardan más (CE-1405).
- Dominio: agrupar, silencio que cruza la medianoche, presupuesto cruzado, textos con uno y
  varios hogares.
- Batería de ataques: registrar el token de otro, preferencias ajenas, eventos de otro hogar.
- axe-core en los ajustes nuevos a 320 y 1280 px; `expo export --platform android` y
  `expo prebuild` con y sin las variables.
- En Android, con las cuentas creadas por el propietario: CE-1404.
