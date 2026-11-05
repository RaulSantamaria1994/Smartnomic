# Especificación: Búsqueda de movimientos

**Rama de la funcionalidad**: `009-busqueda`
**Creada**: 2026-11-05
**Plan**: [`plan.md`](plan.md)
**Estado**: Aprobada
**Entrada**: "Vamos a hacer la implementación de la búsqueda de movimientos." (Pendiente del MVP:
«Presupuestos, gráficas, búsqueda y exportación a CSV con filtros quedan para más adelante».)

> Esta especificación describe **qué** debe conseguir la funcionalidad y **por qué**. El
> **cómo** va en el plan técnico, que debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md).

## Aclaraciones

### Sesión 2026-11-05

- P: ¿Por qué se puede buscar? → R: Por categoría y tipo (gasto o ingreso), por importe (desde
  y hasta) y por fechas (desde y hasta). No por el texto de la nota.
- P: ¿Desde dónde se abre? → R: Con una lupa en la barra de «Mes». No es una pestaña.
- P: ¿Qué se ve junto a los resultados? → R: La lista y, arriba, cuántos son y cuánto suman
  (gastos e ingresos por separado).
- P: ¿Qué pasa al tocar un resultado? → R: Se abre el movimiento, como en «Mes»; al volver, la
  búsqueda sigue igual.
- P: ¿Qué se ve antes de poner filtros? → R: Todos los movimientos, de 100 en 100 con «Mostrar
  más», como en «Mes».
- P: ¿Se puede filtrar por categorías archivadas? → R: Sí, aparte, al final y marcadas como
  archivadas.

## Escenarios de usuario y pruebas _(obligatorio)_

### Historia 1: Encontrar movimientos por categoría, tipo y fechas (Prioridad: P1) 🎯

Lucía no recuerda cuándo pagó el seguro del coche. Abre la búsqueda desde «Mes», elige la
categoría Seguros y ve todos sus movimientos de más reciente a más antiguo, con cuántos son y
cuánto suman.

**Por qué esta prioridad**: es el uso más común (¿cuándo pagué…?, ¿cuánto llevo en…?) y sienta
la pantalla, la lista y los totales.

**Prueba independiente**: con movimientos de varias categorías, tipos y meses, cada
combinación de filtros devuelve exactamente los que la cumplen, y los totales coinciden con la
suma de la lista.

**Escenarios de aceptación**:

1. **Dado** «Mes», **cuando** se toca la lupa de la barra de arriba, **entonces** se abre la
   pantalla «Buscar movimientos».
2. **Dado** la pantalla sin filtros, **cuando** se abre, **entonces** muestra todos los
   movimientos del hogar de más reciente a más antiguo, los 100 primeros y «Mostrar más» para
   seguir, y arriba cuántos son en total y cuánto suman los gastos y los ingresos.
3. **Dado** el filtro de tipo, **cuando** se elige «Gastos» o «Ingresos», **entonces** solo
   salen los de ese tipo; con «Todos», los dos.
4. **Dado** el filtro de categorías, **cuando** se eligen una o varias, **entonces** solo
   salen los movimientos de esas categorías; las categorías que se ofrecen son las del tipo
   elegido (o todas si es «Todos»), y las archivadas van aparte, al final, marcadas como
   archivadas.
5. **Dado** el filtro de fechas, **cuando** se escribe «desde», «hasta» o las dos (dd/mm/aaaa),
   **entonces** solo salen los de esos días, ambos incluidos.
6. **Dado** cualquier cambio de filtro, **cuando** se aplica, **entonces** la lista, el número
   y los totales se actualizan, y se vuelve a los 100 primeros.
7. **Dado** filtros que no encuentran nada, **cuando** se aplican, **entonces** se dice que no
   hay movimientos con esos filtros y se ofrece quitarlos.
8. **Dado** un resultado, **cuando** quien puede editar lo toca, **entonces** se abre ese
   movimiento para editarlo o borrarlo y, al volver, los filtros y la lista siguen como
   estaban, ya al día.

---

