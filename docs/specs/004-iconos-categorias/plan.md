# Plan de implementación: Iconos de categoría en lugar de emoji

**Rama**: `004-iconos-categorias` | **Fecha**: 2026-10-29 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Las categorías dejan de guardar un emoji y guardan el identificador de un icono de un
catálogo cerrado definido en el dominio. La app traduce cada identificador a un glifo de
Material Community Icons y a un nombre en español. Una migración convierte los emoji
existentes; el servidor solo acepta identificadores del catálogo; la pantalla
«Categorías» sustituye el campo de texto por una cuadrícula de iconos.

## Contexto técnico

| Campo                        | Valor                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Node 22 — igual que el MVP                                         |
| **Dependencias nuevas**      | Ninguna: `MaterialCommunityIcons` viene en `@expo/vector-icons` (ya instalado en 003)     |
| **Almacenamiento**           | Misma columna `categories.icon` (texto); migración de datos `0005`, sin cambio de tipo    |
| **Tests**                    | Vitest: catálogo (dominio), validación y migración (servidor), contraste y emoji (app)    |
| **Plataformas**              | Android y navegador                                                                       |
| **Objetivos de rendimiento** | «Mes» < 1 s con 500 movimientos (CE-403); la fuente de iconos se carga con las demás      |
| **Restricciones**            | Accesible (WCAG 2.1 AA); sin texto fuera de `src/i18n/es.ts`; sin valores fuera de tokens |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                           | Estado |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------ |
| I. Stack                   | Sin dependencias nuevas.                                                                                           | ✅     |
| II. Arquitectura por capas | El catálogo de identificadores y la conversión de emoji van en `packages/domain`; el glifo y el nombre, en la app. | ✅     |
| III. Dinero y fechas       | No aplica.                                                                                                         | ✅     |
| IV. Datos y persistencia   | Migración versionada `0005` que solo actualiza `categories.icon`; se puede repetir sin efecto.                     | ✅     |
| V. API                     | `categoryIconSchema` pasa a `z.enum` del catálogo en `packages/api`; las respuestas siguen aceptando texto.        | ✅     |
| VI. Seguridad y privacidad | Sin cambios de permisos; crear y editar siguen exigiendo `categories.write`.                                       | ✅     |
| VII. Tests                 | Tests primero del catálogo, la conversión, la validación, la migración, el contraste y la ausencia de emoji.       | ✅     |
| VIII. Calidad y CI         | `pnpm check`; nombres de iconos en `es.ts`.                                                                        | ✅     |
| IX. App y plataformas      | Mismo componente en Android y web; los datos en caché con emoji se ven con el icono genérico.                      | ✅     |

Sin incumplimientos.

## Estructura de archivos

```text
packages/domain/src/
├── categoryIcons.ts           # nuevo: CATEGORY_ICONS, CategoryIconId, DEFAULT_CATEGORY_ICON,
│                              #        isCategoryIcon, iconFromEmoji
├── categoryIcons.test.ts
└── categories.ts              # DEFAULT_CATEGORIES con identificadores
packages/api/src/schemas/
└── transactions.ts            # categoryIconSchema = z.enum(CATEGORY_ICONS)
apps/server/src/db/migrations/
└── 0005_category_icons.sql    # emoji → identificador; el resto → 'tag'
apps/server/test/
├── categories.test.ts         # iconos válidos y rechazo de emoji
└── migrations.test.ts         # la 0005 convierte filas con emoji (nuevo o ampliado)
apps/mobile/src/design/
├── categoryGlyphs.ts          # nuevo: CategoryIconId → nombre de glifo de MaterialCommunityIcons
├── CategoryIcon.tsx           # glifo con el color de la categoría oscurecido sobre su fondo suave
├── color.ts                   # iconTone(hex): oscurece hasta 3:1 sobre tint(hex)
└── color.test.ts
apps/mobile/src/components/
└── IconPicker.tsx             # nuevo: cuadrícula accesible del catálogo
apps/mobile/app/(app)/
├── household/categories.tsx   # IconPicker en lugar del campo de texto
└── occurrence/[ruleId]/[dueDate].tsx  # icono junto al nombre, no en el título
apps/mobile/src/i18n/es.ts     # categoryIcons: { home: 'Vivienda', … }
apps/mobile/src/noEmoji.test.ts # CE-401: sin emoji en app/, src/ y packages/
```

## Investigación y decisiones

