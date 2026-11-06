# Plan de implementación: Cambios en tiempo real

**Rama**: `feat/012-tiempo-real` | **Fecha**: 2026-11-06 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Cada app abierta mantiene una conexión **WebSocket** con el servidor
(`GET /api/realtime`). El servidor sabe de qué hogar es cada conexión y, cuando una petición
cambia algo de un hogar, envía a todas las conexiones de ese hogar un aviso mínimo:
`{ "type": "changed", "scope": "transactions" }`. El aviso no lleva datos; la app solo
invalida en TanStack Query las consultas de ese ámbito y las vuelve a pedir como siempre. Los
avisos salen de un único gancho de Fastify (`onResponse`) para todas las rutas que cambian algo,
así que no hay que acordarse de avisar ruta a ruta. Al reconectar, la app recarga todo lo del
hogar para ponerse al día.

## Contexto técnico

| Campo                        | Valor                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Node 22, Fastify 5, Expo 58 — igual que ahora                                |
| **Dependencias nuevas**      | `@fastify/websocket` (servidor), justificada abajo; en la app, ninguna (`WebSocket` ya existe)      |
| **Almacenamiento**           | Sin cambios: las conexiones viven en memoria del servidor                                           |
| **Tests**                    | Vitest: servidor con conexiones WebSocket reales (`injectWS`), mapa de avisos de la app, reconexión |
| **Plataformas**              | Android y navegador                                                                                 |
| **Objetivos de rendimiento** | Cambio visible en < 2 s (CE-1201); 50 conexiones sin empeorar las rutas (CE-1205)                   |
| **Restricciones**            | Los avisos sin datos personales (art. VI.4); WCAG 2.1 AA; sin push                                  |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                                                                                        | Estado |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Una dependencia nueva, `@fastify/websocket`: plugin oficial de Fastify, mantenido y con tipos. Se justifica en el PR (abajo).                                                   | ✅     |
| II. Arquitectura por capas | El servidor solo dice «cambió X en tu hogar»; la app decide qué recargar con un mapa puro y probado (`src/realtime/scopes.ts`).                                                 | ✅     |
| III. Dinero y fechas       | No aplica: los avisos no llevan importes ni fechas.                                                                                                                             | ✅     |
| IV. Datos y persistencia   | Sin cambios en el esquema; las cifras siguen saliendo de SQL en las rutas de siempre.                                                                                           | ✅     |
| V. API                     | El mensaje tiene su esquema zod en `packages/api` (`realtimeMessageSchema`); la app valida lo que llega.                                                                        | ✅     |
| VI. Seguridad y privacidad | Misma sesión que el resto (cookie o cabecera); `Origin` comprobado en el navegador; cada conexión, solo su hogar; sin datos en los avisos ni en los logs; límite de conexiones. | ✅     |
| VII. Tests                 | Tests primero: conexión sin sesión, otro hogar, aviso por cada tipo de cambio, quien sale del hogar deja de recibir, reconexión.                                                | ✅     |
| VIII. Calidad y CI         | `pnpm check`.                                                                                                                                                                   | ✅     |
| IX. App y plataformas      | El mismo código en Android y web; con la app en segundo plano se cierra la conexión (sin push, RF-1206).                                                                        | ✅     |

Sin incumplimientos.

### Por qué `@fastify/websocket`

- El navegador y React Native traen `WebSocket` de serie; para la otra opción, Server-Sent
  Events, React Native no trae `EventSource` y habría que añadir un polyfill en la app.
- Es el plugin oficial de Fastify: se integra con sus ganchos y su sesión, y trae `injectWS`
  para probar las conexiones sin abrir puertos.
- Escribirlo a mano sobre el módulo `ws` supondría gestionar la actualización HTTP y los
  errores que el plugin ya resuelve.

## Contrato

- `GET /api/realtime` con `Upgrade: websocket`. Sesión como en el resto de la API: en el
  navegador la cookie (y un `Origin` permitido, si no, `403`); en Android, la cabecera de sesión
  que ya envía la app. Sin sesión, `401`, y sin hogar, `403`, antes de aceptar la conexión.
