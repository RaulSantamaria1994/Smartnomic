# Plan de implementación: Estilo Android estándar y animaciones pequeñas

**Rama**: `006-estilo-android` | **Fecha**: 2026-11-04 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Solo cambia la app (`apps/mobile`). Los tokens pasan a los valores de la propuesta de Figma
(fondo blanco, separadores grises, esquinas de 4/8/16 px, fuente del sistema) y los
componentes de diseño se rehacen con el aspecto de Android: una barra superior nueva en
`Screen`, filas con separador en lugar de tarjetas, estado en texto en lugar de pastilla,
iconos de categoría pintados sin fondo y un botón flotante para «+». Las ocho animaciones
van en los componentes que ya existen, con `Animated` de React Native y un único gancho
que lee «reducir movimiento». Servidor, contrato, dominio y datos no se tocan.

## Contexto técnico

| Campo                        | Valor                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Expo 58, React Native 0.88 — igual que ahora                                           |
| **Dependencias nuevas**      | Ninguna. Se **quita** `@expo-google-fonts/plus-jakarta-sans` (RF-602)                                         |
| **Dependencias usadas**      | `Animated`, `AccessibilityInfo` y `Easing` de React Native; `MaterialCommunityIcons` de `@expo/vector-icons`  |
| **Almacenamiento**           | Sin cambios                                                                                                   |
| **Tests**                    | Vitest (lógica pura: tokens, contraste, lista con salidas, tiempos con reducir movimiento) y Playwright (e2e) |
| **Plataformas**              | Android y navegador                                                                                           |
| **Objetivos de rendimiento** | «Mes» < 1 s con 500 movimientos (CE-604); sin fuente que descargar al abrir                                   |
| **Restricciones**            | WCAG 2.1 AA; sin texto fuera de `src/i18n/es.ts`; sin valores fuera de tokens; animaciones de 150 a 300 ms    |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                                  | Estado |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Sin dependencias nuevas; se elimina una.                                                                                  | ✅     |
| II. Arquitectura por capas | Todo en `apps/mobile/src/design` y `src/components`; la lógica testeable (lista con salidas, tiempos) en funciones puras. | ✅     |
| III. Dinero y fechas       | No cambia cómo se calculan ni se formatean.                                                                               | ✅     |
| IV. Datos y persistencia   | No aplica.                                                                                                                | ✅     |
| V. API                     | Sin cambios.                                                                                                              | ✅     |
| VI. Seguridad y privacidad | Sin cambios; el «+» sigue oculto para quien no tiene `transactions.write`.                                                | ✅     |
| VII. Tests                 | Tests primero de tokens, contraste sobre blanco, lista con salidas y reducir movimiento; e2e y axe al cierre.             | ✅     |
| VIII. Calidad y CI         | `pnpm check`; los textos de la flecha atrás y del botón flotante en `es.ts`.                                              | ✅     |
| IX. App y plataformas      | Mismos componentes en Android y web; `useNativeDriver` solo fuera de la web, aislado en `src/design/motion.ts`.           | ✅     |

Sin incumplimientos.

## Estructura de archivos

```text
apps/mobile/
├── package.json                 # sin @expo-google-fonts/plus-jakarta-sans
└── src/
    ├── design/
    │   ├── tokens.ts            # colores, radios, tipografía del sistema, sin sombras de tarjeta
    │   ├── tokens.test.ts       # nuevo: radios 4/8/16, sin Plus Jakarta, contrastes AA
    │   ├── fonts.ts             # solo la fuente de iconos
    │   ├── Text.tsx             # fontWeight en lugar de familias por peso
    │   ├── Icon.tsx             # interfaz con MaterialCommunityIcons (adiós Feather)
    │   ├── CategoryIcon.tsx     # glifo del color de la categoría, sin fondo
    │   ├── color.ts             # iconTone(hex, fondo = blanco); fuera categoryBackground
    │   ├── AppBar.tsx           # nuevo: barra superior (título, subtítulo, atrás, flechas)
    │   ├── ListRow.tsx          # fila con separador inferior
    │   ├── Section.tsx          # nuevo: subtítulo verde + contenido (sustituye a Card)
    │   ├── StatusText.tsx       # nuevo: estado en texto de color (sustituye a StatusPill)
    │   ├── ProgressBar.tsx      # nuevo: barra de 4 px que se rellena (animación 5)
    │   ├── SummaryCard.tsx      # → SummaryBlock: cifra, barra y tres líneas
    │   ├── SavingsCard.tsx      # → SavingsRow: fila con barra; icono con bote (animación 8)
    │   ├── EmptyState.tsx       # icono sin círculo de fondo
    │   ├── Brand.tsx            # icono y nombre, sin eslogan; aparece suave (animación 3)
    │   ├── motion.ts            # nuevo: duraciones, useReduceMotion, useNativeDriver por plataforma
    │   └── motion.test.ts       # nuevo: duración 0 con reducir movimiento
    ├── components/
    │   ├── Screen.tsx           # pinta AppBar; fondo blanco; sin título grande
    │   ├── TabBar.tsx           # cuatro pestañas con salto del icono (animación 1)
    │   ├── Fab.tsx              # nuevo: «+» flotante que gira (animación 2)
    │   ├── Chip.tsx             # 8 px; marca que crece al elegir (animación 4)
    │   ├── SegmentedControl.tsx # botones segmentados con borde y marca
    │   ├── Button.tsx           # 44 px, 4 px, relleno / borde / peligro / texto
    │   ├── TextField.tsx        # borde fino de 4 px
    │   ├── MonthSlide.tsx       # nuevo: contenido que entra deslizando al cambiar de mes (animación 6)
    │   ├── AnimatedList.tsx     # nuevo: filas que entran y salen fundidas (animación 7)
    │   ├── animatedList.ts      # nuevo: lógica pura de entradas y salidas
    │   ├── animatedList.test.ts # nuevo
    │   ├── MonthGrid.tsx        # hoy en círculo, sin marco
    │   ├── CategoryPicker.tsx   # chips con icono de color
    │   └── UndoSnackbar.tsx, ReminderBanners.tsx, RuleForm.tsx, SavingsForm.tsx,
    │       TransactionForm.tsx  # al nuevo estilo
    ├── i18n/es.ts               # fuera brand.tagline y el saludo; + common.back, tabs.add ya existe
    └── noAiTells.test.ts        # nuevo: CE-603
apps/mobile/app/                 # las 23 pantallas que usan Screen: título y atrás en la barra,
                                 # fuera los «Volver»/«Cancelar» de abajo, tarjetas → secciones
```

