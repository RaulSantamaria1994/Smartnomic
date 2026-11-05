# Especificación: Gráficas

**Rama de la funcionalidad**: `008-graficas`
**Creada**: 2026-11-05
**Plan**: [`plan.md`](plan.md)
**Estado**: Aprobada
**Entrada**: "Implementa las gráficas." (Pendiente del MVP: «Presupuestos, gráficas, búsqueda y
exportación a CSV con filtros quedan para más adelante».)

> Esta especificación describe **qué** debe conseguir la funcionalidad y **por qué**. El
> **cómo** va en el plan técnico, que debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md).

## Aclaraciones

### Sesión 2026-11-04

- P: ¿Qué gráficas? → R: Cuatro: gasto por categoría del mes, ingresos y gastos por mes,
  evolución de una categoría y lo ahorrado en huchas. Se ve una cada vez y se puede cambiar
  de una a otra.
- P: ¿Dónde van? → R: En una pestaña nueva, «Gráficas», justo después de «Mes».
- P: ¿Cuántos meses hacia atrás en las gráficas de evolución? → R: 6.
- P: ¿Cómo se dibujan? → R: Con barras, sin gráficos de tarta ni de líneas.
- P: ¿Cómo se elige el mes? → R: Con las mismas flechas de anterior y siguiente que en «Mes»:
  la gráfica del mes muestra ese mes y las de 6 meses terminan en él.
- P: ¿Cómo se elige la categoría de «Evolución»? → R: Tocando su barra en «Gasto por
  categoría»; la gráfica de evolución tiene además un selector de categoría.
- P: ¿Qué muestra la de huchas? → R: Lo ahorrado en total al final de cada mes, y debajo cada
  hucha con lo que lleva.

## Escenarios de usuario y pruebas _(obligatorio)_

### Historia 1: Ver en qué se va el dinero del mes (Prioridad: P1) 🎯

Lucía abre «Gráficas» y ve las categorías de gasto de este mes de mayor a menor, cada una con
su barra, su importe y su porcentaje del total: Supermercado 412,30 € (38 %), Vivienda
350,00 € (32 %)…

**Por qué esta prioridad**: es la pregunta que la app promete responder («en qué se va el
dinero»), y la que abre la evolución de una categoría (historia 3).

**Prueba independiente**: con gastos de varias categorías en un mes, cada barra, importe y
porcentaje coinciden con la suma de los gastos de esa categoría en el periodo.

**Escenarios de aceptación**:

1. **Dado** la barra inferior, **cuando** se abre la app, **entonces** hay una pestaña
   «Gráficas» entre «Mes» y «Calendario».
2. **Dado** «Gráficas», **cuando** se abre, **entonces** arriba hay un selector con las cuatro
   gráficas y está elegida «Por categoría»; se ve una sola gráfica cada vez.
3. **Dado** un mes con gastos, **cuando** se ve «Por categoría», **entonces** cada categoría
   de gasto con gastos ese mes tiene una fila con su icono, su nombre, una barra
   proporcional, el importe y el porcentaje del gasto total, de mayor a menor, y arriba el
   total gastado.
4. **Dado** las flechas de mes, **cuando** se pasa al mes anterior o al siguiente,
   **entonces** la gráfica muestra ese periodo, igual que «Mes».
5. **Dado** un mes sin gastos, **cuando** se ve «Por categoría», **entonces** se explica que
   ese mes no hay gastos, sin barras vacías.

---

### Historia 2: Comparar ingresos y gastos de los últimos meses (Prioridad: P2)

Lucía quiere saber si este otoño gasta más de lo que entra. En «Ingresos y gastos» ve los 6
últimos meses, cada uno con una barra de ingresos y otra de gastos y la diferencia.

**Por qué esta prioridad**: es la visión del hogar en el tiempo, pero necesita varios meses
de datos para decir algo.

**Prueba independiente**: con movimientos en varios meses, los ingresos, gastos y diferencia
de cada mes coinciden con los que muestra «Mes» para ese periodo.

**Escenarios de aceptación**:

1. **Dado** «Ingresos y gastos», **cuando** se abre, **entonces** muestra 6 meses que terminan
   en el mes elegido con las flechas, del más antiguo al más reciente.
2. **Dado** cada mes, **cuando** se muestra, **entonces** tiene una barra de ingresos y otra de
   gastos a la misma escala, el nombre del mes y la diferencia («+120,00 €» o «−45,00 €»).
3. **Dado** un mes sin movimientos, **cuando** se muestra, **entonces** aparece con 0 € y sin
   barras, sin desplazar a los demás.
4. **Dado** un lector de pantalla, **cuando** llega a un mes, **entonces** oye el mes, los
   ingresos, los gastos y la diferencia, sin depender del color.

---

### Historia 3: Seguir una categoría mes a mes (Prioridad: P3)

En «Por categoría» Lucía toca Restaurantes y pasa a «Evolución», que le enseña lo que gastó en
restaurantes cada uno de los 6 últimos meses. Desde ahí cambia a Ocio con el selector.

**Por qué esta prioridad**: responde a «¿esto ha subido?», pero parte de la historia 1.

**Prueba independiente**: con gastos de una categoría en varios meses, cada barra coincide
con la suma de esa categoría en su periodo.

**Escenarios de aceptación**:

