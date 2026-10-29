# Plan de implementación: Diseño visual de la app

**Rama**: `003-diseno-visual` | **Fecha**: 2026-10-29 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Se aplica la dirección «Calma» del lienzo a toda la app. Se crea un sistema de diseño
pequeño en `apps/mobile/src/design/` (tokens y componentes), se rehacen las pantallas
encima de él, se cambia la navegación a una barra inferior de pestañas con Expo Router y
se añaden icono, pantalla de carga y favicon. No cambian el dominio, la API ni el
servidor.

## Auditoría del punto de partida

Hecha con la skill de sistema de diseño (plugin Design) sobre `apps/mobile`:

| Categoría   | Definido hoy                  | Valores sueltos encontrados                                    |
| ----------- | ----------------------------- | -------------------------------------------------------------- |
| Color       | 9 colores en `src/theme.ts`   | 16 hex sueltos (categorías, avisos, snackbar, fila atrasada)   |
| Tipografía  | Ninguna (fuente del sistema)  | 62 `fontSize` literales en 10 tamaños; 4 pesos                 |
| Espaciado   | 5 pasos (`spacing`)           | Pocos sueltos; se amplía la escala                             |
| Esquinas    | Ninguna                       | 19 `borderRadius` literales en 6 valores                       |
| Sombras     | Ninguna                       | —                                                              |
| Componentes | 10 (Button, Chip, TextField…) | Tarjetas, filas, etiquetas de estado e iconos repetidos a mano |

Prioridades: 1) tokens de color, tipografía y esquinas; 2) componentes de tarjeta, fila,
etiqueta de estado e icono de categoría, hoy duplicados en varias pantallas; 3) una regla
de ESLint que impida volver a meter valores sueltos (CE-202).

## Contexto técnico

