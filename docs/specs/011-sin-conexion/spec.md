# Especificación: Apuntar movimientos sin conexión

**Rama de la funcionalidad**: `011-sin-conexion`
**Creada**: 2026-11-06
**Estado**: Borrador
**Entrada**: "Vamos con guardar sin conexión." (Pendiente del MVP: «Sin conexión solo se
consultan datos; guardar cambios sin conexión y sincronizarlos después llega más adelante».)

> Esta especificación describe **qué** debe conseguir la funcionalidad y **por qué**. El
> **cómo** va en el plan técnico, que debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md).

## Aclaraciones

### Sesión 2026-11-06

- P: ¿Qué se puede hacer sin conexión? → R: Solo apuntar movimientos nuevos. Editar, borrar,
  pagar recurrentes y las huchas siguen necesitando conexión.
- P: ¿Cómo se ven los que aún no se han enviado? → R: En «Mes», en su mes, marcados como
  pendientes, y contando ya en el resumen; arriba, un aviso con cuántos hay sin enviar.
- P: ¿Cuándo se envían? → R: Solos, al volver la conexión o al abrir la app; además, un botón
  «Enviar ahora» en el aviso.
- P: ¿Y si uno no se puede enviar (categoría archivada, ya no puedes editar en el hogar…)? →
  R: Se queda en pendientes marcado «No se ha podido enviar», con el motivo, y se puede corregir
  o descartar. Nunca se pierde sin avisar.

## Escenarios de usuario y pruebas _(obligatorio)_

### Historia 1: Apuntar un gasto sin cobertura (Prioridad: P1) 🎯

Lucía paga en el súper del sótano, sin cobertura. Abre la app en su Android, apunta 45,30 € en
Supermercado y guarda. La app le dice que se enviará en cuanto haya conexión; el gasto ya sale
en «Mes» como pendiente y el resumen ya lo cuenta. Al salir a la calle, el móvil recupera la
conexión y el gasto se envía solo.

**Por qué esta prioridad**: es la funcionalidad entera; sin ella, lo apuntado sin conexión se
pierde o hay que acordarse de apuntarlo después.

**Prueba independiente**: sin conexión se apuntan varios movimientos, se cierra y se vuelve a
abrir la app, se recupera la conexión y todos llegan al servidor una sola vez, con sus datos.

**Escenarios de aceptación**:

1. **Dado** Android sin conexión, **cuando** se apunta un movimiento y se guarda, **entonces**
   se queda guardado en el móvil, la pantalla se cierra como siempre y se avisa: «Sin conexión:
   se enviará cuando vuelva».
2. **Dado** movimientos sin enviar, **cuando** se abre «Mes» del mes al que pertenecen,
   **entonces** salen en la lista en su fecha con «Pendiente de enviar» y cuentan en el
   resumen y en los presupuestos de ese mes.
3. **Dado** movimientos sin enviar, **cuando** se abre la app o se está en «Mes», **entonces**
   arriba se ve un aviso «2 movimientos sin enviar» con el botón «Enviar ahora».
4. **Dado** que vuelve la conexión, **cuando** la app está abierta o se abre, **entonces** los
   pendientes se envían solos, uno a uno en el orden en que se apuntaron, y al llegar dejan de
   estar marcados; si todo ha ido bien, el aviso desaparece.
5. **Dado** que se cierra la app (o se apaga el móvil) con movimientos sin enviar, **cuando**
   se vuelve a abrir, **entonces** siguen ahí y se envían en cuanto hay conexión.
6. **Dado** un movimiento que se envía dos veces (por ejemplo, la conexión se corta justo
   después de enviarlo), **cuando** llega, **entonces** se guarda una sola vez.
7. **Dado** un pendiente, **cuando** se toca, **entonces** se puede corregir (importe,
   categoría, fecha, nota, tipo) o descartar, sin conexión.

---

### Historia 2: Lo que no se puede enviar (Prioridad: P2)

Mientras Lucía estaba sin cobertura, Juan archivó la categoría «Ocio». Al volver la conexión, el
gasto de Lucía en Ocio no se puede guardar. Se queda en pendientes con «No se ha podido enviar:
la categoría está archivada» y Lucía lo corrige eligiendo otra categoría, y entonces se envía.

**Por qué esta prioridad**: es raro, pero sin esto se perderían datos sin avisar.

**Prueba independiente**: se fuerza cada motivo de rechazo y el movimiento se queda con su
motivo; al corregirlo se envía y al descartarlo desaparece.

**Escenarios de aceptación**:

