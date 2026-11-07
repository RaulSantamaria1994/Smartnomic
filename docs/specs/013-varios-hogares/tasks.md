# Tareas: Pertenecer a varios hogares

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/013-varios-hogares/`
**Requisitos previos**: especificación y plan aprobados.

**Tests**: obligatorios según la constitución (art. VII). Se escriben primero y deben
fallar antes de implementar.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]…[US3]**: historia de la especificación a la que pertenece.
- Prefijo `H` para no confundirlas con las de otras funcionalidades. Se marca `[x]` al
  terminarla, con `pnpm check` en verde.

---

## Fase 1: Base (datos, contrato, dominio y acceso)

**Objetivo**: el servidor admite varios hogares por persona y comprueba cada petición contra
el hogar de la URL, sin cambiar aún lo que ve la app.

- [x] H001 [P] Dominio: `activeHousehold` y `MAX_HOUSEHOLDS` en `packages/domain` con sus
      tests (guardado y presente, guardado y quitado, id desconocido, lista vacía)
- [x] H002 [P] Contrato en `packages/api`: `me` con `households` (y `household`/`member`
      nulos sin hogares), crear hogar, vista previa de invitación con `atLimit`; tests de los
      esquemas
- [x] H003 Migración `0008`: índice único (hogar, usuario), fuera el de usuario, índice por
      usuario
- [x] H004 Tests del servidor con un usuario en dos hogares: lee y cambia cada uno con su
      rol; desde la sesión no se llega a un hogar ajeno; todas las rutas con `requireMember`
      llevan `:householdId` (recorriendo las rutas registradas); `me` lista los dos y
      `household` es el más antiguo; `me` sin hogares no crea uno
- [x] H005 `findMembership(userId, householdId)`, `listMemberships`, `createHousehold`;
      `requireMember` por el hogar de la URL; `me` nuevo; el registro sigue creando su hogar

**Punto de control**: RF-1301, RF-1304 (servidor), RF-1309 y RF-1311.

---

## Fase 2: Historia 1 — Estar en dos hogares y cambiar entre ellos (P1) 🎯

- [x] H006 [US1] Tests y cambio de aceptar una invitación: conserva el hogar actual y sus
      datos (CE-1303); con 5 hogares, `409`; ya miembro, como ahora; la vista previa con
      `atLimit` y los campos viejos fijos (compatibilidad)
- [x] H007 [US1] Tests y cambio del tiempo real por hogar: `?householdId=` (sin él, el
      primero); hogar ajeno, `403`; quitar a alguien de un hogar solo le cierra esa conexión
- [x] H008 [US1] App: `src/households/active.ts` (`useHousehold`, `useSwitchHousehold`,
      guardado por cuenta en el dispositivo) y cambiar todos los usos de `me.household` y
      `me.member`
- [x] H009 [US1] App: nombre del hogar en la barra como botón y la lista de hogares
      (`app/(app)/households/index.tsx`) con el elegido y el rol; textos en `es.ts`
- [x] H010 [US1] App: tiempo real con el hogar elegido; bandeja sin conexión filtrada por el
      hogar elegido; aceptar una invitación elige el hogar nuevo y ya no avisa de perder datos
- [x] H011 [US1] Recordatorios de todos los hogares (tests de la planificación con varios
      hogares y el nombre del hogar en el texto; al tocar, se elige ese hogar)

**Punto de control**: RF-1302 a RF-1304 y RF-1310.

---

## Fase 3: Historia 2 — Crear un hogar y quitar los que no se usan (P2)

- [ ] H012 [US2] Tests y rutas: crear hogar con `POST /api/households` (límite de 5, también
      con dos peticiones a la vez; categorías de siempre; zona horaria); borrar hogar con
      `DELETE /api/households/:id` (solo el propietario si es el único miembro; si no, `409`
      o `403`); salir sin crear hogar
- [x] H013 [US2] Borrar la cuenta con varios hogares: bloqueo con los nombres de los hogares
      en los que es propietario con más miembros; borra los suyos de un solo miembro; tests
- [ ] H014 [US2] App: «Crear hogar» (`app/(app)/households/new.tsx`), «Borrar el hogar» en
      ajustes (exportar antes, confirmación), salir lleva a otro hogar; textos del límite

**Punto de control**: RF-1305 a RF-1307.

---

## Fase 4: Historia 3 — Quedarse sin hogar (P3)

- [ ] H015 [US3] App: `app/(app)/sin-hogar.tsx` con «Crear hogar» y el código de invitación;
      `SignedIn` lleva a ella sin hogares; si el hogar elegido desaparece, pasar a otro o a
      ella

**Punto de control**: RF-1308.

---

## Fase 5: Cierre

- [ ] H016 Batería de ataques con un usuario en dos hogares: cada ruta con el hogar ajeno,
      tiempo real ajeno, crear por encima del límite, borrar un hogar ajeno o con miembros
      (CE-1302)
- [ ] H017 Punta a punta con tres personas y dos hogares: cambiar de hogar (CE-1301), aceptar
      con datos (CE-1303), quedarse sin hogar de cada forma (CE-1304), crear y borrar; las
      anteriores siguen pasando (`us4` cambia: quien sale ya no recibe un hogar vacío, vuelve
      al suyo); peticiones al abrir con 5 hogares
- [ ] H018 [P] axe-core en la lista de hogares, crear hogar, borrar hogar y sin hogar, a 320
      y 1280 px (CE-1305)
- [ ] H019 [P] `expo export --platform android` compila
- [ ] H020 Actualizar `README.md` y `AGENTS.md`, marcar RF-007 y RF-008 del MVP como
      sustituidos y marcar tareas (el PR, cuando lo pida el propietario)

---

## Dependencias y orden

- **Fase 1** bloquea todo lo demás.
- **Historia 1** antes que la 2 y la 3 (las pantallas nuevas usan el hogar elegido).
- **Cierre** al final.

### En paralelo

- H001 y H002; H006 y H007 (archivos distintos del servidor); H018 y H019.
