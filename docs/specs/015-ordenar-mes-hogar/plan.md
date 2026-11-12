# Plan de implementación: Ordenar «Mes» y «Hogar»

**Rama**: `015-ordenar-mes-hogar` | **Fecha**: 2026-11-12 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Solo cambia la app (`apps/mobile`) y una función pura nueva en `packages/domain`. En «Mes»,
los bloques vacíos pasan de un estado vacío con icono a una sola fila de lista, y
«Presupuestos» y «Próximos pagos» se recortan a 3 y 5 filas con un «Ver todos»; el recorte lo
hace `limitRows`, que no esconde nunca un pago atrasado. En «Hogar», el bloque de borrar la
cuenta sale a una pantalla propia (`delete-account`) que conserva el flujo de hoy tal cual, y el
botón de borrar pasa a un botón nuevo, rojo relleno. Servidor, API, datos, caché y tiempo real
no se tocan.

## Contexto técnico

| Campo                        | Valor                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Expo 58, React Native 0.88 — igual que ahora                                        |
| **Dependencias nuevas**      | Ninguna                                                                                                    |
| **Almacenamiento**           | Sin cambios. `CACHE_BUSTER` no cambia: no cambia la forma de lo guardado                                   |
| **Tests**                    | Vitest (`limitRows`, token y contraste del botón rojo) y Playwright manual contra la pila local (e2e, axe) |
| **Plataformas**              | Android y navegador                                                                                        |
| **Objetivos de rendimiento** | «Mes» < 1 s con 500 movimientos (CE-1506); el recorte no añade consultas ni peticiones                     |
| **Restricciones**            | WCAG 2.1 AA; sin texto fuera de `src/i18n/es.ts`; sin valores fuera de tokens; sin tarjetas ni pastillas   |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                             | Estado |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Sin dependencias nuevas.                                                                                             | ✅     |
| II. Arquitectura por capas | La regla «máximo N filas, nunca los atrasados» es lógica pura en `packages/domain`; las pantallas solo la llaman.    | ✅     |
| III. Dinero y fechas       | No cambia cómo se calculan ni se formatean importes y fechas.                                                        | ✅     |
| IV. Datos y persistencia   | No aplica; sin migraciones.                                                                                          | ✅     |
| V. API                     | Sin cambios. Se sigue usando `DELETE /api/account` (`api.deleteAccount`) sin tocar el contrato.                      | ✅     |
| VI. Seguridad y privacidad | Borrar la cuenta sigue pidiendo la contraseña y la confirmación en dos pasos; la ruta nueva queda dentro de `(app)`. | ✅     |
| VII. Tests                 | Tests primero de `limitRows` (casos límite) y del contraste del botón rojo; e2e y axe al cierre.                     | ✅     |
| VIII. Calidad y CI         | `pnpm check`; el único texto nuevo («Ver todos» y sus nombres de lector) va en `es.ts`; sin `any`.                   | ✅     |
| IX. App y plataformas      | Mismos componentes en Android y web; no hay código por plataforma nuevo.                                             | ✅     |

Sin incumplimientos.

## Investigación y decisiones

