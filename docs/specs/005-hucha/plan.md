# Plan de implementación: Huchas para objetivos de ahorro

**Rama**: `005-hucha` | **Fecha**: 2026-10-30 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Dos tablas nuevas: `savings_goals` (la hucha) y `savings_entries` (aportaciones,
retiradas y meses saltados). Lo ahorrado, el estado, la cuota y las aportaciones
pendientes no se guardan: se calculan en `packages/domain` a partir de la hucha y sus
movimientos, así nunca se desincronizan. Las fechas de aportación son una regla mensual
del módulo de recurrencias que ya existe (`occurrencesBetween`), con el día elegido, desde
que se crea la hucha hasta su fecha límite: el día 31 en meses cortos sale solo.

El servidor expone las huchas y sus movimientos, añade las aportaciones pendientes a
«próximos pagos» y al calendario, y el resumen del periodo gana «Apartado para objetivos».
La app añade las pantallas de huchas, una tarjeta en «Mes» y los avisos del día de apartar.

## Contexto técnico

| Campo                        | Valor                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Node 22 — igual que el MVP                                        |
| **Dependencias nuevas**      | Ninguna                                                                                  |
| **Almacenamiento**           | 2 tablas nuevas y migración `0006`                                                       |
| **Tests**                    | Vitest: dominio (cuota, estados, fechas), servidor contra PostgreSQL real, app (avisos)  |
| **Plataformas**              | Android y navegador                                                                      |
| **Objetivos de rendimiento** | «Mes» < 1 s con 500 movimientos y 10 huchas (CE-504); API p95 < 300 ms                   |
| **Restricciones**            | Céntimos enteros; fechas civiles; «hoy» en la zona del hogar; accesible; sin emoji (004) |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                                         | Estado |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Sin dependencias nuevas.                                                                                                         | ✅     |
| II. Arquitectura por capas | Cuota, estado, pendientes y «apartado» en `packages/domain/src/savings.ts`; servidor y app solo lo usan.                         | ✅     |
| III. Dinero y fechas       | Importes en céntimos enteros (cuota redondeada hacia arriba al céntimo); fechas `YYYY-MM-DD`; sin `Date` en el dominio.          | ✅     |
| IV. Datos y persistencia   | Ambas tablas con `household_id` y filtradas por él; migración nueva; movimientos de hucha con borrado lógico (`deleted_at`).     | ✅     |
| V. API                     | Esquemas zod en `packages/api`; ids UUIDv7 de la app (idempotencia); solo se añaden campos a respuestas existentes (compatible). | ✅     |
| VI. Seguridad y privacidad | Acción nueva `savings.write` (propietario y editor); ver con `household.view`; logs sin importes ni nombres de huchas.           | ✅     |
| VII. Tests                 | Dominio con casos límite; cada endpoint con tests de otro hogar y de lector; carrera al confirmar y al sacar.                    | ✅     |
| VIII. Calidad y CI         | `pnpm check`; textos en `es.ts`; tokens de diseño; sin emoji.                                                                    | ✅     |
| IX. App y plataformas      | Mismas pantallas en Android y web; avisos locales del día de apartar (sin importe); caché sin conexión como el resto.            | ✅     |

Sin incumplimientos.

## Estructura de archivos