1. **Dado** un pendiente que el servidor rechaza por sus datos o por permisos, **cuando** se
   intenta enviar, **entonces** se queda marcado «No se ha podido enviar» con el motivo que da
   el servidor, y los demás pendientes se siguen enviando.
2. **Dado** un pendiente rechazado, **cuando** se corrige y se guarda, **entonces** se vuelve a
   intentar enviar.
3. **Dado** un pendiente rechazado, **cuando** se descarta (con confirmación), **entonces**
   desaparece del móvil sin haberse guardado.
4. **Dado** un fallo de conexión o del servidor (no de los datos), **cuando** se intenta
   enviar, **entonces** no cuenta como rechazo: sigue pendiente y se reintenta más tarde.
5. **Dado** que la sesión ha caducado, **cuando** se intenta enviar, **entonces** los
   pendientes se conservan y se envían después de volver a entrar con la misma cuenta.

### Casos límite

- Solo en Android: en el navegador la app necesita conexión (constitución, art. IX.3) y, sin
  ella, guardar sigue avisando y no pierde lo escrito, como hasta ahora.
- Editar o borrar un movimiento ya guardado, pagar un recurrente o tocar una hucha sin
  conexión: se avisa como hasta ahora; no se guarda para más tarde.
- Cerrar sesión con pendientes: se avisa de cuántos hay sin enviar y de que se perderán si se
  sale; hay que confirmarlo.
- Entrar con otra cuenta en el mismo móvil: no ve ni envía los pendientes de la anterior.
- Los pendientes se guardan para el hogar en el que se apuntaron; si se sale de ese hogar,
  al enviarlos se rechazan con su motivo y se pueden descartar.
- «Gráficas» y la búsqueda muestran lo que ya está en el servidor: un pendiente aparece en
  ellas al enviarse.
- Un pendiente con una fecha de otro mes cuenta en ese mes.
- Muchos pendientes (decenas): se envían todos, de uno en uno, sin bloquear la app.
- Se apunta con el formulario de siempre, con las mismas comprobaciones (importe, categoría,
  fecha).

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-1101**: En Android, guardar un movimiento nuevo sin conexión DEBE dejarlo guardado en el
  móvil, avisarlo y cerrar el formulario como un guardado normal.
- **RF-1102**: Los pendientes DEBEN sobrevivir a cerrar la app y reiniciar el móvil.
- **RF-1103**: Los pendientes DEBEN enviarse solos al volver la conexión o al abrir la app, en
  el orden en que se apuntaron, y también con «Enviar ahora».
- **RF-1104**: Enviar un pendiente dos veces NO DEBE duplicarlo en el servidor.
- **RF-1105**: «Mes» DEBE mostrar los pendientes de cada mes marcados como tales y contarlos en
  el resumen y en los presupuestos; los totales se calculan en `packages/domain`
  (constitución, art. IV.5).
- **RF-1106**: Un pendiente rechazado por sus datos o permisos DEBE quedarse con el motivo y
  poder corregirse o descartarse; un fallo de conexión o del servidor DEBE reintentarse.
- **RF-1107**: Los pendientes son de la cuenta y del hogar en que se apuntaron; cerrar sesión
  con pendientes DEBE pedir confirmación.
- **RF-1108**: Solo se guardan sin conexión los movimientos nuevos; el resto de cambios avisa
  como hasta ahora.
- **RF-1109**: Todo DEBE cumplir WCAG 2.1 AA y el estilo de la especificación 006.

## Criterios de éxito _(obligatorio)_

- **CE-1101**: En una prueba sin conexión con 20 movimientos apuntados, cerrando y abriendo la
  app entre medias, al volver la conexión los 20 llegan al servidor una sola vez, con sus
  datos exactos.
- **CE-1102**: Con la conexión cortándose a mitad del envío varias veces, no se pierde ni se
  duplica ninguno.
- **CE-1103**: Apuntar sin conexión lleva los mismos pasos que con conexión.
- **CE-1104**: El resumen de «Mes» con pendientes coincide al céntimo con el que habrá cuando
  se envíen.
- **CE-1105**: axe-core sin problemas en «Mes» con pendientes (y uno rechazado) a 320 y
  1280 px; las pruebas de punta a punta anteriores siguen pasando.

## Supuestos

- Los movimientos ya llevan un identificador creado en el móvil, así que repetir el envío no
  los duplica (especificación 001).
- La fecha y la hora de «apuntado» que quedan en el servidor son las de cuando llega; la fecha
  del movimiento es la que se eligió.
- Quien apunta sin conexión tenía permiso para apuntar la última vez que la app habló con el
  servidor; si lo ha perdido, el envío se rechaza con su motivo.
