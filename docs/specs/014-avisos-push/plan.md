# Plan de implementación: Avisos push de cambios de otros miembros

**Rama**: `feat/014-avisos-push` | **Fecha**: 2026-11-10 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Cada Android con sesión abierta y permiso de notificaciones registra su **token de Expo Push**
en el servidor (`PUT /api/push-device`), atado a su sesión. Cuando una ruta crea un movimiento,
paga un vencimiento o aporta o saca de una hucha, apunta el cambio en un **agrupador en
memoria** (por hogar y miembro, ventana fija de 5 s). Al cerrar la ventana, el servidor busca
en SQL los dispositivos de los demás miembros con los avisos de ese hogar activados y con la
sesión viva, compone el texto y lo envía a la API HTTP de Expo Push con `fetch`. El envío nunca
retrasa ni hace fallar la petición que provocó el aviso. La preferencia es una columna nueva en
`members`, como la de los recordatorios. En la app, el aviso llega con la app cerrada porque lo
muestra el sistema (Expo/FCM), y al tocarlo se abre el hogar y la pantalla del cambio.

## Contexto técnico

| Campo                        | Valor                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Node 22, Fastify 5, Expo 58 — igual que ahora                                    |
| **Dependencias nuevas**      | Ninguna: el servidor llama a Expo Push con `fetch`; la app usa `expo-notifications` y `expo-constants`  |
| **Almacenamiento**           | Tabla nueva `push_devices`; columna nueva `members.activity_alerts_enabled`                             |
| **Servicios externos**       | Expo Push (ya en el stack) y, por debajo, Firebase Cloud Messaging (credenciales FCM en EAS, sin coste) |
| **Tests**                    | Vitest: servidor con PostgreSQL real y un emisor falso; textos y agrupador con reloj inyectado; app     |
| **Plataformas**              | Solo Android (RF-1412); en la web solo se ve y cambia la preferencia                                    |
| **Objetivos de rendimiento** | 95 % de avisos en < 10 s (CE-1401); guardar no tarda más con Expo caído (CE-1405)                       |
| **Restricciones**            | Sin importes ni textos en los logs (art. VI.4); el texto del aviso sale de la UE (VI.6, enmienda 1.2.0) |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                                                                                                                                                                       | Estado |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Expo Push ya está en la tabla del stack. Sin dependencias nuevas: `expo-server-sdk` no hace falta para tres llamadas HTTP.                                                                                                                                     | ✅     |
| II. Arquitectura por capas | El agrupador y los textos son puros y con reloj inyectado; las rutas solo apuntan el cambio; la app solo registra el token y abre el destino.                                                                                                                  | ✅     |
| III. Dinero y fechas       | III.2 enmendado (1.2.0): el texto del aviso con el importe se compone en el servidor con `formatCents` de `packages/domain`, la misma función que usa la app. Ver «Enmiendas».                                                                                 | ✅     |
| IV. Datos y persistencia   | Migración nueva y aditiva (añade tabla y columna). `push_devices` no lleva `household_id`: es de la cuenta, como `sessions`, y toda consulta filtra por usuario o sesión. Los destinatarios se buscan en SQL filtrando por el hogar.                           | ✅     |
| V. API                     | Esquemas zod en `packages/api` (`pushDeviceSchema`, campo nuevo en `memberSchema` y `updateMyMemberSchema`). Campo nuevo opcional para la APK antigua (V.4). Registrar el token es idempotente.                                                                | ✅     |
| VI. Seguridad y privacidad | Cada destinatario es miembro actual del hogar (consulta con `members`); token atado a la sesión, que muere al cerrar sesión o borrar la cuenta. Logs solo con ids y recuentos. VI.6 enmendado (1.2.0): el texto pasa por Expo y FCM, desactivable y explicado. | ✅     |
| VII. Tests                 | Tests primero; sin red: el emisor de Expo se inyecta y en los tests es falso; el agrupador recibe el reloj.                                                                                                                                                    | ✅     |
| VIII. Calidad y CI         | `pnpm check`. Textos de la app en `src/i18n/es.ts`; los del aviso, en un único módulo del servidor.                                                                                                                                                            | ✅     |
| IX. App y plataformas      | Lo nativo en `src/push/push.native.ts`; `push.ts` vacío en la web. El aviso de permisos que ya existe se amplía (IX.2.3).                                                                                                                                      | ✅     |

