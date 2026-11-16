# Plan de implementación: Entrar con Google

**Rama**: `feat/016-entrar-google` | **Fecha**: 2026-11-14 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Better Auth ya autentica con email y contraseña. Se le añade el proveedor **Google** (OAuth
en el navegador, el mismo en Android y en la web: `expo-web-browser` ya está). El servidor
solo se configura si hay `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`; si no, el botón no se
muestra. Un usuario nuevo recibe su hogar en el gancho de alta que ya existe; la zona
horaria del dispositivo, que el callback de Google no trae, se aplica justo después con
`PUT /api/me/timezone`. Si el email coincide con una cuenta ya creada con contraseña, Better
Auth las vincula. Borrar la cuenta sigue pidiendo la contraseña cuando la hay; si no, el
email. La foto de Google no se guarda.

## Contexto técnico

| Campo                        | Valor                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Node 22, Fastify 5, Expo 58, Better Auth 1.7 — igual que ahora       |
| **Dependencias nuevas**      | Ninguna: Google va en Better Auth; en Android abre el navegador con `expo-web-browser`      |
| **Almacenamiento**           | Sin migración: `accounts` de Better Auth ya admite `provider_id = google`                   |
| **Servicios externos**       | Google Identity (OAuth 2.0), gratis. Credenciales solo en el servidor                       |
| **Tests**                    | Vitest: servidor con PostgreSQL real; Google se simula insertando filas en `accounts`       |
| **Plataformas**              | Android y navegador (RF-1601); iOS fuera                                                    |
| **Objetivos de rendimiento** | Entrar con Google y ver «Mes» en < 2 min (CE-1601), el mismo listón que CE-001              |
| **Restricciones**            | Secretos fuera del repo (art. VI.3); logs sin emails (VI.4); datos que se guardan, en la UE |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                                                                                                                                                             | Estado |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Autenticación = Better Auth. Sin dependencias nuevas. No se añade el SDK nativo de Google (habría que justificar SHA-1 y otra librería).                                                                                                             | ✅     |
| II. Arquitectura por capas | Comparar emails al borrar es puro (`packages/domain`). El servidor comprueba la contraseña o el email; la app solo enseña el campo que toca.                                                                                                         | ✅     |
| III. Dinero y fechas       | El hogar nuevo sigue usando la zona del dispositivo (RF-002). Como el callback de Google no trae `x-timezone`, la app la envía en `PUT /api/me/timezone` justo al entrar.                                                                            | ✅     |
| IV. Datos y persistencia   | Sin migración. `users.image` se deja a `null`. Las consultas de borrar y de `hasPassword` filtran por el usuario de la sesión.                                                                                                                       | ✅     |
| V. API                     | Esquemas zod: `loginOptionsSchema`, `hasPassword` en `me`, `deleteAccountSchema` ampliado, `putTimezoneSchema`. `hasPassword` es campo **añadido**: la APK antigua lo ignora (V.4). `PUT /api/auth/*` de Better Auth ya es idempotente en reintento. | ✅     |
| VI. Seguridad y privacidad | Google solo confirma nombre y email; no se le envían movimientos ni hogares. Los tokens que Better Auth guarde viven en PostgreSQL (UE). El botón lo explica (RF-1606). Borrar exige contraseña o email (RF-039). POST de auth siguen con límite.    | ✅     |
| VII. Tests                 | Tests primero. Sin red a Google: cuentas «solo Google» se insertan en `accounts`. El baile OAuth de punta a punta se prueba a mano (CE-1601, CE-1602).                                                                                               | ✅     |
| VIII. Calidad y CI         | `pnpm check`. Textos en `src/i18n/es.ts`.                                                                                                                                                                                                            | ✅     |
| IX. App y plataformas      | El cliente nativo ya usa `@better-auth/expo` y `smartnomic://`. La diferencia web/Android del OAuth la aisla ese plugin, no las pantallas.                                                                                                           | ✅     |

Sin enmiendas. VI.6 habla de **los datos que se guardan** (siguen en la UE) y de avisos push que salen hacia Expo/FCM. Aquí no sale ningún dato del hogar: Google nos da la identidad que ya tiene. Se explica junto al botón, como la nota de la 014, sin tocar la constitución.

## Modelo de datos

Sin tablas nuevas. Better Auth ya tiene `accounts` (`provider_id`, `account_id`, `password`,
tokens). Email y contraseña usan `provider_id = 'credential'`; Google, `'google'`.

- **Tiene contraseña**: existe una fila `credential` con `password` no nulo.
- **Solo Google**: solo filas `google`, sin `credential`.
- **Vinculada**: las dos. Entrar funciona de las dos formas (RF-1604).
- `users.image`: no se rellena (`mapProfileToUser` no la copia; si Better Auth la pusiera, el
  gancho de alta la deja a `null`).

