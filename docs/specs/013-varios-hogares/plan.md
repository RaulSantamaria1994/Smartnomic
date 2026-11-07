# Plan de implementación: Pertenecer a varios hogares

**Rama**: `feat/013-varios-hogares` | **Fecha**: 2026-11-07 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Los datos ya son de un hogar (`household_id` en todas las tablas) y todas las rutas de datos
llevan el hogar en la URL (`/api/households/:householdId/…`). Lo que supone un solo hogar es:

- el índice único `members_user_id_unique`;
- `findMembership(userId)`, que devuelve «el» hogar del usuario;
- `GET /api/me`, que devuelve un solo hogar y crea uno vacío si no hay;
- aceptar una invitación, que te saca del tuyo;
- salir de un hogar, que te crea uno vacío;
- la conexión de tiempo real, que va al único hogar.

El plan cambia esas piezas. El servidor comprueba la pertenencia al hogar de la URL, no a
«el» hogar. La app guarda en el dispositivo qué hogar está elegido y lo usa donde ahora usa
`me.household`.

## Contexto técnico

| Campo                        | Valor                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Node 22, Fastify 5, Expo 58, Drizzle — igual que ahora             |
| **Dependencias nuevas**      | Ninguna                                                                                   |
| **Almacenamiento**           | Una migración: fuera el índice único por usuario, dentro uno por (hogar, usuario)         |
| **Tests**                    | Vitest: rutas con un usuario en dos hogares; elección del hogar en la app; avisos         |
| **Plataformas**              | Android y navegador                                                                       |
| **Objetivos de rendimiento** | Cambiar de hogar y ver sus datos en < 2 s (CE-1301)                                       |
| **Restricciones**            | Nada de un hogar visible desde otro (RF-1311); compatible con la app instalada (art. V.4) |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                                                                                       | Estado |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| I. Stack                   | Sin dependencias nuevas.                                                                                                                                                       | ✅     |
| II. Arquitectura por capas | Elegir el hogar activo (último elegido, si sigue siendo miembro; si no, el primero) es una función pura de `packages/domain`, probada.                                         | ✅     |
| III. Dinero y fechas       | Sin cambios; cada hogar con su zona horaria y su día de inicio.                                                                                                                | ✅     |
| IV. Datos y persistencia   | Migración nueva que **añade** el índice (hogar, usuario) antes de **quitar** el de usuario (IV.3). Todas las consultas siguen filtrando por `household_id`.                    | ✅     |
| V. API                     | Esquemas zod nuevos. `GET /api/me` **añade** `households` y conserva `household` y `member` para la app instalada (V.4, ver «Compatibilidad»).                                 | ✅     |
| VI. Seguridad y privacidad | `requireMember` busca la pertenencia del usuario **a ese hogar** de la URL; sin ella, 403 igual que ahora. Batería de ataques con un usuario miembro de dos hogares (CE-1302). | ✅     |
| VII. Tests                 | Tests primero: cada ruta con el hogar ajeno y con el propio, límite de 5, crear, borrar, salir del último, invitaciones, borrar la cuenta, tiempo real por hogar.              | ✅     |
| VIII. Calidad y CI         | `pnpm check`.                                                                                                                                                                  | ✅     |
| IX. App y plataformas      | El hogar elegido se guarda en el dispositivo (AsyncStorage en Android, `localStorage` en la web), por cuenta. Mismo código en las dos.                                         | ✅     |

Sin incumplimientos.

## Datos

- Migración `0008_multi_household.sql`:
  1. Crear `members_household_user_unique` en (`household_id`, `user_id`): nadie es dos
     veces miembro del mismo hogar.
  2. Quitar `members_user_id_unique`.
  3. Crear `members_user_id_idx` en `user_id`, para listar los hogares de alguien.
- El límite de 5 hogares se comprueba en las rutas (crear y aceptar), dentro de la misma
  transacción y con un bloqueo por usuario (`pg_advisory_xact_lock`), para que dos peticiones a
  la vez no lleguen a 6.

## Contrato (`packages/api`)

- `GET /api/me` → `{ user, households: [{ household, member }], household, member }`:
  - `households`: todos, ordenados por fecha de entrada (el primero, el más antiguo).
  - `household` y `member`: los del primero, solo para la app instalada (ver
    «Compatibilidad»). Sin hogares, `households: []` y `household`/`member` a `null`.
  - Ya no crea un hogar si no hay (RF-1308). El hogar del registro se sigue creando al
    registrarse (RF-1309), en el gancho de alta que ya existe.
