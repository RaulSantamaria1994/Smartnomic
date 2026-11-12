# AGENTS.md

Cómo trabajar en este repositorio si eres un agente de código (Claude Code, Codex,
Copilot…). Las personas también pueden leerlo.

## Qué es Smartnomic

App móvil para que un hogar apunte sus ingresos y gastos mensuales, entienda en qué se va
el dinero y reciba recordatorios antes de cada pago.

## Documentos que debes conocer

| Documento                                      | Para qué                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| [`docs/CONSTITUTION.md`](docs/CONSTITUTION.md) | Reglas técnicas obligatorias. **Mandan sobre todo lo demás.**      |
| `docs/specs/NNN-nombre/spec.md`                | Qué debe hacer una funcionalidad y por qué (historias, requisitos) |
| `docs/specs/NNN-nombre/plan.md`                | Cómo se construye: decisiones, datos, API, estructura              |
| `docs/specs/NNN-nombre/tasks.md`               | Tareas ordenadas para implementarla                                |
| `AGENTS.md` (este)                             | Forma de trabajar: flujo, comandos, comunicación                   |

Antes de escribir código, lee la constitución. Si una tarea choca con ella, no la
resuelvas por tu cuenta: explica el conflicto y pregunta.

## Flujo de cada funcionalidad

Ninguna funcionalidad se programa sin antes tener, en este orden, sus tres documentos en
`docs/specs/NNN-nombre/` (`NNN` es un número correlativo: `001`, `002`…):

1. **`spec.md`**: qué y por qué, desde el punto de vista del usuario, sin tecnología.
   Historias priorizadas, escenarios de aceptación, casos límite, requisitos y criterios
   de éxito. Las dudas se marcan como `[NECESITA ACLARACIÓN: …]` y se resuelven con el
   propietario antes de seguir.
2. **`plan.md`**: cómo se construye. Contexto técnico, comprobación de la constitución,
   investigación y decisiones, modelo de datos, contratos de la API y estructura de
   archivos.
3. **`tasks.md`**: tareas pequeñas y ordenadas por historia, cada una con los archivos
   que toca y cómo se comprueba.

Cada documento se revisa y aprueba antes de pasar al siguiente. Después se implementa
siguiendo `tasks.md`, marcando las tareas hechas. Si al implementar algo cambia, se
actualizan primero los documentos.

## Estado actual

