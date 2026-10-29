# Especificación: MVP del hogar

**Rama de la funcionalidad**: `001-mvp-hogar`
**Creada**: 2026-10-26
**Estado**: Borrador
**Plan**: [`plan.md`](plan.md)
**Entrada**: "La gente pone sus ingresos y sus gastos mensuales y la app le permite llevar
un control de su economía. Debe dar recordatorios de pagos."

> Esta especificación describe **qué** debe hacer el MVP y **por qué**, desde el punto de
> vista de quien lo usa. El **cómo** (tecnología, arquitectura, datos) va en el plan
> técnico, que debe cumplir [`docs/CONSTITUTION.md`](../../CONSTITUTION.md).

## Aclaraciones

### Sesión 2026-10-26

- P: ¿El MVP permite invitar a otras personas al hogar? → R: Sí. El hogar compartido
  entra en el MVP (historia 4).
- P: ¿En qué plataformas funciona el MVP? → R: Android y navegador. iOS queda para más
  adelante.

## Escenarios de usuario y pruebas _(obligatorio)_

Las historias están ordenadas por prioridad. Cada una se puede desarrollar, probar y
enseñar por separado, y cada una aporta valor por sí sola.

### Historia 1: Apuntar ingresos y gastos y ver cómo va el mes (Prioridad: P1)

Lucía crea su cuenta, apunta la nómina que acaba de cobrar y los gastos que va haciendo
(supermercado, gasolina, una cena). En la pantalla principal ve cuánto ha entrado, cuánto
ha salido y cuánto le queda este mes, y puede consultar los meses anteriores.

**Por qué esta prioridad**: es la idea base de la app. Sin esto no hay nada más; con solo
esto, ya hay una app útil para llevar el control.

**Prueba independiente**: se crea una cuenta, se apuntan un ingreso y varios gastos en
distintas categorías, y se comprueba que el resumen del mes cuadra y que los movimientos
aparecen en la lista.

**Escenarios de aceptación**:

1. **Dado** un usuario sin cuenta, **cuando** se registra con su email y una contraseña,
   **entonces** entra en la app con un hogar propio creado, del que es propietario, con
   euros como moneda y las categorías predefinidas disponibles.
2. **Dado** un usuario en la pantalla principal, **cuando** apunta un gasto de 45,30 € en
   "Supermercado" con fecha de hoy, **entonces** el gasto aparece en la lista del mes y
   el total de gastos y el balance se actualizan al momento.
3. **Dado** un mes con un ingreso de 1.800 € y gastos por 1.234,56 €, **cuando** el usuario
   mira el resumen, **entonces** ve ingresos 1.800,00 €, gastos 1.234,56 € y balance
   565,44 €, sin errores de redondeo.
4. **Dado** un movimiento ya apuntado, **cuando** el usuario cambia su importe, categoría,
   fecha o nota, **entonces** el resumen del mes refleja el cambio; y si cambia la fecha
   a otro mes, el movimiento pasa a ese mes.
5. **Dado** un movimiento ya apuntado, **cuando** el usuario lo borra, **entonces**
   desaparece del mes y puede deshacer el borrado durante unos segundos.
6. **Dado** el mes actual en pantalla, **cuando** el usuario pasa al mes anterior,
   **entonces** ve el resumen y los movimientos de ese mes.
7. **Dado** un usuario que ha cerrado sesión, **cuando** vuelve a entrar con su email y
   contraseña, en el móvil o en el navegador, **entonces** encuentra todos sus datos tal
   como los dejó.

---

### Historia 2: Pagos recurrentes (Prioridad: P2)

Lucía paga cada mes el alquiler (750 €, el día 1), la luz (unos 60 €, el día 15) y una
vez al año el seguro del coche (320 €, en marzo). Los da de alta una vez y la app le
enseña qué pagos tiene pendientes. Cuando paga uno, lo marca como pagado indicando lo que
ha costado de verdad, y queda apuntado como gasto.

**Por qué esta prioridad**: los pagos fijos son la mayor parte del gasto de un hogar.
Tenerlos dados de alta ahorra apuntarlos cada mes y es la base de los recordatorios.

**Prueba independiente**: se crean un pago mensual y uno anual, se comprueba que aparecen
los próximos vencimientos con sus fechas y que, al marcar uno como pagado, se crea el
gasto correspondiente en el mes.

**Escenarios de aceptación**:

