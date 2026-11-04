# Tareas: Estilo Android estándar y animaciones pequeñas

**Entrada**: [`spec.md`](spec.md) y [`plan.md`](plan.md) de `docs/specs/006-estilo-android/`
**Requisitos previos**: especificación y plan aprobados.

**Tests**: obligatorios según la constitución (art. VII). Se escriben primero y deben
fallar antes de implementar.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin depender de tareas
  pendientes).
- **[US1]…[US2]**: historia de la especificación a la que pertenece.
- Prefijo `A` para no confundirlas con las de otras funcionalidades. Se marca `[x]` al
  terminarla, con `pnpm check` en verde.

---

## Fase 1: Base (tokens, fuente, iconos)

**Objetivo**: los cimientos del estilo nuevo, sin tocar aún las pantallas.

- [x] A001 [P] Tests en `apps/mobile/src/design/tokens.test.ts`: radios 4/8/16, fondo
      blanco, sin familias de Plus Jakarta, contraste 4,5:1 de texto y secundario sobre
      blanco, 3:1 del borde y de los iconos de las categorías predefinidas y de la paleta
- [x] A002 [P] Tests de `iconTone(hex, '#FFFFFF')` en `color.test.ts` (un amarillo claro se
      oscurece hasta 3:1; los de serie quedan igual)
- [x] A003 Tokens nuevos en `src/design/tokens.ts` (colores de Figma, `#757575` de borde,
      escala de texto con `fontWeight`, sin `shadow.card`); `Text.tsx` sin familias;
      `fonts.ts` solo con la fuente de iconos; quitar `@expo-google-fonts/plus-jakarta-sans`
- [x] A004 `Icon.tsx` con Material Community Icons (mismos nombres de uso);
      `CategoryIcon.tsx` sin fondo con `iconTone` sobre blanco; fuera `categoryBackground`

**Punto de control**: `pnpm check` en verde; la app arranca con la fuente del sistema.

---

## Fase 2: Historia 1 — Componentes al estilo Android (P1) 🎯

- [ ] A005 [US1] `AppBar.tsx` y `Screen.tsx` con barra superior (título, subtítulo,
      atrás con «Volver», flechas de mes); atrás sin historial va a «Mes»
- [ ] A006 [P] [US1] `Button`, `TextField`, `Chip`, `SegmentedControl` al estilo de Figma
- [ ] A007 [P] [US1] `ListRow` con separador, `Section`, `StatusText` (sustituye a
      `StatusPill`), `EmptyState` sin círculo, `ProgressBar` (aún sin animación)
- [ ] A008 [US1] `TabBar` con cuatro pestañas y `Fab.tsx` (solo con `transactions.write`)
      en el layout de pestañas
- [ ] A009 [US1] `SummaryCard` → bloque de resumen (cifra, barra, tres líneas);
      `SavingsCard` → fila de hucha; `Brand` sin eslogan; fuera el saludo y las iniciales
- [ ] A010 [P] [US1] `MonthGrid`, `CategoryPicker`, `IconPicker`, `UndoSnackbar`,
      `ReminderBanners`, `RuleForm`, `SavingsForm`, `TransactionForm` al nuevo estilo

**Punto de control**: componentes listos; RF-601 a RF-606 en las piezas.

---

## Fase 3: Historia 1 — Pantallas

- [ ] A011 [US1] Pestañas: «Mes», «Calendario», «Pagos», «Hogar» como en Figma
- [ ] A012 [US1] Sin sesión: Entrar, Registro, Recuperar, Restablecer, Invitación
- [ ] A013 [US1] Formularios y detalles: Apuntar, movimiento, pago recurrente (nuevo y
      detalle), vencimiento, Categorías, Miembros, Ajustes
- [ ] A014 [US1] Huchas: lista, nueva, detalle, editar, apartar el mes
- [ ] A015 [US1] Test `src/noAiTells.test.ts` (CE-603): sin Plus Jakarta, sin
      `StatusPill`, `Card` ni `categoryBackground`, sin «Volver»/«Cancelar» de navegación
      al pie de las pantallas

**Punto de control**: todas las pantallas con el estilo nuevo; RF-609 y RF-610.

---

## Fase 4: Historia 2 — Animaciones pequeñas (P2)

- [ ] A016 [P] [US2] Tests de `src/design/motion.test.ts` (duración 0 con reducir
      movimiento) y `src/components/animatedList.test.ts` (entradas, salidas, primera carga
      sin animar, la misma clave que vuelve)
- [ ] A017 [US2] `motion.ts` (`useReduceMotion`, `duration`, `useNativeDriver` por
      plataforma) y `animatedList.ts`
- [ ] A018 [P] [US2] Animaciones 1 (pestaña), 2 (botón «+»), 3 (logo) y 4 (marca del chip)
- [ ] A019 [P] [US2] Animaciones 5 (barras de progreso) y 8 (hucha conseguida)
- [ ] A020 [US2] Animación 6 (`MonthSlide` en «Mes» y «Calendario») y 7 (`AnimatedList`
      en movimientos, pagos e historial de la hucha)

**Punto de control**: RF-607 y RF-608.

---

## Fase 5: Cierre

- [ ] A021 Capturas una al lado de la otra de las seis pantallas de Figma a 390 px
      (CE-601) para revisión del propietario
- [ ] A022 [P] axe-core en todas las pantallas a 320 y 1280 px (CE-602)
- [ ] A023 Pruebas de punta a punta (MVP, calendario, categorías, huchas) con los
      selectores de la flecha atrás; «Mes» con 500 movimientos (CE-604)
- [ ] A024 [P] Playwright con `reducedMotion: 'reduce'`: cada animación en su estado final
      al momento (CE-605)
- [ ] A025 [P] `expo export --platform android` compila
- [ ] A026 Actualizar `README.md` y `AGENTS.md` (estilo y animaciones), marcar tareas

---

## Dependencias y orden

- **Fase 1** bloquea todo lo demás.
- **Fase 2** antes que la 3 (las pantallas usan los componentes).
- **Fase 4** tras la 3: las animaciones van en componentes ya rehechos.
- **Cierre** al final.

### En paralelo

- A001 y A002; A006, A007 y A010; A016, A018 y A019; A022, A024 y A025.
