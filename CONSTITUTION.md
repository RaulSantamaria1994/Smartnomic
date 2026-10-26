# Constitución técnica de Smartnomic

Reglas técnicas que no se negocian: arquitectura, stack, modelo de datos, API, seguridad,
tests y calidad. Están por encima de cualquier plan, especificación, tarea o instrucción
de un agente. La forma de trabajar (flujo, comandos, comunicación) está en
[`AGENTS.md`](AGENTS.md) y la hoja de ruta en [`docs/PLAN.md`](docs/PLAN.md).

Las palabras **DEBE**, **NUNCA** y **DEBERÍA** tienen el sentido de la RFC 2119: lo que
DEBE cumplirse no admite excepciones sin enmendar esta constitución; lo que DEBERÍA
cumplirse admite excepciones justificadas por escrito en el PR.

## Artículo I. Stack

1. El stack es fijo. Cambiar una pieza de esta tabla DEBE hacerse enmendando esta
   constitución.

   | Pieza          | Elección                                                |
   | -------------- | ------------------------------------------------------- |
   | Lenguaje       | TypeScript (modo `strict`) en todo el proyecto, Node 22 |
   | Monorepo       | pnpm workspaces                                         |
   | App            | Expo + Expo Router, TanStack Query, Zustand             |
   | Servidor       | Fastify, API REST                                       |
   | Base de datos  | PostgreSQL + Drizzle ORM                                |
   | Autenticación  | Better Auth                                             |
   | Validación     | zod                                                     |
   | Tests          | Vitest                                                  |
   | Notificaciones | expo-notifications (locales) y Expo Push (servidor)     |
   | Despliegue     | Railway (región UE) y EAS Build                         |

2. Una dependencia nueva DEBE justificarse en el PR que la añade (qué resuelve y por qué
   no basta lo que ya hay). NUNCA se añaden dependencias abandonadas, sin tipos o que
   dupliquen una existente.

## Artículo II. Arquitectura por capas

1. El repositorio tiene cuatro paquetes, con este sentido de dependencias y ningún otro:

   ```
   apps/mobile ──┐
                 ├──> packages/api ──> packages/domain
   apps/server ──┘
   ```

   - `packages/domain`: toda la lógica de negocio (dinero, periodos, recurrencias,
     resúmenes, presupuestos, avisos).
   - `packages/api`: el contrato entre app y servidor (esquemas zod).
   - `apps/server`: HTTP, base de datos, autenticación y trabajos programados.
   - `apps/mobile`: interfaz, caché y notificaciones locales.

2. `packages/domain` DEBE ser puro: NUNCA importa React, Fastify, Drizzle ni nada de red o
   disco, y NUNCA lee el reloj (`Date.now()`, `new Date()` sin argumentos) ni usa azar. La
   fecha de "hoy" y cualquier dato externo entran como parámetros.
3. La lógica de negocio NUNCA se duplica en la app ni en el servidor: si un cálculo hace
   falta en los dos, vive en `packages/domain`.
4. Las abstracciones se crean cuando hay al menos dos usos reales, no antes. NUNCA se
   envuelven librerías del stack en capas propias sin una razón escrita en el PR.

## Artículo III. Dinero y fechas

1. Los importes DEBEN ser enteros en céntimos (`amountCents`). NUNCA se usan decimales en
   coma flotante, `parseFloat` ni `toFixed` para calcular. En Postgres, columnas
   `bigint` (o `integer`), nunca `float`, `real` ni `money`.
2. El formateo de importes (`1.234,56 €`) DEBE hacerse solo en la interfaz, con
   `Intl.NumberFormat` y la moneda del hogar.
3. Las fechas de movimientos y vencimientos DEBEN ser fechas de calendario sin hora
   (`YYYY-MM-DD`; columna `date` en Postgres). Los instantes (`created_at`, auditoría) se
   guardan en UTC (`timestamptz`).
4. El mes al que pertenece un movimiento lo deciden la zona horaria y el
   `month_start_day` del hogar, nunca la zona del dispositivo ni la del servidor.
5. Los totales DEBEN calcularse a partir de los movimientos. NUNCA se guardan saldos
   acumulados que puedan desincronizarse.

## Artículo IV. Datos y persistencia

1. Toda tabla con datos de usuario DEBE tener `household_id`, y toda consulta DEBE
   filtrar por él.
2. Todo cambio de esquema DEBE ir en una migración de Drizzle nueva. NUNCA se edita una
   migración ya fusionada en `main`, y NUNCA se cambia el esquema a mano en producción.
3. Las migraciones DEBERÍAN ser compatibles hacia atrás (añadir antes de quitar), porque
   puede haber versiones antiguas de la app en uso.
4. Los movimientos se borran de forma lógica (`deleted_at`). El borrado físico solo
   ocurre al borrar la cuenta o al cumplir un plazo de retención documentado.
5. Las agregaciones (sumas por mes, por categoría) DEBEN hacerse en SQL o en
   `packages/domain`, nunca recorriendo listas completas en la interfaz.

