# Tareas: Apuntar movimientos sin conexión

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/011-sin-conexion/`
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

## Fase 1: Base (dominio y motor de la bandeja)

**Objetivo**: la bandeja guarda, envía, reintenta y rechaza bien, sin pantallas.

- [x] O001 [P] Tests de `packages/domain/src/outbox.ts`: `sendOutcome` para cada código
      (2xx, sin respuesta, 401, 408, 429, 5xx, 400, 403, 404, 409, 422);
      `summaryWithPending` (ingresos y gastos, otros periodos fuera, rechazados fuera, día de
      inicio 25); `budgetsWithPending` (su categoría, ingresos fuera, categorías sin
      presupuesto); `pendingInPeriod`
- [x] O002 Implementar `packages/domain/src/outbox.ts` y exportarlo
- [x] O003 Tests del motor `apps/mobile/src/outbox/outbox.test.ts` con almacenamiento y envío
      falsos: añadir, corregir y descartar; orden de envío; reintentar para la cola;
      rechazado sigue con el siguiente y guarda el motivo; corte a mitad del envío y reenvío
      sin duplicar (CE-1102); volver a leer tras «reiniciar» (CE-1101); dos envíos a la vez no
      se pisan; separado por cuenta
- [x] O004 Implementar `src/outbox/outbox.ts` y el almacenamiento (`outbox-storage.native.ts`
      con AsyncStorage, `outbox-storage.ts` sin bandeja salvo `EXPO_PUBLIC_E2E_OUTBOX=1`)

**Punto de control**: RF-1102 a RF-1104 y RF-1106 en el motor.

---

## Fase 2: Historia 1 — Apuntar sin cobertura (P1) 🎯

- [x] O005 [US1] `useOutbox` (estado y envío automático: abrir, primer plano, cada 30 s,
      tras una petición buena, «Enviar ahora») e invalidar `periods` al enviar
- [x] O006 [US1] `new.tsx`: sin conexión, a la bandeja con el mismo id, se cierra y se anuncia
- [x] O007 [US1] «Mes»: aviso «N movimientos sin enviar» con «Enviar ahora», pendientes en la
      lista con su estado, resumen y presupuestos con pendientes; textos en `es.ts`
- [x] O008 [US1] `app/(app)/pending/[id].tsx`: corregir o descartar (con confirmación)

**Punto de control**: RF-1101, RF-1103, RF-1105 y RF-1108.

---

## Fase 3: Historia 2 — Lo que no se puede enviar (P2)

- [x] O009 [US2] Rechazados: «No se ha podido enviar: …» en «Mes» y en el aviso; corregir lo
      devuelve a la cola
- [x] O010 [US2] Cerrar sesión con pendientes pide confirmación y borra la bandeja de esa
      cuenta (RF-1107)

---

## Fase 4: Cierre

- [ ] O011 Prueba de punta a punta (compilación de pruebas, red cortada con Playwright):
      apuntar sin conexión, «Mes» con pendientes, recargar, recuperar la red y llegar una vez;
      20 pendientes con recargas (CE-1101); cortes durante el envío (CE-1102); un rechazo,
      corregirlo y descartarlo; cerrar sesión con pendientes; las anteriores siguen pasando
- [ ] O012 [P] axe-core en «Mes» con pendientes y un rechazado, y en la pantalla del
      pendiente, a 320 y 1280 px (CE-1105)
- [ ] O013 [P] `expo export --platform android` compila
- [ ] O014 Actualizar `README.md` y `AGENTS.md` y marcar tareas (el PR, cuando lo pida el
      propietario)

---

## Dependencias y orden

- **Fase 1** bloquea todo lo demás.
- **Historia 1** antes que la 2.
- **Cierre** al final.

### En paralelo

- O001 y O003; O007 y O008 una vez hecho `useOutbox`; O012 y O013.