Funcionalidades terminadas: **`001-mvp-hogar`** (falta probarla en Android con el APK, T098
y T099), **`002-calendario`**, **`003-diseno-visual`**, **`004-iconos-categorias`** y
**`005-hucha`** (huchas: lo ahorrado, la cuota y las pendientes se calculan en
`packages/domain/src/savings.ts`, nunca se guardan) y **`006-estilo-android`** (estilo
Android estándar y ocho animaciones pequeñas; sustituye al estilo «Calma» de la 003) y
**`007-presupuestos`** (presupuesto mensual por categoría de gasto: la tabla `budgets` guarda
los cambios con el periodo desde el que valen; lo gastado se suma en SQL en la ruta del
periodo, con `budgetsBetween` de `apps/server/src/routes/budgets.ts`, y nunca se guarda) y
**`008-graficas`** (pestaña «Gráficas» con cuatro gráficas de barras; una sola ruta,
`GET /api/households/:id/charts/:start` en `apps/server/src/routes/charts.ts`, suma en SQL los 6
periodos que terminan en `:start`; la ventana y los porcentajes salen de
`packages/domain/src/charts.ts`, y la caché de las gráficas cuelga de `periods` en
`apps/mobile/src/api/queryKeys.ts` para refrescarse con los meses) y **`009-busqueda`**
(búsqueda de movimientos por tipo, categorías, importe y fechas: `GET
/api/households/:id/transactions/search` en `apps/server/src/routes/search.ts`, paginada por
clave con cursor y con el número y los totales sumados en SQL; la búsqueda cuelga también de
`periods` pero no se guarda en la caché de Android, ver `persistable`). Todo lo que cuelga de
`periods` no son solo meses: para encontrar un movimiento cargado se usa
`findCachedTransaction`. **`010-exportar-csv`** exporta a CSV (para Excel en español) lo que
muestra la búsqueda: `GET /api/households/:id/transactions/export` en
`apps/server/src/routes/export-csv.ts`, con los mismos filtros que la búsqueda
(`routes/transaction-filters.ts`) y el formato en `packages/domain/src/csv.ts` (comillas y
protección contra fórmulas). **`011-sin-conexion`**: en Android, un movimiento nuevo que no
se puede guardar por falta de conexión va a una bandeja de salida (`apps/mobile/src/outbox/`,
AsyncStorage por cuenta) y se envía solo después con su mismo id (el `PUT` es idempotente); el
servidor no cambia. Los totales con pendientes salen de `packages/domain/src/outbox.ts`. En la
web no hay bandeja, salvo la compilación de pruebas con `EXPO_PUBLIC_E2E_OUTBOX=1`.
**`013-varios-hogares`**: una persona puede ser miembro de hasta 5 hogares
(`MAX_HOUSEHOLDS` en `packages/domain`). El servidor comprueba cada petición contra el hogar de
la URL (`requireMember` con `:householdId`; una ruta con `requireMember` sin él responde 403) y
`findMembership(db, userId, householdId)` da la pertenencia a ese hogar; no hay «el» hogar de
un usuario. `GET /api/me` lista `households` y repite el primero en `household`/`member` para
la APK instalada antes de varios hogares (quitarlos es un segundo paso). En la app, el hogar
elegido sale de `useHousehold()` (`src/households/active.ts`, guardado por cuenta en el
dispositivo); no uses `me.household`. Crear un hogar y aceptar invitaciones pasan por
`lockUserHouseholds` para no superar el máximo con peticiones a la vez. La caché de Android
lleva versión (`CACHE_BUSTER`): cámbiala si cambia la forma de lo guardado.
**`012-tiempo-real`**: el servidor avisa por WebSocket (`@fastify/websocket`, dependencia
añadida por esta funcionalidad) a las apps abiertas de un hogar de qué ha cambiado, sin datos:
`{ type: 'changed', scope }` (esquema en `packages/api/src/schemas/realtime.ts`). Los avisos
salen de un único gancho `onResponse` en `apps/server/src/routes/realtime.ts` según la URL de
la ruta (`/api/households/:householdId/<sección>`); las rutas sin el hogar en la URL lo añaden a
mano con `request.realtime`. Una ruta nueva bajo un hogar avisa sola; si su sección no está en
`SCOPES`, añádela. Las conexiones viven en memoria (`src/realtime/hub.ts`, una sola instancia);
se cierran (4001) si el usuario deja el hogar o su sesión termina. En la app,
`src/realtime/useRealtime.ts` decide qué consultas recargar con `src/realtime/scopes.ts`.
**`015-ordenar-mes-hogar`**: «Mes» enseña como máximo 3 presupuestos y 5 próximos pagos con «Ver
todos», y los bloques vacíos son una sola fila; el recorte lo hace `limitRows`
(`packages/domain/src/lists.ts`), que nunca esconde un pago atrasado. Borrar la cuenta vive en
`app/(app)/delete-account.tsx` (en «Hogar» solo hay una fila que lleva a ella) y su botón es la
variante `destructive` de `Button` (rojo relleno, `color.bg.destructive`). Sin cambios en el
servidor. Faltan por probar con la pila real y en Android las tareas O014, O017 y la prueba con
el APK.