### Enmiendas a la constitución (aprobadas el 2026-11-10, versión 1.2.0)

Las dos chocaban con la constitución 1.1.1; el propietario las aprobó y van en su propio PR
(Gobierno, punto 3), que se fusiona antes que el de esta funcionalidad.

1. **III.2 — «El formateo de importes DEBE hacerse solo en la interfaz, con
   `Intl.NumberFormat`»**. Con la app cerrada no corre código de la app: el sistema muestra el
   texto tal cual llega, así que «45,30 €» tiene que salir del servidor. (Un aviso solo con datos
   que la app formatee en segundo plano no es fiable en Android con la app cerrada.)
   **Propuesta**: llevar `formatMoney` de `apps/mobile/src/format.ts` a `packages/domain`
   (`formatCents`), usarla en la app y en el texto del aviso, y enmendar III.2 (versión MENOR):
   «El formateo de importes DEBE hacerse solo al mostrarlos (en la interfaz o en el texto de un
   aviso), con la función común de `packages/domain` y la moneda del hogar». De paso, la regla
   deja de citar `Intl.NumberFormat`, que la app ya no usa (`format.ts` formatea a mano para que
   salga igual en Android y en la web).
2. **VI.6 — «Los datos se alojan en la Unión Europea»**. El texto del aviso (hogar, nombre,
   importe y categoría) pasa por Expo (EE. UU.) y por FCM de Google, que lo guardan poco tiempo
   para entregarlo. La especificación ya lo acepta y lo explica junto al interruptor (RF-1413).
   **Propuesta**: enmendar VI.6 (versión MENOR) para precisar que lo que **se guarda** se aloja
   en la UE y que el texto de los avisos push puede pasar por Expo y FCM para entregarse, siempre
   que el usuario pueda desactivarlos.

Con las dos enmiendas, el plan no incumple ningún artículo.

## Modelo de datos

- `members.activity_alerts_enabled boolean NOT NULL DEFAULT true`: independiente de
  `reminders_enabled` (RF-1408). Entrar en un hogar crea el miembro con `true` (escenario 2.4);
  salir o ser quitado borra la fila y con ella los avisos (RF-1409).
- `push_devices`:

  | Columna      | Tipo          | Notas                                                                     |
  | ------------ | ------------- | ------------------------------------------------------------------------- |
  | `token`      | `text` PK     | `ExponentPushToken[…]`; un móvil, un token                                |
  | `user_id`    | `text`        | FK `users`, `ON DELETE CASCADE` (borrar la cuenta borra sus dispositivos) |
  | `session_id` | `text`        | FK `sessions`, `ON DELETE CASCADE` (cerrar sesión borra el dispositivo)   |
  | `created_at` | `timestamptz` |                                                                           |
  | `updated_at` | `timestamptz` | Último registro                                                           |

  Índice por `user_id`. Si otra cuenta entra en el mismo móvil, el `PUT` reasigna el token a la
  nueva sesión: el móvil solo recibe los avisos de quien tiene la sesión abierta.

## Contrato

- `PUT /api/push-device` (sesión obligatoria, sin hogar), cuerpo `{ token }` validado con
  `pushDeviceSchema` (`^Expo(nent)?PushToken\[[A-Za-z0-9_-]{1,200}\]$`) → `204`. Ata el token a
  la sesión de la petición (alta o reasignación). Límite de peticiones como el resto.
- `DELETE /api/push-device`, cuerpo `{ token }` → `204` aunque no exista; solo borra si es de
  este usuario. La app lo llama antes de cerrar sesión (si falla sin conexión, el borrado de la
  sesión en el servidor lo hace igual cuando llegue, o caduca).
