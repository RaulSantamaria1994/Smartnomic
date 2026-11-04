# Plan de implementación: Presupuestos por categoría

**Rama**: `007-presupuestos` | **Fecha**: 2026-11-04 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Una tabla nueva, `budgets`, guarda los cambios de presupuesto de cada categoría con el inicio
del periodo desde el que valen (una fila por categoría y periodo; quitar un presupuesto es una
fila sin importe). El presupuesto de un periodo es la última fila de su categoría que empieza
antes de que termine el periodo. Lo gastado no se guarda: sale en SQL de los movimientos del
periodo, agrupado por categoría. El periodo que ya devuelve «Mes» añade `budgets` con el
importe y lo gastado; una ruta `PUT`/`DELETE` por categoría cambia el presupuesto desde el
periodo en curso. En la app, una sección «Presupuestos» en «Mes» y una pantalla para
editarlos todos a la vez.

## Contexto técnico

| Campo                        | Valor                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Node 22, Expo 58 — igual que ahora                                      |
| **Dependencias nuevas**      | Ninguna                                                                                        |
| **Almacenamiento**           | PostgreSQL: tabla `budgets`, migración `0007` con `pnpm db:generate`                           |
| **Tests**                    | Vitest: dominio (estado y orden), esquemas, servidor (rutas, versiones, sumas), migración, app |
| **Plataformas**              | Android y navegador                                                                            |
| **Objetivos de rendimiento** | «Mes» < 1 s con 500 movimientos y 15 presupuestos (CE-703); una consulta más en el periodo     |
| **Restricciones**            | Importes en céntimos; sumas en SQL (art. III.5, IV.5); estilo de la 006; WCAG 2.1 AA           |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                                    | Estado |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Sin dependencias nuevas.                                                                                                    | ✅     |
| II. Arquitectura por capas | Estado (normal, cerca, pasado), lo que queda y el orden en `packages/domain/src/budgets.ts`; contrato en `packages/api`.    | ✅     |
| III. Dinero y fechas       | `amount_cents` entero; periodos con el `month_start_day` del hogar; lo gastado se calcula siempre de los movimientos.       | ✅     |
| IV. Datos y persistencia   | `budgets` con `household_id` y clave compuesta a la categoría del mismo hogar; migración nueva `0007`, solo añade.          | ✅     |
| V. API                     | Esquemas zod; `budgets` se añade al periodo con valor por defecto `[]` (compatible con apps instaladas); `PUT` idempotente. | ✅     |
| VI. Seguridad y privacidad | Permiso nuevo `budgets.write` (propietario y editor); toda consulta filtra por hogar; batería de ataques ampliada.          | ✅     |
| VII. Tests                 | Tests primero en cada capa; la suma por categoría se contrasta con la suma de los movimientos (CE-702).                     | ✅     |
| VIII. Calidad y CI         | `pnpm check`; textos en `es.ts`.                                                                                            | ✅     |
| IX. App y plataformas      | Mismas pantallas en Android y web; los presupuestos vienen en el periodo, así que se ven sin conexión con la caché.         | ✅     |

Sin incumplimientos.

## Modelo de datos

```text
budgets
  id            uuid  pk
  household_id  uuid  not null → households(id) on delete cascade
  category_id   uuid  not null
  valid_from    date  not null        -- inicio del periodo desde el que vale
  amount_cents  bigint null           -- null: sin presupuesto desde ese periodo
  member_id     uuid  null            -- quién lo cambió (se conserva si sale del hogar)
  created_at, updated_at  timestamptz
  unique (category_id, valid_from)
  foreign key (category_id, household_id) → categories(id, household_id)
  check (amount_cents is null or amount_cents > 0)
```

- **Presupuesto de un periodo** (RF-702): por categoría, la fila con mayor `valid_from` que
  sea ≤ el último día del periodo (`DISTINCT ON (category_id) … ORDER BY valid_from DESC`). Si
  su importe es `null`, la categoría no tiene presupuesto ese periodo.
- **Cambiar o quitar** escribe la fila del periodo en curso (`INSERT … ON CONFLICT
(category_id, valid_from) DO UPDATE`): el mismo cambio repetido no crea filas nuevas, y
  cambiarlo dos veces en el mismo mes deja el último importe.
- **Lo gastado** (RF-703): `sum(amount_cents)` de los gastos no borrados del periodo, agrupado
  por categoría, en la misma consulta.

## Contrato de la API

- `GET /api/households/:id/periods/:start` añade
  `budgets: [{ categoryId, amountCents, spentCents }]` (por defecto `[]`), solo de categorías
  de gasto no archivadas con presupuesto en ese periodo.