1. **Dado** un usuario, **cuando** crea el pago recurrente "Alquiler", 750 €, categoría
   "Vivienda", mensual, el día 1, **entonces** ve en "Próximos pagos" el siguiente
   vencimiento con su fecha e importe.
2. **Dado** un vencimiento pendiente de "Luz" con importe previsto de 60 €, **cuando** el
   usuario lo marca como pagado indicando 67,12 €, **entonces** se crea un gasto de
   67,12 € en "Suministros" con la fecha del pago, y el vencimiento queda como pagado.
3. **Dado** un vencimiento pendiente, **cuando** el usuario lo marca como omitido (ese mes
   no se paga), **entonces** deja de aparecer como pendiente y no se crea ningún gasto.
4. **Dado** un pago recurrente el día 31, **cuando** llega un mes con menos días,
   **entonces** el vencimiento cae el último día de ese mes.
5. **Dado** un pago recurrente, **cuando** el usuario cambia su importe o su día,
   **entonces** los vencimientos futuros se actualizan y los ya pagados no cambian.
6. **Dado** un pago recurrente, **cuando** el usuario lo desactiva o lo borra, **entonces**
   no se generan más vencimientos ni recordatorios, y los gastos ya creados se conservan.
7. **Dado** un ingreso fijo (la nómina, el día 28), **cuando** el usuario lo da de alta como
   recurrente, **entonces** aparece en "Próximos" y al confirmarlo se crea el ingreso.

---

### Historia 3: Recordatorios de pagos (Prioridad: P3)

Lucía recibe un aviso en su móvil Android el día antes de que venza el alquiler y otro el
mismo día. Al tocar el aviso, la app se abre en ese pago y puede marcarlo como pagado.
Cuando entra desde el navegador del ordenador, ve destacados los pagos que vencen pronto
o que están atrasados.

**Por qué esta prioridad**: es lo que evita recargos y descuidos, y lo que hace que la app
se abra a diario. Depende de la historia 2.

**Prueba independiente**: con un pago recurrente que vence mañana, se comprueba que en
Android llega el aviso a la hora configurada, también sin conexión, y que al tocarlo se
abre el pago; y que en el navegador aparece destacado al entrar.

**Escenarios de aceptación**:

1. **Dado** un vencimiento pendiente para mañana con recordatorio de 1 día antes,
   **cuando** llega la hora de aviso de hoy, **entonces** el usuario recibe en Android una
   notificación con el nombre del pago y la fecha. El importe se ve al abrir la app, no en
   la notificación, que aparece en la pantalla de bloqueo (cambio de la auditoría de
   seguridad del 29 de octubre de 2026, `docs/seguridad/`).
2. **Dado** un vencimiento pendiente para hoy, **cuando** llega la hora de aviso,
   **entonces** el usuario recibe en Android una notificación de que vence hoy.
3. **Dado** un vencimiento ya marcado como pagado u omitido, **cuando** llega la hora de
   aviso, **entonces** no se envía ninguna notificación.
4. **Dado** un usuario que toca una notificación, **cuando** se abre la app, **entonces**
   muestra ese vencimiento con la opción de marcarlo como pagado.
5. **Dado** un móvil sin conexión, **cuando** llega la hora de un recordatorio ya conocido,
   **entonces** la notificación llega igualmente.
6. **Dado** un usuario de Android que no ha concedido permiso de notificaciones,
   **cuando** crea un pago recurrente o abre la app, **entonces** ve un aviso claro de que
   no recibirá recordatorios y cómo activarlos.
7. **Dado** un pago recurrente, **cuando** el usuario cambia con cuántos días de antelación
   quiere el aviso (0, 1, 3 o 7) o lo desactiva, **entonces** los avisos siguientes
   respetan el cambio.
8. **Dado** un usuario que entra desde el navegador, **cuando** tiene vencimientos para los
   próximos días o atrasados, **entonces** los ve destacados en la pantalla principal.

---

### Historia 4: Compartir el hogar (Prioridad: P4)

Lucía vive con Marcos y quieren llevar juntos los gastos de casa. Lucía le envía una
invitación desde la app; Marcos la acepta y, desde su propio móvil o desde el navegador,
ve los mismos movimientos y pagos, apunta los suyos y puede marcar el alquiler como
pagado. En cada movimiento se ve quién lo apuntó.

