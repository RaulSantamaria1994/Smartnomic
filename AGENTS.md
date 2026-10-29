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
y T099) y **`002-calendario`**. En curso: **`003-diseno-visual`**, documentos aprobados y fase 1 (base del sistema de diseño) terminada; la siguiente es la fase 2, desde D007. No inventes comandos, rutas
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
