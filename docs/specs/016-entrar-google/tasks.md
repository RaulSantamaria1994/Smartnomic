# Tareas: Entrar con Google

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/016-entrar-google/`
**Requisitos previos**: especificación y plan aprobados.

**Tests**: obligatorios según la constitución (art. VII). Se escriben primero y deben
fallar antes de implementar.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]…[US3]**: historia de la especificación a la que pertenece.
- Prefijo `G` para no confundirlas con las de otras funcionalidades. Se marca `[x]` al
  terminarla, con `pnpm check` en verde.

---

## Fase 0: Fuera del código (propietario)

- [x] G000 Pantalla de consentimiento OAuth en el proyecto de Google Cloud / Firebase de la
      014 (externa, nombre Smartnomic). En modo prueba, añadir los emails que vayan a entrar
- [x] G001 Cliente OAuth «Aplicación web»: orígenes `http://localhost:3000`,
      `http://localhost:8081` y la URL pública; redirecciones
      `http://localhost:3000/api/auth/callback/google` y
      `https://<dominio>/api/auth/callback/google`
- [x] G002 `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `apps/server/.env` y en Railway
      (nunca en el repositorio)

**Bloquea**: solo G024 y G025 (baile real con Google). El resto se hace con claves falsas en
los tests o sin Google.

---

## Fase 1: Base (dominio y contrato)

**Objetivo**: las funciones y los esquemas, sin cambiar aún el servidor ni la app.

- [x] G003 [P] Tests de `packages/domain/src/email.ts`: `emailsMatch` ignora mayúsculas y
      espacios alrededor; distinto no coincide; vacío recortado no coincide con un email.
      Implementación y exportar desde `src/index.ts`
- [x] G004 [P] Contrato en `packages/api`: - `loginOptionsSchema` `{ google: boolean }` - `putTimezoneSchema` `{ timezone }` (el `timeZoneSchema` de hoy) - `user` de `meResponseSchema` gana `hasPassword: boolean` (obligatorio) - `deleteAccountSchema`: `{ password?: string, email?: string }` con al menos uno y
      cadenas no vacías (mensajes «Escribe tu contraseña.» / «Escribe tu email.»)
      Tests en `schemas/households.test.ts` y `schemas/account.ts` (o el test que ya cubra
      `deleteAccountSchema` y `me`)

**Punto de control**: `pnpm check` en verde; aún no hay botón ni rutas nuevas. Los tests de
`me` del servidor fallarán en cuanto se exija `hasPassword` en el esquema: G009 los pone al
día.

---

## Fase 2: Historia 1 — Entrar o crear la cuenta con Google (P1) 🎯

### Servidor

- [x] G005 [US1] `createAuth` / `createApi` aceptan `google?: { clientId, clientSecret }`. Si
      viene: `socialProviders.google` con `prompt: 'select_account'` y `mapProfileToUser` solo
      `name` y `email`; `account.accountLinking` `{ enabled: true, trustedProviders: ['google'] }`;
      el gancho de alta deja `users.image` a `null`. Sin `google`, el comportamiento de hoy.
      `apps/server/src/auth.ts`, `api.ts`
- [x] G006 [US1] Tests en `test/auth.test.ts`: sin `google`, `GET /api/login-options` →
      `{ google: false }`; con claves de test (sin red), `{ google: true }`. Implementación en
      `src/routes/login-options.ts` y registro en `server.ts` (fuera de `/api/auth/*`)
- [x] G007 [US1] Con claves de test, `POST /api/auth/sign-in/social` `{ provider: 'google' }`
      (origen `TEST_ORIGIN`) responde una URL de cuentas de Google; no se sigue el redirect.
      `useTestServer` acepta `google?: { clientId, clientSecret }`
- [x] G008 [US1] `index.ts` pasa las claves si están `GOOGLE_CLIENT_ID` y
      `GOOGLE_CLIENT_SECRET`; si falta una, aviso en el log (sin valores). Las dos vacías en
      `apps/server/.env.example`
- [x] G009 [US1] `userHasPassword` (`src/account.ts`): `true` si hay fila `credential` con
      `password`. `GET /api/me` incluye `hasPassword`. Tests: alta con email → `true`; cuenta
      solo Google (G010) → `false`. Actualizar los `me` de los tests que parsean el esquema
- [x] G010 [P] [US1] Helper `insertGoogleUser` en `test/helpers.ts`: inserta `users` +
      `accounts` (`provider_id = 'google'`, sin password) y llama a `ensureHousehold`. Sirve
      a G009, G011 y a la historia 3
- [x] G011 [US1] Tests e implementación de `PUT /api/me/timezone` (`applySignupTimezone` en
      `src/account.ts`, ruta en `routes/me.ts`): alta reciente, un hogar en Madrid y zona
      válida → se cambia; dos hogares, zona ya distinta o cuenta de más de 15 min → 204 sin
      tocar; zona inválida 400; sin sesión 401. Reloj inyectado (`now` del servidor)

### App

- [x] G012 [P] [US1] Textos en `src/i18n/es.ts`: `auth.google.continue` («Continuar con
      Google»), `auth.google.privacy` (Google nos da el nombre y el email),
      `auth.google.cancelled` no se usa en pantalla (cancelar no muestra error)
- [x] G013 [US1] `api.loginOptions` y `api.putTimezone` en `src/api/client.ts`. **Entrar** y
      **Crear cuenta**: si `loginOptions.google`, botón `secondary` debajo del envío y la
      nota; si la consulta falla o `google: false`, no se muestra. `signIn.social({ provider:
'google', callbackURL: next ?? '/' })` con `x-timezone`; tras éxito, `putTimezone` y
      `router.replace`. Cancelar: sin `Message`. Invitación (`next`) sigue con `safeNext`
- [x] G014 [US1] Códigos nuevos en `src/session/auth-errors.ts` (y su test): cancelar no
      pasa por el mensaje desconocido; el resto de fallos de Google usan `unknown` o
      `emailInUse` si el código es de cuenta existente
- [x] G015 [US1] `CACHE_BUSTER` → `entrar-google-1` en `src/cache/query-client.ts`

**Punto de control**: RF-1601 a RF-1603 y RF-1606 a RF-1608; el baile real queda para G024/G025.

---

## Fase 3: Historia 2 — La misma cuenta (P2)

- [x] G016 [US2] Tests: cuenta solo Google (`insertGoogleUser`); `POST /api/auth/sign-up/email`
      con ese email → error de email en uso (el de hoy); `hasPassword: false`. No se crea
      otra fila en `users`
- [x] G017 [US2] Tests: cuenta con contraseña a la que se añade a mano una fila `google` en
      `accounts`; `hasPassword: true`; entrar con email y contraseña sigue funcionando.
      (Vincular de verdad al pulsar el botón es G024: hace falta Google)

**Punto de control**: RF-1604 y RF-1605.

---

## Fase 4: Historia 3 — Borrar la cuenta si se entra con Google (P3)

- [x] G018 [US3] Tests en `test/account.test.ts`: solo Google, email correcto (mayúsculas y
      espacios) → 204 y no quedan usuario ni hogar; email distinto o vacío → 400 «El email no
      coincide.» / validación, la cuenta sigue; mandar solo `password` → 400 y sigue
- [x] G019 [US3] Tests: cuenta con contraseña, borrar solo con el email → 400 y sigue;
      contraseña correcta → 204 (los tests de hoy siguen). Cuenta con las dos filas en
      `accounts`: hace falta la contraseña, el email no basta
- [x] G020 [US3] Implementación en `routes/account.ts`: si `userHasPassword`,
      `verifyPassword`; si no, `emailsMatch`. `deleteAccountSchema` del G004
- [x] G021 [US3] App: `api.deleteAccount({ password?, email? })`. «Borrar mi cuenta»: si
      `hasPassword`, el campo de contraseña de hoy; si no, campo de email (`es.account.email`
      / `emailRequired`). Dos toques, botón `destructive`, propietario con más miembros: sin
      cambios. Textos en `es.ts`

**Punto de control**: RF-1609 y RF-1610; CE-1603 cubierto por G018 y G019.

---

## Fase 5: Cierre

- [x] G022 Batería de ataques: `PUT /api/me/timezone` y `DELETE /api/account` sin sesión
      (401); el timezone y el borrado son siempre de la sesión (no hay id de otro usuario).
      `GET /api/login-options` no exige sesión y no filtra datos
- [ ] G023 [P] axe-core en **Entrar** (con y sin botón), **Crear cuenta** y **Borrar mi
      cuenta** (con contraseña y solo email) a 320 y 1280 px (CE-1605)
- [x] G024 [P] Con las claves del propietario (G000–G002): punta a punta en la web, pila
      local — cuenta nueva con Google ve «Mes» (CE-1601); cuenta de email entra con Google
      del mismo email y conserva datos, y luego con la contraseña (CE-1602); dos cuentas de
      Google distintas no se ven (CE-1604); cancelar no crea cuenta. Sin claves, el botón no
      está (comprobable en CI)
- [ ] G025 Prueba en Android con la APK (`eas build --profile preview`): lo mismo que G024
      (CE-1601, CE-1602) y la invitación tras entrar con Google
- [x] G026 [P] `expo export --platform web` compila; `pnpm check` en verde
- [x] G027 Actualizar `README.md` (variables y consola de Google) y `AGENTS.md` (estado:
      Better Auth `socialProviders.google`, `GET /api/login-options`, `PUT /api/me/timezone`,
      borrar con email si no hay contraseña), apuntar resultados en `plan.md` y marcar
      tareas. `spec.md` → Implementada al cerrar

---

## Dependencias y orden

- **Fase 0** solo bloquea G024 y G025; el propietario puede hacerla en cualquier momento.
- **Fase 1** antes que las historias. G004 antes de G009 (el parseo de `me`).
- **G010** antes de G009 (solo Google), G011, G016 y G018.
- **Historia 1** (servidor G005–G011) antes de la app (G013) y de las historias 2 y 3.
- **G012** puede ir en paralelo al servidor.
- **Historia 2** después de G005 y G010.
- **Historia 3**: tests G018/G019 antes de G020; G021 después de G009 (hace falta
  `hasPassword` en `me`).
- **Cierre** al final. G023 y G026 en paralelo; G024 espera G000–G002 y el código; G025
  espera G024 o se hace a la vez en otro dispositivo.

### En paralelo

- G003 y G004; G012 mientras el servidor; G023 y G026.