**Por qué esta prioridad**: la app es para hogares, y en la mayoría viven varias
personas. Depende de la historia 1; las anteriores ya son útiles para una sola persona.

**Prueba independiente**: un propietario invita a otra cuenta, esta acepta y se comprueba
que las dos ven los mismos datos, que lo que apunta una lo ve la otra y que cada rol solo
puede hacer lo que le corresponde.

**Escenarios de aceptación**:

1. **Dado** el propietario de un hogar, **cuando** crea una invitación eligiendo el rol
   (editor o lector), **entonces** obtiene un enlace y un código para compartir, válidos
   durante 7 días.
2. **Dado** una persona con una invitación válida, **cuando** la abre y entra con su cuenta
   (o se registra), **entonces** pasa a ser miembro del hogar con el rol indicado y ve sus
   movimientos, pagos y categorías.
3. **Dado** un hogar con dos miembros, **cuando** uno apunta un gasto, **entonces** el otro
   lo ve al actualizar o volver a abrir la app, con el nombre de quien lo apuntó.
4. **Dado** un vencimiento pendiente, **cuando** un miembro lo marca como pagado,
   **entonces** deja de aparecer como pendiente para todos, y el resto deja de recibir sus
   avisos en cuanto su app se actualiza.
5. **Dado** un miembro con rol lector, **cuando** intenta apuntar, editar o borrar algo,
   **entonces** la app no se lo permite.
6. **Dado** un miembro con rol editor, **cuando** intenta invitar a alguien, cambiar
   roles o cambiar los ajustes del hogar, **entonces** la app no se lo permite.
7. **Dado** el propietario, **cuando** quita a un miembro o le cambia el rol, **entonces** el
   cambio se aplica y, si lo ha quitado, esa persona deja de ver los datos del hogar.
8. **Dado** un miembro que no es propietario, **cuando** decide salir del hogar y lo
   confirma, **entonces** deja de ver sus datos y se le crea un hogar propio vacío.
9. **Dado** una invitación caducada, ya usada o anulada por el propietario, **cuando**
   alguien intenta usarla, **entonces** ve un mensaje claro y no entra en el hogar.
10. **Dado** una persona que ya tiene un hogar propio con datos, **cuando** acepta una
    invitación, **entonces** la app le avisa de que dejará su hogar actual, le ofrece
    exportar sus datos y solo continúa si lo confirma.

---

### Historia 5: Ajustar el hogar y las categorías (Prioridad: P5)

Lucía cobra el día 25, así que quiere que su "mes" vaya del 25 al 24. También quiere una
categoría "Mascotas" que no viene de serie y quitar "Ropa", que no usa.

**Por qué esta prioridad**: hace que los números cuadren con la vida real de cada hogar,
pero la app funciona sin tocarlo.

**Prueba independiente**: se cambia el día de inicio de mes y se comprueba que los
movimientos se reparten en los periodos correctos; se crea, renombra y archiva una
categoría; se exportan los datos y se borra una cuenta.

**Escenarios de aceptación**:

1. **Dado** un hogar con inicio de mes el día 1, **cuando** el propietario lo cambia al 25,
   **entonces** el periodo actual pasa a ser del 25 al 24 del mes siguiente y los
   resúmenes se recalculan para todos los miembros.
2. **Dado** un gasto del 26 de octubre con inicio de mes el día 25, **cuando** el usuario
   consulta los periodos, **entonces** el gasto cuenta en el periodo "25 oct – 24 nov".
3. **Dado** un editor o propietario, **cuando** crea la categoría de gasto "Mascotas" con un
   icono y un color, **entonces** todos los miembros pueden usarla al apuntar gastos.
4. **Dado** una categoría con movimientos, **cuando** se archiva, **entonces** deja de
   ofrecerse al apuntar, pero los movimientos antiguos la conservan y siguen contando en
   los resúmenes.
5. **Dado** un miembro, **cuando** pide exportar los datos, **entonces** obtiene un archivo
   con todos los movimientos, pagos recurrentes y categorías del hogar.
6. **Dado** un usuario, **cuando** pide borrar su cuenta y lo confirma, **entonces** su
   cuenta y sus datos personales se eliminan y ya no puede entrar con ese email y esa
   contraseña.
7. **Dado** el propietario de un hogar con otros miembros, **cuando** pide borrar su
   cuenta, **entonces** la app le pide antes pasar la propiedad a otro miembro.

### Casos límite

