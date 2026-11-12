# Tareas: Avisos push de cambios de otros miembros

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/014-avisos-push/`
**Requisitos previos**: especificación y plan aprobados; enmienda 1.2.0 de la constitución
fusionada en su propio PR.

**Tests**: obligatorios según la constitución (art. VII). Se escriben primero y deben
fallar antes de implementar.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]…[US3]**: historia de la especificación a la que pertenece.
- Prefijo `P` para no confundirlas con las de otras funcionalidades. Se marca `[x]` al
  terminarla, con `pnpm check` en verde.

---

## Fase 0: Fuera del código (propietario)

- [x] P000 `eas init` en `apps/mobile`: `owner` y `extra.eas.projectId` en `app.json`
- [ ] P001 Proyecto de Firebase con la app `com.raulsantamaria.smartnomic`;
      `apps/mobile/google-services.json` y `android.googleServicesFile` en `app.json`
- [ ] P002 Clave de cuenta de servicio de FCM v1 subida con `eas credentials` (no entra en el
      repositorio)
- [ ] P003 Opcional: seguridad reforzada de Expo Push y `EXPO_ACCESS_TOKEN` en Railway

**Bloquea**: solo la prueba en Android (P024). Todo lo demás se puede hacer antes.

---

## Fase 1: Base (dominio, contrato y datos)

**Objetivo**: la función común de importes, los esquemas y las tablas.

- [ ] P004 [P] `formatCents` en `packages/domain/src/money.ts` con sus tests (cero, céntimos,
      miles, millones, negativos, otra moneda, espacio duro); `apps/mobile/src/format.ts`
      reexporta `formatMoney` desde ella y sus tests siguen pasando
- [ ] P005 [P] `pushDeviceSchema` (`packages/api/src/schemas/push.ts`) con tests (tokens
      válidos `ExponentPushToken[…]` y `ExpoPushToken[…]`; vacío, sin corchetes, demasiado
      largo, caracteres raros)
- [ ] P006 [P] `activityAlertsEnabled` en `memberSchema` (opcional en la respuesta para la APK
      antigua) y en `updateMyMemberSchema`, con tests
- [ ] P007 Esquema Drizzle: `members.activity_alerts_enabled` (`DEFAULT true`) y tabla
      `push_devices` (FK a `users` y `sessions` con `ON DELETE CASCADE`, índice por `user_id`);
      `pnpm --filter @smartnomic/server db:generate`; test en `test/migrations.test.ts` de que
      los miembros existentes quedan con `true`

**Punto de control**: `pnpm check` en verde sin cambios de comportamiento.

---

## Fase 2: Historia 1 — Enterarse de lo que apunta otro miembro (P1) 🎯

### Servidor

- [ ] P008 [P] [US1] Tests de `src/push/expo.ts` con `fetch` falso: trocea de 100 en 100,
      envía `EXPO_ACCESS_TOKEN` si existe, devuelve tickets, consulta recibos; un error HTTP
      lanza un error que solo lleva el estado. Implementación
- [ ] P009 [P] [US1] Tests de `src/push/messages.ts`: cada tipo de cambio (gasto, ingreso, pago,
      aportar, sacar), varios del mismo tipo, mezclados, sin miembro, importes con miles; datos
      del aviso (`type`, `householdId`, `target`), `channelId: 'actividad'`, `priority`, `ttl`.
      Implementación
- [ ] P010 [US1] Tests de `src/push/activity.ts` con reloj y emisor falsos y PostgreSQL real:
      `record` no hace E/S; ventana fija de 5 s que no se alarga; 20 eventos → 1 envío; dos
      autores → 2 envíos; destinatarios = otros miembros del hogar con la preferencia activada
      y sesión viva (no el autor ni sus otros móviles, no otro hogar); sin destinatarios no
      envía; `DeviceNotRegistered` en ticket o recibo borra el token; error del emisor solo se
      registra (logs sin importes ni textos); `flushAll` envía lo pendiente. Implementación
- [ ] P011 [US1] Crear el notificador en `src/server.ts` (inyectable, como el email) y en
      `src/index.ts` con `createExpoPushSender`; `flushAll` en `onClose`; `EXPO_ACCESS_TOKEN`
      en `.env.example`. En los tests, emisor falso en `test/helpers.ts`
- [ ] P012 [US1] Tests en `test/push-activity.test.ts` por ruta: alta de movimiento avisa;
      editar, borrar, restaurar y reenviar el mismo `PUT` no avisan; pagar un vencimiento
      avisa, repetirlo y omitir no; aportar y sacar de una hucha avisan, reenviar y saltar un
      mes no; un movimiento con el emisor fallando o lento responde igual y en el mismo tiempo
      (CE-1405)
- [ ] P013 [US1] Llamadas a `record` en `routes/transactions.ts` (`RETURNING (xmax = 0)`),
      `routes/recurring.ts` (`pay`) y `routes/savings.ts` (`entries`)

### Registro del dispositivo

- [ ] P014 [US1] Tests en `test/push-devices.test.ts`: `PUT /api/push-device` sin sesión 401,
      token malo 400, alta 204, repetir no duplica, otra cuenta en el mismo móvil se lo queda;
      `DELETE` solo borra el propio; cerrar sesión y borrar la cuenta borran el dispositivo.
      Implementación en `src/routes/push-devices.ts` con su límite de peticiones

### App

- [ ] P015 [P] [US1] `src/push/push.native.ts` y `push.ts` (web vacío): `pushSupported`,
      `getPushToken` (con el `projectId` de `expo-constants`) y canal `actividad`. Textos del
      canal en `src/i18n/es.ts`
- [ ] P016 [US1] `usePushRegistration` en `SignedIn`: con permiso, al abrir y al volver a primer
      plano registra el token si cambió (test de la decisión «registrar o no»); oyente de
      rotación del token. `api.registerPushDevice` y `api.unregisterPushDevice` en
      `src/api/client.ts`
- [ ] P017 [US1] Tests de `src/notifications/target.ts` (recordatorio, movimiento → su mes,
      vencimiento, hucha, varios → «Mes», sin hogar, datos malos) e implementación;
      `useReminderSync` lo usa en su oyente y cambia de hogar antes de navegar. Hucha que ya no
      existe → «Mes» de ese hogar (RF-1406)

**Punto de control**: RF-1401 a RF-1406 y RF-1411 con tests; aviso real pendiente de P024.

---

## Fase 3: Historia 2 — Desactivar los avisos de un hogar (P2)

- [ ] P018 [US2] Tests en `test/members.test.ts`: `PATCH members/me` con
      `activityAlertsEnabled` (solo el propio, en cada hogar por separado, lector también
      puede); con la preferencia apagada no se avisa y en su otro hogar sí (CE-1402); un hogar
      nuevo o una invitación aceptada empiezan con `true`; la exportación la incluye.
      Implementación
- [ ] P019 [US2] Pantalla «Hogar» (`app/(app)/(tabs)/account.tsx`): interruptor «Cambios de
      otros miembros» en la sección de avisos, con la nota sobre Expo (RF-1413) y, en la web,
      la de que solo llegan en Android. Textos en `src/i18n/es.ts`; etiqueta accesible
- [ ] P020 [US2] `CACHE_BUSTER` → `avisos-push-1` en `src/cache/query-client.ts`

**Punto de control**: RF-1407 y RF-1408.

---

## Fase 4: Historia 3 — Permisos y dispositivos (P3)

- [ ] P021 [US3] `ReminderBanners`: el aviso de permiso denegado sale también con avisos de
      actividad activados en algún hogar con más miembros (test de la condición)
- [ ] P022 [US3] `session/sign-out.ts` y borrar la cuenta: `unregisterPushDevice` antes de
      cerrar sesión, sin bloquear si no hay conexión (test con el cliente falso)

**Punto de control**: RF-1409 y RF-1410.

---

## Fase 5: Cierre

- [ ] P023 Batería de ataques ampliada: registrar el token de otro, borrar el de otro, tokens
      basura, muchos registros, recibir avisos de un hogar ajeno, `PATCH` de la preferencia en
      un hogar ajeno
- [ ] P024 Prueba en Android con la APK (`eas build --profile preview`) y dos cuentas: app
      cerrada, en segundo plano y abierta (CE-1401); preferencia por hogar (CE-1402); autor,
      otro hogar, sesión cerrada y miembro quitado (CE-1403); 20 movimientos desde la bandeja
      sin conexión (CE-1404); tocar el aviso con otro hogar elegido (CE-1406); permiso denegado;
      canales separados en los ajustes del sistema
- [ ] P025 [P] Punta a punta en la web: el interruptor se guarda por hogar y se ve en la otra
      sesión; las pruebas anteriores siguen pasando
- [ ] P026 [P] axe-core en «Hogar» a 320 y 1280 px; `expo export --platform android` compila
- [ ] P027 Actualizar `README.md` (configuración de Firebase y EAS) y `AGENTS.md` (estado y
      dónde vive cada pieza), apuntar resultados en `plan.md` y marcar tareas

---

## Dependencias y orden

- **Fase 0** solo bloquea P024; el propietario la puede hacer en cualquier momento.
- **Fase 1** bloquea todo lo demás.
- **Historia 1** antes que la 2 (la preferencia se prueba con avisos que ya se envían) y que
  la 3.
- **Cierre** al final.

### En paralelo

- P004, P005 y P006; P008 y P009; P015 mientras se hace el servidor; P025 y P026.
