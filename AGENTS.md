# AGENTS.md

Instrucciones para agentes de código (Claude Code, Codex, Copilot…) que trabajan en este
repositorio. Las personas también pueden leerlo: es la guía corta de cómo se trabaja aquí.

## Qué es Smartnomic

App móvil para que un hogar apunte sus ingresos y gastos mensuales, entienda en qué se va
el dinero y reciba recordatorios antes de cada pago. El plan completo (arquitectura, modelo
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

## Reglas del dominio (no negociables)

- **Dinero en céntimos enteros** (`amountCents: number`, entero). Nunca `number` con
  decimales ni `parseFloat` sobre importes. Formatear solo en la interfaz con
  `Intl.NumberFormat`.
- **Fechas de calendario sin hora** (`YYYY-MM-DD`) para movimientos y vencimientos. El
  "mes" depende de la zona horaria y del `month_start_day` del hogar.
- `packages/domain` es **puro**: sin React, sin red, sin base de datos, sin `Date.now()`
  ni `new Date()` sin argumentos. La fecha de "hoy" entra como parámetro.
- **Toda regla nueva del dominio llega con sus tests**, incluidos los casos límite: día 31
  en meses cortos, años bisiestos, cambio de hora, importes negativos o cero.
- Marcar un vencimiento como pagado crea el movimiento con el **importe real**.

## Seguridad y privacidad

Son datos económicos personales:

- **Cada consulta del servidor filtra por `household_id`** y comprueba que el usuario es
  miembro con el rol necesario. Cualquier endpoint nuevo lleva un test que intenta leer o
  modificar datos de otro hogar y falla.
- Valida con zod toda entrada del servidor; no confíes en lo que envía la app.
- En la app, los tokens van en `expo-secure-store`, nunca en AsyncStorage.
- Nunca subas secretos (`.env`, claves, URLs de base de datos). Usa `.env.example`.
- No escribas importes, notas ni datos personales en los logs.
- Los datos reales de usuarios nunca se usan en tests ni en ejemplos.

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

- Cambiar una decisión de `docs/PLAN.md` (stack, modelo de datos, alcance de una fase).
- Añadir un servicio externo de pago, conexión bancaria o algo con coste.
- Borrar datos o migraciones, o cambios que no se puedan deshacer.
- Funcionalidades fuera del roadmap.
