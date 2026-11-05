# Especificación: Exportar movimientos a CSV con filtros

**Rama de la funcionalidad**: `010-exportar-csv`
**Creada**: 2026-11-05
**Plan**: [`plan.md`](plan.md)
**Estado**: Implementada
**Entrada**: "Vamos con otra función" → exportar a CSV con filtros. (Pendiente del MVP:
«Presupuestos, gráficas, búsqueda y exportación a CSV con filtros quedan para más adelante».)

> Esta especificación describe **qué** debe conseguir la funcionalidad y **por qué**. El
> **cómo** va en el plan técnico, que debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md).

## Aclaraciones

### Sesión 2026-11-05

- P: ¿Desde dónde se exporta? → R: Con un botón «Exportar a CSV» en «Buscar movimientos», que
  descarga exactamente los movimientos que cumplen los filtros puestos (sin filtros, todos).
- P: ¿Para qué programa se prepara? → R: Para Excel en español: separado por punto y coma,
  decimales con coma y fechas dd/mm/aaaa.
- P: ¿Qué columnas? → R: Fecha, tipo, categoría e importe siempre; además la nota y quién lo
  apuntó, y el importe con signo (gastos en negativo, ingresos en positivo).
- P: ¿Quién puede exportar? → R: Todos los miembros, también los lectores (ya pueden ver y
  buscar todos los movimientos).

## Escenarios de usuario y pruebas _(obligatorio)_

### Historia 1: Llevarse a una hoja de cálculo lo que se ha buscado (Prioridad: P1) 🎯

Lucía quiere repasar en Excel los gastos del supermercado de este año. En «Buscar movimientos»
elige «Gastos», la categoría Supermercado y la fecha de inicio del año, y toca «Exportar a
CSV». En el navegador se descarga el archivo; en Android elige dónde guardarlo o a quién
enviarlo. Al abrirlo con doble clic en Excel, cada dato está en su columna y los importes se
pueden sumar.

**Por qué esta prioridad**: es la funcionalidad entera.

**Prueba independiente**: con movimientos variados, el archivo exportado con unos filtros
tiene exactamente los movimientos que muestra la búsqueda con esos filtros, con los datos
correctos en cada columna, y Excel en español lo abre bien.

**Escenarios de aceptación**:

1. **Dado** «Buscar movimientos» con o sin filtros, **cuando** hay al menos un resultado,
   **entonces** hay un botón «Exportar a CSV»; sin resultados no aparece.
2. **Dado** el botón, **cuando** se toca, **entonces** se genera un archivo con todos los
   movimientos que cumplen los filtros (no solo los cargados en pantalla), en el mismo orden
   que la búsqueda (de más reciente a más antiguo).
3. **Dado** el navegador, **cuando** el archivo está listo, **entonces** se descarga; **dado**
   Android, **entonces** se abre el menú de compartir para guardarlo o enviarlo, como la
   exportación completa de «Hogar».
4. **Dado** el archivo, **cuando** se abre, **entonces** la primera fila son los títulos
   (Fecha; Tipo; Categoría; Importe (€); Nota; Apuntado por) y cada movimiento ocupa una fila:
   fecha dd/mm/aaaa, «Gasto» o «Ingreso», el nombre de la categoría, el importe con signo y
   coma decimal («-45,30», «1800,00»), la nota (vacía si no tiene) y el nombre de quien lo
   apuntó (o «Antiguo miembro»).
5. **Dado** Excel en español, **cuando** se abre el archivo con doble clic, **entonces** cada
   dato queda en su columna, los acentos y la «ñ» se ven bien y la columna de importes se
   puede sumar.
6. **Dado** un lector, **cuando** está en la búsqueda, **entonces** también puede exportar.
7. **Dado** que la exportación tarda, **cuando** se está generando, **entonces** el botón
   muestra que está trabajando y no se puede pulsar dos veces; si falla (por ejemplo, sin
   conexión), se explica.

### Casos límite

- Notas con punto y coma, comillas, saltos de línea o el carácter `"`: el archivo sigue
  teniendo una fila por movimiento y cada dato en su columna.
- Notas que empiezan por `=`, `+`, `-` o `@`: Excel no las ejecuta como fórmulas (protección
  contra la inyección de fórmulas).
- Categorías archivadas: salen con su nombre, como en la búsqueda.
- Muchos movimientos (miles): el archivo los incluye todos y se genera en pocos segundos.
- Movimientos borrados: no salen nunca. Lo apartado en huchas no es un movimiento y no sale.
- El nombre del archivo dice qué es y cuándo se hizo:
  `smartnomic-movimientos-AAAA-MM-DD.csv` (fecha de hoy en la zona del hogar).
- Los filtros con errores no se aplican, igual que en la búsqueda: se exporta lo que se ve.

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-1001**: «Buscar movimientos» DEBE tener un botón «Exportar a CSV» cuando hay resultados,
  disponible para todos los miembros.
- **RF-1002**: El archivo DEBE contener todos los movimientos que cumplen los filtros aplicados
  en la búsqueda, en su mismo orden, y ningún otro.
- **RF-1003**: El archivo DEBE estar pensado para Excel en español: separado por punto y coma,
  importes con coma decimal y signo (gastos negativos), fechas dd/mm/aaaa, codificación que
  Excel reconoce con acentos, y una fila de títulos.
- **RF-1004**: Columnas, en este orden: Fecha, Tipo, Categoría, Importe (€), Nota, Apuntado por.
- **RF-1005**: Ningún dato escrito por una persona DEBE poder romper las filas o columnas del
  archivo ni ejecutarse como fórmula al abrirlo.
- **RF-1006**: En el navegador se DEBE descargar; en Android, abrir el menú de compartir.
- **RF-1007**: La exportación completa de «Hogar» (RGPD, RF-038) no cambia.
- **RF-1008**: Todo DEBE cumplir WCAG 2.1 AA y funcionar igual en Android y en el navegador.

## Criterios de éxito _(obligatorio)_

- **CE-1001**: Con cientos de movimientos y varias combinaciones de filtros, cada archivo tiene
  exactamente los movimientos de la búsqueda con esos filtros, y la suma de su columna de
  importes coincide al céntimo con ingresos menos gastos de la búsqueda.
- **CE-1002**: Un archivo con notas que llevan punto y coma, comillas, saltos de línea y
  fórmulas se lee con el mismo número de filas y columnas, y ninguna celda empieza por una
  fórmula.
- **CE-1003**: Con 5.000 movimientos, el archivo está listo en menos de 5 s.
- **CE-1004**: Exportar lo buscado lleva un toque desde la búsqueda.
- **CE-1005**: axe-core sin problemas en la búsqueda con el botón a 320 y 1280 px; las pruebas
  de punta a punta anteriores siguen pasando.

## Supuestos

- Los importes van en la moneda del hogar (euro), sin el símbolo en la celda (para que Excel
  los trate como números); el título de la columna dice «Importe (€)».
- Si alguien usa Excel en otro idioma o Google Sheets, puede que tenga que importar el archivo
  indicando el punto y coma como separador; no se ofrece otro formato.
- No hay límite de movimientos por archivo.