- Mensajes del servidor (esquema en `packages/api/src/schemas/realtime.ts`):
  - `{ type: 'changed', scope }` con `scope` uno de `transactions`, `recurring`, `savings`,
    `budgets`, `categories`, `household`, `members`.
  - `{ type: 'ping' }` cada 25 s, para que el proxy de Railway no cierre la conexión por estar
    callada; la app no responde (el propio WebSocket detecta la caída).
- La app no envía nada por la conexión.

## Servidor

- `src/realtime/hub.ts`: un registro en memoria `hogar → conexiones`; `publish(householdId,
scope)` envía el aviso a todas. Sin dependencias de las rutas.
- `src/routes/realtime.ts`: la ruta de conexión (autenticación con el mismo
  `auth.api.getSession` que `household-access`), alta y baja en el hub, `ping` periódico.
- **Gancho único** `onResponse`: si la petición cambió algo (`POST`, `PUT`, `PATCH`, `DELETE`
  con respuesta 2xx) y su ruta es `/api/households/:householdId/<sección>…`, publica en ese
  hogar con el ámbito de la sección (`transactions`, `recurring`, `savings`, `budgets`,
  `categories`; `members`, `leave`, `transfer-ownership` e `invitations` → `members`; la ruta
  del propio hogar → `household`). Las pocas rutas sin el hogar en la URL (aceptar una
  invitación, borrar la cuenta) publican `members` a mano.
- **Quien deja de ser miembro**: con cada aviso `members`, el hub vuelve a comprobar en la base
  de datos qué conexiones de ese hogar siguen siendo de un miembro y cierra las demás (RF-1203,
  CE-1203). Su app se reconecta y queda en su nuevo hogar.
- **Límites**: como mucho 10 conexiones abiertas por cuenta (las de más se cierran, de la más
  antigua a la más nueva) y el límite de peticiones de siempre para abrir conexiones.
- **Varias instancias**: Railway corre una sola instancia (`railway.json` no pide más). Si un
  día hubiera varias, el hub tendría que repartir los avisos (por ejemplo, con `LISTEN/NOTIFY`
  de PostgreSQL); se deja anotado, no se hace ahora.

## App

- `src/realtime/scopes.ts`: qué consultas invalida cada ámbito (puro y probado):
  - `transactions` → `periods` (meses, gráficas y búsqueda) y `calendar`.
  - `recurring` → `recurring`, `upcoming`, `periods`, `calendar`.
  - `savings` → `savings`, `upcoming`, `periods`, `calendar`.
  - `budgets` → `periods`.
  - `categories` → `categories`, `periods`.
  - `household` → `me`, `periods`, `calendar`, `upcoming`.
  - `members` → `me` (rol y permisos), `members`, `invitations`.
- `src/realtime/useRealtime.ts`, montado en `SignedIn` junto a la bandeja de salida:
  - Abre la conexión con la app en primer plano (Android: `AppState`; web: visibilidad de la
    pestaña) y la cierra al pasar a segundo plano o cerrar sesión.
  - Agrupa los avisos que llegan en 300 ms y luego invalida una sola vez cada consulta
    afectada (CE-1204).
  - Reconecta sola con esperas crecientes (1, 2 y luego cada 5 s, para estar al día en menos de
    10 s al volver la conexión, CE-1202) y, al reconectar, invalida todo
    lo del hogar (RF-1204).
  - No muestra mensajes ni anuncia nada al lector de pantalla (RF-1202). Las pantallas de
    edición no cambian lo que se está escribiendo: sus formularios ya guardan su propio estado.
- La URL sale de `API_URL` cambiando `http` por `ws` (`https` → `wss`).

## Investigación y decisiones

