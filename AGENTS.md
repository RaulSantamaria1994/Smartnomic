# AGENTS.md

Instrucciones para agentes de código (Claude Code, Codex, Copilot…) que trabajan en este
repositorio. Las personas también pueden leerlo: es la guía corta de cómo se trabaja aquí.

## Qué es Smartnomic

App móvil para que un hogar apunte sus ingresos y gastos mensuales, entienda en qué se va
el dinero y reciba recordatorios antes de cada pago. Los principios que no se negocian
están en [`CONSTITUTION.md`](CONSTITUTION.md). El plan completo (arquitectura, modelo
de datos y roadmap por fases) está en [`docs/PLAN.md`](docs/PLAN.md). **Léelo antes de
proponer cambios de arquitectura** y, si una decisión cambia, actualízalo en el mismo PR.

## Estado actual

El proyecto está en **fase 0** (fundaciones): todavía no hay código. Mientras una parte no
exista, no inventes comandos ni rutas: crea lo que pida la tarea siguiendo `docs/PLAN.md` y
actualiza este archivo cuando cambie la estructura o los comandos.

## Stack

- TypeScript en todo, monorepo con **pnpm workspaces**. Node 22.
- **App:** Expo + Expo Router, TanStack Query (datos del servidor), Zustand (estado de UI).
- **Servidor:** Fastify (API REST), PostgreSQL con Drizzle ORM y migraciones.
- **Autenticación:** Better Auth.
- **Validación:** zod. **Tests:** Vitest. **Notificaciones:** expo-notifications.
- **Despliegue:** Railway (servidor y Postgres, región UE) y EAS Build (app).

No añadas dependencias nuevas sin explicar por qué en el PR; prefiere lo que ya está en el
stack.

## Estructura

| Carpeta           | Qué contiene                                                                 |
| ----------------- | ---------------------------------------------------------------------------- |
| `packages/domain` | Lógica pura: dinero, periodos, recurrencias, resúmenes, presupuestos, avisos |
| `packages/api`    | Contrato app ↔ servidor: esquemas zod de peticiones y respuestas             |
| `apps/server`     | API REST (Fastify), acceso a Postgres, trabajos programados                  |
| `apps/mobile`     | App Expo: pantallas, formularios, gráficas y notificaciones                  |
| `docs/`           | Plan, decisiones y documentación                                             |

Dependencias permitidas: `apps/*` → `packages/api` → `packages/domain`. El dominio no
importa nada de `apps/` ni de `packages/api`.

## Comandos

```sh
pnpm install
pnpm check      # formato + lint + tipos + tests: lo mismo que el CI
pnpm test       # solo tests
pnpm --filter @smartnomic/server dev   # servidor en local
pnpm --filter @smartnomic/mobile start # app con Expo
```

**Antes de dar una tarea por terminada, `pnpm check` debe pasar sin errores.** Si un
comando no existe todavía, dilo en lugar de suponer que ha pasado.

## Cómo se aplica la constitución

Los principios están en [`CONSTITUTION.md`](CONSTITUTION.md) y mandan sobre este archivo.
Aquí solo se concreta cómo se cumplen en el código:

- **Dinero (art. I):** `amountCents: number` siempre entero. Nada de `parseFloat` ni
  decimales sobre importes; formatear solo en la interfaz con `Intl.NumberFormat`.
- **Fechas (art. I):** cadenas `YYYY-MM-DD` para movimientos y vencimientos. El mes se
  calcula con la zona horaria y el `month_start_day` del hogar.
- **Vencimientos (art. I y IV):** marcar uno como pagado crea el movimiento con el
  importe real que confirma el usuario.
- **Dominio puro (art. III):** `packages/domain` no importa React, red ni base de datos,
  y no llama a `Date.now()` ni a `new Date()` sin argumentos: "hoy" entra como parámetro.
- **Aislamiento (art. II):** cada consulta del servidor filtra por `household_id` y
  comprueba el rol. Cada endpoint nuevo lleva un test que intenta acceder a otro hogar y
  falla.
- **Entradas (art. II):** valida con zod todo lo que llega al servidor.
- **Sesión (art. II):** tokens en `expo-secure-store`, nunca en AsyncStorage.
- **Secretos (art. II):** solo en variables de entorno; en el repositorio, `.env.example`.
- **Logs (art. II):** nunca importes, notas ni datos personales.

## Estilo de código

- TypeScript estricto; nada de `any` (usa `unknown` y estrecha el tipo).
- Tipos derivados de los esquemas zod (`z.infer`) en lugar de duplicarlos.
- Nombres de código en inglés; **textos de la interfaz, commits y documentación en
  español**.
- Funciones pequeñas y con nombre claro; comentarios solo para explicar el _porqué_.
- Formato con Prettier y lint con ESLint: no los desactives para un archivo entero.

## Base de datos

- Todo cambio de esquema va en una **migración de Drizzle** nueva; nunca edites una
  migración ya fusionada en `main`.
- Los movimientos se borran de forma lógica (`deleted_at`).
- Las sumas por mes y categoría se hacen en SQL o en el dominio, no en la interfaz.

## Git y PRs

- `main` siempre en verde. Cada cambio en su rama: `feat/…`, `fix/…`, `chore/…`,
  `docs/…`.
- Commits pequeños, en español e imperativo: `Añade el cálculo del balance mensual`.
- Un PR por cambio coherente o por hito del roadmap; mejor pequeños.
- No hagas `push --force` sobre ramas compartidas ni reescribas el historial de `main`.

## Qué preguntar antes de hacer

Para y pregunta en lugar de decidir por tu cuenta cuando la tarea implique:

- Algo que choque con `CONSTITUTION.md`, o modificar ese archivo.
- Cambiar una decisión de `docs/PLAN.md` (stack, modelo de datos, alcance de una fase).
- Añadir un servicio externo de pago, conexión bancaria o algo con coste.
- Borrar datos o migraciones, o cambios que no se puedan deshacer.
- Funcionalidades fuera del roadmap.
