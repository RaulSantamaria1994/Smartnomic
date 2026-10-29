# Plan de implementación: Calendario de pagos programados

**Rama**: `002-calendario` | **Fecha**: 2026-10-29 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Una pantalla nueva, «Calendario», enseña un mes natural con los vencimientos de los pagos
y cobros recurrentes del hogar, cada uno con su estado. Al tocar un día se ven sus
vencimientos, y desde ahí se pagan u omiten con la pantalla de vencimiento que ya existe.

Enfoque técnico: no hay tablas nuevas. El dominio gana un módulo `calendar.ts` que arma la
cuadrícula del mes y calcula los vencimientos con su estado y los totales, reutilizando
`occurrencesBetween`, la misma función que usan "Próximos pagos" y los recordatorios (así
nunca discrepan, CE-102). El servidor expone `GET /api/households/:id/calendar/:month`, que
junta reglas, vencimientos resueltos y el importe real de los pagados, y aplica los
límites de navegación. La app pinta la cuadrícula con componentes propios, sin
dependencias nuevas.

## Contexto técnico

| Campo                        | Valor                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Node 22 — igual que el MVP                                        |
| **Dependencias nuevas**      | Ninguna                                                                                  |
| **Almacenamiento**           | Sin cambios en el esquema ni migraciones                                                 |
| **Tests**                    | Vitest: dominio (cuadrícula, estados, totales) y servidor contra PostgreSQL real         |
| **Plataformas**              | Android y navegador (RF-109), misma pantalla                                             |
| **Objetivos de rendimiento** | Mes visible en menos de 1 s con 50 pagos recurrentes (CE-101); API p95 < 300 ms          |
| **Restricciones**            | Fechas civiles `YYYY-MM-DD`; "hoy" en la zona del hogar; importes en céntimos; accesible |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                               | Estado |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Sin dependencias nuevas; la cuadrícula se hace con `View`/`Pressable`.                                                 | ✅     |
| II. Arquitectura por capas | Cuadrícula, estados y totales en `packages/domain/src/calendar.ts`; el servidor y la app solo lo usan.                 | ✅     |
| III. Dinero y fechas       | Totales en céntimos enteros; meses como `YYYY-MM` y días como fechas civiles, sin `Date` en el dominio.                | ✅     |
| IV. Datos y persistencia   | Sin cambios de esquema; lee `recurring_rules`, `occurrences` y `transactions` filtrando por `household_id`.            | ✅     |
| V. API                     | Esquema zod de la respuesta y del parámetro `:month` en `packages/api`; errores con el formato común.                  | ✅     |
| VI. Seguridad y privacidad | `requireMember('household.view')`; pagar u omitir sigue usando las rutas existentes con su permiso.                    | ✅     |
| VII. Tests                 | Dominio con casos límite (fin de mes, bisiestos, cambio de año, semanas); servidor con estados, límites y aislamiento. | ✅     |
| VIII. Calidad y CI         | `pnpm check`; textos en `src/i18n/es.ts`.                                                                              | ✅     |
| IX. App y plataformas      | Una sola pantalla para Android y web; caché persistida en Android para verlo sin conexión; accesible (RF-108).         | ✅     |

Sin incumplimientos.

## Estructura de archivos

```text
packages/domain/src/
├── calendar.ts              # nuevo: monthGrid, monthRange, calendarMonth, calendarTotals
└── calendar.test.ts
packages/api/src/schemas/
└── calendar.ts              # nuevo: monthSchema (YYYY-MM) y calendarResponseSchema
apps/server/src/routes/
└── calendar.ts              # nuevo: GET /api/households/:householdId/calendar/:month
apps/server/test/
└── calendar.test.ts
apps/mobile/
├── app/(app)/calendar.tsx   # nuevo: pantalla del calendario
├── src/components/MonthGrid.tsx  # nuevo: cuadrícula accesible
├── src/api/client.ts        # api.calendar y queryKeys.calendar
├── src/hooks/data.ts        # useCalendar
└── src/i18n/es.ts           # textos
```

Cambios menores: enlace «Calendario» en la pantalla «Mes»; al pagar, omitir o cambiar un
pago recurrente se invalida también `queryKeys.calendar` (en `useRuleMutations` y en la
pantalla de vencimiento).

## Investigación y decisiones