### Historia 2: Buscar por importe (Prioridad: P2)

Lucía quiere ver los gastos de más de 100 € de este año. Escribe 100 en «Importe desde» y la
fecha de inicio del año.

**Por qué esta prioridad**: afina la búsqueda; se apoya en la pantalla de la historia 1.

**Prueba independiente**: con importes variados, «desde» y «hasta» incluyen los límites y
excluyen el resto, solos o junto a los otros filtros.

**Escenarios de aceptación**:

1. **Dado** «Importe desde» y/o «hasta», **cuando** se escribe un importe (con hasta dos
   decimales), **entonces** solo salen los movimientos con ese importe o entre los dos, ambos
   incluidos.
2. **Dado** un importe o una fecha no válidos, o un «desde» mayor que el «hasta», **cuando** se
   escriben, **entonces** se explica junto al campo y no se busca con ese filtro hasta
   corregirlo.

### Casos límite

- Movimientos borrados: no salen nunca, igual que en «Mes».
- Lo apartado en huchas no es un movimiento y no sale.
- Movimientos de pagos recurrentes: salen como cualquier otro.
- Miles de movimientos: la primera página y los totales llegan rápido; los totales cuentan
  todos los que cumplen los filtros, no solo los cargados.
- Un movimiento editado o borrado desde la búsqueda: al volver, la lista y los totales ya
  están al día.
- Lectores: pueden buscar y ver los resultados, pero no abrirlos para editarlos (como en «Mes»,
  donde solo los abren quienes pueden editarlos).
- Sin conexión en Android: se avisa como en el resto de la app; no hay búsqueda sin conexión.
- Texto grande del sistema y 320 px de ancho: los filtros y las filas no se cortan.

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-901**: Una lupa en la barra de «Mes» DEBE abrir la pantalla «Buscar movimientos»,
  disponible para todos los miembros, también los lectores.
- **RF-902**: Se DEBE poder filtrar por tipo (todos, gastos, ingresos), por una o varias
  categorías (archivadas incluidas, aparte), por importe (desde y hasta) y por fechas (desde y
  hasta), en cualquier combinación; los límites están incluidos.
- **RF-903**: Sin filtros DEBE mostrar todos los movimientos del hogar.
- **RF-904**: La lista DEBE ir de más reciente a más antiguo, de 100 en 100 con «Mostrar más».
- **RF-905**: Arriba DEBE mostrar cuántos movimientos cumplen los filtros y cuánto suman los
  gastos y los ingresos, calculado sobre todos ellos (no solo los cargados) y siempre a partir
  de los movimientos.
- **RF-906**: Tocar un resultado DEBE abrir el movimiento a quien puede editarlo, como en «Mes»; al volver, los filtros se conservan y
  la lista está al día.
- **RF-907**: No se busca por el texto de la nota.
- **RF-908**: Todo DEBE cumplir WCAG 2.1 AA, seguir el estilo de la especificación 006 y
  funcionar igual en Android y en el navegador.

## Criterios de éxito _(obligatorio)_

- **CE-901**: En una prueba con cientos de movimientos de varias categorías, tipos, importes y
  meses, cada combinación de filtros devuelve exactamente los movimientos que la cumplen, y el
  número y los totales coinciden al céntimo con ellos.
- **CE-902**: Con 5.000 movimientos en el hogar, la primera página y los totales aparecen en
  menos de 1 s al cambiar un filtro.
- **CE-903**: Encontrar los movimientos de una categoría lleva como mucho tres toques desde
  «Mes» (lupa, abrir el filtro de categorías, elegirla).
- **CE-904**: axe-core sin problemas en la pantalla nueva a 320 y 1280 px; las pruebas de punta
  a punta anteriores siguen pasando.

## Supuestos

- Los importes van en la moneda del hogar (euro), con dos decimales.
- Las fechas son días del calendario del hogar, como en el resto de la app.
- La búsqueda solo lee: se edita o borra desde la pantalla del movimiento, que ya existe.
- Los filtros no se guardan al salir de la pantalla de búsqueda.
