# Tareas: Huchas para objetivos de ahorro

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/005-hucha/`
**Requisitos previos**: especificación y plan aprobados.

**Tests**: obligatorios según la constitución (art. VII). Se escriben primero y deben
fallar antes de implementar.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]…[US4]**: historia de la especificación a la que pertenece.
- Prefijo `H` para no confundirlas con las de otras funcionalidades. Se marca `[x]` al
  terminarla, con `pnpm check` en verde.

---

## Fase 1: Base (dominio, contrato y datos)

**Objetivo**: cálculos, esquemas y tablas listos, sin rutas ni pantallas.

- [x] H001 [P] Tests de `packages/domain/src/savings.test.ts`: fechas de aportación (día
      31 y febrero, cambio de año, desde la creación hasta el plazo), saldo con retiradas,
      estados (en curso, conseguida, plazo vencido, cerrada), pendientes y atrasadas
      (excluye las resueltas y los meses saltados), cuota con redondeo hacia arriba y con
      0 aportaciones restantes, «al día»/«retrasada», apartado de un periodo
- [x] H002 Implementar `packages/domain/src/savings.ts` y exportarlo
- [x] H003 [P] Acción `savings.write` (propietario y editor) en `permissions.ts` y su test
- [x] H004 [P] Esquemas en `packages/api/src/schemas/savings.ts` (hucha, plan, movimiento,
      entradas de crear/editar/aportar) con tests de límites (nombre, importes, día,
      plazo); `summary` + `setAsideCents`, `upcoming` + `savings`,
      calendario + `savings`, exportación + huchas
- [x] H005 Tablas `savings_goals` y `savings_entries` en `apps/server/src/db/schema.ts` y
      migración `0006` con `pnpm db:generate` (restricciones e índice único parcial)

**Punto de control**: dominio con tests en verde; la migración se aplica en una base vacía.

---

## Fase 2: Historia 1 — Crear una hucha y ver cuánto apartar (P1) 🎯

- [x] H006 [US1] Tests en `apps/server/test/savings.test.ts`: crear (idempotente), editar,
      listar con plan calculado, borrar sin movimientos y 409 con ellos; lector 403; otro
      hogar 403; no sobrescribir la hucha de otro hogar con su id
- [x] H007 [US1] Rutas `GET/PUT/DELETE /savings[/:goalId]` en `apps/server/src/routes/savings.ts`
- [x] H008 [US1] App: `api.savings`, `useSavings`, `SavingsCard` (barra de progreso,
      cuota, plazo, «al día»/«retrasada»), `SavingsForm` (nombre, icono del catálogo,
      objetivo, plazo, día), pantallas `savings/index.tsx` y `savings/new.tsx`; entrada
      en «Hogar» y tarjeta «Huchas» en «Mes»; textos en `es.ts`

**Punto de control**: RF-501 y RF-502 cubiertos.

---

## Fase 3: Historia 2 — Apartar la cuota el día elegido (P2)

- [x] H009 [US2] Tests del servidor: confirmar con la cuota y con otro importe, reenviar
      (idempotente), dos confirmaciones a la vez (una sola, 409 con quién), saltar,
      atrasada, pendientes en `/upcoming` y en el calendario, apartado en el periodo
- [x] H010 [US2] Rutas `PUT …/entries/:entryId` (con `dueDate`) y `POST …/due/:dueDate/skip`;
      `/upcoming`, calendario y periodo con huchas
- [x] H011 [US2] App: pendientes en «Próximos pagos» de «Mes» y en el calendario; pantalla
      `savings/[goalId]/due/[dueDate].tsx` (confirmar con importe editable o saltar);
      `SummaryCard` con «Apartado para objetivos» y lo que queda
- [x] H012 [US2] Avisos del día de apartar en `src/reminders/plan.ts` (sin importe), con
      test

**Punto de control**: RF-503, RF-504 y RF-506 cubiertos.

---

## Fase 4: Historia 3 — Aportar o sacar cuando se quiera (P3)

- [x] H013 [US3] Tests del servidor: aportar con fecha, sacar, sacar más que el saldo
      (409), dos retiradas a la vez sin saldo negativo, historial con quién, deshacer el
      último (y 409 con otro)
- [x] H014 [US3] Rutas de aportar/sacar sin `dueDate`, `GET …/entries` y `DELETE
…/entries/:entryId`
- [x] H015 [US3] App: pantalla `savings/[goalId].tsx` con historial, aportar, sacar y
      deshacer

**Punto de control**: RF-505 cubierto.

---

## Fase 5: Historia 4 — Conseguir el objetivo o cambiar de planes (P4)

- [x] H016 [US4] Tests del servidor: conseguida al llegar al objetivo (sin más
      pendientes), cerrar (retirada por el saldo, sin pendientes), plazo vencido, editar
      objetivo/plazo/día recalcula pendientes sin tocar lo hecho
- [x] H017 [US4] Ruta `POST …/close` y estados en las respuestas
- [x] H018 [US4] App: estado conseguida (celebración accesible), plazo vencido con
      ampliar/cambiar/cerrar, editar y cerrar desde el detalle, lista con cerradas

**Punto de control**: RF-507 cubierto.

---

## Fase 6: Cierre

- [x] H019 Exportación con huchas y movimientos (RF-508), con test
- [x] H020 Batería de ataques de la auditoría ampliada a las rutas nuevas (IDOR con ids de
      otro hogar, roles, importes y fechas absurdos)
- [x] H021 Pruebas de punta a punta contra la web de producción: crear, confirmar el mes,
      aportar, sacar, ver el apartado en «Mes», cerrar; CE-503; las del MVP, calendario y
      categorías siguen pasando; «Mes» con 500 movimientos y 10 huchas (CE-504)
- [x] H022 [P] axe-core en las pantallas nuevas; 320 y 1280 px
- [x] H023 [P] `expo export --platform android` compila
- [x] H024 Actualizar `README.md` y `AGENTS.md`, marcar tareas y abrir el PR

---

## Dependencias y orden

- **Fase 1** bloquea todo lo demás.
- **Historia 1** antes que las demás (crea las huchas que usan).
- **Historias 2 y 3** comparten la ruta de movimientos: la 2 primero.
- **Historia 4** tras la 3.
- **Cierre** al final.

### En paralelo

- H001, H003 y H004.
- En cada historia, los tests y rutas del servidor y las pantallas de la app se pueden
  hacer a la vez una vez fijado el contrato.
