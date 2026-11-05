# Plan de implementación: Búsqueda de movimientos

**Rama**: `feat/009-busqueda` | **Fecha**: 2026-11-05 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Una ruta nueva de solo lectura, `GET /api/households/:id/transactions/search`, recibe los
filtros (tipo, categorías, importe desde y hasta, fechas desde y hasta) en la URL y devuelve
una página de 100 movimientos, de más reciente a más antiguo, con un cursor para la siguiente
y, en la primera página, el número y los totales de todos los que cumplen los filtros,
sumados en SQL. La app añade una lupa en la barra de «Mes» que abre la pantalla
`/search`, con los filtros arriba y la lista debajo, y reutiliza la fila de movimiento de
«Mes». Sin tablas nuevas, sin migraciones y sin dependencias nuevas.

## Contexto técnico

| Campo                        | Valor                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Node 22, Expo 58 — igual que ahora                                 |
| **Dependencias nuevas**      | Ninguna                                                                                   |
| **Almacenamiento**           | Sin cambios: se lee `transactions` con el índice `transactions_household_date_idx`        |
| **Tests**                    | Vitest: dominio (rangos), esquemas (filtros y cursor), servidor (filtros, páginas, sumas) |
| **Plataformas**              | Android y navegador                                                                       |
| **Objetivos de rendimiento** | Primera página y totales < 1 s con 5.000 movimientos (CE-902)                             |
| **Restricciones**            | Importes en céntimos; sumas en SQL (art. III.5, IV.5); estilo de la 006; WCAG 2.1 AA      |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                                                                                        | Estado |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Sin dependencias nuevas; la lista paginada usa `useInfiniteQuery` de TanStack Query, que ya está.                                                                               | ✅     |
| II. Arquitectura por capas | Tamaño de página y comprobación de rangos en `packages/domain/src/search.ts`; filtros y respuesta en `packages/api`.                                                            | ✅     |
| III. Dinero y fechas       | Importes en céntimos con `parseAmount`; fechas `YYYY-MM-DD` con `parseShortDate`; límites incluidos.                                                                            | ✅     |
| IV. Datos y persistencia   | Sin cambios en el esquema; toda consulta filtra por hogar y excluye borrados; número y totales en SQL.                                                                          | ✅     |
| V. API                     | Esquemas zod para los filtros y la respuesta; ruta nueva de solo lectura; las apps instaladas no la usan.                                                                       | ✅     |
| VI. Seguridad y privacidad | Permiso `household.view`; ids de categoría ajenos no encuentran nada (el filtro va siempre con el hogar); batería de ataques ampliada; los logs no llevan filtros con importes. | ✅     |
| VII. Tests                 | Tests primero; cada combinación de filtros se contrasta con un filtrado hecho a mano (CE-901).                                                                                  | ✅     |
| VIII. Calidad y CI         | `pnpm check`; textos en `es.ts`.                                                                                                                                                | ✅     |
| IX. App y plataformas      | Misma pantalla en Android y web; sin conexión se avisa como en el resto (la búsqueda no se guarda en caché).                                                                    | ✅     |

Sin incumplimientos.

## Contrato de la API

`GET /api/households/:id/transactions/search` con permiso `household.view`. Todos los
parámetros son opcionales:

| Parámetro    | Valor                                             |
| ------------ | ------------------------------------------------- |
| `kind`       | `expense` o `income`                              |
| `categoryId` | uuid; se puede repetir (como mucho 50)            |
| `minCents`   | entero > 0 con el máximo de siempre (`MAX_CENTS`) |
| `maxCents`   | igual; si van los dos, `minCents ≤ maxCents`      |
| `from`, `to` | fechas `YYYY-MM-DD`; si van las dos, `from ≤ to`  |
| `cursor`     | el `nextCursor` de la página anterior             |

Un valor no válido o un rango al revés responde `400`.

```text
{
  transactions: Transaction[],      // como mucho 100, de más reciente a más antiguo
  nextCursor: string | null,        // null si no hay más
  totals?: { count, incomeCents, expenseCents }   // solo en la primera página (sin cursor)
}
```

- **Orden y cursor**: el de «Mes» (`date DESC, created_at DESC, id DESC`). El cursor lleva la
  fecha, el instante de creación y el id del último movimiento de la página, codificados en
  base64url; la página siguiente empieza justo después (paginación por clave, no por
  posición, así un movimiento nuevo no repite ni salta filas). Un cursor mal formado es `400`.
- **Totales**: `count(*)` y `sum(amount_cents) filter (where kind = …)` con los mismos filtros
  y sin cursor (RF-905).
- Los ids de categoría no se comprueban contra el hogar: como la consulta siempre filtra por
  `household_id`, uno ajeno o inexistente simplemente no encuentra nada, sin decir si existe.

## Dominio

`packages/domain/src/search.ts`:

