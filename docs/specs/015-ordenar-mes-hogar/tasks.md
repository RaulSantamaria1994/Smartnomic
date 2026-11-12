# Tareas: Ordenar «Mes» y «Hogar»

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/015-ordenar-mes-hogar/`
**Requisitos previos**: especificación y plan aprobados.

**Tests**: obligatorios según la constitución (art. VII). Se escriben primero y deben
fallar antes de implementar.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]…[US2]**: historia de la especificación a la que pertenece.
- Prefijo `O` para no confundirlas con las de otras funcionalidades. Se marca `[x]` al
  terminarla, con `pnpm check` en verde.

---

## Fase 1: Base

**Objetivo**: medir cómo está «Mes» antes de tocarlo y dejar listas las piezas que usan las
dos historias.

- [x] O001 Medir el «antes» con Playwright a 390 × 844 px contra la pila local (`docker compose`,
      servidor y web): posición vertical del título «Movimientos» en un hogar nuevo y en uno
      completo (6 presupuestos, 8 próximos pagos, 3 huchas), más una captura de «Mes» y de
      «Hogar». Apuntar las cifras en el apartado «Resultados» de este archivo. Si el ahorro
      que espera el plan (≥ 300 px, CE-1502) no es alcanzable con 3 y 5 filas, parar y avisar
      al propietario antes de seguir
- [x] O002 Comprobar que `router.navigate('/recurring')` abre la pestaña «Pagos» y no una pantalla
      de la carpeta `app/(app)/recurring/`; si no, usar `/(tabs)/recurring` y anotarlo en el
      plan
- [x] O003 [P] Tests en `packages/domain/src/lists.test.ts` (ver «Pruebas» del plan): recorta a
      `max` sin `mustShow`; con menos `mustShow` que `max` completa con el resto; con más
      `mustShow` que `max` enseña solo los `mustShow` y `hidden` cuenta el resto; `items.length
