# Tareas: Exportar movimientos a CSV con filtros

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/010-exportar-csv/`
**Requisitos previos**: especificación y plan aprobados.

**Tests**: obligatorios según la constitución (art. VII). Se escriben primero y deben
fallar antes de implementar.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]**: historia de la especificación a la que pertenece.
- Prefijo `X` para no confundirlas con las de otras funcionalidades. Se marca `[x]` al
  terminarla, con `pnpm check` en verde.

---

## Fase 1: Base (formato, contrato y ruta)

**Objetivo**: el archivo correcto sale del servidor, sin pantallas.

- [x] X001 [P] Tests de `packages/domain/src/csv.ts`: BOM, títulos, `\r\n`, fecha dd/mm/aaaa,
      «Gasto»/«Ingreso», importe con signo y coma decimal (céntimos sueltos, miles sin
      separador, el máximo), nota vacía, comillas cuando hay `;`, `"`, `\r` o `\n`, apóstrofo
      delante de `=`, `+`, `-`, `@`, tabulador y retorno de carro en los textos, y el importe
      negativo sin apóstrofo
- [x] X002 Implementar `packages/domain/src/csv.ts` y exportarlo
- [x] X003 [P] Esquemas en `packages/api`: filtros de la exportación (los de la búsqueda sin
      `cursor`) y respuesta `{ fileName, csv }`, con sus tests
- [x] X004 Sacar `filtersOf` de `routes/search.ts` a `routes/transaction-filters.ts` sin cambiar
      la búsqueda (sus tests siguen pasando)
- [x] X005 Tests en `apps/server/test/export-csv.test.ts`: sin sesión 401; otro hogar 403;
      lector puede; cursor no se acepta (400); filtros no válidos 400; nombre del archivo con
      la fecha del hogar; títulos y columnas; categoría y autor (también antiguo miembro);
      borrados fuera; mismo orden y mismos movimientos que la búsqueda con varias
      combinaciones; suma de importes = ingresos − gastos de la búsqueda (CE-1001); notas
      difíciles se leen con las mismas filas y columnas y sin fórmulas (CE-1002)
- [x] X006 Ruta `GET /api/households/:id/transactions/export` en
      `apps/server/src/routes/export-csv.ts` y registrarla en `server.ts`

**Punto de control**: RF-1002 a RF-1005, CE-1001 y CE-1002 en el servidor.

---

## Fase 2: Historia 1 — Exportar desde la búsqueda (P1) 🎯

- [x] X007 [US1] `saveFile(name, content, mimeType)` en `src/export/` (web y Android) y la
      exportación completa usándolo sin cambiar lo que hace
- [x] X008 [US1] `api.exportTransactions` y `src/export/export-transactions.ts`
- [x] X009 [US1] Botón «Exportar a CSV» en `app/(app)/search.tsx` (solo con resultados, con
      estado de carga y error); textos en `es.ts`

**Punto de control**: RF-1001, RF-1006 y RF-1007.

---

## Fase 3: Cierre

- [ ] X010 Batería de ataques ampliada a `/transactions/export` (otro hogar, ids ajenos, sin
      sesión, lector, filtros absurdos, fórmulas y CSV roto en notas)
- [ ] X011 Prueba de punta a punta: buscar, exportar, descargar en el navegador y leer el
      archivo; las anteriores siguen pasando; CE-1003 con 5.000 movimientos
- [ ] X012 [P] axe-core en la búsqueda con el botón a 320 y 1280 px (CE-1005)
- [ ] X013 [P] `expo export --platform android` compila
- [ ] X014 Actualizar `README.md` y `AGENTS.md` y marcar tareas (el PR, cuando lo pida el
      propietario)

---

## Dependencias y orden

- **Fase 1** bloquea todo lo demás; X004 antes que X006.
- **Historia 1** después.
- **Cierre** al final.

### En paralelo

- X001 y X003; X007 y X008 una vez fijado el contrato; X012 y X013.