- `SEARCH_PAGE_SIZE = 100` y `SEARCH_MAX_CATEGORIES = 50`.
- `rangeError(from, to)` → `'reversed'` si los dos existen y `from > to`, si no `null`; se usa
  para importes (céntimos) y fechas (comparando `YYYY-MM-DD`), en el esquema del servidor y en
  la app junto al campo.

## App

```text
apps/mobile/
├── app/(app)/search.tsx              # nuevo: «Buscar movimientos»
├── app/(app)/(tabs)/index.tsx        # lupa en la barra; la fila de movimiento sale a un componente
├── src/components/TransactionRow.tsx # la fila de «Mes», reutilizada (con fecha completa en la búsqueda)
├── src/design/AppBar.tsx             # `action`: un botón de icono a la derecha
├── src/components/Chip.tsx           # `multiple`: rol `checkbox` para elegir varias
├── src/design/Icon.tsx               # `search` → `magnify`
├── src/api/client.ts, queryKeys.ts   # api.searchTransactions; queryKeys.search bajo `periods`
├── src/hooks/data.ts                 # useSearch(householdId, filters) con useInfiniteQuery
└── src/i18n/es.ts                    # textos
```

- **Lupa**: `AppBar` acepta `action` (icono, etiqueta y `onPress`) y lo pinta a la derecha;
  «Mes» la usa con la etiqueta «Buscar movimientos».
- **Filtros** (arriba, sin tarjeta):
  - Tipo: `SegmentedControl` «Todos», «Gastos», «Ingresos».
  - Categorías: `Chip` con `multiple`, que se parten en varias líneas; las del tipo elegido
    (todas con «Todos»), y debajo de un subtítulo «Archivadas», las archivadas. Al cambiar de
    tipo se quitan las elegidas que ya no encajan.
  - Importe: dos `TextField` «Desde» y «Hasta» con «€».
  - Fechas: dos `TextField` «Desde» y «Hasta» (dd/mm/aaaa).
  - Los campos de texto se aplican al dejar de escribir (400 ms) o al pulsar «Intro»; si no
    valen, el error va bajo el campo (`parseAmount`, `parseShortDate`, `rangeError`) y ese
    filtro no se envía hasta corregirlo.
  - «Quitar filtros» cuando hay alguno.
- **Resultados**: una línea con «23 movimientos» y los totales de gastos e ingresos
  (`Amount`), la lista con `TransactionRow` (fecha como «27/10/2026», porque mezcla años) y
  «Mostrar más» mientras haya `nextCursor`. Sin resultados, `EmptyState` con «Quitar filtros».
- **Abrir un resultado**: `router.push('/transaction/:id')`, como en «Mes». La pantalla de
  búsqueda sigue montada debajo, así que al volver conserva los filtros.
- **Refresco**: `queryKeys.search(h, filtros)` = `['periods', h, 'search', filtros]`: lo que ya
  invalida los meses (editar, borrar, deshacer, apuntar, pagos recurrentes) refresca también la
  búsqueda. La búsqueda no se guarda en la caché persistente (no tiene sentido sin conexión y
  las combinaciones de filtros son infinitas).

## Investigación y decisiones

| Decisión           | Elegido                             | Alternativas descartadas                                                                     |
| ------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| Dónde se filtra    | En el servidor, en SQL              | En la app sobre lo cargado: habría que traer todo el historial y sumar en la app (art. IV.5) |
| Paginación         | Por clave con cursor                | Por posición (`offset`): un movimiento nuevo o borrado repite o salta filas                  |
| Totales            | Solo en la primera página           | En cada página: misma consulta repetida sin cambiar nada                                     |
| Filtros en la URL  | Parámetros de consulta (`GET`)      | `POST` con cuerpo: es una lectura, y `GET` es más simple de cachear y probar                 |
| Varias categorías  | `categoryId` repetido               | Lista separada por comas: el validador de uuid ya trata cada valor                           |
| Fila de resultados | La de «Mes», sacada a un componente | Una fila nueva: dos sitios que mantener iguales                                              |

## Riesgos

- **Barra de «Mes» a 320 px**: la lupa quita sitio al título, que ya se acorta con «…» en
  «Noviembre de 2026». Se comprueba en la tarea de la barra; el nombre completo sigue llegando
  al lector de pantalla.
- **Muchos chips de categorías**: con todas las categorías la zona de filtros es alta en un
  móvil; los resultados quedan debajo y se llega desplazando. Se acepta para esta versión.

## Pruebas y cierre

- Batería de ataques ampliada a `/transactions/search` (otro hogar, ids de categoría ajenos,
  sin sesión, valores absurdos, cursores manipulados, inyección en los parámetros).
- CE-901: cientos de movimientos; varias combinaciones de filtros contra un filtrado a mano,
  recorriendo todas las páginas.
- Punta a punta: lupa, filtros, «Mostrar más», abrir un resultado, editarlo y volver; las
  anteriores siguen pasando. CE-902 con 5.000 movimientos; axe-core a 320 y 1280 px;
  `expo export --platform android`.
