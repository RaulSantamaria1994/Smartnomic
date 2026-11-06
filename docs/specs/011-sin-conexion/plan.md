# Plan de implementación: Apuntar movimientos sin conexión

**Rama**: `feat/011-sin-conexion` | **Fecha**: 2026-11-06 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Una **bandeja de salida** en el móvil guarda los movimientos nuevos que no se pudieron enviar
por falta de conexión. Cada uno ya lleva su id UUIDv7 creado en el móvil y la ruta `PUT
/transactions/:id` es idempotente (especificación 001), así que reenviarlo nunca lo duplica:
**el servidor no cambia**. La bandeja se guarda en AsyncStorage por cuenta, se vacía sola de uno
en uno en el orden en que se apuntaron, y clasifica cada fallo como «reintentar» (conexión,
servidor, sesión) o «rechazado» (datos o permisos, con el motivo). «Mes» mezcla los pendientes
con los movimientos del servidor y suma su efecto en el resumen y en los presupuestos con
funciones de `packages/domain`. Sin dependencias nuevas.

## Contexto técnico

| Campo                   | Valor                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| **Lenguaje/versión**    | TypeScript (`strict`), Expo 58 — igual que ahora                                                   |
| **Dependencias nuevas** | Ninguna: AsyncStorage y zustand ya están                                                           |
| **Almacenamiento**      | En el móvil: AsyncStorage, clave por cuenta. En el servidor: sin cambios (ni rutas ni migraciones) |
| **Tests**               | Vitest: dominio (resumen y presupuestos con pendientes, clasificar fallos) y motor de la bandeja   |
| **Plataformas**         | Android (la web necesita conexión, art. IX.3)                                                      |
| **Restricciones**       | Céntimos enteros; agregaciones en `packages/domain` (art. IV.5); estilo de la 006; WCAG 2.1 AA     |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                                        | Estado |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Sin dependencias nuevas.                                                                                                        | ✅     |
| II. Arquitectura por capas | Resumen y presupuestos con pendientes y la clasificación de fallos en `packages/domain/src/outbox.ts`; la bandeja en la app.    | ✅     |
| III. Dinero y fechas       | Los pendientes guardan `TransactionInput` (céntimos y fecha `YYYY-MM-DD`); el mes lo decide el periodo del hogar, como siempre. | ✅     |
| IV. Datos y persistencia   | El servidor no cambia; los totales del servidor siguen saliendo de SQL y los pendientes se suman en el dominio (IV.5).          | ✅     |
| V. API                     | Se usa la misma ruta y el mismo esquema que al apuntar con conexión.                                                            | ✅     |
| VI. Seguridad y privacidad | La bandeja va en el almacenamiento privado de la app, separada por cuenta y borrada al cerrar sesión; los logs no cambian.      | ✅     |
| VII. Tests                 | Tests primero; el motor se prueba con almacenamiento y API falsos (cortes, reinicios, rechazos), además de punta a punta.       | ✅     |
| VIII. Calidad y CI         | `pnpm check`; textos en `es.ts`.                                                                                                | ✅     |
| IX. App y plataformas      | Solo Android (IX.2); la diferencia se aísla en `outbox-storage.native.ts` / `outbox-storage.ts`; en la web todo sigue igual.    | ✅     |

Sin incumplimientos.

## Datos en el móvil

```text
PendingTransaction {
  id            uuid v7 (el del movimiento; el mismo al reenviar)
  householdId   hogar en que se apuntó
  input         TransactionInput (kind, amountCents, date, categoryId, note)
  createdAt     instante en que se apuntó (para el orden)
  status        'waiting' | 'rejected'
  reason        texto del servidor si está rechazado
}
```

Se guarda en AsyncStorage con la clave `smartnomic-outbox:<userId>`: otra cuenta en el mismo
móvil no la ve. Cerrar sesión la borra (tras confirmar si tiene algo).

## Dominio (`packages/domain/src/outbox.ts`)

- `sendOutcome(status)` → `'sent' | 'retry' | 'rejected'` a partir del código HTTP: 2xx enviado;
  sin respuesta, 401, 408, 429 y 5xx, reintentar; el resto de 4xx (400, 403, 404, 409, 422),
  rechazado.
- `summaryWithPending(summary, pending)` → el resumen del periodo sumando ingresos y gastos de
  los pendientes que caen en él (solo los `waiting`: un rechazado no se va a guardar tal cual).
- `budgetsWithPending(budgets, pending)` → lo gastado de cada presupuesto más los gastos
  pendientes de su categoría.
- `pendingInPeriod(pending, period)` → los del periodo, por fecha.

## App