## Contrato

- `GET /api/login-options` (sin sesión) → `{ google: boolean }`. `true` solo si el servidor
  arrancó con las dos variables de Google. La app oculta el botón si es `false` o si la
  petición falla (RF-1607).
- `GET /api/me`: `user` gana `hasPassword: boolean`. Obligatorio en el esquema nuevo; la APK
  antigua no lo lee.
- `PUT /api/me/timezone` (sesión), cuerpo `{ timezone }` (`timeZoneSchema`) → `204`.
  `applySignupTimezone`: si el usuario es propietario de **exactamente un** hogar, ese hogar
  sigue en `Europe/Madrid` y la cuenta se creó hace menos de 15 min, se escribe la zona. En
  cualquier otro caso, 204 sin cambiar nada (quien ya tenía hogar, o Madrid de verdad, no se
  toca).
- `DELETE /api/account`: el cuerpo pasa a `{ password?: string, email?: string }` (al menos
  uno, cadenas no vacías). El servidor **no** se fía del campo que mande la app:
  - si `hasPassword`, exige `password` y `verifyPassword`; el email, si viene, se ignora;
  - si no, exige `email` y `emailsMatch` con el de la cuenta (minúsculas, sin espacios);
    una contraseña no basta.
- Better Auth, sin esquema nuestro: `POST /api/auth/sign-in/social` `{ provider: 'google', callbackURL }`.
  Sigue el límite de 10 POST/min de `/api/auth/*`.

## Servidor

- `createAuth` / `createApi` aceptan `google?: { clientId: string; clientSecret: string }`.
  Si viene, `socialProviders.google` con `prompt: 'select_account'` (para poder cambiar de
  cuenta de Google) y `mapProfileToUser` solo con `name` y `email`.
  `account.accountLinking`: `{ enabled: true, trustedProviders: ['google'],
  requireLocalEmailVerified: false }` — el alta con contraseña no verifica el email
  (`users.email_verified` queda en false). Better Auth, por defecto, no vincula Google a esa
  fila y Juan vuelve a Entrar sin cookie. Google ya comprueba el correo (RF-1604).