| Decisión                      | Elegido                                                                                                                                                        | Alternativas descartadas                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Dónde se calculan             | En el servidor con el dominio: un único `GET` por mes que ya trae estados e importes reales.                                                                   | Calcularlos en la app con `/recurring` y `/upcoming`: faltan los resueltos y sus importes   |
| Endpoint                      | `GET /calendar/:month` nuevo                                                                                                                                   | Ampliar `/upcoming` con `from`/`to`: mezcla dos usos y no trae los resueltos                |
| Cuadrícula                    | Componente propio: 7 columnas, semanas de lunes a domingo, 4–6 filas según el mes                                                                              | Librería de calendario (dependencia nueva para algo pequeño, peor control de accesibilidad) |
| Estados                       | `overdue` (pasado y sin resolver), `pending` (hoy o futuro), `paid`, `skipped`                                                                                 | —                                                                                           |
| Importe mostrado              | Pagado: el del movimiento creado (si se borró, el previsto). Resto: el previsto de la regla                                                                    | —                                                                                           |
| Reglas desactivadas           | Sus vencimientos sin resolver no aparecen (como en "Próximos pagos"); los resueltos sí                                                                         | —                                                                                           |
| Resueltos fuera de calendario | Un vencimiento resuelto cuya fecha ya no encaja con la regla (porque se editó) se muestra igual en su día: ocurrió                                             | Ocultarlo (perdería información real)                                                       |
| Límites (aclaración 3)        | Desde el mes de inicio del pago más antiguo hasta 12 meses después del mes actual (zona del hogar). Fuera de ahí: 400. Sin pagos: solo el mes actual hasta +12 | —                                                                                           |
| Totales (RF-106)              | Previsto de pagos y de cobros del mes (importe real en los pagados, nada en los omitidos) y pendiente de pagar (gastos `pending` + `overdue`)                  | —                                                                                           |
| Pagar u omitir (historia 2)   | El detalle del día enlaza a `/occurrence/[ruleId]/[dueDate]`, la pantalla del MVP: mismas validaciones, permisos e idempotencia. Lectores: sin enlace          | Duplicar el formulario de pago en el calendario                                             |
| Caché                         | `['calendar', householdId, month]` con TanStack Query; persistida en Android como el resto                                                                     | —                                                                                           |
| Día seleccionado              | Al abrir: hoy si es el mes actual; si no, el primer día con vencimientos o el día 1                                                                            | —                                                                                           |

## Modelo de datos

Sin cambios. Se leen:

- `recurring_rules` del hogar (todas, también las desactivadas, para los resueltos).
- `occurrences` del hogar con `due_date` dentro del mes.
- `transactions` enlazadas desde `occurrences.transaction_id` (sin `deleted_at`), para el
  importe real.

## Dominio (`packages/domain/src/calendar.ts`)

```ts
type Month = string; // 'YYYY-MM'
monthRange(month): { start: DateString; end: DateString }
monthOf(date): Month
shiftMonth(month, n): Month
/** Semanas de lunes a domingo; los huecos fuera del mes son null. */
monthGrid(month): (DateString | null)[][]
type CalendarStatus = 'pending' | 'overdue' | 'paid' | 'skipped'
interface CalendarItem { ruleId; dueDate; status; amountCents; kind }
calendarMonth(rules, resolved, month, today): CalendarItem[]   // ordenados por fecha y regla
calendarTotals(items): { expenseCents; incomeCents; pendingExpenseCents }
```

`calendarMonth` usa `occurrencesBetween(rule, start, end)` para las reglas activas, quita
las resueltas y añade todas las resueltas del mes con su estado e importe. Tests: meses de
28/29/30/31 días, mes que empieza en domingo (6 filas), febrero que empieza en lunes (4
filas), diciembre → enero, pagos el 31, semanales, cada N meses, anuales, fecha de fin,
reglas desactivadas, resueltos y totales.

## Contrato de la API

`GET /api/households/:householdId/calendar/:month` — lector o superior.

```jsonc
{
  "month": "2026-11",
  "today": "2026-10-29",
  "bounds": { "min": "2026-09", "max": "2027-10" },
  "items": [
    {
      "ruleId": "…",
      "dueDate": "2026-11-01",
      "status": "pending",
      "kind": "expense",
      "amountCents": 75000,
      "transactionId": null,
      "resolvedBy": null,
    },
  ],
  "totals": { "expenseCents": 0, "incomeCents": 0, "pendingExpenseCents": 0 },
}
```

- `:month` no válido o fuera de `bounds`: `400 validation_failed` con un mensaje en
  español.