- `POST /api/households` `{ name }` (+ cabecera de zona horaria) → `201 { household,
member }`; con 5 hogares, `409 conflict` «Ya estás en 5 hogares, el máximo. Sal de uno o
  bórralo para crear otro.».
- `DELETE /api/households/:householdId` → `204`, solo el propietario y si es el único
  miembro; si no, `409`. Borra el hogar y todo lo suyo (las tablas ya borran en cascada).
- `POST /api/households/:householdId/leave` → la respuesta de `me` (ya no crea uno vacío).
- Invitaciones:
  - Vista previa: se quitan `currentHousehold` y `currentHouseholdHasData` (ver
    «Compatibilidad») y se añade `atLimit` (ya estás en 5).
  - Aceptar: añade el hogar sin tocar los demás; con 5, `409`. Se ignora `confirmLoseData`.
- Tiempo real: `GET /api/realtime?householdId=…`. Sin `householdId`, el primer hogar (la app
  instalada). Si no es miembro de ese hogar, `403`.

### Compatibilidad con la app instalada (art. V.4)

La APK instalada lee `me.household` y `me.member` y usa la vista previa vieja. Se hace en dos
pasos:

1. Esta funcionalidad: `me` conserva `household` y `member` (el primer hogar), así que la app
   instalada sigue funcionando con su hogar más antiguo. En la vista previa se dejan
   `currentHousehold: 'leave'` y `currentHouseholdHasData: false`. La app instalada avisará
   «saldrás de tu hogar», pero al aceptar no sale.
2. Más adelante, cuando ya no quede ninguna APK anterior a esta en uso: quitar esos campos.

Sin hogares, la app instalada no sabe qué hacer con `household: null`, pero ese caso no podía
darse antes. Se acepta, porque la APK nueva se publica a la vez.

## Servidor

- `src/households.ts`:
  - `findMembership(db, userId, householdId)`: la de ese hogar o `null`.
  - `listMemberships(db, userId)`.
  - `createHousehold(tx, user, name, timezone)`: la usan el registro y `POST /api/households`;
    crea las categorías de siempre.
  - Lo que ahora hace `ensureHousehold` queda solo para el registro.
- `plugins/household-access.ts`: `requireMember` usa `params.householdId`. Una ruta con
  `requireMember` sin `:householdId` no deja pasar a nadie (403): falla cerrada, y un test lo
  comprueba.
- `routes/households.ts`: crear y borrar. Borrar ofrece la exportación en la app, no en el
  servidor, que ya tiene `GET …/export`.
- `routes/members.ts`: `leave` sin hogar nuevo.
- `routes/invitations.ts`: aceptar sin salir del actual; límite.
- `routes/account.ts`: recorre todos los hogares:
  - si en alguno es propietario con más miembros, `409` con los nombres;
  - si es el único miembro, borra el hogar;
  - si no, sus movimientos quedan como de «un antiguo miembro», como ahora.
- `routes/realtime.ts`: cada conexión es de (usuario, hogar elegido). `dropStale` comprueba
  la pertenencia a ese hogar. Los avisos de `members` y la sesión cerrada siguen igual. El
  gancho `onResponse` ya avisa al hogar de la URL. Crear o borrar un hogar avisa `members` a
  mano a sus conexiones (al borrarlo, se cierran con 4001).

## Dominio (`packages/domain`)

- `activeHousehold(households, storedId)`: el guardado si sigue en la lista; si no, el primero;
  sin hogares, `null`. Probado con hogares quitados, lista vacía e id desconocido.
- `MAX_HOUSEHOLDS = 5`.

## App

- `src/households/active.ts`:
  - el hogar elegido por cuenta en el dispositivo (`smartnomic-household:<userId>`);
  - `useHousehold()` devuelve `{ household, member }` del elegido con `activeHousehold`;
  - `useSwitchHousehold()` lo cambia.
  - Sustituye los usos de `useMe().data.household/member` (unos 45, en 26 archivos).
