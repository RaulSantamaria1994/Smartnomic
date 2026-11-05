# Plan de implementación: Exportar movimientos a CSV con filtros

**Rama**: `feat/010-exportar-csv` | **Fecha**: 2026-11-05 | **Especificación**: [`spec.md`](spec.md)

> El plan describe **cómo** se construye lo que pide la especificación. Debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). El siguiente paso es `tasks.md`.

## Resumen

Una ruta nueva de solo lectura, `GET /api/households/:id/transactions/export`, recibe los
mismos filtros que la búsqueda y devuelve `{ fileName, csv }`: el texto del archivo ya hecho,
con todos los movimientos que los cumplen. Las filas salen de una consulta que reutiliza las
condiciones de la búsqueda y une la categoría y el nombre de quien lo apuntó; el texto lo
escribe una función pura de `packages/domain/src/csv.ts` (separador, comillas, signo, coma
decimal, fechas y protección contra fórmulas). La app añade el botón «Exportar a CSV» en la
búsqueda y guarda el archivo con el mismo mecanismo que la exportación completa de «Hogar»
(descarga en el navegador, menú de compartir en Android). Sin tablas, migraciones ni
dependencias nuevas.

## Contexto técnico

| Campo                        | Valor                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| **Lenguaje/versión**         | TypeScript (`strict`), Node 22, Expo 58 — igual que ahora                                     |
| **Dependencias nuevas**      | Ninguna (`expo-file-system` y `expo-sharing` ya están para la exportación completa)           |
| **Almacenamiento**           | Sin cambios                                                                                   |
| **Tests**                    | Vitest: dominio (CSV), esquemas, servidor (filtros, columnas, contraste con la búsqueda), app |
| **Plataformas**              | Android y navegador                                                                           |
| **Objetivos de rendimiento** | Archivo de 5.000 movimientos en < 5 s (CE-1003)                                               |
| **Restricciones**            | Importes en céntimos hasta escribir el texto; estilo de la 006; WCAG 2.1 AA                   |

## Comprobación de la constitución

| Artículo                   | Cómo lo cumple este plan                                                                                                               | Estado |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Stack                   | Sin dependencias nuevas.                                                                                                               | ✅     |
| II. Arquitectura por capas | El formato CSV en `packages/domain/src/csv.ts` (puro y probado); filtros y respuesta en `packages/api`; la app solo guarda.            | ✅     |
| III. Dinero y fechas       | Céntimos enteros hasta el último paso; «-45,30» se escribe con aritmética entera, sin coma flotante; fechas `YYYY-MM-DD` → dd/mm/aaaa. | ✅     |
| IV. Datos y persistencia   | Sin cambios en el esquema; mismas condiciones que la búsqueda (hogar, sin borrados).                                                   | ✅     |
| V. API                     | Esquema zod de la respuesta; reutiliza `searchQuerySchema` sin `cursor`; ruta nueva de solo lectura.                                   | ✅     |
| VI. Seguridad y privacidad | Permiso `household.view`; protección contra la inyección de fórmulas; batería de ataques ampliada; los logs no llevan el contenido.    | ✅     |
| VII. Tests                 | Tests primero; el archivo se contrasta con la búsqueda y con un análisis del CSV (CE-1001, CE-1002).                                   | ✅     |
| VIII. Calidad y CI         | `pnpm check`; textos en `es.ts`.                                                                                                       | ✅     |
| IX. App y plataformas      | Mismo botón en Android y web; el guardado ya existe para cada plataforma.                                                              | ✅     |

Sin incumplimientos.

## Contrato de la API

`GET /api/households/:id/transactions/export` con permiso `household.view` y los mismos
parámetros que la búsqueda (`kind`, `categoryId` repetido, `minCents`, `maxCents`, `from`,
`to`); un `cursor` no se acepta. Respuesta:

```text
{ fileName: "smartnomic-movimientos-2026-11-05.csv", csv: "﻿Fecha;Tipo;…\r\n…" }
```

- `fileName` lleva la fecha de hoy en la zona horaria del hogar.
- Va dentro de JSON para usar el mismo cliente HTTP, con su sesión y sus errores, que el
  resto de la app; un archivo de 5.000 movimientos ocupa unos 400 KB.

