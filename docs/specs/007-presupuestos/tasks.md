# Tareas: Presupuestos por categoría

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/007-presupuestos/`
**Requisitos previos**: especificación y plan aprobados.

**Tests**: obligatorios según la constitución (art. VII). Se escriben primero y deben
fallar antes de implementar.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]…[US2]**: historia de la especificación a la que pertenece.
- Prefijo `B` para no confundirlas con las de otras funcionalidades. Se marca `[x]` al
  terminarla, con `pnpm check` en verde.

---

## Fase 1: Base (dominio, contrato y datos)

**Objetivo**: cálculos, esquemas y tabla listos, sin rutas ni pantallas.

- [ ] B001 [P] Tests de `packages/domain/src/budgets.test.ts`: lo que queda y lo que se ha
      pasado, nivel normal / cerca (desde el 80 %) / pasado, presupuesto sin gastos y gastos
      justo en el límite, orden de más a menos gastado (y por nombre a igualdad)
- [ ] B002 Implementar `packages/domain/src/budgets.ts` y exportarlo
- [ ] B003 [P] Acción `budgets.write` (propietario y editor) en `permissions.ts` y su test
- [ ] B004 [P] Esquemas en `packages/api`: entrada `{ amountCents }` con límites, presupuesto
      del periodo `{ categoryId, amountCents, spentCents }`, `budgets` en el periodo y en la
      exportación con valor por defecto `[]`, con tests
- [ ] B005 Tabla `budgets` en `apps/server/src/db/schema.ts` y migración `0007` con
      `pnpm db:generate` (clave compuesta a la categoría, único por categoría y periodo,
      importe positivo o nulo), con su test de migración

**Punto de control**: dominio y contrato compilan; la migración se aplica en una base vacía.

---

## Fase 2: Historia 1 — Ponerle un límite a una categoría (P1) 🎯

- [ ] B006 [US1] Tests en `apps/server/test/budgets.test.ts`: poner, cambiar (el mismo mes
      deja el último), quitar; repetir no crea filas; lector 403; otro hogar 403/404; categoría
      de ingresos o archivada 409; importes no válidos 400; meses pasados conservan el suyo
- [ ] B007 [US1] Rutas `PUT` y `DELETE /api/households/:id/budgets/:categoryId` en
      `apps/server/src/routes/budgets.ts` (vale desde el periodo en curso del hogar)
- [ ] B008 [US1] App: `api.saveBudget`/`deleteBudget`, pantalla `app/(app)/budgets.tsx`
      (un campo por categoría y un «Guardar» que envía solo lo cambiado; lector sin campos),
      fila «Presupuestos» en «Hogar», icono y textos en `es.ts`

**Punto de control**: RF-701, RF-702 y RF-707.

---

## Fase 3: Historia 2 — Ver cómo va cada presupuesto en el mes (P2)

- [ ] B009 [US2] Tests del servidor: `budgets` en el periodo con lo gastado por categoría
      (gastos apuntados, editados de importe, fecha o categoría, borrados, de pagos
      recurrentes; sin ingresos ni huchas), día de inicio de mes 25, mes pasado con su
      presupuesto de entonces, archivadas fuera; comparación con la suma de los movimientos
      (CE-702)
- [ ] B010 [US2] `budgets` en la ruta del periodo (una consulta SQL con el presupuesto vigente
      y lo gastado) y en la exportación (RF-708)
- [ ] B011 [US2] App: `BudgetRow`, `ProgressBar` con tonos «cerca» y «pasado», sección
      «Presupuestos» en «Mes» con «Editar presupuestos» y la fila para empezar; se refresca
      al apuntar, editar o borrar

**Punto de control**: RF-703 a RF-706.

---

## Fase 4: Cierre

- [ ] B012 Batería de ataques ampliada a `/budgets` (otro hogar, IDOR, lector, importes
      absurdos)
- [ ] B013 Prueba de punta a punta: poner, cambiar y quitar; llegar al 80 % y pasarse; mes
      pasado; las anteriores siguen pasando; «Mes» con 500 movimientos y 15 presupuestos
      (CE-703)
- [ ] B014 [P] axe-core en «Mes» y «Presupuestos» a 320 y 1280 px (CE-704)
- [ ] B015 [P] `expo export --platform android` compila
- [ ] B016 Actualizar `README.md` y `AGENTS.md`, marcar tareas y abrir el PR

---

## Dependencias y orden

- **Fase 1** bloquea todo lo demás.
- **Historia 1** antes que la 2 (crea los presupuestos que se ven).
- **Cierre** al final.

### En paralelo

- B001, B003 y B004; en cada historia, los tests y rutas del servidor y las pantallas de la
  app una vez fijado el contrato; B014 y B015.