- `index.ts`: si están `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, se las pasa a `createApi`;
  si falta una, aviso en el log (sin valores) y el botón no existirá. Igual que Brevo.
- `GET /api/login-options` junto a las rutas de cuenta/sesión, no bajo `/api/auth/*` (eso lo
  traga Better Auth).
- `userHasPassword(db, userId)` y `applySignupTimezone` en `households.ts` (o un módulo
  `src/account.ts` si queda más claro: la consulta de `accounts` no es de hogares).
- Borrar cuenta: `emailsMatch` de `packages/domain`. Mensajes: «La contraseña no es correcta.»
  (como ahora) y «El email no coincide.» / «Escribe tu email.» Los logs no llevan el email
  escrito.
- Tests: `useTestServer` acepta `google?: { clientId; clientSecret }` (valores falsos, sin
  red). Por defecto, sin Google.

## App

- `GET /api/login-options` al abrir **Entrar** y **Crear cuenta** (TanStack Query, sin
  persistir). Si `google`, botón `secondary` «Continuar con Google» debajo del envío del
  formulario y una nota (`es.auth.google.privacy`). Sin icono de marca: el sistema de diseño
  no tiene el G de colores y no hace falta para el requisito.
- En la **web**, `authClient.signIn.social({ provider: 'google', callbackURL })` con
  `fetchOptions.headers` de `x-timezone`. `callbackURL` es la ruta. Tras éxito:
  `PUT /api/me/timezone` y `router.replace(next ?? '/')`.
- En **Android**, `continueWithGoogle` (`google.native.ts`) hace `POST /api/auth/sign-in/social`
  y abre el `expo-authorization-proxy` con `WebBrowser.openBrowserAsync` en **otra tarea**,
  visible en recientes (`createTask: true`, `showInRecents: true`, sin actividad proxy).
  La huella y el 2FA son otra actividad: si la pestaña comparte tarea con la APK
  (`singleTask`), Android la destruye. Se espera `smartnomic:///entrar?cookie=`; volver al
  frente (huella) no cancela. `captureAuthCallback` guarda la cookie si Android mata el
  proceso. Cerrar la pestaña no es un error (RF-1607). `next` sigue por `safeNext`.
  Red u otros errores: `authErrorMessage`.
- **Borrar mi cuenta**: si `me.user.hasPassword`, el campo de contraseña de hoy; si no, un
  campo de email. El botón y los dos toques no cambian. Propietario con más miembros, igual.
- `CACHE_BUSTER` → `entrar-google-1` (cambia la forma de `user` en `me`).
- Textos en `src/i18n/es.ts`.

## Configuración fuera del código (la hace el propietario)

Mismo proyecto de Google Cloud / Firebase que los avisos (014). **Tipo de cliente: aplicación
web** (el OAuth termina en el servidor, no hace falta cliente Android ni SHA-1).

1. **Pantalla de consentimiento OAuth** (externa, nombre Smartnomic). En pruebas basta el
   modo de prueba con los emails que vayan a entrar.
2. **Cliente OAuth «Aplicación web»**:
   - Orígenes JavaScript: la URL pública, `http://localhost:3000`, `http://localhost:8081`.
   - URIs de redirección: `http://localhost:3000/api/auth/callback/google` y
     `https://<dominio>/api/auth/callback/google` (`BETTER_AUTH_URL` + `/api/auth/callback/google`).
3. Variables, nunca en el repo: `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en
   `apps/server/.env` y en Railway. `.env.example` las nombra vacías.
4. Sin ellas el servidor arranca; email y contraseña siguen; el botón no se ve.

## Investigación y decisiones

| Decisión             | Elegido                                                                                                             | Alternativas descartadas                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flujo OAuth          | Código de autorización en el navegador (Custom Tab en otra tarea y recientes en Android; la web en el mismo origen) | SDK nativo + idToken: dependencia nueva y SHA-1; Custom Tab en la misma tarea: la huella destruye la pestaña                                                                    |
| Vincular por email   | `accountLinking` con Google de confianza y `requireLocalEmailVerified: false`                                       | Exigir la contraseña para vincular: Juan vería una cuenta vacía o un error (choca con RF-1604). Dejar el default de Better Auth: las cuentas de contraseña no entran con Google |
| Zona horaria         | `PUT /api/me/timezone` al volver de Google, con guarda de alta reciente                                             | Cookie en el callback: en Android el callback va por Chrome, no por la app, y no vería la cookie                                                                                |
| ¿Hay Google?         | `GET /api/login-options`                                                                                            | Variable `EXPO_PUBLIC_*`: obliga a recompilar la web; un servidor sin claves dejaría un botón que falla                                                                         |
| Confirmar el borrado | Contraseña si hay; si no, email                                                                                     | Reabrir Google: más flujo nativo. Obligar a poner contraseña: choca con la aclaración 3                                                                                         |
| Foto                 | No copiarla                                                                                                         | Guardarla y no mostrarla: dato personal de más, sin uso                                                                                                                         |
| Marca del botón      | Texto «Continuar con Google», variante `secondary`                                                                  | Colores oficiales de Google: chocan con los tokens (006) y no están en el catálogo de iconos                                                                                    |

## Riesgos

- **Pantalla de consentimiento en modo prueba**: quien no esté en la lista de testers verá un
  aviso de Google. Hasta publicar la app, es lo esperado.
- **`redirect_uri_mismatch`**: la URI tiene que ser exactamente `BETTER_AUTH_URL` +
  `/api/auth/callback/google`. Se documenta en el README.
- **Alta a medias**: si se crea la cuenta en Google y la app se cierra antes del
  `PUT` de zona, el hogar se queda en Madrid. Raro; no hay ajustes de zona hoy. Se acepta.
- **APK antigua**: no tiene el botón; email y contraseña siguen. `hasPassword` de más en
  `/api/me` no la rompe.
- **Callback `/` en Android**: si Google abre Chrome, `/` se resuelve a la web de Railway y
  la sesión se queda en el navegador. En nativo el `callbackURL` es `smartnomic://…`
  (`googleCallbackURL` en `auth-client.native.ts`).
- **Huella / 2FA en Android**: son otra actividad. Si el Custom Tab está en la misma tarea
  que la APK (`createTask: false`, `singleTask`), Android lo destruye al verificar la
  huella. La pestaña va en otra tarea y en recientes (`createTask: true`,
  `showInRecents: true`, sin proxy). Volver al frente no cancela la espera del deep link
  (G025).
- **Cuenta de contraseña sin verificar**: Better Auth no vincula Google si
  `email_verified` es false (defensa contra un registro previo con el Gmail de otra
  persona). Aquí no hay verificación de email; `requireLocalEmailVerified: false` cumple
  RF-1604. El riesgo de secuestro por registrarse antes con ese correo se acepta, igual
  que R1 de la auditoría (el alta ya revela si el email existe).

## Pruebas y cierre

- Dominio: `emailsMatch` (mayúsculas, espacios, distinto).
- Servidor (PostgreSQL real, **sin** llamar a Google):
  - sin claves: `GET /api/login-options` → `{ google: false }`; con claves de test → `true`;
  - con claves, `POST /api/auth/sign-in/social` `{ provider: 'google' }` responde una URL de
    cuentas de Google (no se sigue el redirect);
  - usuario solo Google (fila `accounts` insertada): `hasPassword: false`; borrar con email
    correcto 204; email distinto o vacío 400; contraseña 400 y la cuenta sigue;
  - usuario con contraseña: `hasPassword: true`; borrar solo con email 400; con contraseña
    bien, 204 (los tests de hoy siguen);
  - usuario con las dos filas: hace falta la contraseña;
  - `PUT /api/me/timezone`: alta reciente y un hogar en Madrid → se cambia; dos hogares, o
    zona ya distinta, o cuenta vieja → no se toca; zona inválida → 400; sin sesión → 401;
  - Google con el email de una cuenta de contraseña (`email_verified` false) vincula y
    entra en esa misma fila, no crea otra (RF-1604);
  - crear cuenta con email que ya existe (también si es solo Google) → el error de hoy;
  - batería de ataques: borrar la cuenta de otro, timezone de otro (no hay: es «yo»).
- App: `authErrorMessage` con cancelar; `hasPassword` decide el campo de borrar.
- Punta a punta en la web (Playwright, pila local) **cuando el propietario tenga las
  claves**: CE-1601 y CE-1602. Sin claves, el botón no está (CE automático).
- axe-core en **Entrar**, **Crear cuenta** y **Borrar mi cuenta** (con y sin contraseña) a
  320 y 1280 px (CE-1605).
- Android con la APK: CE-1601 y CE-1602 a mano (como T098).
- `expo export --platform web` y `pnpm check`.

## Estructura de archivos

```text
packages/domain/src/
├── email.ts                  # nuevo: emailsMatch
├── email.test.ts
└── index.ts                  # exporta ./email

packages/api/src/schemas/
├── households.ts             # user.hasPassword
├── account.ts                # deleteAccountSchema; putTimezoneSchema; loginOptionsSchema
└── …tests

apps/server/src/
├── auth.ts                   # socialProviders.google, accountLinking, mapProfileToUser
├── api.ts                    # opción google
├── index.ts                  # GOOGLE_CLIENT_ID / SECRET
├── account.ts                # nuevo: userHasPassword, applySignupTimezone
├── routes/me.ts              # hasPassword; PUT /timezone
├── routes/login-options.ts   # nuevo: GET /api/login-options
└── routes/account.ts         # borrar con contraseña o email

apps/server/test/
├── helpers.ts                # opción google; insertGoogleAccount()
├── auth.test.ts              # login-options, sign-in/social
├── account.test.ts           # borrar sin contraseña; timezone
└── …                         # hasPassword en GET /api/me

apps/mobile/
├── app/(auth)/entrar.tsx
├── app/(auth)/registro.tsx
├── app/(app)/delete-account.tsx
└── src/
    ├── api/client.ts         # loginOptions, putTimezone, deleteAccount({ password, email })
    ├── session/auth-errors.ts
    ├── cache/query-client.ts # CACHE_BUSTER
    └── i18n/es.ts

apps/server/.env.example
README.md                     # variables y consola de Google
AGENTS.md                     # estado
```

## Resultados (2026-11-14)

Implementado en `feat/016-entrar-google`. **923 tests** en verde (PostgreSQL real, sin llamar a
Google). `expo export --platform web` compila. Secretos, formato y lint en verde. El typecheck
de dominio, API y servidor pasa. El typecheck de la app en Windows chocaba con
`AnimatedList.tsx` / `animatedList.ts` (mismo nombre, distinta capitalización): el auxiliar
pasa a `trackList.ts`.

- **CE-1603**: cubierto por tests de ruta (email con mayúsculas y espacios borra una cuenta
  solo Google; con contraseña el email no basta, tampoco si hay las dos filas).
- **CE-1605** (axe): pendiente (G023). No hay Playwright en el repositorio; se hace a mano
  contra la web, como en la 015.
- **CE-1601**: cubierto en la web con la pila local (G024). **CE-1602 y CE-1604** pendientes
  de un segundo pase; **G025** (APK) pendiente. Sin claves, `GET /api/login-options` →
  `{ google: false }` y el botón no se pinta (tests).

Decisiones tomadas al implementar, que el plan no fijaba:

- `accountLinking` con Google de confianza queda **siempre** activo, con
  `requireLocalEmailVerified: false` (el alta con contraseña no verifica el email). Sin
  claves no hay proveedor que vincular; el alta con email no cambia.
- La zona del dispositivo no viaja en el callback de Google (en Android el Custom Tab no
  comparte cookies con la app). `PUT /api/me/timezone` se llama al montar la sesión
  (`SignedIn` en `app/(app)/_layout.tsx`), no solo tras pulsar el botón: cubre el redirect
  de página completa en la web.
- Las cuentas «solo Google» de los tests se fabrican con un alta de email y sustituyendo la
  fila `credential` por `provider_id = google`, para conservar una cookie de sesión válida.
- `GET /api/login-options` vive fuera de `/api/auth/*`: Better Auth se queda con ese
  prefijo.