- Cambiar de hogar:
  - la barra superior de las pestañas muestra el nombre del hogar como botón con «▾»
    (`AppBar`, `Screen` con `householdSwitcher`);
  - abre `app/(app)/households/index.tsx`: la lista con el elegido marcado, el rol de cada uno,
    «Crear hogar» y, si hay 5, el aviso del límite;
  - al tocar un hogar, se elige y se vuelve a la pestaña desde la que se abrió.
- `app/(app)/households/new.tsx`: crear con nombre (mismas reglas que en ajustes).
- «Ajustes del hogar»: «Borrar el hogar», solo para el propietario cuando es el único miembro.
  Ofrece exportar y pide confirmación, como al borrar la cuenta.
- Sin hogar: `SignedIn` lleva a `app/(app)/sin-hogar.tsx`, con «Crear hogar» y el campo de
  código de invitación que ya existe en «Miembros del hogar».
- Invitación (`app/invitacion/[code].tsx`): ya no avisa de perder el hogar; con 5, explica el
  límite. Al aceptar, elige el hogar nuevo.
- Recordatorios (Android):
  - `useReminderSync` pide `recurring`, `upcoming` y `savings` de **todos** los hogares
    (`useQueries`) y planifica con los ajustes de aviso de cada miembro;
  - el texto lleva el nombre del hogar cuando hay más de uno;
  - cada aviso guarda su hogar y, al tocarlo, se elige ese hogar antes de abrir el
    vencimiento.
  - Tope: el de 50 avisos programados, ahora entre todos.
- Tiempo real: `useRealtime` conecta con el hogar elegido (`?householdId=`); al cambiar de
  hogar, cierra y abre otra conexión, y se pone al día.
- Bandeja sin conexión: los pendientes ya guardan su `householdId` y se envían a ese hogar.
  «Mes» muestra solo los del hogar elegido. El aviso «N sin enviar» cuenta solo los de ese
  hogar.
- Si el hogar elegido desaparece (4001 en tiempo real, o deja de estar en `me`),
  `activeHousehold` pasa al primero, o a «sin hogar» si no queda ninguno.

## Investigación y decisiones

| Decisión                   | Elegido                                              | Alternativas descartadas                                                                |
| -------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Dónde se guarda el elegido | En el dispositivo, por cuenta                        | En la cuenta (servidor): un dispositivo cambiaría el hogar del otro sin que se note     |
| Cómo sabe el servidor cuál | El hogar va en la URL, como ya hace la API           | Cabecera «hogar activo»: duplicaría lo que ya dice la URL                               |
| Compatibilidad de `me`     | Añadir `households` y conservar `household`          | Romper `me`: la APK instalada dejaría de funcionar                                      |
| Límite de 5                | En la ruta, con bloqueo por usuario                  | Restricción en la base de datos: PostgreSQL no limita filas por grupo sin un disparador |
| Hogares de la vista previa | `atLimit` nuevo; los campos viejos con valores fijos | Quitarlos ya: la APK instalada dejaría de entender la vista previa                      |

## Riesgos

- **Rutas sin comprobar el hogar**: `requireMember` sin `:householdId` en la URL responde 403
  (falla cerrada). La batería de ataques repite cada ruta
  con el hogar ajeno.
- **Muchos cambios en la app** (unos 45 usos de `me.household`): se cambian con un solo hook y
  se busca con `grep` que no quede ninguno; las pruebas de punta a punta anteriores pasan.
- **Recordatorios de varios hogares**: más peticiones al abrir la app (3 por hogar, como
  mucho 15); se mide.

## Pruebas y cierre

- Servidor:
  - un usuario en dos hogares lee y cambia cada uno, y desde uno no lee ni cambia el otro;
  - crear (y el límite, también con dos peticiones a la vez);
  - borrar (propietario único, no propietario, con más miembros);
  - salir del último;
  - aceptar sin perder datos y con el límite;
  - borrar la cuenta con varios hogares;
  - `me` sin hogares;
  - tiempo real por hogar;
  - compatibilidad: `me.household` es el primero.
- Batería de ataques ampliada (CE-1302).
- Punta a punta con tres personas y dos hogares: cambiar de hogar (CE-1301), aceptar con datos
  (CE-1303), quedarse sin hogar de cada forma (CE-1304); las anteriores siguen pasando.
- axe-core en las pantallas nuevas a 320 y 1280 px (CE-1305).
- `expo export --platform android`.
