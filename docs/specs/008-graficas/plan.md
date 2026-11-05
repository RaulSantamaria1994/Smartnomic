# Plan de implementación: Gráficas

**Rama**: `feat/008-graficas` | **Fecha**: 2026-11-05 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Una ruta nueva de solo lectura, `GET /api/households/:id/charts/:start`, devuelve en una
respuesta los datos de las cuatro gráficas para los 6 periodos del hogar que terminan en el
que empieza en `:start`: ingresos y gastos de cada periodo, gasto de cada categoría en cada
periodo y lo apartado en huchas al final de cada periodo (en total y por hucha). Todo se
suma en SQL a partir de los movimientos, con tres consultas agregadas. La app añade la
pestaña «Gráficas» (la segunda), con un selector de chips para elegir la gráfica, las mismas
flechas de mes que «Mes» y filas con barras horizontales: un componente nuevo, `ChartBar`,
basado en la barra de progreso que ya existe. Sin dependencias nuevas.

## Contexto técnico

| Campo                        | Valor                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Node 22, Expo 58 — igual que ahora                                       |
| **Dependencias nuevas**      | Ninguna                                                                                         |
| **Almacenamiento**           | Sin cambios: ni tablas ni migraciones; se leen `transactions`, `categories` y `savings_entries` |
| **Tests**                    | Vitest: dominio (ventana de periodos, porcentajes, barras), esquemas, servidor (sumas), app     |
| **Plataformas**              | Android y navegador                                                                             |
| **Objetivos de rendimiento** | «Gráficas» < 1 s con 500 movimientos por mes durante 6 meses (CE-802); una sola petición        |
| **Restricciones**            | Importes en céntimos; sumas en SQL (art. III.5, IV.5); estilo de la 006; WCAG 2.1 AA            |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                                           | Estado |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Sin dependencias nuevas: las barras se pintan con `View` como la barra de progreso.                                                | ✅     |
| II. Arquitectura por capas | Ventana de 6 periodos, porcentajes, longitud de barra y categoría por defecto en `packages/domain/src/charts.ts`; contrato en api. | ✅     |
| III. Dinero y fechas       | Céntimos enteros; los 6 periodos salen de `periodOf`/`shiftPeriod` con el `month_start_day` del hogar.                             | ✅     |
| IV. Datos y persistencia   | Sin cambios en el esquema; toda consulta filtra por hogar y excluye borrados; sumas en SQL.                                        | ✅     |
| V. API                     | Esquema zod de la respuesta; ruta nueva de solo lectura; las apps instaladas no la usan y siguen funcionando.                      | ✅     |
| VI. Seguridad y privacidad | Permiso `household.view` (todos los miembros); otro hogar 403/404; batería de ataques ampliada; los logs no llevan importes.       | ✅     |
| VII. Tests                 | Tests primero en cada capa; cada importe se contrasta con la suma de los movimientos (CE-801).                                     | ✅     |
| VIII. Calidad y CI         | `pnpm check`; textos en `es.ts`.                                                                                                   | ✅     |
| IX. App y plataformas      | Misma pantalla en Android y web; la respuesta se guarda en la caché persistente, así que se ve sin conexión.                       | ✅     |

Sin incumplimientos.

## Contrato de la API

`GET /api/households/:id/charts/:start` (`:start` debe ser inicio de periodo del hogar, como
en la ruta del periodo; si no, `400`). Permiso `household.view`.

```text
{
  months: [                         // 6, del más antiguo al más reciente; el último empieza en :start
    { start, end, incomeCents, expenseCents }
  ],
  categories: [                     // categorías de gasto con algún gasto en los 6 periodos
    { categoryId, monthsCents: [n, n, n, n, n, n] }   // mismo orden que `months`
  ],
  savings: {
    monthsCents: [n, n, n, n, n, n],  // apartado en todas las huchas al final de cada periodo
    goals: [{ goalId, balanceCents }] // huchas con saldo > 0 al final del último periodo
  }
}
```

- Las categorías archivadas con gastos en la ventana **sí** vienen: sin ellas la suma de «Por
  categoría» no daría el total del mes. La app las muestra en «Por categoría» pero no en el
  selector de «Evolución» (RF de la historia 3, escenario 5).
- Los nombres, iconos y colores de categorías y huchas no viajan aquí: la app ya los tiene
  (`useCategories`, `useSavings`).

## Consultas (servidor)

`apps/server/src/routes/charts.ts`, `registerChartRoutes`. Las tres en paralelo:

