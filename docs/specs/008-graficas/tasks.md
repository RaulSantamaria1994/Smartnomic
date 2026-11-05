# Tareas: Gráficas

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/008-graficas/`
**Requisitos previos**: especificación y plan aprobados.

**Tests**: obligatorios según la constitución (art. VII). Se escriben primero y deben
fallar antes de implementar.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]…[US4]**: historia de la especificación a la que pertenece.
- Prefijo `G` para no confundirlas con las de otras funcionalidades. Se marca `[x]` al
  terminarla, con `pnpm check` en verde.

---

## Fase 1: Base (dominio, contrato y ruta)

**Objetivo**: cálculos, esquema de la respuesta y ruta listos, sin pantallas.

- [x] G001 [P] Tests de `packages/domain/src/charts.test.ts`: `chartWindow` con día de inicio
      1 y 25 y cambio de año; `shares` (total 0, redondeo); `barShare` (0, mínimo visible,
      máximo 0); `sortByAmount` (empates por nombre); `defaultCategory` (con y sin gastos,
      sin archivadas ni de ingresos)
- [x] G002 Implementar `packages/domain/src/charts.ts` y exportarlo
- [x] G003 [P] Esquema de la respuesta en `packages/api/src/schemas/charts.ts` (6 meses,
      `monthsCents` de 6, importes enteros no negativos) con sus tests
- [x] G004 Tests en `apps/server/test/charts.test.ts`: sin sesión 401; otro hogar 403/404;
      `:start` que no es inicio de periodo 400; lector puede verla; ingresos y gastos por
      periodo (borrados fuera, huchas fuera); gasto por categoría con archivadas; meses sin
      movimientos a 0; día de inicio 25; huchas: aportaciones, retiradas, cerrada y borradas,
      saldo al final de cada periodo y `goals` del último; contraste con la suma de los
      movimientos (CE-801)
- [x] G005 Ruta `GET /api/households/:id/charts/:start` en `apps/server/src/routes/charts.ts`
      (tres consultas agregadas en paralelo) y registrarla en `server.ts`

**Punto de control**: la respuesta de la ruta cuadra al céntimo con los movimientos.

---

## Fase 2: Historia 1 — Ver en qué se va el dinero del mes (P1) 🎯

- [x] G006 [US1] App: `api.charts`, `queryKeys.charts` bajo `periods` (test de que invalidar
      `periods` la incluye) y `useCharts`
- [x] G007 [US1] `ChartBar` en `src/design/` (8 px, tonos, animación de relleno con «reducir
      movimiento», decorativa), icono `chart` y tono de ingresos con su prueba de contraste en
      `color.test.ts`
- [x] G008 [US1] Pestaña `charts` entre «Mes» y «Calendario» en `_layout.tsx` y `TabBar.tsx`;
      comprobar las cinco pestañas a 320 px con texto grande
- [x] G009 [US1] `app/(app)/(tabs)/charts.tsx`: `AppBar` con flechas de mes y `MonthSlide`,
      chips de las cuatro gráficas y «Por categoría» (total, filas con icono, nombre, importe,
      porcentaje y barra; mes sin gastos con `EmptyState`); textos en `es.ts`

**Punto de control**: RF-801 a RF-805.

---

## Fase 3: Historia 2 — Ingresos y gastos (P2)

- [x] G010 [US2] «Ingresos y gastos»: una fila por mes con dos barras a la misma escala, sus
      importes y la diferencia con signo; etiqueta accesible completa por fila

---

## Fase 4: Historia 3 — Evolución de una categoría (P3)

- [x] G011 [US3] «Evolución»: chips de categorías de gasto no archivadas, `defaultCategory`
      al abrirla desde el selector, filas por mes; tocar una fila de «Por categoría» abre
      su evolución (RF-806, CE-803)

---

## Fase 5: Historia 4 — Huchas (P4)

- [x] G012 [US4] «Huchas»: una fila por mes con lo apartado al final del mes y la lista de
      huchas con saldo de más a menos; sin huchas, `EmptyState` con el enlace para crear una
      solo para quien tiene `savings.write`

---

## Fase 6: Cierre

- [x] G013 Batería de ataques ampliada a `/charts` (otro hogar, IDOR, `:start` no válido,
      sin sesión)
- [x] G014 Prueba de punta a punta: abrir «Gráficas», cambiar de gráfica y de mes, tocar una
      categoría, apuntar un gasto y verlo; las anteriores siguen pasando; CE-802 con 500
      movimientos por mes durante 6 meses
- [x] G015 [P] axe-core en las cuatro gráficas a 320 y 1280 px (CE-804)
- [x] G016 [P] `expo export --platform android` compila
- [x] G017 Actualizar `README.md` y `AGENTS.md`, el texto de `noAiTells`/tests de la barra si
      cambian, y marcar tareas (el PR, cuando lo pida el propietario)

---

## Dependencias y orden

- **Fase 1** bloquea todo lo demás.
- **Historia 1** antes que las otras (pestaña, pantalla y selector).
- Historias 2, 3 y 4 son independientes entre sí; la 3 usa la fila de la 1.
- **Cierre** al final.

### En paralelo

- G001 y G003; G006, G007 y G008 una vez fijado el contrato; G015 y G016.