- `PATCH /api/households/:householdId/members/me` acepta además `activityAlertsEnabled`.
  `memberSchema` añade `activityAlertsEnabled` (en `GET /api/me` y en la lista de miembros). Con
  el cambio de miembro, el tiempo real ya avisa (`members`).
- La exportación de datos (`routes/export.ts`) incluye `activityAlertsEnabled` del miembro.

## Servidor

- `src/push/expo.ts`: `createExpoPushSender({ accessToken?, apiUrl?, fetch? })`, como
  `createBrevoSender`. `send(messages)` trocea de 100 en 100 y devuelve los tickets;
  `receipts(ids)` consulta los recibos. `EXPO_ACCESS_TOKEN` opcional (seguridad reforzada de
  Expo Push) en `.env.example`. Los errores solo llevan el estado HTTP.
- `src/push/messages.ts`: textos del aviso (puros, probados):
  - Un cambio: título = nombre del hogar; cuerpo «Juan ha apuntado 45,30 € en Supermercado»,
    «Juan ha apuntado un ingreso de 1.800,00 € en Nómina», «Juan ha pagado Alquiler
    (750,00 €)», «Juan ha aportado 50,00 € a Vacaciones» / «ha sacado 50,00 € de Vacaciones».
  - Varios del mismo tipo: «Juan ha apuntado 20 movimientos», «Juan ha pagado 3 recibos»,
    «Juan ha hecho 2 movimientos en huchas»; mezclados: «Juan ha hecho 5 cambios».
  - Sin miembro (salió del hogar): «Se ha apuntado…».
  - Datos del aviso: `{ type: 'activity', householdId, target }` con `target` uno de
    `{ kind: 'transaction', date }`, `{ kind: 'occurrence', ruleId, dueDate }`,
    `{ kind: 'savings', goalId }`, o `{ kind: 'month' }` si son varios.
  - `channelId: 'actividad'`, `priority: 'high'`, `ttl` de 1 día.
- `src/push/activity.ts`: `createActivityNotifier({ db, sender, log, windowMs = 5000, clock })`:
  - `record(event)`: síncrono y sin E/S (RF-1411). Clave `householdId:memberId`; el primer
    evento abre una ventana fija de 5 s (no se alarga con cada evento, para no pasar de 10 s,
    CE-1401) y los siguientes se suman (RF-1405).
  - Al cerrar la ventana, una consulta: dispositivos de `members` del hogar con
    `activity_alerts_enabled`, `user_id` distinto del autor (RF-1403), unidos a `sessions` con
    `expires_at > now()`. Nombre del autor y del hogar en la misma consulta. Sin destinatarios,
    no se envía nada.
  - Tickets con `DeviceNotRegistered` → se borra ese token; los recibos se consultan una vez
    15 min después (temporizador `unref`) y hacen lo mismo. Cualquier otro error se registra
    con ids y recuentos y el aviso se pierde (sin reintentos).
  - `flushAll()` en el gancho `onClose` de Fastify: un despliegue no pierde lo pendiente.
- Dónde se apunta (llamada directa en la ruta, tras guardar):
  - `PUT …/transactions/:id`: `RETURNING (xmax = 0) AS inserted`; solo si es nuevo. Reenviar
    el mismo movimiento (bandeja sin conexión) cae en la rama de actualizar y no avisa.
  - `POST …/recurring/:ruleId/occurrences/:dueDate/pay`: solo cuando se crea la resolución
    (`resolved`), no al repetir. Omitir no avisa.
  - `PUT …/savings/:goalId/entries/:entryId`: solo al insertar con `kind` `deposit` o
    `withdrawal`; el reenvío (`repeated`) y saltar un mes no avisan.
- `src/routes/push-devices.ts`: las dos rutas del contrato.
- Una sola instancia (como el hub de tiempo real): si un día hay varias, cada una agrupa lo
  suyo y podría haber un aviso de más; se deja anotado.

## App

- `packages/domain/src/money.ts`: `formatCents` (movido de `format.ts`, que la reexporta para no
  tocar las pantallas). (enmienda III.2).
