# Tareas: Búsqueda de movimientos

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/009-busqueda/`
**Requisitos previos**: especificación y plan aprobados.

**Tests**: obligatorios según la constitución (art. VII). Se escriben primero y deben
fallar antes de implementar.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]…[US2]**: historia de la especificación a la que pertenece.
- Prefijo `S` para no confundirlas con las de otras funcionalidades. Se marca `[x]` al
  terminarla, con `pnpm check` en verde.

---

## Fase 1: Base (dominio, contrato y ruta)

**Objetivo**: filtros, páginas y totales listos en el servidor, sin pantallas.

- [ ] S001 [P] Tests de `packages/domain/src/search.ts`: `rangeError` con números y fechas
      (vacíos, iguales, al revés) y las constantes
- [ ] S002 Implementar `packages/domain/src/search.ts` y exportarlo
- [ ] S003 [P] Esquemas en `packages/api/src/schemas/search.ts`: filtros desde la URL (tipo,
      `categoryId` uno o varios con máximo, importes, fechas, rangos al revés, cursor) y la
      respuesta (`totals` opcional), con sus tests
- [ ] S004 Tests en `apps/server/test/search.test.ts`: sin sesión 401; otro hogar 403; lector
      puede; sin filtros devuelve todo en orden; cada filtro y combinaciones; límites
      incluidos; borrados fuera; ids de categoría ajenos no encuentran nada; páginas de 100
      con cursor sin repetir ni saltar (también con un movimiento nuevo entre páginas);
      totales solo en la primera página y sobre todos; valores no válidos y cursor
      manipulado 400; contraste con un filtrado a mano (CE-901)
- [ ] S005 Ruta `GET /api/households/:id/transactions/search` en
      `apps/server/src/routes/search.ts` (consulta de la página y de los totales en paralelo)
      y registrarla en `server.ts`

**Punto de control**: la ruta cumple RF-902 a RF-905 y CE-901.

---

## Fase 2: Historia 1 — Categoría, tipo y fechas (P1) 🎯

- [ ] S006 [US1] App: `api.searchTransactions`, `queryKeys.search` bajo `periods` (test) y
      `useSearch` con `useInfiniteQuery`
- [ ] S007 [US1] `AppBar` con `action`, icono `search`, lupa en «Mes»; comprobar la barra a
      320 px
- [ ] S008 [US1] `TransactionRow` a `src/components/` (con la fecha completa como opción) y
      «Mes» usándolo sin cambiar lo que se ve
- [ ] S009 [US1] `Chip` con `multiple` (rol `checkbox`)
- [ ] S010 [US1] `app/(app)/search.tsx`: tipo, categorías (archivadas aparte), fechas con su
      error, número y totales, lista con «Mostrar más», sin resultados con «Quitar filtros»,
      abrir un resultado y volver con los filtros; textos en `es.ts`

**Punto de control**: RF-901 a RF-906 sin importes.

---

## Fase 3: Historia 2 — Importe (P2)

- [ ] S011 [US2] Campos «Importe desde» y «hasta» con `parseAmount`, su error y el rango
      al revés

---

## Fase 4: Cierre

- [ ] S012 Batería de ataques ampliada a `/transactions/search` (otro hogar, ids ajenos, sin
      sesión, valores absurdos, cursores manipulados, inyección)
- [ ] S013 Prueba de punta a punta: lupa, cada filtro, «Mostrar más», abrir, editar y volver;
      las anteriores siguen pasando; CE-902 con 5.000 movimientos
- [ ] S014 [P] axe-core en la búsqueda (con y sin resultados, con errores en los campos) a
      320 y 1280 px (CE-904)
- [ ] S015 [P] `expo export --platform android` compila
- [ ] S016 Actualizar `README.md` y `AGENTS.md` y marcar tareas (el PR, cuando lo pida el
      propietario)

---

## Dependencias y orden

- **Fase 1** bloquea todo lo demás.
- **Historia 1** antes que la 2 (la pantalla existe).
- **Cierre** al final.

### En paralelo

- S001 y S003; S006, S007, S008 y S009 una vez fijado el contrato; S014 y S015.