```text
packages/domain/src/
├── savings.ts               # nuevo: fechas de aportación, saldo, estado, cuota, pendientes, apartado
├── savings.test.ts
└── permissions.ts           # acción 'savings.write'
packages/api/src/schemas/
├── savings.ts               # nuevo: hucha, movimiento, entradas y respuestas
├── transactions.ts          # summary: + setAsideCents
├── recurring.ts             # upcoming: + savings (pendientes)
├── calendar.ts              # calendario: + savings
└── account.ts               # exportación: + savingsGoals y savingsEntries
apps/server/src/
├── db/schema.ts             # savings_goals, savings_entries
├── db/migrations/0006_*.sql
├── routes/savings.ts        # nuevo
├── routes/periods.ts        # apartado del periodo
├── routes/recurring.ts      # upcoming con pendientes de huchas
├── routes/calendar.ts       # calendario con huchas
└── routes/export.ts         # exportación con huchas
apps/server/test/savings.test.ts
apps/mobile/
├── app/(app)/savings/index.tsx        # lista (en curso, conseguidas, cerradas)
├── app/(app)/savings/new.tsx          # crear
├── app/(app)/savings/[goalId].tsx     # detalle: progreso, cuota, historial, aportar, sacar, editar, cerrar
├── app/(app)/savings/[goalId]/due/[dueDate].tsx  # confirmar o saltar la aportación del mes
├── src/components/SavingsForm.tsx     # crear y editar
├── src/design/SavingsCard.tsx         # tarjeta con barra de progreso
├── src/api/client.ts, src/hooks/data.ts  # api.savings…, useSavings, invalidaciones
├── src/reminders/plan.ts              # avisos del día de apartar
└── src/i18n/es.ts
```

Cambios en pantallas existentes: «Mes» (tarjeta «Huchas» y pendientes en «Próximos
pagos»; `SummaryCard` con «Apartado para objetivos»), calendario (marcas y lista del día)
y «Hogar» (entrada «Huchas»). La barra inferior no cambia.

## Investigación y decisiones

| Decisión              | Elegido                                                                                                                                                                                                                    | Alternativas descartadas                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Fechas de aportación  | Regla mensual de `recurrence.ts`: día elegido, desde la fecha de creación (`start_date`) hasta la fecha límite                                                                                                             | Código propio de fechas (duplicaría casos límite ya probados)                      |
| Qué se guarda         | Solo la hucha y sus movimientos. Saldo, estado (en curso, conseguida, plazo vencido), cuota y pendientes se calculan                                                                                                       | Guardar saldo y estado (se desincronizan)                                          |
| Estado «cerrada»      | `closed_at`. Cerrar crea, en la misma transacción, una retirada por el saldo con fecha de hoy                                                                                                                              | Borrar la hucha (cambiaría los resúmenes pasados)                                  |
| Movimientos           | `kind`: `deposit`, `withdrawal` o `skip` (este último sin importe, solo para un mes saltado). `due_date` enlaza con el mes que resuelve                                                                                    | Tabla aparte para saltados                                                         |
| Confirmar una vez     | Índice único parcial `(goal_id, due_date)` sobre movimientos no borrados con `due_date`; el segundo intento da 409 con quién lo hizo                                                                                       | Comprobar antes de insertar (carrera)                                              |
| Idempotencia          | Id UUIDv7 que manda la app (`PUT …/entries/:entryId`); reenviar el mismo no duplica                                                                                                                                        | —                                                                                  |
| Sacar sin pasarse     | Transacción con la hucha bloqueada (`SELECT … FOR UPDATE`): saldo recalculado dentro                                                                                                                                       | Comprobar fuera de la transacción (dos retiradas a la vez dejarían saldo negativo) |
| Deshacer              | Borrado lógico del movimiento más reciente no borrado; otro da 409                                                                                                                                                         | Borrado físico (constitución IV.4)                                                 |
| Pendientes de un mes  | Fechas de aportación sin movimiento con ese `due_date`, entre la creación y min(hoy + ventana, plazo); atrasadas si ya pasaron. Ninguna si está conseguida o cerrada                                                       | —                                                                                  |
| Cuota                 | `ceil((objetivo − saldo) / n)`, con `n` = pendientes (atrasadas incluidas) hasta el plazo; si `n = 0`, todo lo que falta                                                                                                   | Dividir entre meses naturales (no cuadra con el día elegido)                       |
| Al día o retrasada    | Al día si no hay aportaciones atrasadas y el saldo ≥ objetivo × (fechas de aportación ya pasadas ÷ fechas totales)                                                                                                         | Comparar con la cuota inicial (cambia al editar)                                   |
| Apartado del periodo  | Suma de aportaciones − retiradas con fecha en el periodo, en SQL (`setAsideCents`); lo que queda es `balanceCents − setAsideCents` y lo calcula la app. `balanceCents` no cambia de significado (compatibilidad de la API) | Cambiar `balanceCents` (rompería apps instaladas)                                  |
| Editar                | Se puede cambiar todo salvo `start_date`; las pendientes se recalculan solas. Objetivo ≤ saldo ⇒ conseguida                                                                                                                | —                                                                                  |
| Borrar                | `DELETE` solo sin movimientos; con movimientos, 409 y se ofrece cerrar                                                                                                                                                     | —                                                                                  |
| Icono y color         | Icono del catálogo de 004 (por defecto `savings`); color de acento del tema, sin elegir color                                                                                                                              | Color por hucha (más campos sin valor claro)                                       |
| Dónde se ve en la app | Tarjeta «Huchas» en «Mes» (las en curso, con progreso) y entrada en «Hogar»; pantallas en el `Stack`                                                                                                                       | Pestaña nueva (la barra ya tiene 4 y el «+»)                                       |
| Avisos                | Solo el del mismo día de apartar, a la hora del miembro: «Hoy apartas para Vacaciones · Toca para ver el importe»                                                                                                          | Aviso con antelación (no hace falta para apartar)                                  |
| Límites               | Nombre 1–40 caracteres; objetivo 1 céntimo–`MAX_CENTS`; día 1–31; plazo ≥ hoy al crear y como mucho 30 años                                                                                                                | —                                                                                  |