- Hogar ajeno: `403` (como el resto de rutas).
- `resolvedBy` es el id del miembro; la app pone el nombre con `/members`.

## App

- **Entrada**: enlace «Calendario» en la cabecera de «Próximos pagos» de la pantalla «Mes».
- **Pantalla** `calendar.tsx`: cabecera con el mes («Noviembre de 2026»), flechas anterior
  y siguiente (desactivadas en los límites) y «Hoy»; totales; cuadrícula; lista del día
  seleccionado; mensaje si el mes no tiene vencimientos.
- **Cuadrícula** `MonthGrid`: cada día es un `Pressable` de al menos 44×44 con el número y
  una marca: punto rojo si hay atrasados, del color principal si hay pendientes, gris si
  todo está resuelto, y un número si hay más de uno. Hoy con borde; el seleccionado
  relleno. Etiqueta accesible: «Martes 3 de noviembre, 2 vencimientos, 1 atrasado».
  Encabezados L M X J V S D con su nombre completo para el lector de pantalla.
- **Lista del día**: icono de la categoría, nombre, importe (real si pagado), estado y,
  si está resuelto, quién lo resolvió. Pendientes y atrasados enlazan a pagar u omitir
  solo si `can('occurrences.resolve')`.
- **Pantallas estrechas y texto grande**: la cuadrícula ocupa el ancho disponible
  (7 columnas flexibles); los números no se cortan con escalado de texto.

## Guía de validación

1. Crear "Alquiler" mensual el día 31, "Gimnasio" semanal los lunes y "Nómina" el 28.
2. Abrir el calendario: el mes actual con hoy destacado y las marcas en los días
   correctos; febrero muestra el alquiler el 28 (o el 29 en bisiesto).
3. Tocar un día con varios vencimientos y ver la lista; pagar uno con otro importe y ver
   que pasa a pagado con el importe real, también en "Próximos pagos".
4. Omitir otro; navegar hasta +12 meses (la flecha se desactiva) y volver con «Hoy».
5. Con una cuenta lectora: ver el calendario sin poder pagar.
6. Pasar axe-core a la pantalla y probarla con TalkBack y texto grande en Android.

## Orden de implementación

1. Dominio `calendar.ts` con sus tests.
2. Esquemas en `packages/api`.
3. Ruta del servidor con sus tests.
4. Pantalla, cuadrícula y enlace en la app; invalidar la caché al pagar u omitir.
5. Prueba de punta a punta en web, axe-core, export de Android y documentación.

## Riesgos

| Riesgo                                                      | Mitigación                                                                    |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Discrepancias entre calendario, "Próximos pagos" y avisos   | Misma función del dominio (`occurrencesBetween`) y un test que compara ambos  |
| Cuadrícula ilegible en móviles estrechos o con texto grande | Columnas flexibles, marcas en lugar de textos dentro del día, prueba a 360 px |
| Muchos pagos semanales en 12 meses hacen lento el cálculo   | Se calcula solo el mes pedido; 50 reglas semanales son ~250 vencimientos      |

## Resultado de los criterios de éxito (C015–C016, 2026-10-29)

Medido en local con la web compilada para producción (servidor y PostgreSQL en la misma
máquina, Chromium sin interfaz).

| Criterio                                         | Resultado | Cómo se ha medido                                                                                                                                                                        |
| ------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CE-101 (mes < 1 s con 50 pagos)                  | ✅        | 50 pagos (25 semanales, 25 mensuales; 132 vencimientos en noviembre). API: 12 ms de mediana (peor 20 ms). Web recargando la página entera: 874 ms (peor 878 ms); pasar de mes: 68–89 ms. |
| CE-102 (mismo día que «Próximos pagos» y avisos) | ✅        | Los tres usan `occurrencesBetween`; un test del dominio compara el calendario con `upcoming`.                                                                                            |
| CE-103 (pagar en ≤ 3 toques)                     | ✅        | Hoy viene seleccionado: tocar el pago y «Marcar como pagado» son 2 toques (3 si es otro día).                                                                                            |
| CE-104 (WCAG 2.1 AA automático)                  | ✅        | axe-core sin problemas en la pantalla; a 360 px sin scroll horizontal.                                                                                                                   |

Guía de validación recorrida en web con la versión de producción (pasos 1–5). El paso 6
en Android (TalkBack y texto grande) queda pendiente del APK, como en el MVP.