| Decisión       | Elegido                                     | Alternativas descartadas                                                                   |
| -------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Transporte     | WebSocket                                   | SSE: React Native no trae `EventSource`; sondeo cada pocos segundos: más carga y más lento |
| Qué viaja      | Solo el ámbito («cambió transactions»)      | Los datos cambiados: más privacidad que proteger y dos caminos para los mismos datos       |
| Dónde se avisa | Un gancho `onResponse` para todas las rutas | Llamar a `publish` en cada ruta: fácil olvidarse de una                                    |
| Avisos propios | También llegan a quien hizo el cambio       | Excluir la conexión de origen: los otros dispositivos de la misma persona no se enterarían |
| Ponerse al día | Recargar todo lo del hogar al reconectar    | Guardar los avisos perdidos: más estado en el servidor para ahorrar unas pocas peticiones  |

## Riesgos

- **Proxy de Railway**: cierra conexiones calladas; el `ping` cada 25 s lo evita. Se comprueba
  en producción tras desplegar.
- **CSP**: `connect-src 'self'` debe admitir `wss` del mismo origen; se comprueba en el
  navegador y, si no, se añade el origen `wss` exacto.
- **Batería del móvil**: la conexión solo está abierta con la app en primer plano.

## Pruebas y cierre

- Servidor: sin sesión, otro hogar, `Origin` no permitido, aviso por cada tipo de cambio, sin
  datos en los avisos, quien sale deja de recibir, límite de conexiones.
- Batería de ataques ampliada (conectarse a otro hogar, sesión robada o caducada, mensajes del
  cliente, muchas conexiones).
- Punta a punta con dos navegadores (dos miembros): cada tipo de cambio en menos de 2 s, corte
  de 30 s y reconexión, 20 cambios seguidos, quitar a un miembro; las anteriores siguen
  pasando; tiempos de las rutas con 50 conexiones abiertas.
- `expo export --platform android`.

## Resultados

- `pnpm check` en verde: 655 tests (18 del servidor con conexiones reales: sesión, `Origin`,
  un aviso por cada tipo de cambio, sin datos, otro hogar, quien sale, sesión cerrada, límite de
  conexiones y `ping`; y los de la app: qué recarga cada aviso, agrupar avisos, URL y esperas de
  reconexión).
- CE-1201: con dos miembros en dos navegadores, cada cambio se ve en la otra sesión sin recargar:
  movimiento 340 ms, presupuesto 333 ms, hucha 352 ms, pago recurrente 372 ms, pagar un
  vencimiento 371 ms, categoría 346 ms, ajustes del hogar 344 ms, cambio de rol 333 ms (a quien
  pasa a lector le desaparece «Apuntar»).
- CE-1202: cortando 30 s la conexión en tiempo real con un gasto por medio, se ve 3,1 s después
  de recuperarla; tras reiniciar el servidor, 1 s; al volver de segundo plano, 67 ms (en segundo
  plano la conexión se cierra y no llega nada).
- CE-1203: quien es quitado queda en su hogar nuevo en menos de 1 s y deja de recibir avisos
  del anterior; un miembro de otro hogar no recibe nada, aunque pida el hogar ajeno en la URL.
- CE-1204: 20 movimientos casi a la vez se ven en 414 ms con una sola recarga en la otra sesión.
- CE-1205: con 50 conexiones abiertas recibiendo avisos, las rutas responden igual (mediana
  3,8 ms frente a 4,2 ms; p95 12,8 ms frente a 13,3 ms). Pasan las pruebas de punta a punta
  anteriores.
- Batería de ataques: sin sesión o con cookie inventada, 401; `Origin` ajeno o `null`, 403; los
  mensajes del cliente se ignoran (500 seguidos no llegan a nadie) y uno de más de 1 KB cierra
  la conexión (1009); como mucho 10 conexiones por cuenta; 200 intentos sin sesión, todos 401.
  Encontró que una conexión abierta antes de cerrar la sesión seguía recibiendo avisos: ahora se
  cierra con el siguiente `ping` (como mucho 25 s).
- axe-core sin problemas en las 29 pantallas a 320 y 1280 px.
- `expo export --platform android` compila.
- Queda tras desplegar: comprobar que el proxy de Railway mantiene la conexión y que la CSP
  admite `wss`. Si la sesión se cierra en otro dispositivo, la app reintenta conectar cada 5 s
  (recibe 401) hasta que vuelve a entrar; como antes, la app no trata ese 401 de forma general.