```text
apps/mobile/
├── src/outbox/outbox.ts               # motor: añadir, corregir, descartar, enviar (sin React)
├── src/outbox/outbox-storage.native.ts # AsyncStorage
├── src/outbox/outbox-storage.ts       # web: sin bandeja (salvo la compilación de pruebas, abajo)
├── src/outbox/useOutbox.ts            # estado (zustand) y envío automático
├── app/(app)/new.tsx                  # sin conexión → a la bandeja y se cierra
├── app/(app)/pending/[id].tsx         # nuevo: corregir o descartar un pendiente
├── app/(app)/(tabs)/index.tsx         # aviso, pendientes en la lista, resumen y presupuestos
├── app/(app)/(tabs)/account.tsx       # cerrar sesión con pendientes pide confirmación
└── src/i18n/es.ts                     # textos
```

- **Motor** (`outbox.ts`): funciones puras sobre una lista y un almacenamiento inyectado, con un
  candado para que no haya dos envíos a la vez. `flush(api)` recorre los `waiting` en orden: si
  sale bien lo quita; si es `retry` para y deja el resto para luego (no tiene sentido seguir sin
  conexión); si es `rejected` lo marca con el motivo y sigue con el siguiente. Después de enviar
  al menos uno, invalida `periods` para que «Mes», gráficas y búsqueda se recarguen.
- **Cuándo se envía**: al abrir la app, al volver a primer plano, cada 30 s mientras haya
  pendientes y la app esté abierta, después de cualquier petición que salga bien (señal de que
  hay conexión) y con «Enviar ahora». No se usa una librería para detectar la red: los
  reintentos baratos cubren lo que pide la especificación sin una dependencia nueva.
- **Apuntar** (`new.tsx`): si guardar falla con `network` y la bandeja está disponible, se añade
  con el mismo id y el formulario se cierra; el aviso de «Mes» lo dice y se anuncia al lector de
  pantalla («Sin conexión: se enviará cuando vuelva»). Con otro error, el formulario lo muestra
  como hasta ahora.
- **«Mes»**: los pendientes del periodo se mezclan con los movimientos por fecha y se pintan con
  `TransactionRow` y un estado («Pendiente de enviar» o «No se ha podido enviar: …», con
  `StatusText`); el resumen y los presupuestos usan `summaryWithPending` y `budgetsWithPending`.
  Arriba, con `ReminderBanners`, el aviso «N movimientos sin enviar» y «Enviar ahora».
- **Corregir o descartar** (`/pending/:id`): el mismo `TransactionForm` con los datos del
  pendiente; guardar lo deja en `waiting` (y lo intenta enviar), «Descartar» pide confirmación.
- **Cerrar sesión**: con pendientes, un diálogo con cuántos se perderían.
- **Pruebas en el navegador**: la web de producción no tiene bandeja. Una compilación de pruebas
  con `EXPO_PUBLIC_E2E_OUTBOX=1` usa `localStorage` como almacenamiento, solo para poder probar
  de punta a punta con Playwright; esa variable no existe en producción.

## Investigación y decisiones

| Decisión               | Elegido                                                              | Alternativas descartadas                                                                      |
| ---------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Evitar duplicados      | El id del móvil y el `PUT` idempotente que ya existen                | Un id de «operación» aparte: no hace falta                                                    |
| Detectar la conexión   | Reintentos (abrir, primer plano, cada 30 s, tras una petición buena) | `@react-native-community/netinfo`: otra dependencia para lo mismo                             |
| Dónde se guarda        | AsyncStorage por cuenta                                              | La caché de TanStack Query (mutaciones en pausa): se borra con la caché y no permite corregir |
| Orden y fallos         | De uno en uno; un rechazo no para la cola, un fallo de red sí        | En paralelo: el orden de llegada cambiaría y se saturaría al volver la conexión               |
| Totales con pendientes | En `packages/domain`, sobre el resumen del servidor                  | Sumar en la pantalla: lo prohíbe el art. IV.5                                                 |

## Riesgos

- **Pendientes antiguos**: si alguien no abre la app en semanas, se envían al abrirla; la fecha
  del movimiento es la que eligió, así que cae en su mes.
- **Permisos perdidos**: si a quien apuntó lo pasan a lector o lo sacan del hogar, se rechaza
  con el motivo y puede descartarlo; no hay forma de guardarlo por otro.
- **Probar en Android real**: el almacenamiento de Android solo se prueba con el APK; el motor
  y la interfaz se prueban con almacenamiento falso y en el navegador con la compilación de
  pruebas.

## Pruebas y cierre

- Motor: almacenamiento y API falsos con cortes a mitad del envío, reinicios (volver a leer del
  almacenamiento), rechazos de cada tipo y dos envíos a la vez (CE-1101, CE-1102).
- Punta a punta (compilación de pruebas, red cortada con Playwright): apuntar sin conexión,
  verlo pendiente en «Mes» con el resumen y el presupuesto, recargar la app, recuperar la red y
  ver que llega una vez; un rechazo, corregirlo y descartarlo; cerrar sesión con pendientes.
- axe-core en «Mes» con pendientes y un rechazado a 320 y 1280 px; `expo export --platform
android`.