<= max` da `hidden = 0`; lista vacía; `max = 0` con atrasados; conserva el orden con un
      `mustShow` en medio; `hidden` nunca negativo. **Deben fallar** antes de O004
- [x] O004 `packages/domain/src/lists.ts`: `limitRows`, `MONTH_BUDGET_ROWS = 3`,
      `MONTH_UPCOMING_ROWS = 5`; exportar desde `src/index.ts`
- [x] O005 [P] Test en `apps/mobile/src/design/color.test.ts`: blanco sobre `color.bg.destructive`
      ≥ 4,5:1 (debe fallar antes de O006)
- [x] O006 `src/design/tokens.ts`: `color.bg.destructive` (`palette.red`); `src/components/Button.tsx`:
      variante `destructive` (fondo `color.bg.destructive`, texto `onAccent`, indicador de carga
      claro, ripple como `primary`)
- [x] O007 [P] `src/i18n/es.ts`: `budgets.seeAll` («Ver todos»), `budgets.seeAllLabel` («Ver todos
      los presupuestos»), `recurring.seeAll` («Ver todos») y `recurring.seeAllLabel` («Ver todos
      los pagos»)

**Punto de control**: `pnpm check` en verde (salvo lo que ya falle por falta de Docker); `lists`
y el contraste del botón pasan.

---

## Fase 2: Historia 1 — «Mes» llega antes a los movimientos (P1) 🎯

**Prueba independiente**: «Mes» a 390 × 844 px con un hogar nuevo y con uno completo.

- [x] O008 [US1] `app/(app)/(tabs)/index.tsx`, `BudgetSection`: sin presupuestos y con permiso, una
      `ListRow` suelta sin `Section` con título (sin permiso, nada, como hoy); con presupuestos,
      `limitRows(rows, MONTH_BUDGET_ROWS)` y, si `hidden > 0`, «Ver todos» a `/budgets` (con
      `accessibilityLabel` de `budgets.seeAllLabel`) en lugar de «Editar presupuestos»; sin
      recorte, «Editar presupuestos» para quien puede escribir
- [x] O009 [US1] Mismo archivo, `Upcoming`: `limitRows(entries, MONTH_UPCOMING_ROWS, (e) =>
e.overdue)`; si `hidden > 0`, «Ver todos» a la pestaña «Pagos» (ruta de O002) con
      `recurring.seeAllLabel`. Sin reglas ni entradas, una `ListRow` no pulsable (título
      `recurring.upcomingTitle`, detalle `recurring.empty` en hasta 2 líneas, icono
      `recurring`) en lugar de `EmptyState`
- [x] O010 [US1] Mismo archivo, `SavingsSection`: sin huchas, quitar el `Section` con título y dejar
      la `ListRow` de hoy; con huchas, sin cambios
- [x] O011 [US1] Comprobar con Playwright los escenarios 1 a 7 de la historia 1 (hogar nuevo, 6
      presupuestos, 8 pagos con y sin atrasados, justo 3 y 5, solo lectura) y los casos límite
      de 320 px y texto grande

**Punto de control**: CE-1501 y CE-1502 con las cifras de O001; «Mes» < 1 s con 500 movimientos.

---

## Fase 3: Historia 2 — «Hogar» deja aparte lo irreversible (P1)

**Prueba independiente**: recorrer «Hogar» hasta el final y borrar una cuenta de prueba desde la
pantalla nueva.

- [x] O012 [US2] `app/(app)/delete-account.tsx`: `Screen title={es.account.deleteTitle} back` con el
      flujo de hoy movido sin cambios de lógica desde `account.tsx` (`deleteAccount()`,
      `password`, `confirmDelete`, `deleting`, `deleteError`, textos `deleteHint`,
      `deleteOnlyMember`/`deleteMember`, caso del propietario con otros miembros), y el botón
      de borrar con `variant="destructive"`. Si la 014 ya está fusionada, la llamada a
      `DELETE /api/push-device` se mueve con la función
- [x] O013 [US2] `app/(app)/(tabs)/account.tsx`: quitar de «Tu cuenta» el bloque de contraseña, sus
      estados y los imports que queden sin usar; añadir un `MenuRow` «Borrar mi cuenta» (icono
      `trash`) a `/delete-account` debajo de «Cerrar sesión». Orden final: accesos, «Avisos»,
      «Exportar», «Cerrar sesión», «Borrar mi cuenta»
- [x] O014 [US2] Comprobar con Playwright los escenarios 1 a 7 de la historia 2: sin campo de
      contraseña en «Hogar»; borrar con contraseña y confirmación en dos pasos; contraseña
      incorrecta; propietario de un hogar con más miembros; volver con la flecha atrás (la
      contraseña no se conserva); enlace directo sin sesión va a «Entrar»; «Cerrar sesión» con
      pendientes sin enviar

**Punto de control**: CE-1503 y CE-1504.

---

## Fase 4: Cierre

- [x] O015 [P] axe-core en «Mes», «Hogar» y «Borrar mi cuenta» a 320 y 1280 px (CE-1505)
- [ ] O016 Capturas «después» de «Mes» y «Hogar» junto a las de O001 para revisión del
      propietario; anotar las cifras en «Resultados»
- [x] O017 [P] `expo export --platform web` compila; `pnpm check` en verde (con la base de datos
      en marcha para los tests del servidor)
- [x] O018 Actualizar `AGENTS.md` («Estado actual»: una línea con `limitRows`, `delete-account` y
      el botón `destructive`) y marcar las tareas; la prueba en Android con el APK queda
      pendiente para el propietario

---

## Dependencias y orden

- **Fase 1** antes que las historias; O001 antes de cambiar nada de «Mes».
- O002 antes de O009.
- **Fase 2** y **Fase 3** son independientes entre sí; se pueden hacer en cualquier orden y por
  separado.
- O008 a O010 tocan el mismo archivo: van en orden.
- O013 después de O012.
- **Cierre** al final.

### En paralelo

- O003, O005 y O007; O015 y O017.

## Resultados

**Cómo se midió (2026-11-12).** Sin Docker, con la web compilada de cada versión y un servidor
de pruebas que simula la API con datos de prueba (`mock-server.cjs`, fuera del repositorio),
Playwright a 390 × 844 px. «Antes» es `index.tsx` de `HEAD` (compilado aparte); «después», el
código actual. No es la pila real: falta repetirlo contra el servidor y PostgreSQL.

| Medida                                                                                                                   | Antes                     | Después      | Diferencia                        |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ------------ | --------------------------------- |
| Hogar completo (6 presupuestos, 8 pagos con 2 atrasados, 3 huchas): `top` de «Movimientos» desde el inicio del contenido | 1965 px                   | 1544 px      | −421 px (CE-1502 ✅, pedía ≥ 300) |
| Hogar completo: alto total del contenido                                                                                 | 2921 px                   | 2500 px      | −421 px                           |
| Hogar nuevo: `top` de «Movimientos» en pantalla                                                                          | 666 px                    | 489 px       | −177 px                           |
| Hogar nuevo: mensaje «Aún no hay movimientos…» a la vista sin desplazarse                                                | no (cortado por la barra) | sí, a 597 px | CE-1501 ✅                        |

**Escenarios comprobados (O002, O011):**

- Hogar completo: 3 presupuestos con «Ver todos los presupuestos» y 5 pagos (2 atrasados) con
  «Ver todos los pagos»; las 3 huchas como antes.
- 7 pagos atrasados: se ven los 7 y ningún pago al día, con «Ver todos los pagos».
- 3 presupuestos y 5 pagos justos: sin «Ver todos»; aparece «Editar presupuestos».
- Solo lectura sin datos: no salen presupuestos, huchas ni el botón «+»; sale la fila de pagos.
- `router.navigate('/recurring')` abre la pestaña «Pagos» (O002 ✅; se queda `/recurring`).
- A 320 px, «Mes», «Hogar» y «Borrar mi cuenta» no desbordan en horizontal.

**Parte de O014 comprobada:** «Hogar» sin campo de contraseña; la pantalla «Borrar mi cuenta» con
propietario de un hogar con más miembros (aviso y enlace, sin campo ni botón); sin contraseña no
borra; con contraseña, la primera pulsación pide confirmar y la segunda llama a `DELETE
/api/account` (una vez). El botón es rojo relleno.

**axe-core (O015, CE-1505).** axe-core 4.10.2 (reglas WCAG 2.0 y 2.1 A y AA) sobre la misma
web y datos de prueba, **0 violaciones** en todos los casos:

| Pantalla                                                                   | 320 px | 1280 px |
| -------------------------------------------------------------------------- | ------ | ------- |
| «Mes» con hogar completo («Ver todos» en presupuestos y pagos)             | ✅     | ✅      |
| «Mes» con hogar nuevo (tres filas de empezar y mensaje de sin movimientos) | ✅     | —       |
| «Hogar» (con la fila «Borrar mi cuenta»)                                   | ✅     | ✅      |
| «Borrar mi cuenta» con contraseña y aviso de confirmación abierto          | ✅     | —       |
| «Borrar mi cuenta» (propietario único, formulario)                         | —      | ✅      |

Sin cubrir: «Mes» con hogar nuevo a 1280 px y «Borrar mi cuenta» del propietario con más
miembros (solo vista, sin axe).

**Pendiente:** O014 completo (contraseña incorrecta, flecha atrás, enlace directo sin sesión,
«Cerrar sesión» con pendientes) y CE-1504 contra el servidor real; O016 (capturas para el
propietario; ya están hechas en la carpeta de capturas de la sesión) y O017 con `pnpm check`
completo; O018.

**Observaciones fuera de alcance:** en «Pagos», el botón «+» tapa el final de «+ Nuevo pago
recurrente». (El mando del interruptor, que en la web salía verde azulado, se arregló con
`switchColors.web.ts`.)

**Con la pila real (2026-11-12, servidor y PostgreSQL locales, web servida por el propio servidor):**

- Contraseña incorrecta: error «La contraseña no es correcta.» y la cuenta sigue.
- Desde «Hogar», la fila «Borrar mi cuenta» abre la pantalla con el campo vacío.
- Borrar con la contraseña correcta y dos pulsaciones: vuelve a «Entrar»; en la base de datos no
  quedan usuario ni hogar ni dispositivos, y entrar de nuevo da 401 (CE-1504).
- El enlace directo a `/delete-account` sin sesión lleva a «Entrar».
- Sin probar: «Cerrar sesión» con pendientes sin enviar (necesita la compilación con la bandeja).