## Investigación y decisiones

| Decisión                     | Elegido                                                                                                                                                                                                                                                                                                                                       | Alternativas descartadas                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Colores                      | Los de Figma: primario `#0E5A4C`, fondo `#FFFFFF`, texto `#1F1F1F`, secundario `#5F6368`, separador `#E0E0E0`, borde de campos, chips y botones segmentados y texto de ejemplo `#757575` (el `#9AA0A6` de la primera maqueta daba 2,6:1 y no llegaba al 3:1 de WCAG 1.4.11; ya está corregido en Figma), ingreso `#1E7A3C`, peligro `#B3261E` | Mantener el arena de «Calma»: es parte del aspecto que se quiere quitar                 |
| Fuente                       | Sin `fontFamily`: Roboto en Android y la pila del sistema de react-native-web en el navegador; pesos con `fontWeight` 400/500                                                                                                                                                                                                                 | Cargar Roboto de Google Fonts: añade descarga y en Android ya está                      |
| Escala de texto              | 34 (cifra del resumen), 22 (título de Entrar), 20 (barra superior), 16 (texto), 15 (botones y cifras), 14 (detalle, subtítulos), 13 (etiquetas de campo), 12 (pestañas)                                                                                                                                                                       | —                                                                                       |
| Iconos de la interfaz        | `MaterialCommunityIcons`, el mismo set que las categorías (RF-603); `Icon` traduce los nombres actuales (`home`, `calendar`…) a glifos de Material                                                                                                                                                                                            | Dejar Feather: dos estilos de icono mezclados                                           |
| Color del icono de categoría | `iconTone(hex, '#FFFFFF')`: el color de la categoría oscurecido hacia la tinta hasta 3:1 sobre blanco; los 12 de serie y los 8 de la paleta ya llegan sin oscurecer                                                                                                                                                                           | Gris para todos: se pierde el color (aclaración)                                        |
| Barra superior               | `AppBar` dentro de `Screen` (`title`, `subtitle`, `back`, `onPrev`/`onNext`); 64 px, fondo primario, título 20 px blanco en una línea con «…»; flecha atrás con `accessibilityLabel` «Volver»                                                                                                                                                 | Cabecera de `expo-router`: no deja poner las flechas del mes ni el subtítulo sin rodeos |
| Atrás sin historial          | `router.canGoBack() ? router.back() : router.replace('/')` (pasa al abrir un enlace directo en la web)                                                                                                                                                                                                                                        | `router.back()` a secas: no hace nada sin historial                                     |
| «+»                          | `Fab` en el layout de pestañas, 56×56, 16 px de radio, sombra `raised` (lo único con sombra), abajo a la derecha sobre la barra; solo con `transactions.write`; `TabBar` queda con cuatro pestañas                                                                                                                                            | Dentro de cada pantalla: cuatro copias                                                  |
| Tarjetas                     | Fuera `Card`; en su lugar `Section` (subtítulo de 14 px en primario y contenido) y separadores de 1 px entre grupos                                                                                                                                                                                                                           | Tarjetas planas sin sombra: siguen siendo tarjetas                                      |
| Estados                      | `StatusText`: el mismo texto de `StatusPill` (RF-204 sigue) con su color de primer plano y sin fondo                                                                                                                                                                                                                                          | —                                                                                       |
| Reducir movimiento           | `useReduceMotion()` con `AccessibilityInfo.isReduceMotionEnabled()` y el evento `reduceMotionChanged` (en la web lo resuelve react-native-web con `prefers-reduced-motion`); `duration(ms)` devuelve 0 si está activado y la animación salta al final                                                                                         | Consultarlo en cada componente: se olvida en alguno                                     |
| Motor de animación           | `Animated.timing`/`sequence` con `useNativeDriver` en Android y JS en la web; solo `opacity` y `transform` (`scale`, `rotate`, `translateX/Y`, `scaleX` con `transformOrigin: 'left'` para las barras)                                                                                                                                        | `react-native-reanimated`: dependencia nueva para ocho animaciones cortas               |
| Filas que entran y salen     | `animatedList.ts` calcula, a partir de la lista anterior y la nueva, qué claves entran y cuáles salen; `AnimatedList` mantiene 200 ms las que salen mientras se funden. En la primera carga no se anima nada                                                                                                                                  | `LayoutAnimation`: no funciona en la web y en Android depende de la arquitectura        |
| Cambio de mes                | `MonthSlide` envuelve el contenido con `key` del mes y la dirección (+1/−1); entra desde ±24 px con opacidad de 0 a 1 en 200 ms                                                                                                                                                                                                               | Deslizar la pantalla entera: mueve también la barra superior                            |
| Hucha conseguida             | El icono de `SavingsRow` da el bote cuando el estado pasa a «conseguida» o la primera vez que se muestra así en la sesión (un `Set` en memoria evita repetirlo)                                                                                                                                                                               | Guardarlo en el servidor: no merece un dato nuevo                                       |
| Animaciones que se pisan     | Cada componente guarda su `Animated.Value` y llama a `stop()` antes de empezar otra; el valor final no depende de cuántas veces se pulse                                                                                                                                                                                                      | —                                                                                       |
| Escritorio                   | Igual que ahora: contenido centrado con `layout.maxWidth`; la barra superior ocupa todo el ancho y su contenido se centra con el mismo máximo                                                                                                                                                                                                 | —                                                                                       |