| Campo                        | Valor                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Expo SDK 58, Expo Router                                                 |
| **Dependencias nuevas**      | `expo-font`, `@expo-google-fonts/plus-jakarta-sans`, `@expo/vector-icons`, `expo-splash-screen` |
| **Almacenamiento**           | Sin cambios                                                                                     |
| **Tests**                    | Vitest para helpers de color; pruebas de punta a punta existentes (adaptadas); axe-core         |
| **Plataformas**              | Android y navegador                                                                             |
| **Objetivos de rendimiento** | «Mes» < 1 s con 500 movimientos (CE-203); la fuente no retrasa la primera pantalla > 300 ms     |
| **Restricciones**            | WCAG 2.1 AA; sin modo oscuro (tokens preparados); textos en `src/i18n/es.ts`                    |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                         | Estado |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Cuatro paquetes oficiales de Expo, justificados en [Seguimiento de complejidad](#seguimiento-de-complejidad).    | ✅     |
| II. Arquitectura por capas | Solo cambia `apps/mobile`; el dominio y la API no se tocan.                                                      | ✅     |
| III. Dinero y fechas       | Los importes se siguen formateando con `formatMoney`; solo cambia su estilo (cifras tabulares).                  | ✅     |
| IV–VI                      | Sin cambios en datos, API ni seguridad.                                                                          | ✅     |
| VII. Tests                 | Tests de los helpers de color (contraste); las pruebas de punta a punta del MVP y del calendario siguen pasando. | ✅     |
| VIII. Calidad y CI         | `pnpm check`; regla de ESLint contra colores y tamaños sueltos; textos centralizados.                            | ✅     |
| IX. App y plataformas      | Misma interfaz en Android y web; accesibilidad comprobada con axe-core y TalkBack (pendiente del APK).           | ✅     |

## Estructura de archivos

```text
apps/mobile/
├── src/design/
│   ├── tokens.ts            # color, tipografía, espaciado, esquinas, sombras (sustituye a src/theme.ts)
│   ├── color.ts             # tint(hex) y contraste WCAG, con tests
│   ├── color.test.ts
│   ├── fonts.ts             # carga de Plus Jakarta Sans (useAppFonts)
│   ├── Text.tsx             # <AppText variant="display|title|heading|body|label|caption" />
│   ├── Icon.tsx             # iconos de interfaz (Feather de @expo/vector-icons) con nombres propios
│   ├── Card.tsx             # superficie con borde y esquinas
│   ├── ListRow.tsx          # fila con icono, título, detalle e importe
│   ├── StatusPill.tsx       # atrasado · vence pronto · pagado · omitido · cobrado
│   ├── CategoryIcon.tsx     # emoji de la categoría sobre un fondo suave de su color
│   ├── Amount.tsx           # importe con signo, color y cifras tabulares
│   ├── SummaryCard.tsx      # tarjeta «Te quedan este mes» con barra de gasto
│   ├── EmptyState.tsx       # icono, texto y acción
│   └── index.ts
├── src/components/          # Button, Chip, TextField, Message, Screen… pasan a usar los tokens
├── app/(app)/(tabs)/        # nuevo grupo con la barra inferior
│   ├── _layout.tsx          # Tabs: Mes, Calendario, «+», Pagos, Hogar
│   ├── index.tsx            # Mes (antes app/(app)/index.tsx)
│   ├── calendar.tsx         # (antes app/(app)/calendar.tsx)
│   ├── recurring.tsx        # Pagos (antes app/(app)/recurring/index.tsx)
│   └── account.tsx          # Hogar: miembros, ajustes, categorías, avisos, exportar, cuenta
├── assets/                  # icon.png, adaptive-icon.png, splash.png, favicon.png
└── app.json                 # icono, splash (expo-splash-screen), favicon, color de notificación
```

Las rutas no cambian (`/`, `/calendar`, `/recurring`, `/account`): los grupos de Expo
Router no forman parte de la URL, así que los enlaces de avisos e invitaciones siguen
valiendo.

## Investigación y decisiones

| Decisión                 | Elegido                                                                                                                                                                  | Alternativas descartadas                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Tokens                   | Objeto TypeScript en `src/design/tokens.ts`, con nombres semánticos (`color.bg.canvas`, `color.text.muted`, `color.status.overdue.fg`…) sobre una paleta base            | Librería de temas (dependencia para algo pequeño)                      |
| Modo oscuro              | No ahora; los componentes solo leen tokens semánticos, así que añadir una paleta oscura no toca pantallas                                                                | —                                                                      |
| Tipografía               | Plus Jakarta Sans 400/500/600/700/800 con `@expo-google-fonts`. En Android cada peso es una familia (`PlusJakartaSans_700Bold`): `AppText` elige la familia por variante | Fuente del sistema (menos carácter); otra fuente de pago               |
| Escala tipográfica       | display 40/800 · title 22/700 · heading 17/700 · body 16/500 · label 14/600 · caption 13/500; importes con `fontVariant: ['tabular-nums']`                               | —                                                                      |
| Carga de la fuente       | `useFonts` en el layout raíz con `expo-splash-screen` hasta que carga; en web, `font-display: swap`                                                                      | —                                                                      |
| Iconos de interfaz       | Feather de `@expo/vector-icons` (incluido en Expo, trazo fino como el lienzo)                                                                                            | SVG a mano (`react-native-svg`, otra dependencia nativa)               |
| Iconos de categoría      | Se mantienen los emoji guardados en cada categoría, sobre un fondo `tint(color)`                                                                                         | Cambiar a iconos de trazo (migración de datos y elegir icono al crear) |
| Fondo de categoría       | `tint(hex, 0.14)` mezclado con blanco; un test comprueba que el texto tinta sobre él cumple 4,5:1                                                                        | —                                                                      |
| Navegación               | `Tabs` de Expo Router en `(app)/(tabs)`. El «+» es un botón propio en la barra que abre `/new` (no es una pestaña); se oculta a los lectores                             | Barra hecha a mano (perdería la gestión de estado de pestañas)         |
| Pantallas secundarias    | Siguen en el `Stack` de `(app)` encima de las pestañas, con cabecera propia y «Volver»                                                                                   | —                                                                      |
| Tarjeta de resumen       | Fondo pino, «Te quedan este mes», barra de gasto = gastos / ingresos (tope 100 %; sin ingresos, oculta)                                                                  | Gráfico circular (más difícil de leer y de hacer accesible)            |
| Icono y splash           | Se dibujan en SVG y se convierten a PNG con Chromium (Playwright, ya instalado), con un script en `apps/mobile/scripts/`                                                 | Herramienta de diseño externa                                          |
| Valores sueltos (CE-202) | Regla de ESLint `no-restricted-syntax` en `apps/mobile`: prohíbe literales hex y `fontSize` numérico fuera de `src/design/`                                              | Revisión a mano                                                        |

## Componentes

| Componente     | Variantes / estados                                           | Accesibilidad                                                    |
| -------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `Button`       | primary, secondary, link, danger · pressed, disabled, loading | `accessibilityRole` button/link, estado `disabled`/`busy`, 48 px |
| `Chip`         | normal, seleccionado                                          | `radio` con `aria-checked`                                       |
| `TextField`    | normal, foco, error                                           | etiqueta visible ligada al campo; error anunciado                |
| `Card`         | normal, destacada (pino)                                      | —                                                                |
| `ListRow`      | con o sin acción, con o sin importe                           | `button` si tiene acción; etiqueta completa                      |
| `StatusPill`   | overdue, soon, pending, paid, collected, skipped              | texto siempre visible (no solo color)                            |
| `CategoryIcon` | tamaños md (40) y lg (48)                                     | decorativo (`accessible={false}`)                                |
| `Amount`       | income, expense, neutral · tamaños                            | signo explícito en el texto                                      |
| `SummaryCard`  | con y sin ingresos                                            | etiqueta con balance, ingresos, gastos y porcentaje              |
| `EmptyState`   | con o sin acción                                              | —                                                                |
| Barra inferior | pestaña activa, «+»                                           | `tab` con `selected`; «+» etiquetado «Apuntar un movimiento»     |

## Guía de validación

1. `pnpm check` en verde, con la regla nueva de ESLint sin excepciones fuera de `src/design/`.
2. Recorrer todas las pantallas en web a 390 px y 1280 px y compararlas con el lienzo.
3. axe-core sin problemas en todas las pantallas (CE-201).
4. Pruebas de punta a punta del MVP y del calendario (adaptadas a la barra inferior) en
   verde (CE-204); «Mes» < 1 s con 500 movimientos (CE-203).
5. Exportar para Android; con el APK, revisar TalkBack, texto grande al 200 % e icono.

## Orden de implementación

1. Tokens, helpers de color con tests, fuentes e iconos.
2. Componentes base y rehacer los existentes con tokens.
3. Barra inferior y reorganización de rutas.
4. Pantallas, de la más usada a la menos: Mes, Apuntar/editar, Calendario, Pagos,
   Hogar y el resto (auth, invitación, miembros, categorías…).
5. Icono, splash y favicon.
6. Regla de ESLint, axe-core, pruebas de punta a punta, export de Android y documentación.

## Seguimiento de complejidad

| Dependencia                            | Por qué hace falta                                        | Alternativa descartada                      |
| -------------------------------------- | --------------------------------------------------------- | ------------------------------------------- |
| `expo-font`                            | Cargar la tipografía de la marca                          | Fuente del sistema (distinta en cada móvil) |
| `@expo-google-fonts/plus-jakarta-sans` | Archivos de la fuente, con licencia OFL, dentro de la app | Descargarlos a mano al repositorio          |
| `@expo/vector-icons`                   | Iconos de interfaz (pestañas, flechas, avisos)            | `react-native-svg` y dibujar cada icono     |
| `expo-splash-screen`                   | Pantalla de carga con la marca mientras carga la fuente   | Pantalla en blanco                          |

## Riesgos

| Riesgo                                              | Mitigación                                                                        |
| --------------------------------------------------- | --------------------------------------------------------------------------------- |
| Mover rutas a `(tabs)` rompe enlaces o pruebas      | Las URL no cambian; las pruebas de punta a punta se ejecutan tras mover cada ruta |
| Pesos de fuente que no se ven en Android            | `AppText` usa la familia de cada peso, nunca `fontWeight` con fuente propia       |
| Colores de categorías del usuario poco contrastados | El texto va siempre en tinta; el color solo pinta el fondo suave y el punto       |
| Rediseño grande en un solo PR difícil de revisar    | Commits por fase y capturas antes/después en la descripción del PR                |
