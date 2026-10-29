# Tareas: Diseño visual de la app

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/003-diseno-visual/`
**Requisitos previos**: especificación y plan aprobados.

**Tests**: obligatorios según la constitución (art. VII). Los helpers con lógica (color,
contraste) llevan tests primero; las pantallas se comprueban con las pruebas de punta a
punta y axe-core.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]…[US4]**: historia de la especificación a la que pertenece.
- Prefijo `D` para no confundirlas con las de otras funcionalidades. Se marca `[x]` al
  terminarla, con `pnpm check` en verde.

---

## Fase 1: Base del sistema de diseño

**Objetivo**: tokens, fuente e iconos disponibles, sin cambiar aún ninguna pantalla.

- [x] D001 Instalar `expo-font`, `@expo-google-fonts/plus-jakarta-sans`,
      `@expo/vector-icons` y `expo-splash-screen` (versiones del SDK 58) en
      `apps/mobile/package.json`
- [x] D002 [P] Tests de `tint` y `contrastRatio` en `apps/mobile/src/design/color.test.ts`:
      mezcla con blanco, ratio WCAG conocido (negro/blanco 21:1), y que la tinta sobre el
      fondo suave de cada color de categoría predefinida cumple 4,5:1
- [x] D003 Implementar `apps/mobile/src/design/color.ts`
- [x] D004 [P] Tokens «Calma» en `apps/mobile/src/design/tokens.ts` (paleta base y
      nombres semánticos de color, escala tipográfica, espaciado, esquinas, sombras);
      `src/theme.ts` pasa a reexportarlos mientras dura la migración
- [x] D005 [P] Carga de la fuente con `expo-splash-screen` en
      `apps/mobile/src/design/fonts.ts` y `app/_layout.tsx`
- [x] D006 [P] `AppText` (variantes) e `Icon` (Feather con nombres propios) en
      `apps/mobile/src/design/`

**Punto de control**: la app arranca igual que antes, con la fuente nueva cargada.

---

## Fase 2: Historia 1 — Una identidad visual coherente (P1) 🎯

**Objetivo**: componentes comunes con los tokens y todas las pantallas usándolos.

- [x] D007 [US1] Componentes nuevos en `apps/mobile/src/design/`: `Card`, `ListRow`,
      `StatusPill`, `CategoryIcon`, `Amount`, `EmptyState`
- [x] D008 [US1] Rehacer con tokens `Button` (primary, secondary, link, danger), `Chip`,
      `TextField`, `Message`, `Screen`, `UndoSnackbar` y `ReminderBanners` en
      `apps/mobile/src/components/`
- [x] D009 [US1] Formularios `TransactionForm` y `RuleForm` con el estilo del lienzo
      (importe grande, categorías en cuadrícula con `CategoryIcon`, fechas en chips)
- [x] D010 [US1] Pantallas de entrada (`entrar`, `registro`, `recuperar`, `restablecer`) e
      `invitacion/[code]`
- [x] D011 [US1] Pantallas de pagos (`recurring/*`, `occurrence/*`), calendario
      (`calendar.tsx`, `MonthGrid`) y hogar (`household/*`, `account.tsx`)
- [x] D012 [US1] Regla de ESLint en `eslint.config.js`: en `apps/mobile`, fuera de
      `src/design/`, prohibidos los literales de color hex y los `fontSize` numéricos

**Punto de control**: RF-201, RF-202, RF-204–RF-206 cubiertos; la regla no tiene
excepciones.

---

## Fase 3: Historia 2 — Pantalla principal de un vistazo (P2)

- [ ] D013 [US2] `SummaryCard` (balance, barra de gasto sobre ingresos con tope 100 %,
      totales; sin ingresos, sin barra) en `apps/mobile/src/design/SummaryCard.tsx`
- [ ] D014 [US2] Rehacer `app/(app)/index.tsx`: cabecera con el hogar, selector de mes,
      `SummaryCard`, próximos pagos en tarjetas con fecha destacada, movimientos con
      `ListRow` y `EmptyState`

**Punto de control**: RF-203 cubierto; «Mes» < 1 s con 500 movimientos.

---

## Fase 4: Historia 3 — Barra de navegación inferior (P3)

- [ ] D015 [US3] Mover `index.tsx`, `calendar.tsx`, `recurring/index.tsx` (como
      `recurring.tsx`) y `account.tsx` a `app/(app)/(tabs)/` sin cambiar sus URL
- [ ] D016 [US3] `app/(app)/(tabs)/_layout.tsx` con `Tabs`: Mes, Calendario, «+»
      (abre `/new`, oculto a lectores), Pagos y Hogar; accesible (`tab`, `selected`)
- [ ] D017 [US3] Quitar los enlaces que sobran con la barra (Ajustes, Calendario,
      Gestionar, Cerrar sesión duplicado) y dar a «Hogar» el contenido de ajustes y hogar

**Punto de control**: RF-208 cubierto; todas las URL y enlaces de avisos siguen valiendo.

---

## Fase 5: Historia 4 — Icono y pantalla de inicio (P4)

- [ ] D018 [US4] Script `apps/mobile/scripts/make-icons.cjs` que dibuja el icono en SVG y
      genera con Chromium `assets/icon.png`, `adaptive-icon.png`, `splash.png` y
      `favicon.png`
- [ ] D019 [US4] Configurar icono, icono adaptativo, splash, favicon y color de
      notificación en `apps/mobile/app.json`

**Punto de control**: RF-207 cubierto.

---

## Fase 6: Cierre

- [ ] D020 Adaptar las pruebas de punta a punta (barra inferior) y pasarlas todas contra
      la web de producción (CE-204); medir «Mes» con 500 movimientos (CE-203)
- [ ] D021 [P] axe-core en todas las pantallas (CE-201) y revisión con la skill de
      accesibilidad del plugin Design; pruebas a 360 px y 1280 px
- [ ] D022 [P] `expo export --platform android` compila
- [ ] D023 Capturas antes/después; actualizar `README.md`, `AGENTS.md` y marcar tareas

---

## Dependencias y orden

- **Fase 1** bloquea todo lo demás.
- **Historia 1** antes que las demás: sus componentes los usan la 2 y la 3.
- **Historias 2 y 3** pueden ir en cualquier orden; **4** es independiente tras la fase 1.
- **Cierre** al final.

### En paralelo

- D002, D004, D005 y D006.
- Dentro de la historia 1, D010 y D011 cuando D007–D009 estén hechas.
- D018 en cualquier momento tras D004; D021 y D022 a la vez.