- Importe cero, negativo, sin rellenar o con más de dos decimales: se rechaza con un
  mensaje claro antes de guardar.
- Importes grandes (por ejemplo, 250.000 € de una hipoteca): se guardan y se muestran
  sin perder precisión.
- Un gasto apuntado a las 23:50 del último día del mes cuenta en ese mes, también si el
  usuario viaja a otra zona horaria.
- Pagos el día 29, 30 o 31 en febrero y en meses de 30 días; 29 de febrero en años no
  bisiestos.
- Cambio de hora (marzo y octubre): los recordatorios siguen llegando a la hora local
  configurada.
- Movimientos con fecha futura: se permiten y cuentan en su mes, pero no en el mes actual.
- Un mes sin movimientos: el resumen muestra ceros y un mensaje para apuntar el primero.
- Muchos pagos recurrentes a la vez (más de 30): todos los avisos de los próximos días
  llegan, aunque el sistema del móvil limite cuántos se pueden programar.
- Doble toque en "Guardar" o reenvío tras perder la conexión: no se duplica el
  movimiento.
- Sin conexión en Android: se pueden consultar los últimos datos cargados; si se intenta
  guardar, la app avisa de que no hay conexión y no pierde lo escrito.
- Contraseña olvidada: el usuario puede recuperarla por email.
- Vencimiento pasado y no marcado: sigue apareciendo como pendiente (atrasado) hasta que
  se marque como pagado u omitido.
- Dos miembros marcan el mismo vencimiento como pagado casi a la vez: solo se crea un
  gasto, y el segundo ve que ya estaba pagado y por quién.
- Dos miembros editan el mismo movimiento a la vez: se guarda el último cambio, y quien
  edita una versión antigua ve los datos actualizados.
- Un miembro marca un pago como pagado mientras otro está sin conexión: el segundo puede
  recibir todavía el aviso hasta que su app se actualice.
- Un miembro sale del hogar o es quitado: los movimientos que apuntó se conservan en el
  hogar, mostrados como "antiguo miembro".
- El propietario es el único miembro y borra su cuenta: el hogar y todos sus datos se
  borran.
- Una persona intenta aceptar una invitación del hogar al que ya pertenece: la app se lo
  indica y no cambia nada.
- En el navegador, la sesión caduca: se pide iniciar sesión de nuevo sin perder lo que
  estaba escrito.

## Requisitos _(obligatorio)_

### Requisitos funcionales

**Cuenta y hogar**

- **RF-001**: El sistema DEBE permitir registrarse con email y contraseña, iniciar
  sesión, cerrar sesión y recuperar la contraseña por email.
- **RF-002**: Al registrarse, el sistema DEBE crear un hogar del que el usuario es
  propietario, con moneda euro, inicio de mes el día 1 y la zona horaria del dispositivo.
- **RF-003**: El propietario DEBE poder cambiar el día de inicio de mes (del 1 al 28).

**Hogar compartido**

- **RF-004**: El propietario DEBE poder invitar a otras personas al hogar con el rol de
  editor o lector, mediante un enlace o un código que caduca a los 7 días y sirve una sola
  vez.
- **RF-005**: El propietario DEBE poder anular invitaciones pendientes, cambiar el rol de
  un miembro, quitar miembros y pasar la propiedad a otro miembro.
- **RF-006**: Los roles DEBEN limitar lo que cada miembro puede hacer:
  - **Propietario**: todo, incluidos los ajustes del hogar y la gestión de miembros.
  - **Editor**: apuntar, editar y borrar movimientos; gestionar pagos recurrentes,
    vencimientos y categorías.
  - **Lector**: solo consultar.
- **RF-007**: Un miembro que no es propietario DEBE poder salir del hogar; al hacerlo se
  le crea un hogar propio vacío.
- **RF-008**: En el MVP, cada usuario DEBE pertenecer a un solo hogar. Aceptar una
  invitación cuando ya se tiene un hogar con datos DEBE avisar, ofrecer exportarlos y
  pedir confirmación.
- **RF-009**: Cada movimiento DEBE mostrar qué miembro lo apuntó, y cada vencimiento
  pagado, quién lo marcó.
- **RF-010**: Los cambios de un miembro DEBEN verse en los dispositivos del resto al
  actualizar la pantalla o volver a abrir la app.

**Movimientos**

- **RF-011**: Los editores y el propietario DEBEN poder crear, editar y borrar ingresos y
  gastos con importe, fecha, categoría y nota opcional.