## Las ocho animaciones

| #   | Qué                      | Componente     | Movimiento                                 | Duración |
| --- | ------------------------ | -------------- | ------------------------------------------ | -------- |
| 1   | Icono de la pestaña      | `TabBar`       | `scale` 1 → 1,15 → 1                       | 200 ms   |
| 2   | Botón «+»                | `Fab`          | `rotate` 0° → 90°; navega al pulsar        | 150 ms   |
| 3   | Logo al entrar           | `Brand`        | `opacity` 0 → 1 y `scale` 0,9 → 1, una vez | 300 ms   |
| 4   | Marca de los chips       | `Chip`         | `scale` 0 → 1 de la marca                  | 150 ms   |
| 5   | Barras de progreso       | `ProgressBar`  | `scaleX` 0 (o el valor anterior) → valor   | 300 ms   |
| 6   | Cambio de mes            | `MonthSlide`   | `translateX` ±24 → 0 y `opacity` 0 → 1     | 200 ms   |
| 7   | Filas que entran y salen | `AnimatedList` | `opacity` 0 → 1 al entrar, 1 → 0 al salir  | 200 ms   |
| 8   | Hucha conseguida         | `SavingsRow`   | `translateY` 0 → −6 → 0, una vez           | 300 ms   |

Todas con `Easing.out(Easing.quad)`; con reducir movimiento, duración 0.

## Pantallas

Las seis de Figma (Entrar, Mes, Apuntar, Calendario, Hogar, detalle de hucha) se igualan a
la maqueta. El resto aplica las mismas piezas: Registro y Recuperar como Entrar; Pagos y la
lista de huchas como las listas de «Mes»; Categorías, Miembros y Ajustes como «Hogar»;
formularios (pago recurrente, hucha, movimiento, vencimiento) como «Apuntar»; invitación y
restablecer contraseña como Entrar.

## Riesgos

- **Pruebas de punta a punta**: los selectores que buscan «Volver» o «Cancelar» abajo
  pasan a la flecha de la barra (mismo nombre accesible «Volver»); «Cancelar» de los
  formularios pasa a ser esa flecha. Se adaptan en el cierre.
- **Fuente del sistema en Android**: el ancho de los textos cambia; se revisan a 320 px
  con texto grande para que nada se corte.
- **Animaciones en la web sin `useNativeDriver`**: corren en JS; son pocas y cortas. Se
  mide «Mes» con 500 movimientos para confirmar CE-604.

## Pruebas y cierre

- `pnpm check` en verde.
- Comparación una al lado de la otra de las seis pantallas con Figma a 390 px (CE-601).
- axe-core en todas las pantallas a 320 y 1280 px (CE-602).
- Pruebas de punta a punta del MVP, calendario, categorías y huchas contra la web de
  producción (CE-604) y «Mes» con 500 movimientos.
- Con `reducedMotion: 'reduce'` en Playwright, cada animación queda en su estado final al
  momento (CE-605).
- `expo export --platform android` compila; APK de GitHub Actions para probar en un móvil.