- `src/push/push.native.ts` / `push.ts` (web, vacío): `pushSupported`,
  `getPushToken()` (`getExpoPushTokenAsync` con el `projectId` de `expo-constants`) y
  `ensureActivityChannel()` (canal Android `actividad`, «Cambios de otros miembros»,
  separado de `vencimientos`, RF-1408).
- `src/push/usePushRegistration.ts`, montado en `SignedIn` junto a `useReminderSync`: con
  permiso concedido, al abrir y al volver a primer plano, obtiene el token y lo registra si
  cambió desde el último registro de esa cuenta (escenarios 3.1 y 3.2); escucha
  `addPushTokenListener` por si Android lo rota.
- `src/notifications/target.ts` (puro, probado): de los datos de un aviso (recordatorio o
  actividad) a `{ householdId?, route }`. `useReminderSync` usa este traductor en su único
  oyente de respuestas, así que los dos tipos de aviso abren bien (RF-1406, CE-1406). Una hucha
  que ya no existe lleva a «Mes» de ese hogar.
- `session/sign-out.ts` y borrar la cuenta: `DELETE /api/push-device` antes de cerrar sesión
  (sin esperar si no hay conexión).
- Pantalla «Hogar» (`app/(app)/(tabs)/account.tsx`), sección «Avisos»: interruptor nuevo
  «Cambios de otros miembros» (por hogar, `PATCH members/me`) con la nota «El texto del aviso
  pasa por el servicio de avisos de Expo» y, en la web, «Solo llegan en la app de Android»
  (RF-1407, RF-1413). Textos en `src/i18n/es.ts`.
- `ReminderBanners`: el aviso de permiso denegado sale también si hay avisos de actividad
  activados en algún hogar con más miembros (RF-1410).
- `CACHE_BUSTER` → `avisos-push-1` (cambia la forma de `me`).

## Configuración fuera del código (la hace el propietario)

1. `eas init` en `apps/mobile`: crea el proyecto de EAS y añade `extra.eas.projectId` a
   `app.json` (lo necesita `getExpoPushTokenAsync`).
2. Proyecto de Firebase (gratis) con la app `com.raulsantamaria.smartnomic`: descargar
   `google-services.json` a `apps/mobile/` y añadir `android.googleServicesFile` en `app.json`
   (Google indica que no es un secreto; se sube al repositorio), y subir la clave de cuenta de
   servicio de FCM v1 con `eas credentials` (esa sí es secreta y no entra en el repositorio).
3. Opcional: activar la seguridad reforzada de Expo Push y poner `EXPO_ACCESS_TOKEN` en Railway.
4. Nueva APK con `eas build --profile preview`: la APK instalada no recibe avisos hasta
   actualizarse (el registro del token es código nuevo).

## Investigación y decisiones

| Decisión                 | Elegido                                        | Alternativas descartadas                                                                     |
| ------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Cliente de Expo Push     | `fetch` a la API HTTP                          | `expo-server-sdk`: dependencia para trocear y dos llamadas; ya hay el mismo patrón con Brevo |
| Dónde se apunta          | Llamada en las tres rutas, solo si es nuevo    | Gancho `onResponse` como el tiempo real: no sabe si fue alta o edición ni tiene el importe   |
| Agrupar                  | Memoria, ventana fija de 5 s por hogar y autor | Tabla de pendientes: sobrevive a reinicios, pero más estado para un aviso que puede perderse |
| Texto con la app cerrada | Lo compone el servidor                         | Solo datos y la app lo formatea: no es fiable en Android con la app cerrada                  |
| Dispositivo ↔ sesión     | FK a `sessions` con borrado en cascada         | Solo a `users`: un móvil con la sesión cerrada seguiría recibiendo hasta que falle el token  |
| Preferencia              | Columna en `members` (persona y hogar)         | Por dispositivo: la especificación pide que valga para todos los móviles de la persona       |

## Riesgos

- **Entrega en Android**: algunos fabricantes retrasan avisos con ahorro de batería; con
  prioridad alta suele bastar. Se mide en la prueba con la APK (CE-1401).