- **RF-012**: Apuntar un gasto DEBE poder hacerse en como mucho tres toques desde la
  pantalla principal (importe, categoría, guardar), con la fecha de hoy por defecto.
- **RF-013**: El sistema DEBE rechazar importes vacíos, cero, negativos o con más de dos
  decimales, explicando el motivo.
- **RF-014**: Borrar un movimiento DEBE poder deshacerse inmediatamente después.
- **RF-015**: El sistema NO DEBE duplicar un movimiento si la misma petición se envía dos
  veces, ni crear dos gastos si dos miembros pagan el mismo vencimiento a la vez.

**Resumen del mes**

- **RF-016**: El sistema DEBE mostrar, para el periodo actual, el total de ingresos, el
  total de gastos, el balance y la lista de movimientos ordenada por fecha.
- **RF-017**: El usuario DEBE poder navegar a periodos anteriores y siguientes.
- **RF-018**: Los totales DEBEN ser exactos al céntimo y coincidir con la suma de los
  movimientos mostrados.
- **RF-019**: El periodo de cada movimiento DEBE decidirse por su fecha, el día de inicio
  de mes y la zona horaria del hogar, igual para todos los miembros.

**Categorías**

- **RF-020**: El sistema DEBE ofrecer categorías predefinidas de ingresos (Nómina, Otros
  ingresos) y de gastos (Vivienda, Suministros, Supermercado, Transporte, Salud,
  Educación, Ocio, Ropa, Suscripciones, Seguros, Otros gastos).
- **RF-021**: Los editores y el propietario DEBEN poder crear, renombrar y archivar
  categorías. Archivar no borra ni cambia los movimientos que ya la usan.

**Pagos recurrentes y vencimientos**

- **RF-022**: Los editores y el propietario DEBEN poder crear pagos (y cobros)
  recurrentes con nombre, importe previsto, categoría, frecuencia (semanal, mensual,
  cada N meses o anual), día, fecha de inicio y fecha de fin opcional.
- **RF-023**: El sistema DEBE mostrar una lista de "Próximos pagos" con los vencimientos
  de los próximos 30 días y los atrasados, ordenados por fecha.
- **RF-024**: Los editores y el propietario DEBEN poder marcar un vencimiento como
  pagado, indicando el importe real y la fecha, lo que crea el movimiento
  correspondiente.
- **RF-025**: Los editores y el propietario DEBEN poder marcar un vencimiento como
  omitido.
- **RF-026**: Si el día del pago no existe en un mes, el vencimiento DEBE caer el último
  día de ese mes.
- **RF-027**: Editar un pago recurrente DEBE afectar solo a los vencimientos futuros
  pendientes; desactivarlo o borrarlo DEBE conservar los movimientos ya creados.
- **RF-028**: Ningún movimiento DEBE crearse automáticamente a partir de un pago
  recurrente sin que un miembro lo confirme.

**Recordatorios**

- **RF-029**: En Android, el sistema DEBE avisar de cada vencimiento pendiente con la
  antelación elegida en el pago (0, 1, 3 o 7 días; 1 día por defecto) y el mismo día del
  vencimiento.
- **RF-030**: Los avisos DEBEN llegar a una hora configurable (09:00 por defecto), en la
  hora local del usuario.
- **RF-031**: Cada miembro DEBE poder activar o desactivar los avisos para sí mismo, sin
  afectar a los demás.
- **RF-032**: Los avisos de Android DEBEN llegar aunque el móvil no tenga conexión.
- **RF-033**: El sistema NO DEBE avisar de vencimientos pagados u omitidos que el
  dispositivo ya conozca.
- **RF-034**: Tocar un aviso DEBE abrir la app en el vencimiento correspondiente.
- **RF-035**: Si el usuario no ha dado permiso de notificaciones en Android, el sistema
  DEBE indicarlo de forma visible y explicar cómo activarlo.
- **RF-036**: En el navegador, la pantalla principal DEBE destacar los vencimientos de los
  próximos días y los atrasados. Las notificaciones del navegador quedan fuera del MVP.

**Datos y privacidad**

- **RF-037**: En Android, el usuario DEBE poder consultar sin conexión los últimos datos
  cargados.
- **RF-038**: Cualquier miembro DEBE poder exportar todos los datos del hogar en un
  archivo legible.
