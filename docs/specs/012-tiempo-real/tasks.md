# Tareas: Cambios en tiempo real

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/012-tiempo-real/`
**Requisitos previos**: especificación y plan aprobados.

**Tests**: obligatorios según la constitución (art. VII). Se escriben primero y deben
fallar antes de implementar.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]…[US2]**: historia de la especificación a la que pertenece.
- Prefijo `R` para no confundirlas con las de otras funcionalidades. Se marca `[x]` al
  terminarla, con `pnpm check` en verde.

---

## Fase 1: Base (contrato y servidor)

**Objetivo**: el servidor acepta conexiones y avisa a cada hogar de sus cambios.

- [x] R001 [P] `realtimeMessageSchema` y `REALTIME_SCOPES` en `packages/api/src/schemas/realtime.ts`
      con sus tests
- [x] R002 Añadir `@fastify/websocket` al servidor
- [x] R003 Tests en `apps/server/test/realtime.test.ts` con `injectWS`: sin sesión 401; sin
      hogar 403; `Origin` no permitido 403; un aviso por cada tipo de cambio
      (movimientos, recurrentes y vencimientos, huchas, presupuestos, categorías, ajustes del
      hogar, miembros e invitaciones, aceptar una invitación, borrar la cuenta) y con el ámbito
      correcto; los avisos no llevan datos; otro hogar no recibe nada; un `GET` o un cambio
      fallido no avisa; quien sale o es quitado deja de recibir (se le cierra); más de 10
      conexiones por cuenta cierra las antiguas; `ping`
- [x] R004 `src/realtime/hub.ts`, `src/routes/realtime.ts` y el gancho `onResponse`;
      avisos a mano en aceptar invitación y borrar cuenta

**Punto de control**: RF-1201 y RF-1203 en el servidor.

---

## Fase 2: Historia 1 — Ver los cambios de otros al momento (P1) 🎯

- [x] R005 [US1] Tests de `apps/mobile/src/realtime/scopes.ts` (qué consultas invalida cada
      ámbito, agrupar avisos) e implementación
- [x] R006 [US1] `useRealtime`: conectar en primer plano, URL `ws`/`wss`, cabeceras de sesión en
      Android, agrupar 300 ms, invalidar; montarlo en `SignedIn`; cerrar al cerrar sesión

**Punto de control**: RF-1201, RF-1202 y RF-1207.

---

## Fase 3: Historia 2 — Conexión que va y viene (P2)

- [x] R007 [US2] Reconexión con esperas crecientes (test de la secuencia), ponerse al día al
      reconectar, cerrar en segundo plano y abrir al volver

**Punto de control**: RF-1204 a RF-1206.

---

## Fase 4: Cierre

- [ ] R008 Batería de ataques ampliada a `/api/realtime` (otro hogar, sin sesión, sesión
      caducada, `Origin` ajeno, mensajes del cliente, muchas conexiones)
- [ ] R009 Prueba de punta a punta con dos miembros en dos navegadores: cada tipo de cambio en
      < 2 s (CE-1201), corte de 30 s (CE-1202), quitar a un miembro (CE-1203), 20 cambios
      seguidos (CE-1204), rutas con 50 conexiones (CE-1205); las anteriores siguen pasando
- [ ] R010 [P] axe-core en las pantallas principales a 320 y 1280 px (nada nuevo que ver, pero
      que nada se rompa)
- [ ] R011 [P] `expo export --platform android` compila
- [ ] R012 Actualizar `README.md` y `AGENTS.md` (dependencia nueva) y marcar tareas (el PR,
      cuando lo pida el propietario)

---

## Dependencias y orden

- **Fase 1** bloquea todo lo demás.
- **Historia 1** antes que la 2.
- **Cierre** al final.

### En paralelo

- R001 y R002; R005 mientras se hace el servidor; R010 y R011.