- `PUT /api/households/:id/budgets/:categoryId` con `{ amountCents }` (céntimos > 0 y como
  mucho 1.000.000.000): vale desde el periodo en curso. `403` sin `budgets.write`; `404` si la
  categoría no es del hogar; `409` si es de ingresos o está archivada.
- `DELETE /api/households/:id/budgets/:categoryId`: sin presupuesto desde el periodo en curso
  (idempotente).
- Exportación: `budgets: [{ categoryId, validFrom, amountCents }]` (por defecto `[]`).

## Dominio

`packages/domain/src/budgets.ts`:

- `budgetProgress(amountCents, spentCents)` → `{ remainingCents, overCents, share, level }`,
  con `level` `'ok' | 'near' | 'over'` (cerca desde el 80 %, pasado por encima del 100 %).
- `sortBudgets(list)`: de más a menos porcentaje gastado; a igualdad, por nombre.
- Constante `BUDGET_NEAR_SHARE = 0.8`.

## App

```text
apps/mobile/
├── app/(app)/budgets.tsx              # nuevo: editar todos los presupuestos a la vez
├── app/(app)/(tabs)/index.tsx         # sección «Presupuestos» debajo del resumen
├── app/(app)/(tabs)/account.tsx       # fila «Presupuestos» en el menú de «Hogar»
├── src/design/BudgetRow.tsx           # fila: icono, nombre, «320,00 € de 400,00 €», barra y lo que queda
├── src/design/ProgressBar.tsx         # tono `near` (ámbar) y `over` (rojo)
├── src/design/Icon.tsx                # `budget` → `wallet-outline`
├── src/api/client.ts, src/hooks/      # saveBudget, deleteBudget; refrescan el periodo
└── src/i18n/es.ts                     # textos
```

- **«Mes»**: sección «Presupuestos» entre el resumen y «Próximos pagos», con una `BudgetRow`
  por categoría (orden de `sortBudgets`) y el enlace «Editar presupuestos». Sin presupuestos,
  quien puede editarlos ve una fila «Ponerle un límite a una categoría»; quien no, nada.
- **«Presupuestos»** (`/budgets`, desde «Mes» y desde «Hogar»): una fila por categoría de gasto
  en uso, con su icono, su nombre y un campo de importe con «€» (vacío = sin presupuesto), y un
  único botón «Guardar» que envía solo lo cambiado (`PUT` o `DELETE` por categoría, en
  paralelo). Así son tres pasos (CE-701). Un lector ve los importes sin campos.
- **Colores**: normal en verde; cerca, ámbar (`status.soon`); pasado, rojo (`status.overdue`),
  siempre con el texto «Te quedan …» o «Te has pasado …».

## Investigación y decisiones

| Decisión              | Elegido                                                                | Alternativas descartadas                                                                    |
| --------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Guardar el historial  | Filas por categoría y `valid_from` (cambios), quitar = fila con `null` | Un importe por categoría sin historial: cambiarlo reescribiría los meses pasados (RF-702)   |
| Qué fila vale         | La de mayor `valid_from` ≤ fin del periodo                             | ≤ inicio del periodo: si el hogar cambia su día de inicio, un cambio podría saltarse un mes |
| Lo gastado            | SQL agrupado por categoría en la ruta del periodo                      | Sumar en la app: lo prohíbe el art. IV.5                                                    |
| Dónde viaja           | Dentro del periodo (`budgets`, por defecto `[]`)                       | Ruta aparte: otra petición en «Mes» y otra caché que invalidar                              |
| Idempotencia          | `PUT` por categoría (la clave es la categoría y el periodo en curso)   | Ids de cliente: no hacen falta, repetir el mismo cambio da lo mismo                         |
| Editar                | Una pantalla con todos los campos y un «Guardar»                       | Una pantalla por categoría: cuatro pasos en lugar de tres                                   |
| Categorías archivadas | No salen ni en el periodo ni en la pantalla; su historial se conserva  | Borrar sus presupuestos: al restaurarla los perdería                                        |

## Riesgos

- **Cambio de día de inicio de mes**: la fila vale por fecha, así que un cambio hecho en un
  periodo largo puede empezar a valer a mitad del nuevo. Se acepta: es raro y no pierde datos.
- **Apps instaladas antiguas**: no conocen `budgets`; como es un campo añadido con valor por
  defecto, siguen funcionando.

## Pruebas y cierre

- Batería de ataques ampliada a `/budgets` (otro hogar, IDOR con ids de categoría ajenos,
  lector, importes absurdos).
- Pruebas de punta a punta: poner, cambiar y quitar; gastar hasta el 80 % y pasarse; ver un mes
  pasado con su presupuesto de entonces; CE-702 con cientos de gastos; «Mes» con 500
  movimientos y 15 presupuestos (CE-703).
- axe-core en «Mes» y «Presupuestos» a 320 y 1280 px; `expo export --platform android`.