## Modelo de datos (migración `0006`)

```text
savings_goals
  id uuid PK (UUIDv7 de la app) · household_id → households ON DELETE CASCADE
  name text (1–40) · icon text · target_cents bigint (> 0)
  deadline date · contribution_day smallint (1–31) · start_date date
  closed_at timestamptz NULL · created_at · updated_at
  índice (household_id)

savings_entries
  id uuid PK (UUIDv7 de la app) · household_id → households ON DELETE CASCADE
  goal_id → savings_goals ON DELETE CASCADE · member_id → members ON DELETE SET NULL
  kind enum('deposit','withdrawal','skip') · amount_cents bigint
  date date · due_date date NULL · created_at · deleted_at NULL
  CHECK (kind = 'skip') = (amount_cents = 0) y amount_cents ≥ 0
  CHECK kind <> 'skip' OR due_date IS NOT NULL
  UNIQUE (goal_id, due_date) WHERE due_date IS NOT NULL AND deleted_at IS NULL
  índices (household_id, date) y (goal_id)
```

## Dominio (`packages/domain/src/savings.ts`)

```ts
interface SavingsGoal { id; name; targetCents; deadline; contributionDay; startDate; closedAt: string | null }
interface SavingsEntry { kind: 'deposit' | 'withdrawal' | 'skip'; amountCents; date; dueDate: DateString | null }
contributionDates(goal, from, to): DateString[]          // occurrencesBetween con la regla mensual
savedCents(entries): Cents                               // aportaciones − retiradas
savingsStatus(goal, saved, today): 'active' | 'achieved' | 'expired' | 'closed'
pendingContributions(goal, entries, today, until): { dueDate; overdue }[]
savingsPlan(goal, entries, today): { savedCents; remainingCents; quotaCents; contributionsLeft;
                                     nextDueDate: DateString | null; onTrack: boolean; percent }
setAside(entries in period): Cents                       // apartado neto del periodo
```

Tests: cuota con redondeo hacia arriba, día 31 y febrero, plazo antes del próximo día de
apartar, objetivo alcanzado y superado, retiradas, meses saltados, atrasadas, cambio de
año, «al día» y «retrasada», hucha cerrada sin pendientes.

## Contrato de la API

Todas bajo `/api/households/:householdId`; ver: `household.view`; cambiar: `savings.write`.