- **RF-039**: El usuario DEBE poder borrar su cuenta y sus datos personales tras
  confirmarlo. Si es el propietario y hay otros miembros, DEBE pasar antes la propiedad.
- **RF-040**: Ningún usuario DEBE poder ver ni modificar datos de un hogar del que no es
  miembro, ni hacer lo que su rol no permite.

**Plataformas**

- **RF-041**: El MVP DEBE funcionar en móviles Android y en navegadores actuales de
  escritorio y móvil, con los mismos datos y la misma cuenta. iOS queda fuera del MVP.

### Entidades clave

- **Usuario**: persona con cuenta (email, nombre). Pertenece a un hogar.
- **Hogar**: unidad que comparte la economía. Moneda, día de inicio de mes, zona horaria
  y hora de los avisos. Tiene uno o varios miembros.
- **Miembro**: relación entre un usuario y un hogar, con su rol (propietario, editor o
  lector) y si quiere recibir avisos. Hay exactamente un propietario por hogar.
- **Invitación**: permiso para unirse a un hogar con un rol. Tiene enlace y código,
  caducidad y estado (pendiente, usada, anulada o caducada).
- **Categoría**: clasificación de ingresos o de gastos, con nombre, icono, color y si
  está archivada. Pertenece a un hogar.
- **Movimiento**: ingreso o gasto con importe, fecha, categoría, nota y qué miembro lo
  apuntó. Puede venir de un vencimiento.
- **Pago recurrente**: regla que se repite (nombre, tipo ingreso o gasto, importe
  previsto, categoría, frecuencia, día, inicio, fin, antelación del aviso, activo o no).
- **Vencimiento**: cada aparición concreta de un pago recurrente en una fecha. Pendiente,
  pagado u omitido; si está pagado, enlaza con su movimiento y con quién lo marcó.
- **Periodo**: el "mes" de un hogar, del día de inicio al día anterior del mes siguiente.
  Se calcula, no se guarda.

## Criterios de éxito _(obligatorio)_

### Resultados medibles

- **CE-001**: Un usuario nuevo crea su cuenta y apunta su primer gasto en menos de
  2 minutos.
- **CE-002**: Apuntar un gasto lleva como mucho 3 toques y menos de 10 segundos desde
  abrir la app.
- **CE-003**: El resumen del mes se muestra en menos de 1 segundo con hasta 500
  movimientos en el periodo.
- **CE-004**: El 100 % de los totales coinciden al céntimo con la suma de sus movimientos
  en las pruebas, incluidos los casos límite.
- **CE-005**: El 99 % de los recordatorios llegan en Android dentro de los 5 minutos
  siguientes a la hora configurada, también sin conexión, en dispositivos con los
  permisos concedidos.
- **CE-006**: El 90 % de los usuarios de prueba dan de alta un pago recurrente y lo
  marcan como pagado sin ayuda en su primer intento.
- **CE-007**: Ninguna prueba consigue leer o modificar datos de otro hogar ni hacer algo
  que su rol no permite.
- **CE-008**: Invitar a otra persona y que esta vea los datos del hogar lleva menos de
  2 minutos entre las dos.
- **CE-009**: Un cambio de un miembro es visible para el resto en menos de 5 segundos
  tras actualizar la pantalla.

## Supuestos

- Cada usuario pertenece a un solo hogar en el MVP; pertenecer a varios hogares queda
  para más adelante.
- Los movimientos son del hogar: si un miembro sale, se conservan sin su nombre.
- Los cambios de otros miembros se ven al actualizar o reabrir la app; las
  actualizaciones en tiempo real y los avisos push de cambios de otros miembros quedan
  para más adelante.
- En el navegador no hay notificaciones ni uso sin conexión en el MVP.
- Una sola moneda por hogar, euro por defecto; no hay conversión entre monedas.
- Los importes se introducen a mano; no hay conexión con el banco ni importación de
  extractos en el MVP.
- Inicio de sesión solo con email y contraseña; Google llega más adelante.
- Sin conexión solo se consultan datos; guardar cambios sin conexión y sincronizarlos
  después llega más adelante.
- La interfaz está solo en español en el MVP.
- Presupuestos, gráficas, búsqueda y exportación a CSV con filtros quedan para más adelante;
  el MVP solo incluye la exportación completa de datos que exige el RGPD.
- Los usuarios tienen un móvil Android o un navegador con soporte actual.
