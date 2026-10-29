# Tareas: Iconos de categoría en lugar de emoji

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/004-iconos-categorias/`
**Requisitos previos**: especificación y plan aprobados.

**Tests**: obligatorios según la constitución (art. VII). Se escriben primero y deben
fallar antes de implementar.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]…[US2]**: historia de la especificación a la que pertenece.
- Prefijo `I` para no confundirlas con las de otras funcionalidades. Se marca `[x]` al
  terminarla, con `pnpm check` en verde.

---

## Fase 1: Catálogo y contrato

**Objetivo**: el catálogo existe en el dominio y la API solo acepta sus identificadores.

- [x] I001 Tests del catálogo en `packages/domain/src/categoryIcons.test.ts`: 44
      identificadores únicos, `tag` incluido, `isCategoryIcon`, `iconFromEmoji` (las 13
      predefinidas, 🏷️, los frecuentes, con y sin selector de variante `️`, y desconocido →
      `tag`), y que cada categoría predefinida usa un identificador del catálogo
- [x] I002 Implementar `packages/domain/src/categoryIcons.ts` y pasar
      `DEFAULT_CATEGORIES` (`categories.ts`) a identificadores; exportarlo en `index.ts`
- [x] I003 `categoryIconSchema = z.enum(CATEGORY_ICONS)` en
      `packages/api/src/schemas/transactions.ts` (la respuesta sigue con `z.string()`)

**Punto de control**: dominio y contrato compilan; RF-401, RF-402 y RF-406 (contrato).

---

## Fase 2: Historia 1 — Las categorías se ven con iconos coherentes (P1) 🎯

**Objetivo**: servidor y datos con identificadores; todas las pantallas con glifos.

- [x] I004 [US1] Tests del servidor en `apps/server/test/categories.test.ts`: crear y
      editar con un identificador; 400 con un emoji o un texto fuera del catálogo; un
      hogar nuevo empieza con iconos del catálogo
- [x] I005 [US1] Test de la migración en `apps/server/test/migrations.test.ts`: filas con
      emoji predefinidos, frecuentes, desconocidos y ya migrados quedan con su
      identificador; ejecutar la SQL dos veces no cambia nada; la tabla de la SQL coincide
      con `iconFromEmoji` (contenida en el dominio, que puede crecer)
- [x] I006 [US1] Migración `apps/server/src/db/migrations/0005_category_icons.sql` con
      `drizzle-kit generate --custom`
- [x] I007 [P] [US1] Tests de `iconTone` en `apps/mobile/src/design/color.test.ts`: con
      cada color de `categoryPalette` y de las predefinidas, contraste ≥ 3:1 sobre
      `tint(color)`; colores ya oscuros no cambian
- [x] I008 [US1] `iconTone` en `apps/mobile/src/design/color.ts`
- [x] I009 [US1] `apps/mobile/src/design/categoryGlyphs.ts` (identificador → glifo),
      nombres en `src/i18n/es.ts` (`categoryIcons`), tamaños de glifo en `size` y quitar
      `typography.emoji`/`emojiLarge` de `tokens.ts`
- [x] I010 [US1] `CategoryIcon` con `MaterialCommunityIcons`, color `iconTone` y `tag`
      para valores desconocidos; carga de la fuente de iconos en `src/design/fonts.ts`
- [x] I011 [US1] Detalle de vencimiento `app/(app)/occurrence/[ruleId]/[dueDate].tsx`:
      título solo con el nombre e icono junto a él

**Punto de control**: RF-403 y RF-405 en pantalla; ninguna pantalla enseña emoji.

---

## Fase 3: Historia 2 — Elegir el icono de una categoría (P2)

- [x] I012 [US2] `IconPicker` en `apps/mobile/src/components/IconPicker.tsx`: cuadrícula
      `radiogroup`, nombre de `es.ts`, `checked`, celdas de al menos 48 px con tantas
      columnas como quepan (`iconGrid.ts`, con tests)
- [x] I013 [US2] `app/(app)/household/categories.tsx`: `IconPicker` al crear y al editar
      en lugar del campo de texto; `tag` por defecto; quitar el texto «Icono (un emoji)»

**Punto de control**: RF-404 cubierto.

---

## Fase 4: Cierre

- [x] I014 [P] Test `apps/mobile/src/noEmoji.test.ts` (CE-401): ningún emoji en
      `apps/mobile/app`, `apps/mobile/src` ni `packages/*/src`
- [x] I015 Adaptar las pruebas de punta a punta (crear categoría con la cuadrícula) y
      pasarlas todas contra la web de producción con una base migrada desde datos con
      emoji; medir «Mes» con 500 movimientos (CE-403)
- [x] I016 [P] axe-core en las pantallas con categorías, incluida la cuadrícula (CE-402);
      pruebas a 320 px y 1280 px
- [x] I017 [P] `expo export --platform android` compila
- [x] I018 Actualizar `README.md`, `AGENTS.md`, el plan de 003 (la decisión de iconos
      queda sustituida por esta) y marcar tareas; abrir el PR

---

## Dependencias y orden

- **Fase 1** bloquea todo lo demás.
- En la **historia 1**, I004–I006 (servidor) e I007–I011 (app) pueden ir en paralelo.
- **Historia 2** necesita I009–I010.
- **Cierre** al final.