1. **Dado** «Por categoría», **cuando** se toca una fila, **entonces** se pasa a «Evolución»
   con esa categoría elegida y el mismo mes final.
2. **Dado** «Evolución», **cuando** se abre directamente desde el selector, **entonces** está
   elegida la categoría con más gasto del mes, o la primera de gasto si no hay gastos.
3. **Dado** «Evolución», **cuando** se elige otra categoría de gasto en su selector,
   **entonces** la gráfica pasa a esa categoría.
4. **Dado** cada uno de los 6 meses, **cuando** se muestra, **entonces** tiene una barra con lo
   gastado en la categoría y el importe.
5. **Dado** una categoría archivada, **cuando** se abre el selector, **entonces** no aparece.

---

### Historia 4: Ver cómo crece lo ahorrado (Prioridad: P4)

Lucía tiene dos huchas, «Vacaciones» y «Coche». En «Huchas» ve cuánto tenía apartado en total
al final de cada uno de los 6 últimos meses y, debajo, lo que lleva cada hucha.

**Por qué esta prioridad**: complementa las huchas (005), que ya muestran su progreso una a
una.

**Prueba independiente**: con aportaciones y retiradas en varios meses, el total de cada mes
coincide con lo aportado menos lo retirado hasta el último día de ese periodo.

**Escenarios de aceptación**:

1. **Dado** «Huchas», **cuando** se abre, **entonces** muestra 6 meses que terminan en el mes
   elegido, cada uno con una barra y lo que había apartado en todas las huchas al final de
   ese mes.
2. **Dado** la lista de debajo, **cuando** se muestra, **entonces** sale cada hucha con dinero
   al final del mes elegido, con su nombre, su icono y lo que llevaba entonces, de más a
   menos.
3. **Dado** una aportación, una retirada o una hucha cerrada (su saldo vuelve como
   retirada), **cuando** se vuelve a «Gráficas», **entonces** los totales ya están al día.
4. **Dado** un hogar sin huchas, **cuando** se abre «Huchas», **entonces** se explica que no
   hay huchas y, para quien puede crearlas, cómo crear una.

### Casos límite

- Día de inicio de mes del hogar (por ejemplo, el 25): cada «mes» de las gráficas es el
  periodo del hogar, del 25 al 24, como en «Mes».
- Lo apartado en huchas no es un gasto: no cuenta en «Por categoría» ni en «Ingresos y
  gastos», igual que en «Mes».
- Meses futuros: se puede navegar a ellos como en «Mes»; muestran lo apuntado con esa fecha.
- Un mes con un importe muy grande junto a otros pequeños: las barras pequeñas siguen
  teniendo un mínimo visible si su importe no es cero, y el importe siempre va en texto.
- Muchas categorías (más de 15): la lista se desplaza; no se agrupan en «Otras».
- Texto grande del sistema y 320 px de ancho: los nombres, importes y porcentajes no se
  cortan.
- Sin conexión en Android: se ven las últimas gráficas cargadas, como el resto de la app.
- «Reducir movimiento» activado: las barras aparecen sin animación.

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-801**: DEBE haber una pestaña «Gráficas» entre «Mes» y «Calendario», visible para todos
  los miembros, también los lectores.
- **RF-802**: «Gráficas» DEBE tener cuatro gráficas («Por categoría», «Ingresos y gastos»,
  «Evolución» y «Huchas»), una visible cada vez, con un selector para cambiar entre ellas.
- **RF-803**: El mes se DEBE elegir con las flechas de anterior y siguiente, como en «Mes»; las
  gráficas de evolución DEBEN mostrar 6 meses que terminan en el elegido.
- **RF-804**: Todos los importes DEBEN calcularse a partir de los movimientos del hogar en cada
  periodo (nunca guardarse), con los mismos criterios que «Mes»: sin movimientos borrados y
  sin contar las huchas como gasto.
- **RF-805**: Las gráficas DEBEN ser de barras; cada barra DEBE ir acompañada de su importe en
  texto.
- **RF-806**: Tocar una categoría en «Por categoría» DEBE abrir su «Evolución».
- **RF-807**: Las gráficas DEBEN poder entenderse sin color y con lector de pantalla (cada fila
  o mes se anuncia con sus datos), y cumplir WCAG 2.1 AA.
- **RF-808**: Las gráficas DEBEN seguir el estilo de la especificación 006 y funcionar igual en
  Android y en el navegador.

## Criterios de éxito _(obligatorio)_

- **CE-801**: En una prueba con cientos de movimientos de varias categorías y meses, cada
  importe de las cuatro gráficas coincide al céntimo con la suma de sus movimientos.
- **CE-802**: «Gráficas» se muestra en menos de 1 s con 500 movimientos por mes durante 6
  meses.
- **CE-803**: Ver la evolución de una categoría lleva como mucho dos toques desde «Gráficas»
  (abrir la pestaña y tocar la categoría).
- **CE-804**: axe-core sin problemas en las cuatro gráficas a 320 y 1280 px; las pruebas de
  punta a punta anteriores siguen pasando.

## Supuestos

- «Mes» es el periodo del hogar según su día de inicio de mes, como en el resto de la app.
- Los importes van en la moneda del hogar (euro), con dos decimales.
- Las gráficas solo leen datos: no se apunta ni se edita nada desde ellas.
- La barra inferior pasa de cuatro a cinco pestañas.