| Tema                           | Decisión                                                                                                                                                                                                                                                                                                             | Alternativa descartada                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Dónde vive el recorte          | `limitRows(items, max, mustShow)` en `packages/domain/src/lists.ts`, con los límites `MONTH_BUDGET_ROWS = 3` y `MONTH_UPCOMING_ROWS = 5`. Es una regla con casos límite (RF-1503 y escenario 4) y se prueba sin React.                                                                                               | Un `slice` suelto en `index.tsx`: no se puede probar el caso de los atrasados sin pintar.         |
| Regla del recorte              | Se enseñan todas las filas `mustShow` (atrasados) y, hasta completar `max`, las demás en su orden. Con 2 atrasados y 8 pagos → 5 filas (2 + 3); con 7 atrasados → 7 filas y ningún pago al día (escenario 4). `hidden` es lo que queda fuera y decide si sale «Ver todos» (RF-1504).                                 | Cortar por posición: escondería atrasados si no estuvieran todos delante.                         |
| Fila de un bloque vacío        | Presupuestos y huchas ya usan una `ListRow` con título e invitación; solo se quita el `Section` con su título encima, que duplicaba el mensaje. «Próximos pagos» sin ninguna regla deja de usar `EmptyState` y pasa a una `ListRow` no pulsable: título `upcomingTitle`, detalle `recurring.empty` (hasta 2 líneas). | Dar al estado vacío de pagos una acción nueva: sería cambiar lo que hace la app (RF-1508).        |
| «Ver todos» de presupuestos    | `Button variant="link"` a `/budgets`, para todos (esa pantalla ya se abre en solo lectura). Con recorte, sustituye a «Editar presupuestos», porque lleva a la misma pantalla; sin recorte, se queda «Editar presupuestos» para quien puede escribir.                                                                 | Dos enlaces a la misma pantalla seguidos.                                                         |
| «Ver todos» de pagos           | `router.navigate('/recurring')`: ruta de la pestaña «Pagos». Hay también una carpeta `app/(app)/recurring/` (`[id]`, `new`) sin `index`, así que `/recurring` debe resolver a la pestaña; se comprueba en la primera tarea de la historia 1, y si no, se usa la ruta de grupo `/(tabs)/recurring`.                   | `router.push`: apilaría la pestaña sobre «Mes» y dejaría «Atrás» raro.                            |
| Botón de borrar rojo relleno   | Variante nueva `destructive` en `Button` y token `color.bg.destructive` (= `palette.red`, `#B3261E`; blanco sobre él da 6,54:1). `danger` (contorno) se queda para «Cerrar sesión de todas formas» y los ajustes del hogar, donde es lo correcto.                                                                    | Cambiar `danger` para todos: encarecería acciones que no son irreversibles.                       |
| Ruta de la pantalla nueva      | `app/(app)/delete-account.tsx`, hermana de `budgets.tsx` y `search.tsx`. Las pantallas de `(app)` ya exigen sesión (`AppLayout` redirige a «Entrar»), lo que cubre el enlace directo sin sesión. No hace falta registrarla: la `Stack` de `(app)` toma las rutas por archivo.                                        | Carpeta `account/`: una sola pantalla no la justifica.                                            |
| Texto de la fila y la pantalla | Se reutiliza `es.account.deleteTitle` («Borrar mi cuenta»), que ya es el título del bloque, y el resto de `es.account.*` (`deleteHint`, `deleteOnlyMember`, …). No se crea ningún texto para esto.                                                                                                                   | Renombrarlo a «Borrar cuenta» (así lo nombra la especificación): sería un texto nuevo sin motivo. |
| Estado y función de borrar     | `deleteAccount()`, `password`, `confirmDelete`, `deleting` y `deleteError` pasan, sin cambios de lógica, de `account.tsx` a la pantalla nueva. Al volver con la flecha atrás la pantalla se desmonta y la contraseña desaparece sin código extra (caso límite).                                                      | Subir el estado a un almacén: la contraseña no debe sobrevivir a la pantalla.                     |
| Relación con la 014            | La 014 añade en `deleteAccount()` una llamada `DELETE /api/push-device` antes de cerrar sesión. Se implemente antes o después, la función se **mueve entera** y esa llamada va con ella; esta funcionalidad no la añade ni la quita. «Avisos» no se toca.                                                            | Esperar a que la 014 esté fusionada: bloquearía sin necesidad.                                    |
| Animaciones                    | Ninguna nueva (RF-1510). Las filas de presupuestos y próximos pagos de «Mes» no usan `AnimatedList` hoy; el recorte tampoco las anima. Las barras de progreso siguen igual.                                                                                                                                          | Fundir las filas que entran al recortar: sería animación nueva (RF-607 de la 006).                |

## Modelo de datos

Sin cambios. No hay tablas, columnas ni migraciones, y la forma de lo que guarda la caché de
Android no cambia (`CACHE_BUSTER` se queda).

## Contratos de la API

Sin cambios. «Mes» sigue leyendo `GET /api/households/:id/periods/:start`, `…/upcoming`,
`…/recurring` y `…/savings`; la pantalla nueva llama a `api.deleteAccount(password)` como hoy.

## Estructura de archivos

```text
packages/domain/src/
├── lists.ts                  # nuevo: limitRows(), MONTH_BUDGET_ROWS, MONTH_UPCOMING_ROWS
├── lists.test.ts             # nuevo: ver «Pruebas»
└── index.ts                  # exporta ./lists

apps/mobile/
├── app/(app)/
│   ├── (tabs)/index.tsx      # Mes: bloques vacíos en una fila, recortes y «Ver todos»
│   ├── (tabs)/account.tsx    # Hogar: fila «Borrar mi cuenta»; sale el bloque de contraseña
│   └── delete-account.tsx    # nuevo: pantalla con el flujo de borrar la cuenta
└── src/
    ├── components/Button.tsx # variante `destructive`
    ├── design/
    │   ├── tokens.ts         # color.bg.destructive
    │   └── color.test.ts     # contraste de blanco sobre color.bg.destructive ≥ 4,5
    └── i18n/es.ts            # budgets.seeAll, recurring.seeAll y sus nombres para el lector

docs/specs/015-ordenar-mes-hogar/{spec,plan,tasks}.md
AGENTS.md                     # una línea en «Estado actual» al cerrar
```

## Diseño por pieza

**`limitRows`** (`packages/domain/src/lists.ts`):

```ts
export const MONTH_BUDGET_ROWS = 3;
export const MONTH_UPCOMING_ROWS = 5;

export function limitRows<T>(
  items: readonly T[],
  max: number,
  mustShow: (item: T) => boolean = () => false,
): { shown: T[]; hidden: number };
```