| Decisión               | Elegido                                                                                                                                                                                                                  | Alternativas descartadas                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Qué se guarda          | Identificador propio en inglés y corto (`home`, `cart`, `pet`…), independiente de la librería                                                                                                                            | Guardar el nombre del glifo (`cart-outline`): ataría los datos a Material Community              |
| Dónde vive el catálogo | Lista de identificadores en `packages/domain` (la usan servidor, contrato y app); glifo y nombre en la app con `Record<CategoryIconId, …>`, así el compilador obliga a cubrirlos todos                                   | Catálogo completo en el dominio: el dominio no debe saber de librerías ni de textos              |
| Librería               | `MaterialCommunityIcons`, variantes de contorno donde existen, que casan con el trazo de Feather de la interfaz                                                                                                          | Feather: le faltan coche, colegio, ropa, salud (aclaración 1)                                    |
| Color del icono        | `iconTone(color)`: el color de la categoría oscurecido hacia la tinta hasta 3:1 sobre `tint(color)` (WCAG 1.4.11); test con todos los colores de categoría                                                               | Icono siempre en tinta: pierde el color de la categoría; color tal cual: falla 3:1 con amarillos |
| Valores desconocidos   | Respuesta: `icon` sigue siendo `z.string()`; la app muestra `tag` si no está en el catálogo                                                                                                                              | `z.enum` en la respuesta: un dato raro rompería la carga de categorías                           |
| Entrada                | `z.enum(CATEGORY_ICONS)` en crear y editar (RF-406); error con el formato común                                                                                                                                          | Aceptar emoji y convertir: mantiene vivo el formato antiguo                                      |
| Migración              | SQL de datos: `UPDATE … SET icon = CASE icon WHEN '🏠' THEN 'home' … ELSE 'tag' END WHERE icon NOT IN (<catálogo>)`; generada con `drizzle-kit generate --custom`                                                        | Convertir al leer: dejaría emoji en la base para siempre                                         |
| Conversión de emoji    | Las 13 predefinidas y la etiqueta 🏷️, más unos pocos frecuentes (🐶, 🐱, ✈️, 🍽️, ⛽, 💊, 🎁, 🚌); el resto → `tag`. `iconFromEmoji` en el dominio documenta la tabla y la SQL la repite; un test comprueba que coinciden | —                                                                                                |
| Cuadrícula             | `radiogroup` con `radio` por icono, nombre de `es.ts`, `checked`; 48 px por celda (≥ 44); columnas según ancho (6 en móvil, 8 en ancho)                                                                                  | Reutilizar `CategoryPicker`: sus celdas llevan texto y son más grandes                           |
| Título del vencimiento | Fila con `CategoryIcon` y el nombre bajo el título de la pantalla; el título es solo el nombre                                                                                                                           | —                                                                                                |
| Tokens de emoji        | Se quitan `typography.emoji` y `emojiLarge`; tamaños de glifo en `size` (`categoryGlyph: 22`, `categoryGlyphLarge: 26`)                                                                                                  | —                                                                                                |

## Catálogo inicial (44 iconos)

| Id              | Glifo                     | Nombre (es)         | Id           | Glifo                   | Nombre (es)        |
| --------------- | ------------------------- | ------------------- | ------------ | ----------------------- | ------------------ |
| `salary`        | `briefcase-outline`       | Nómina              | `restaurant` | `silverware-fork-knife` | Restaurantes       |
| `cash`          | `cash-multiple`           | Dinero              | `coffee`     | `coffee-outline`        | Café               |
| `savings`       | `piggy-bank-outline`      | Ahorro              | `bus`        | `bus`                   | Transporte público |
| `gift`          | `gift-outline`            | Regalos             | `fuel`       | `gas-station-outline`   | Combustible        |
| `investment`    | `chart-line`              | Inversiones         | `travel`     | `airplane`              | Viajes             |
| `aid`           | `hand-coin-outline`       | Ayudas              | `pet`        | `paw`                   | Mascotas           |
| `home`          | `home-outline`            | Vivienda            | `baby`       | `baby-carriage`         | Bebé               |
| `utilities`     | `lightbulb-outline`       | Suministros         | `kids`       | `account-child-outline` | Hijos              |
| `groceries`     | `cart-outline`            | Supermercado        | `sport`      | `dumbbell`              | Deporte            |
| `car`           | `car-outline`             | Coche               | `pharmacy`   | `pill`                  | Farmacia           |
| `health`        | `stethoscope`             | Salud               | `water`      | `water-outline`         | Agua               |
| `education`     | `school-outline`          | Educación           | `gas`        | `fire`                  | Gas                |
| `leisure`       | `party-popper`            | Ocio                | `internet`   | `wifi`                  | Internet           |
| `clothes`       | `tshirt-crew-outline`     | Ropa                | `phone`      | `cellphone`             | Móvil              |
| `subscriptions` | `television-classic`      | Suscripciones       | `repairs`    | `tools`                 | Reparaciones       |
| `insurance`     | `shield-check-outline`    | Seguros             | `furniture`  | `sofa-outline`          | Muebles            |
| `other`         | `package-variant-closed`  | Otros               | `cleaning`   | `spray-bottle`          | Limpieza           |
| `tag`           | `tag-outline`             | Etiqueta (genérico) | `books`      | `book-open-variant`     | Libros             |
| `games`         | `gamepad-variant-outline` | Juegos              | `music`      | `music-note`            | Música             |
| `bank`          | `bank-outline`            | Banco               | `card`       | `credit-card-outline`   | Tarjeta            |
| `taxes`         | `file-document-outline`   | Impuestos           | `donations`  | `heart-outline`         | Donaciones         |
| `haircut`       | `content-cut`             | Peluquería          | `garden`     | `flower-outline`        | Jardín             |

Todos los glifos están comprobados en el glyphmap de `@expo/vector-icons` 15.1.1.

## Contrato de la API

- `POST /api/households/:id/categories` y `PATCH …/categories/:categoryId`: `icon` debe ser
  un identificador del catálogo; si no, `400 validation_error` con el formato común.
- `GET …/categories`: sin cambios de forma; tras la migración `icon` es siempre un
  identificador.

## Riesgos

- **Apps antiguas** que envían emoji al crear una categoría reciben un 400 hasta que se
  actualizan (asumido en la especificación). La web se actualiza sola al desplegar.
- **Caché persistida en Android** con categorías de antes: se ven con el icono genérico
  hasta la siguiente recarga, que trae los identificadores.

## Pruebas y cierre

- Pruebas de punta a punta del MVP y del calendario contra la web de producción, con los
  selectores de crear categoría adaptados a la cuadrícula.
- axe-core en «Mes», «Apuntar», «Calendario», «Pagos», detalle de vencimiento y
  «Categorías».
- «Mes» con 500 movimientos.
- `expo export --platform android` compila.