1. **Ingresos y gastos**: `sum(amount_cents) filter (where kind = …)` de los movimientos no
   borrados entre el inicio del primer periodo y el fin del último, agrupado por periodo. El
   periodo de cada fila sale de unir con una lista `VALUES (idx, start, end)` de los 6
   periodos (`date BETWEEN start AND end`); usa el índice `transactions_household_date_idx`.
2. **Por categoría**: la misma unión, solo gastos, agrupado por periodo y categoría.
3. **Huchas**: por hucha, `sum(depósito − retirada)` de los movimientos no borrados con
   `date ≤ fin` de cada periodo (unión con los 6 fines). El total del mes es la suma de
   todas las huchas; `goals` sale del último periodo. Las huchas cerradas ya devuelven su
   saldo como retirada (especificación 005), así que no hace falta tratarlas aparte.

Los periodos sin filas se rellenan con 0 en el servidor, así la respuesta siempre tiene 6.

## Dominio

`packages/domain/src/charts.ts`:

- `CHART_MONTHS = 6` y `chartWindow(start, monthStartDay)` → los 6 `Period` que terminan en el
  que empieza en `start`.
- `shares(amounts)` → porcentaje entero de cada importe sobre el total (redondeo normal; no se
  fuerza a que sumen 100) y `0` si el total es 0.
- `barShare(value, max)` → fracción de 0 a 1 para pintar la barra, con un mínimo visible
  (`MIN_BAR_SHARE = 0.02`) si el valor no es 0 (caso límite de importes pequeños).
- `sortByAmount(list)` → de mayor a menor importe; a igualdad, por nombre.
- `defaultCategory(categories, lastMonth)` → la de más gasto del mes; si no hay gastos, la
  primera de gasto no archivada por nombre (historia 3, escenario 2).

## App

```text
apps/mobile/
├── app/(app)/(tabs)/_layout.tsx      # <Tabs.Screen name="charts" /> entre index y calendar
├── app/(app)/(tabs)/charts.tsx       # nuevo: pestaña «Gráficas»
├── src/components/TabBar.tsx         # pestaña `charts` con el icono `chart`; texto de 4 a 5 pestañas
├── src/design/ChartBar.tsx           # nuevo: barra horizontal de 8 px, tonos income/expense/savings
├── src/design/Icon.tsx               # `chart` → `chart-bar`
├── src/api/client.ts                 # api.charts y queryKeys.charts bajo `periods`
├── src/hooks/data.ts                 # useCharts(householdId, start)
└── src/i18n/es.ts                    # textos
```

- **Pantalla**: `Screen` con `AppBar` (título «Gráficas», flechas de mes como «Mes» y el
  mismo `MonthSlide`). Debajo, una fila de cuatro `Chip` (rol `radio`, se parten en dos
  líneas si no caben) para elegir la gráfica: «Por categoría», «Ingresos y gastos»,
  «Evolución» y «Huchas». La gráfica elegida y la categoría de «Evolución» se guardan en el
  estado de la pantalla; no cambian al moverse de mes.
- **Por categoría**: total gastado arriba (`SummaryBlock` o `Amount`) y una `ListRow` por
  categoría con icono, nombre, importe, porcentaje y `ChartBar` (escala: la categoría mayor).
  Tocar una fila pasa a «Evolución» con esa categoría.
- **Ingresos y gastos**: una fila por mes con el nombre del mes, dos `ChartBar` (ingresos y
  gastos, misma escala: el mayor de los 12 valores) con su importe y la diferencia con signo.
- **Evolución**: chips con las categorías de gasto no archivadas (con icono, desplazables
  en horizontal) y una fila por mes con su `ChartBar` y el importe.
- **Huchas**: una fila por mes con lo apartado al final del mes; debajo, `Section` con cada
  hucha con saldo (`CategoryIcon` de la hucha, nombre, importe), de más a menos. Sin
  huchas, `EmptyState` y, para quien tiene `savings.write`, el enlace para crear una.
- **Accesibilidad**: cada fila es un único elemento con `accessibilityLabel` completo
  («Marzo: ingresos 1.800,00 €, gastos 1.650,00 €, diferencia +150,00 €»); las barras son
  decorativas (`aria-hidden`) como la de progreso. Ingresos y gastos se distinguen también
  por la etiqueta de texto de cada barra, no solo por el color.
- **Colores** (`color.chart`): en «Ingresos y gastos», cada barra con el color de sus
  importes en el resto de la app: ingresos en el verde de ingresos y gastos en gris oscuro;
  el resto de gráficas, en el verde de la app. Todos contrastan 3:1 con el fondo
  (`color.test.ts`). Animación: la de la barra de progreso (se rellena al aparecer), sin
  animación con «reducir movimiento».