- **Reinicio del servidor**: lo pendiente se envía al cerrar (`onClose`); un cierre brusco pierde
  como mucho 5 s de avisos (aceptado en la especificación).
- **APK antigua**: no registra token, así que no recibe avisos; el resto sigue igual.

## Pruebas y cierre

- Dominio: `formatCents` (cero, miles, negativos, otra moneda).
- Servidor (PostgreSQL real, emisor falso, reloj inyectado): alta de movimiento avisa a los demás
  y no al autor ni a sus otros móviles; edición, borrado, restaurar, reenvío idempotente y
  omitir no avisan; pagar y aportar/sacar avisan; otro hogar no recibe; preferencia apagada no
  recibe y la del otro hogar sí; sesión cerrada o caducada y miembro quitado no reciben; 20 altas
  dan 1 aviso; Expo caído o con error no cambia la respuesta ni su tiempo; `DeviceNotRegistered`
  borra el token; registrar el token sin sesión (401), con formato malo (400), reasignado a otra
  cuenta; logs sin importes ni textos.
- App: traductor de destinos (cada tipo, hogar ajeno, datos malos), registro solo si cambió el
  token, cierre de sesión borra el dispositivo, interruptor en la web con su nota.
- Punta a punta en la web (Playwright): el interruptor por hogar se guarda y se ve en el otro
  dispositivo.
- En Android con la APK (manual): CE-1401 a CE-1406 con dos cuentas, app cerrada, en segundo
  plano y abierta; tocar el aviso con otro hogar elegido; permiso denegado.
- `expo export --platform android`.

## Resultados (2026-11-12)

Implementado en cuatro fases (`feat/014-avisos-push`). Con PostgreSQL real y el emisor de Expo falso:
**903 tests** del repositorio en verde (433 del servidor); `expo export` compila para Android y
la web; axe-core sin violaciones en «Hogar» a 320 y 1280 px.

- **CE-1402, CE-1403, CE-1404, CE-1405**: cubiertos por tests de ruta (preferencia por hogar; autor,
  otro hogar, ex miembro y sesión cerrada o caducada no reciben; 20 movimientos dan un aviso; con el
  servicio caído guardar responde 200).
- **CE-1406** (tocar el aviso abre el hogar y la pantalla correctos): traducción probada
  (`notifications/target.ts`); falta comprobarlo en Android.
- **CE-1401** (95 % en menos de 10 s con la app cerrada): pendiente de la prueba real (P024).
- **Punta a punta en la web con el servidor real** (P025): el interruptor se guarda y otra sesión de
  la misma persona ve el valor guardado, sin cambiar el de recordatorios.

Decisiones tomadas al implementar, que el plan no fijaba:

- Un token de Expo registrado por otra cuenta **se reasigna** a su sesión (permite que otra cuenta
  entre en el mismo móvil). El token no sale en ninguna respuesta ni log. Es un riesgo aceptado y
  acotado: reasignar mueve avisos, no da acceso a datos (test explícito en `push-devices-attacks`).
- Tope de **20 dispositivos por persona** (`MAX_DEVICES_PER_USER`): se descartan los más antiguos.
  `PUT`/`DELETE /api/push-device` usan el límite de peticiones de autenticación.
- El destino de un aviso de un movimiento es «Mes» en el mes de su fecha (`/?date=…`). Varios cambios,
  «Mes». Una hucha o un pago que ya no existen llevan a «Mes» si el hogar está en caché (`routeIfExists`);
  sin caché cargada se abre su pantalla, que ya dice que no existe.
- El aviso de permiso denegado mira el hogar que se está viendo (para saber si tiene más miembros);
  los demás hogares lo muestran al cambiar a ellos.
- Borrar la cuenta solo limpia el registro local: el servidor ya borra los dispositivos con la cuenta.
- La exportación de datos añade `myPreferences` (opcional en el esquema).
- Pendiente: P001 y P002 (Firebase y credenciales de FCM) y P024 (APK y dos cuentas) son del propietario.