| Método y ruta                              | Qué hace                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `GET /savings`                             | Huchas con su plan calculado (saldo, cuota, estado, próxima fecha, al día)  |
| `PUT /savings/:goalId`                     | Crear o editar (idempotente; nunca toca la de otro hogar)                   |
| `DELETE /savings/:goalId`                  | Borrar solo si no tiene movimientos; si no, 409                             |
| `POST /savings/:goalId/close`              | Cerrar: retirada por el saldo y `closed_at`                                 |
| `GET /savings/:goalId/entries`             | Historial (no borrados), del más reciente al más antiguo, con quién         |
| `PUT /savings/:goalId/entries/:entryId`    | Aportar o sacar (`kind`, `amountCents`, `date`, `dueDate?`); 409 si se pasa |
| `DELETE /savings/:goalId/entries/:entryId` | Deshacer el último (borrado lógico)                                         |
| `POST /savings/:goalId/due/:dueDate/skip`  | Saltar la aportación de ese mes                                             |

Cambios compatibles en respuestas existentes: `summary` del periodo gana `setAsideCents`; `GET /upcoming` gana `savings: [{ goalId, dueDate, overdue, quotaCents }]`;
el calendario gana `savings` con estado (`pending`, `overdue`, `saved`, `skipped`); la
exportación gana `savingsGoals` y `savingsEntries`.

## Pruebas y cierre

- Servidor: crear/editar/borrar, aportar, sacar más que el saldo, confirmar dos veces y a
  la vez, saltar, deshacer, cerrar, apartado del periodo, lector y otro hogar en cada ruta.
- Seguridad: repetir la batería de ataques de la auditoría (`docs/seguridad/`) con las
  rutas nuevas (IDOR con ids de huchas y movimientos de otro hogar).
- Pruebas de punta a punta: crear una hucha, confirmar el mes, aportar y sacar, ver el
  apartado en «Mes», cerrar; CE-503 (suma de huchas = suma de apartados).
- axe-core en las pantallas nuevas; 320 y 1280 px; «Mes» con 500 movimientos y 10 huchas.
- `expo export --platform android` compila.

## Resultados

- `pnpm check` en verde. Servidor: 39 tests de huchas (crear, editar, borrar, confirmar
  una sola vez aunque sea a la vez, saltar, aportar, sacar sin pasarse aunque sea a la vez,
  historial, deshacer, cerrar, plazo vencido, exportación; lector y otro hogar en cada
  ruta); dominio: 16; contrato, permisos, avisos y migración con los suyos.
- Batería de ataques de la auditoría ampliada a las huchas: otro hogar, IDOR con ids de
  huchas y movimientos ajenos, lector, importes/fechas/nombres absurdos y sacar de más; sin
  accesos, sin filtraciones en lista, calendario, próximos pagos ni exportación, sin 500.
  Logs sin nombres de huchas ni importes. Resultado global 28/29 (solo el riesgo aceptado
  R1 de la auditoría).
- Pruebas de punta a punta contra la web de producción: las del MVP, calendario y
  categorías siguen pasando; las de huchas (crear, confirmar el mes, saltar, aportar, sacar,
  deshacer, conseguir, cerrar, editar, borrar) a 390 y 320 px sin errores.
- CE-503: con aportaciones en cuatro meses, retiradas, un movimiento deshecho y una hucha
  cerrada, lo ahorrado (717,76 €) coincide con la suma de «apartado» de todos los periodos.
- CE-504: «Mes» con 500 movimientos y 10 huchas, 893 ms de mediana (antes 885 ms).
- axe-core: 0 problemas en 9 pantallas a 320 y 1280 px, sin scroll horizontal.
- `expo export --platform android` compila.
- Cambios sobre el plan: el resumen no lleva `remainingCents` (lo calcula la app); un
  fallo encontrado al probar: crear una hucha no refrescaba «próximos pagos».