- **Refresco**: `queryKeys.charts(h, start)` = `['periods', h, 'charts', start]`. Todo lo que
  ya invalida `queryKeys.periods(h)` (apuntar, editar, borrar, deshacer, pagos recurrentes,
  huchas) refresca también las gráficas, sin tocar esos sitios.

## Investigación y decisiones

| Decisión                 | Elegido                                                 | Alternativas descartadas                                                                |
| ------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Una ruta o varias        | Una ruta con las cuatro gráficas                        | Una por gráfica: cuatro cachés y peticiones al cambiar de gráfica; cada una es pequeña  |
| Reusar la ruta del mes   | No: las gráficas necesitan 6 periodos agregados         | Pedir 6 periodos completos: miles de movimientos para sumar en la app (prohibido, IV.5) |
| Barras                   | Horizontales con `View` (`ChartBar`)                    | Verticales: a 320 px y con texto grande no caben las cifras debajo; librería SVG        |
| Selector de gráfica      | Chips (`Chip` existente), se parten en dos líneas       | `SegmentedControl`: cuatro textos largos no caben a 320 px                              |
| Categorías archivadas    | En «Por categoría» sí; en el selector de «Evolución» no | Quitarlas de todo: «Por categoría» no sumaría el total del mes que muestra «Mes»        |
| Refrescar tras un cambio | Clave de caché bajo `periods`                           | Añadir una invalidación más en cada mutación: fácil olvidar alguna                      |

## Riesgos

- **Cinco pestañas a 320 px**: cada una tiene 64 px y «Calendario» mide unos 62 px, así que
  las pestañas no llevan margen lateral. Con el texto del sistema más grande, los nombres
  largos se acortan con «…» (su nombre completo sigue llegando al lector de pantalla).
- **Archivar una categoría con gastos**: sigue saliendo en «Por categoría» con su nombre; es lo
  esperado para que el total cuadre.

## Pruebas y cierre

- Batería de ataques ampliada a `/charts` (otro hogar, `:start` no válido, sin sesión).
- CE-801: cientos de movimientos y aportaciones en varias categorías y meses (día de inicio 1
  y 25); cada cifra de la respuesta contra la suma de los movimientos.
- Punta a punta: abrir «Gráficas», cambiar de gráfica, de mes, tocar una categoría y ver su
  evolución, apuntar un gasto y verlo reflejado; las anteriores siguen pasando.
- CE-802: 500 movimientos por mes durante 6 meses; axe-core en las cuatro gráficas a 320 y
  1280 px; `expo export --platform android`.

## Resultados

- `pnpm check` en verde: 560 tests (dominio de las gráficas, esquema de la respuesta, claves de
  la caché, contraste de las barras y 16 de servidor: acceso, otro hogar, lector, fechas fuera
  del calendario, borrados, huchas fuera de los gastos, categorías archivadas, día de inicio 25,
  huchas con retiradas, cerradas y borradas).
- CE-801: 600 movimientos y 120 movimientos de huchas en seis meses; cada cifra de las cuatro
  gráficas coincide al céntimo con la suma de sus movimientos, y los ingresos y gastos de cada
  mes, con el resumen de «Mes».
- CE-802: 3.000 movimientos (500 por mes durante 6 meses): la ruta tarda 19 ms de mediana; de
  recargar a ver las filas, entre 881 y 934 ms (1.006 ms la primera carga en frío, igual que
  «Mes»); cambiar de gráfica, entre 112 y 154 ms.
- CE-803: dos toques desde la barra de pestañas (abrir «Gráficas» y tocar la categoría).
- CE-804: axe-core sin problemas en 26 pantallas, las cuatro gráficas incluidas, a 320 y
  1280 px; las pruebas de punta a punta anteriores (MVP, calendario, categorías, huchas,
  animaciones y presupuestos) siguen pasando.
- Batería de ataques ampliada (otro hogar, IDOR con el id del hogar, sin sesión, lector, fechas
  absurdas, otros métodos): sin accesos, filtraciones ni errores 500; los logs no llevan
  importes. Encontró un 500 con fechas en el extremo del calendario (año 1 y 9999), corregido
  con un 400 y su test. La ruta del periodo de «Mes» tiene el mismo 500 con `9999-12-01`; no se
  toca en esta funcionalidad.
- A 320 px, «Calendario» no cabía en la barra de cinco pestañas: las pestañas van sin margen
  lateral.
- `expo export --platform android` compila.