El aspecto de la app sale del sistema de diseño de `apps/mobile/src/design/` (tokens y
componentes); ESLint impide usar colores, tamaños, pesos o familias de letra sueltos fuera
de él; un test impide los emoji (los iconos de categoría son identificadores de un catálogo
cerrado del dominio) y otro (`noAiTells.test.ts`) las tarjetas, las pastillas de estado, los
fondos detrás de los iconos y los «Volver»/«Cancelar» al pie. Las animaciones pasan por
`src/design/motion.ts` para respetar «reducir movimiento». No inventes comandos, rutas
ni archivos que no existan; si algo de este documento aún no existe, dilo. Cuando cambien
la estructura o los comandos, actualiza este archivo en el mismo PR.

## Comandos

```sh
pnpm install
docker compose up -d                   # PostgreSQL en local
pnpm --filter @smartnomic/server db:generate  # migración nueva tras cambiar el esquema
pnpm --filter @smartnomic/server db:migrate   # aplica las migraciones (usa DATABASE_URL)
pnpm check                             # formato + lint + tipos + tests (lo mismo que el CI)
pnpm test                              # solo tests
pnpm format                            # arregla el formato
pnpm --filter @smartnomic/server dev   # servidor en http://localhost:3000
pnpm --filter @smartnomic/mobile start # app con Expo (Android y web)
pnpm --filter @smartnomic/mobile export:web  # web para producción en apps/mobile/dist
```

Los tests del servidor usan PostgreSQL real (`TEST_DATABASE_URL`, por defecto la base
`smartnomic_test` de `docker compose`). Sin la base de datos en marcha, fallan.

## Cómo trabajar una tarea

1. **Entiende antes de tocar.** Lee el código relacionado y la `spec.md`, el `plan.md` y
   la tarea de `tasks.md` de la funcionalidad.
2. **Empieza por el dominio.** Si la tarea tiene lógica de negocio, escríbela primero en
   `packages/domain` con sus tests; después la API, después la interfaz.
3. **Cambios pequeños.** Haz solo lo que pide la tarea. Si ves algo más que arreglar,
   apúntalo en tu respuesta en lugar de arreglarlo en el mismo cambio.
4. **Verifica.** Ejecuta `pnpm check`. Si tocas la app, pruébala en Expo cuando sea
   posible.
5. **Informa con honestidad.** Di qué has hecho, qué has comprobado y qué no. Si un test
   falla o un paso no se pudo hacer, dilo con la salida del error; nunca lo des por bueno.

## Definición de terminado

Una tarea está terminada cuando:

- `pnpm check` pasa sin errores.
- Cumple la constitución (repasa los artículos que toca el cambio).
- Hay tests para lo nuevo y para cualquier error corregido.
- La documentación afectada (`AGENTS.md`, `spec.md`, `plan.md`, `tasks.md`, README) está actualizada.

## Git y PRs

- `main` siempre en verde. Cada cambio en su rama: `feat/…`, `fix/…`, `chore/…`,
  `docs/…`.
- Commits pequeños, en español e imperativo: `Añade el cálculo del balance mensual`.
- Un PR por cambio coherente o por funcionalidad. La descripción explica qué cambia,
  por qué y cómo se ha probado, y justifica cualquier dependencia nueva o excepción a un
  DEBERÍA de la constitución.
- No hagas `push --force` sobre ramas compartidas ni reescribas el historial de `main`.
- No abras PRs ni hagas merge si no te lo piden.

## Comunicación

- Responde y escribe documentación, commits y PRs en **español**.
- Sé concreto: rutas de archivo, nombres de función, comandos exactos.
- Si tienes dudas sobre lo que se quiere, pregunta una sola vez con opciones claras y tu
  recomendación, en lugar de suponer.

## Qué preguntar antes de hacer

Para y pregunta cuando la tarea implique:

- Algo que choque con `docs/CONSTITUTION.md`, o modificar ese archivo.
- Cambiar una decisión de una `spec.md` o un `plan.md` ya aprobados.
- Añadir un servicio externo, algo con coste o una conexión bancaria.
- Borrar datos o migraciones, o cualquier cambio que no se pueda deshacer.
- Programar algo que no tenga su `spec.md`, `plan.md` y `tasks.md`.