Cuenta las `mustShow`, calcula los huecos libres `max - mustShow` (nunca negativos) y recorre
los elementos conservando el orden: los `mustShow` entran siempre y los demás mientras queden
huecos. `hidden` cuenta los que se quedan fuera.

**«Mes»** (`index.tsx`):

- `BudgetSection`: sin presupuestos y con permiso, una `ListRow` suelta (sin `Section` con
  título); sin permiso, nada (escenario 7). Con presupuestos, `limitRows(rows, MONTH_BUDGET_ROWS)`;
  si `hidden > 0`, un «Ver todos» a `/budgets`; si no, el «Editar presupuestos» de hoy.
- `Upcoming`: `limitRows(entries, MONTH_UPCOMING_ROWS, (e) => e.overdue)`; las aportaciones a
  huchas cuentan como pagos igual que hoy. Si `hidden > 0`, «Ver todos» a la pestaña «Pagos». Sin
  reglas ni entradas, la fila vacía descrita arriba, para todos como hoy.
- `SavingsSection`: sin cambios de lógica. Su estado vacío ya es una fila; solo se quita el
  `Section` con título cuando no hay huchas, para igualarlo a los otros dos. Ya enseña 3 y tiene
  su «Ver todas».
- El orden de bloques, el resumen, el cambio de mes, el botón «+», tirar para recargar y los
  avisos de arriba no se tocan (escenario 6).

**«Hogar»** (`account.tsx`): la sección «Tu cuenta» conserva «Cerrar sesión» y su confirmación
con pendientes sin enviar (escenario 7); debajo, un `MenuRow` «Borrar mi cuenta» (icono `trash`,
que ya está en el catálogo de `Icon`) a `/delete-account`. Se quitan de
`account.tsx` los estados y la función de borrar y los imports que queden sin usar.

**`delete-account.tsx`**: `Screen title={es.account.deleteTitle} back`, con `deleteHint`, el
texto de `deleteOnlyMember`/`deleteMember` y, si es propietario con otros miembros, el aviso
`deleteOwnerFirst` con el enlace a «Miembros» y sin campo ni botón. En los demás casos: campo de
contraseña, `Message`s de confirmación y de error, y `Button variant="destructive"`. El flujo
(contraseña obligatoria → «pulsa otra vez» → borrar → limpiar caché, avisos y bandeja →
`signOut` → `router.replace('/entrar')`) es el de hoy, línea por línea.

## Pruebas

- **`lists.test.ts` (Vitest, primero):** sin `mustShow` recorta a `max`; con `mustShow` delante
  y menos que `max`, completa con los demás hasta `max`; con más `mustShow` que `max`, enseña
  solo los `mustShow` y `hidden` cuenta el resto; con `items.length <= max`, `hidden` es 0;
  vacío; `max = 0` con atrasados; conserva el orden aunque un `mustShow` esté en medio;
  `hidden` nunca negativo.
- **`color.test.ts`:** blanco sobre `color.bg.destructive` ≥ 4,5:1.
- **Texto, estilo y emoji:** `noAiTells.test.ts` y la regla de ESLint de tokens siguen pasando
  (el rojo sale de un token; la fila y la pantalla no llevan tarjetas ni «Volver» al pie).
- **Playwright manual (pila local con `docker compose`), antes y después:**
  - CE-1501/CE-1502: a 390 × 844 px, la posición de «Movimientos» en un hogar nuevo y en uno
    completo (6 presupuestos, 8 próximos pagos, 3 huchas). La medida «antes» se toma en la
    primera tarea, antes de tocar nada, para tener la cifra real y confirmar los 300 px.
  - CE-1503/CE-1504: «Hogar» sin campo de contraseña; borrar una cuenta de prueba desde la
    pantalla nueva (también con propietario de un hogar con más miembros).
  - CE-1505: axe-core en «Mes», «Hogar» y «Borrar mi cuenta» a 320 y 1280 px.
  - Con texto grande y a 320 px, «Ver todos» y la fila de borrar no se cortan.
- **Android (APK):** pendiente de que el propietario lo pruebe junto con la 013 y la 014; no
  puedo probarlo desde aquí.

## Riesgos

- **`/recurring` ambigua:** la pestaña y la carpeta `recurring/` comparten prefijo. Mitigación:
  comprobarla al empezar la historia 1 con la web.
- **Solape con la 014 en `account.tsx`:** las dos tocan ese archivo. Mitigación: cambios en
  bloques distintos («Avisos» frente a «Tu cuenta»); si hay conflicto, se resuelve al fusionar.
- **Cifra de CE-1502:** estimada, no medida. Mitigación: medirla antes; si el ahorro real es
  menor de 300 px, se avisa y se decide con el propietario antes de cambiar el criterio.