## Formato del archivo (`packages/domain/src/csv.ts`)

- **Codificación**: UTF-8 con BOM (`﻿`) al principio, para que Excel reconozca los acentos.
- **Filas**: separadas por `\r\n`; columnas por `;`. Primera fila: `Fecha;Tipo;Categoría;Importe
(€);Nota;Apuntado por`.
- **Fecha**: `27/10/2026`. **Tipo**: `Gasto` o `Ingreso`. **Importe**: con signo y coma
  decimal, sin separador de miles ni símbolo (`-45,30`, `1800,00`), para que Excel lo lea como
  número.
- **Comillas**: un campo con `;`, `"`, `\r` o `\n` va entre comillas dobles y sus `"` se
  duplican (RFC 4180).
- **Fórmulas** (RF-1005): un campo de texto (categoría, nota, nombre) que empieza por `=`, `+`,
  `-`, `@`, tabulador o retorno de carro se precede de un apóstrofo (`'=SUMA(…)`), como
  recomienda OWASP. El importe, que es un número escrito por la app, no se toca.
- `csvFile(rows)` recibe filas ya resueltas (`{ date, kind, category, amountCents, note,
author }`) y devuelve el texto; los títulos y «Gasto»/«Ingreso»/«Antiguo miembro» llegan como
  textos para que el dominio no tenga cadenas de la interfaz.

## Servidor

- `filtersOf` sale de `routes/search.ts` a un módulo compartido (`routes/transaction-filters.ts`)
  y lo usan la búsqueda y la exportación: los dos aplican exactamente los mismos filtros
  (RF-1002).
- La consulta une `categories` (nombre) y `members` → `users` (nombre; si el miembro ya no está,
  «Antiguo miembro») y ordena como la búsqueda. Sin paginar.

## App

- `api.exportTransactions(householdId, filters)` y `exportTransactions` en
  `src/export/export-transactions.ts`, que llama a la ruta y guarda el archivo.
- `saveJsonFile` pasa a `saveFile(name, content, mimeType)`; la exportación completa lo usa con
  `application/json` y la nueva con `text/csv`.
- En «Buscar movimientos», junto al número y los totales, un botón secundario «Exportar a CSV»
  (solo con resultados) con estado de carga; si falla, `Message` con el error.

## Investigación y decisiones

| Decisión             | Elegido                                                    | Alternativas descartadas                                                  |
| -------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| Dónde se hace el CSV | En el servidor, con una función pura del dominio           | En la app pidiendo todas las páginas: 50 peticiones con 5.000 movimientos |
| Cómo viaja           | Texto dentro de JSON con su nombre                         | `text/csv` directo: habría que ampliar el cliente HTTP solo para esto     |
| Filtros              | Las mismas condiciones que la búsqueda, en un módulo común | Copiarlas: dos sitios que pueden dejar de coincidir                       |
| Separador e importes | `;` y coma decimal, sin miles ni €                         | Formato estándar con `,`: Excel en español lo abre en una sola columna    |
| Fórmulas             | Apóstrofo delante (OWASP)                                  | Quitar el carácter: cambiaría lo que escribió la persona                  |

## Riesgos

- **Excel en otro idioma o Google Sheets**: con `;` puede que haya que indicar el separador al
  importar; aceptado en la especificación.
- **Archivos muy grandes**: sin límite; con hogares de varios miles de movimientos al año es
  del orden de megas, asumible. Si algún día no lo fuera, se pasaría a generar el archivo por
  partes.

## Pruebas y cierre

- Batería de ataques ampliada a `/transactions/export` (otro hogar, ids ajenos, sin sesión,
  lector, filtros absurdos, fórmulas e intentos de romper el CSV en notas).
- CE-1001 y CE-1002: cientos de movimientos con notas difíciles; cada archivo se analiza y se
  compara con la búsqueda.
- Punta a punta: buscar, exportar, descargar en el navegador y leer el archivo; CE-1003 con
  5.000 movimientos; axe-core a 320 y 1280 px; `expo export --platform android`.