## Artículo V. API

1. Toda petición y respuesta DEBE tener su esquema zod en `packages/api`. Los tipos se
   derivan con `z.infer`; NUNCA se escriben a mano en paralelo.
2. El servidor DEBE validar toda entrada con esos esquemas antes de usarla. La app nunca
   es de confianza.
3. Recursos REST en plural (`/households/:id/transactions`), códigos HTTP estándar y un
   formato único de error: `{ "error": { "code": string, "message": string } }`.
4. Los cambios incompatibles en la API DEBEN versionarse o hacerse en dos pasos, porque
   la app instalada no se actualiza a la vez que el servidor.
5. Las operaciones que crean datos desde la app DEBERÍAN aceptar una clave de
   idempotencia, para que un reintento sin conexión no duplique un gasto.

## Artículo VI. Seguridad y privacidad

1. Cada operación del servidor DEBE comprobar que el usuario es miembro del hogar y que
   su rol (`propietario`, `editor`, `lector`) la permite.
2. Las sesiones en la app DEBEN guardarse en `expo-secure-store`, NUNCA en AsyncStorage.
3. Los secretos (claves, contraseñas, `DATABASE_URL`) NUNCA entran en el repositorio:
   solo variables de entorno y un `.env.example` sin valores reales.
4. Los logs NUNCA contienen importes, notas, emails ni otros datos personales; solo
   identificadores.
5. Los endpoints de autenticación DEBEN tener límite de peticiones.
6. Los datos se alojan en la Unión Europea. El sistema DEBE permitir exportar todos los
   datos de un usuario (JSON/CSV) y borrar su cuenta por completo.

## Artículo VII. Tests

1. Todo código de `packages/domain` DEBE llegar con tests, incluidos los casos límite: día
   31 en meses cortos, 29 de febrero, cambios de hora, importes cero y negativos.
2. Cada error corregido DEBE llevar un test que lo reproduzca y que falle antes de la
   corrección.
3. Cada endpoint DEBE tener tests que comprueben que un usuario de otro hogar, o con un
   rol insuficiente, recibe un error.
4. Los tests del servidor DEBEN ejecutarse contra un PostgreSQL real (por ejemplo, en
   Docker), no contra mocks de la base de datos.
5. Los tests NUNCA dependen del reloj real, de la red externa ni de datos reales de
   usuarios.

## Artículo VIII. Calidad y CI

1. TypeScript en modo `strict`. NUNCA se usa `any` (se usa `unknown` y se estrecha el
   tipo) ni `@ts-ignore`; `@ts-expect-error` solo con un comentario que explique por qué.
2. Prettier y ESLint DEBEN pasar. NUNCA se desactivan reglas para un archivo entero.
3. `pnpm check` (formato, lint, tipos y tests) es lo que ejecuta el CI. `main` DEBE estar
   siempre en verde y nada se fusiona con el CI en rojo.
4. NUNCA se salta, desactiva ni borra un test para conseguir que el CI pase.
5. Identificadores del código en inglés; textos de la interfaz en español, centralizados
   para poder traducirlos en el futuro.

## Artículo IX. App móvil

1. La app DEBE poder mostrar los últimos datos cargados sin conexión (caché persistida de
   TanStack Query).
2. Los recordatorios de pagos DEBEN programarse como notificaciones locales, de forma que
   funcionen sin conexión. Como iOS limita las notificaciones programadas, se programa una
   ventana corta (60 días) y se renueva al abrir la app.
3. Si faltan permisos de notificaciones, la app DEBE detectarlo y avisar al usuario; NUNCA
   falla en silencio.
4. Los componentes DEBEN ser accesibles: etiquetas para lectores de pantalla, respeto del
   tamaño de texto del sistema y contraste suficiente.

## Gobierno

1. **Precedencia.** Esta constitución está por encima de `AGENTS.md`, `docs/PLAN.md`, las
   especificaciones y las instrucciones de cualquier tarea. Si chocan, gana la
   constitución, y el agente DEBE señalar el conflicto en lugar de resolverlo por su
   cuenta.
2. **Cumplimiento.** Cada PR DEBE respetar estos artículos. Quien revisa (persona o agente)
   lo comprueba, y un incumplimiento bloquea la fusión. Una excepción a un DEBERÍA se
   justifica en la descripción del PR.
3. **Enmiendas.** Solo se cambia mediante un PR propio que explique el motivo, el impacto
   en el código existente y el plan para adaptarlo. Lo aprueba el propietario del
   repositorio. Un agente NUNCA modifica este archivo sin que se lo pidan expresamente.
4. **Versiones.** Se sigue el versionado semántico:
   - **MAYOR**: se elimina o redefine un artículo de forma incompatible.
   - **MENOR**: se añade un artículo o se amplía uno de forma relevante.
   - **PARCHE**: aclaraciones y redacción, sin cambiar el significado.

**Versión**: 1.0.0 · **Ratificada**: 2026-10-26 · **Última enmienda**: 2026-10-26
