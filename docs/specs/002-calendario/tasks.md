# Tareas: Calendario de pagos programados

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/002-calendario/`
**Requisitos previos**: especificación y plan aprobados; MVP (`001-mvp-hogar`) terminado.

**Tests**: obligatorios según la constitución (art. VII). En cada historia, los tests se
escriben primero y deben fallar antes de implementar.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]…[US2]**: historia de la especificación a la que pertenece.
- Cada tarea indica los archivos que toca. Se marca `[x]` al terminarla, con `pnpm check`
  en verde.

Los ids siguen desde los del MVP con el prefijo `C` para no confundirlos.

---

## Fase 1: Base común

**Objetivo**: dominio y contrato del calendario, que usan las dos historias.

- [x] C001 [P] Tests del dominio del calendario en `packages/domain/src/calendar.test.ts`:
      `monthRange`, `monthOf` y `shiftMonth` (cambio de año); `monthGrid` con semanas de
      lunes a domingo (mes de 4, 5 y 6 filas, febrero bisiesto y no bisiesto)
- [x] C002 Implementar `monthRange`, `monthOf`, `shiftMonth` y `monthGrid` en
      `packages/domain/src/calendar.ts` y exportarlos en `src/index.ts`
- [x] C003 [P] Esquemas zod `monthSchema` (`YYYY-MM`), `calendarItemSchema` y
      `calendarResponseSchema` en `packages/api/src/schemas/calendar.ts`, exportados en
      `src/index.ts`

**Punto de control**: `pnpm check` en verde; la cuadrícula de cualquier mes es correcta.

---

## Fase 2: Historia 1 — Ver los pagos del mes en un calendario (P1) 🎯

**Objetivo**: pantalla «Calendario» con los vencimientos del mes, su estado y los totales.

**Prueba independiente**: con pagos recurrentes de varias frecuencias, cada vencimiento
aparece en su día y con su estado; al tocar un día se ven sus pagos.

### Tests de la historia 1

- [ ] C004 [P] [US1] Tests de `calendarMonth` y `calendarTotals` en
      `packages/domain/src/calendar.test.ts`: estados `pending`/`overdue`/`paid`/`skipped`
      según hoy; pagos el día 31 en meses cortos; semanales, cada N meses y anuales; fecha
      de fin; reglas desactivadas (solo sus resueltos); resueltos cuya fecha ya no encaja
      con la regla; importe real de los pagados; totales; y que coincide con `upcoming`
      en los vencimientos pendientes (CE-102)
- [ ] C005 [P] [US1] Tests de la ruta en `apps/server/test/calendar.test.ts`: respuesta
      con estados, importe real y `resolvedBy`; movimiento del pago borrado (importe
      previsto); límites (`bounds`, 400 fuera de ellos y con un mes mal escrito); hogar
      sin pagos; lector puede verlo; hogar ajeno 403; sin sesión 401

### Implementación de la historia 1

- [ ] C006 [US1] `calendarMonth` y `calendarTotals` en `packages/domain/src/calendar.ts`
- [ ] C007 [US1] `GET /api/households/:householdId/calendar/:month` en
      `apps/server/src/routes/calendar.ts`, registrada en `src/server.ts`
- [ ] C008 [P] [US1] `api.calendar`, `queryKeys.calendar` en `apps/mobile/src/api/client.ts`
      y `useCalendar` en `apps/mobile/src/hooks/data.ts`
- [ ] C009 [P] [US1] Textos del calendario en `apps/mobile/src/i18n/es.ts`
- [ ] C010 [US1] Componente `MonthGrid` accesible (marcas por estado, hoy, seleccionado,
      etiquetas para lector de pantalla, 44×44 mínimo) en
      `apps/mobile/src/components/MonthGrid.tsx`
- [ ] C011 [US1] Pantalla `apps/mobile/app/(app)/calendar.tsx`: mes, flechas con límites,
      «Hoy», totales, cuadrícula, lista del día y mensaje si no hay vencimientos
- [ ] C012 [US1] Enlace «Calendario» en la sección «Próximos pagos» de
      `apps/mobile/app/(app)/index.tsx`

**Punto de control**: RF-101…RF-106, RF-108 y RF-109 cubiertos; el calendario se ve en
Android y web.

---

## Fase 3: Historia 2 — Pagar u omitir desde el calendario (P2)

**Objetivo**: desde la lista del día se paga u omite un vencimiento, y el calendario se
actualiza.

**Prueba independiente**: se paga un vencimiento y se omite otro desde el calendario, y
cambian de estado en el calendario, en «Próximos pagos» y en el mes.

- [ ] C013 [US2] En la lista del día, los pendientes y atrasados enlazan a
      `/occurrence/[ruleId]/[dueDate]` solo si `can('occurrences.resolve')`; los resueltos
      muestran quién los resolvió, en `apps/mobile/app/(app)/calendar.tsx`
- [ ] C014 [US2] Invalidar `queryKeys.calendar` al pagar u omitir
      (`apps/mobile/app/(app)/occurrence/[ruleId]/[dueDate].tsx`) y al cambiar un pago
      recurrente (`apps/mobile/src/hooks/useRuleMutations.ts`)

**Punto de control**: RF-107 cubierto.

---

## Fase 4: Cierre

- [ ] C015 Prueba de punta a punta en web (guía de validación del plan) y medir CE-101 y
      CE-103
- [ ] C016 [P] axe-core sin problemas en la pantalla del calendario (CE-104) y prueba a
      360 px de ancho
- [ ] C017 [P] Comprobar que la app compila para Android (`expo export --platform android`)
- [ ] C018 Actualizar `README.md` (endpoint nuevo), `AGENTS.md` (estado) y marcar las
      tareas

---

## Dependencias y orden

- **Fase 1** bloquea las historias.
- **Historia 1** depende de la fase 1.
- **Historia 2** depende de la historia 1 (la lista del día).
- **Cierre** cuando las dos historias estén hechas.

Dentro de cada historia: tests (deben fallar) → dominio → servidor → app.

### En paralelo

- C001 y C003.
- C004 y C005; después C008 y C009 mientras se hace C007.
- C016 y C017.
