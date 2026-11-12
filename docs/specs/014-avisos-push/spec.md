# Especificación: Avisos push de cambios de otros miembros

**Rama de la funcionalidad**: `014-avisos-push`
**Creada**: 2026-11-10
**Plan**: [`plan.md`](plan.md)
**Estado**: Aprobada
**Entrada**: "Vamos con los avisos push. Deben saltar incluso cuando la app está cerrada.
Podrán desactivarse para cada hogar individualmente." (Pendiente del MVP: «las
actualizaciones en tiempo real y los avisos push de cambios de otros miembros quedan para más
adelante»; la especificación 012 resolvió solo el tiempo real con la app abierta.)

> Esta especificación describe **qué** debe conseguir la funcionalidad y **por qué**. El
> **cómo** va en el plan técnico, que debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md).

## Aclaraciones

### Sesión 2026-11-10

- P: ¿Con la app cerrada? → R: Sí: el aviso llega con la app cerrada, en segundo plano o
  abierta.
- P: ¿Qué cambios avisan? → R: Los que mueven dinero: un movimiento nuevo (gasto o ingreso), un
  pago recurrente marcado como pagado y una aportación o retirada de una hucha. Las ediciones,
  los borrados, los presupuestos, las categorías, los ajustes y los miembros no avisan.
- P: ¿Qué dice el aviso? → R: El hogar, quién, qué y el importe: «Casa · Ana ha apuntado
  85,00 € en Supermercado». Se acepta que el texto pase por el servicio de envío de avisos de
  Expo (fuera de la UE); la política de privacidad debe decirlo.
- P: ¿En qué plataformas? → R: Solo en Android. En el navegador no hay notificaciones
  (constitución); allí ya está el tiempo real con la pestaña abierta.
- P: ¿Muchos cambios seguidos? → R: Se agrupan: un solo aviso por persona y hogar en una
  ventana corta («Ana ha apuntado 20 movimientos en Casa»).
- P: ¿Cómo se desactivan? → R: Cada persona, para cada uno de sus hogares por separado.
- P: ¿Dónde se explica que el texto pasa por Expo, si no hay política de privacidad? → R: En
  una nota junto al interruptor de los avisos. Escribir la política queda fuera.

## Escenarios de usuario y pruebas _(obligatorio)_

### Historia 1: Enterarse de lo que apunta otro miembro (Prioridad: P1) 🎯

Lucía y Juan comparten el hogar «Casa». Lucía tiene el móvil en el bolsillo con la app
cerrada. Juan apunta en el navegador 45,30 € de Supermercado. A Lucía le llega una
notificación: «Casa · Juan ha apuntado 45,30 € en Supermercado». La toca y la app se abre en
ese hogar, en el mes del movimiento.

**Por qué esta prioridad**: es la funcionalidad entera; sin ella, Lucía solo se entera al
abrir la app.

**Prueba independiente**: con dos cuentas del mismo hogar, una en un Android con la app
cerrada, cada cambio de los tipos que avisan hecho desde la otra produce una notificación en
el Android en pocos segundos.

**Escenarios de aceptación**:

1. **Dado** dos miembros de un hogar y uno con la app cerrada en Android, **cuando** el otro
   apunta un gasto o un ingreso, **entonces** al primero le llega una notificación con el
   nombre del hogar, quién lo ha apuntado, el importe y la categoría.
2. **Dado** lo mismo, **cuando** el otro marca un pago recurrente como pagado, **entonces**
   llega «Casa · Juan ha pagado Alquiler (750,00 €)».
3. **Dado** lo mismo, **cuando** el otro aporta o saca dinero de una hucha, **entonces** llega
   «Casa · Juan ha aportado 50,00 € a Vacaciones» (o «ha sacado»).
4. **Dado** la app en segundo plano o abierta, **cuando** ocurre uno de esos cambios,
   **entonces** también llega la notificación (con la app abierta, además, los datos se
   actualizan solos como en la especificación 012).
5. **Dado** una notificación, **cuando** se toca, **entonces** la app se abre con ese hogar
   elegido y en la pantalla donde se ve el cambio (el mes del movimiento, el pago o la hucha).
   Si el elemento ya no existe, se abre en «Mes» de ese hogar sin errores.
6. **Dado** un cambio hecho por uno mismo, **cuando** se guarda, **entonces** no le llega
   aviso, tampoco a sus otros dispositivos.
7. **Dado** que se edita, se borra un movimiento u otro tipo de cambio (presupuesto,
   categoría, ajustes, miembros), **cuando** se guarda, **entonces** no se avisa a nadie.

---

### Historia 2: Desactivar los avisos de un hogar (Prioridad: P2)

Lucía pertenece a «Casa» y a «Piso de la playa». Los gastos de la playa no le interesan al
momento, así que apaga los avisos de ese hogar y deja los de «Casa».

**Por qué esta prioridad**: sin control, quien está en varios hogares acabaría desactivando
todas las notificaciones de la app en Android.

**Prueba independiente**: con los avisos de un hogar desactivados, los cambios de ese hogar no
producen notificación y los de otro hogar sí.

**Escenarios de aceptación**:

1. **Dado** un miembro de dos hogares, **cuando** desactiva los avisos de uno en los ajustes
   de ese hogar, **entonces** deja de recibir avisos de ese hogar y sigue recibiendo los del
   otro.
2. **Dado** los avisos desactivados, **cuando** los vuelve a activar, **entonces** recibe los
   cambios que pasen desde ese momento (no los de mientras estaban apagados).
3. **Dado** una persona con dos móviles, **cuando** desactiva los avisos de un hogar en uno,
   **entonces** también dejan de llegar al otro: la preferencia es de la persona en ese hogar,
   no del dispositivo.
4. **Dado** un hogar al que alguien se une (crear o aceptar invitación), **cuando** entra,
   **entonces** los avisos de ese hogar están activados.
5. **Dado** que estos avisos y los recordatorios de pagos (MVP) son cosas distintas, **cuando**
   se desactiva uno, **entonces** el otro no cambia.
6. **Dado** el navegador, **cuando** se abren los ajustes del hogar, **entonces** se ve y se
   puede cambiar la preferencia (vale para los Android de esa persona), con una nota de que los
   avisos solo llegan en la app de Android.

---

### Historia 3: Permisos y dispositivos (Prioridad: P3)

Lucía instala la app en un móvil nuevo. Al entrar, la app pide permiso para notificaciones;
si lo deniega, se le explica que no recibirá avisos ni recordatorios y cómo activarlos.

**Por qué esta prioridad**: sin permiso o sin dispositivo registrado, los avisos fallarían en
silencio, cosa que la constitución prohíbe.

**Prueba independiente**: con el permiso denegado, la app lo muestra; al concederlo, los avisos
empiezan a llegar sin reinstalar.

**Escenarios de aceptación**:

1. **Dado** un Android sin permiso de notificaciones, **cuando** se abre la app, **entonces**
   se avisa de que no llegarán avisos ni recordatorios y de cómo activarlos (el mismo aviso que
   ya existe para los recordatorios).
2. **Dado** que se concede el permiso después, **cuando** se vuelve a la app, **entonces** el
   dispositivo empieza a recibir avisos.
3. **Dado** que se cierra sesión en un móvil, **cuando** otro miembro apunta algo, **entonces**
   a ese móvil no le llega nada.
4. **Dado** que alguien sale de un hogar o lo quitan, **cuando** se apunta algo en ese hogar,
   **entonces** ya no le llega aviso.
5. **Dado** que se desinstala la app o se cambia de móvil, **cuando** se apunta algo,
   **entonces** el móvil viejo deja de figurar como destino en cuanto el servicio de envío lo
   indique, sin que falle el envío a los demás.
6. **Dado** Android, **cuando** se miran los ajustes de notificaciones de la app en el sistema,
   **entonces** los avisos de otros miembros aparecen como una categoría separada de los
   recordatorios de pagos, para poder silenciarlos por separado también desde ahí.

### Casos límite

- Agrupación: varios cambios del mismo miembro en el mismo hogar casi a la vez (por ejemplo, 20
  movimientos de la bandeja sin conexión, especificación 011) dan un solo aviso, «Casa · Juan
  ha apuntado 20 movimientos». Cambios de dos miembros distintos dan avisos distintos.
- Un movimiento apuntado sin conexión avisa cuando llega al servidor, no cuando se apuntó.
  Reintentarlo (el envío es idempotente) no avisa dos veces.
- Movimientos con fecha futura o pasada avisan igual; el aviso dice el importe y la
  categoría, no la fecha.
- Un pago marcado como pagado y luego desmarcado: se avisó al marcarlo y no se avisa al
  desmarcarlo.
- Miembros con rol de solo lectura reciben avisos igual que el resto.
- Quien ha sido quitado del hogar justo antes del cambio no lo recibe; quien entra justo
  después no recibe los cambios anteriores.
- Si el servicio de envío falla o está caído, guardar el movimiento no falla ni tarda más: el
  aviso se pierde o se reintenta, pero el cambio queda guardado.
- Nombre del miembro: el que tiene en el hogar. Si el miembro ya no existe al enviar, el aviso
  sale sin nombre («Casa · Se ha apuntado…»).
- Importes en la moneda del hogar y con el formato español (`1.234,56 €`), igual que en la
  app.
- Movimiento sin categoría (si el modelo lo permite): «… ha apuntado 12,00 €».
- Privacidad: el texto del aviso pasa por el servicio de envío de Expo (fuera de la UE). Nada
  más (notas, descripciones, saldos) se envía. Borrar la cuenta borra sus dispositivos
  registrados; la exportación de datos (RGPD) incluye la preferencia de avisos por hogar.
- Una persona con 5 hogares y 3 móviles recibe en los 3 los avisos de los hogares que tenga
  activados.

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-1401**: Cuando un miembro apunta un movimiento nuevo, marca un pago recurrente como
  pagado o aporta o saca dinero de una hucha, el resto de miembros del hogar con los avisos
  activados DEBEN recibir una notificación en sus Android, con la app abierta, en segundo
  plano o cerrada.
- **RF-1402**: La notificación DEBE decir el hogar, quién hizo el cambio, qué hizo, el importe
  y la categoría, el pago o la hucha. NO DEBE llevar notas, descripciones ni saldos.
- **RF-1403**: Quien hace el cambio NO DEBE recibir aviso de él en ninguno de sus
  dispositivos.
- **RF-1404**: Editar, borrar y el resto de cambios del hogar (presupuestos, categorías,
  ajustes, miembros) NO DEBEN avisar.
- **RF-1405**: Varios cambios del mismo miembro en el mismo hogar en una ventana corta DEBEN
  agruparse en un solo aviso.
- **RF-1406**: Tocar el aviso DEBE abrir la app con ese hogar elegido y en la pantalla del
  cambio, o en «Mes» si ya no existe.
- **RF-1407**: Cada persona DEBE poder activar o desactivar los avisos de cada uno de sus
  hogares por separado, desde los ajustes de ese hogar, en Android y en el navegador. La
  preferencia vale para todos sus dispositivos y está activada al entrar en un hogar.
- **RF-1408**: Los avisos y los recordatorios de pagos DEBEN poder desactivarse por separado,
  también desde los ajustes de notificaciones del sistema (categorías distintas).
- **RF-1409**: Solo DEBEN recibir avisos los miembros actuales del hogar, en dispositivos con
  sesión abierta. Cerrar sesión, salir del hogar o ser quitado DEBE cortar los avisos.
- **RF-1410**: Si falta el permiso de notificaciones, la app DEBE avisar al usuario
  (constitución); NUNCA falla en silencio.
- **RF-1411**: Un fallo o retraso del servicio de envío NO DEBE hacer fallar ni ralentizar el
  guardado del cambio.
- **RF-1412**: Solo en Android; en el navegador no hay notificaciones.
- **RF-1413**: Junto al interruptor de los avisos DEBE explicarse que su texto pasa por el
  servicio de envío de Expo.

### Entidades clave

- **Dispositivo de avisos**: un Android con sesión abierta de una persona, al que se pueden
  enviar avisos. Se da de alta al entrar con permiso y de baja al cerrar sesión o cuando el
  servicio de envío dice que ya no existe.
- **Preferencia de avisos**: por persona y hogar, activada o no.

## Criterios de éxito _(obligatorio)_

- **CE-1401**: En una prueba con dos miembros, el 95 % de los avisos llegan al Android con la
  app cerrada en menos de 10 s desde que se guarda el cambio.
- **CE-1402**: Con los avisos de un hogar desactivados, ningún cambio de ese hogar produce
  notificación en ninguno de los dispositivos de esa persona, y los de su otro hogar sí.
- **CE-1403**: Quien hace el cambio, un miembro de otro hogar, quien ha salido del hogar y un
  móvil con la sesión cerrada no reciben ningún aviso.
- **CE-1404**: 20 movimientos del mismo miembro enviados de golpe producen 1 aviso (como mucho
  2 si caen en el borde de la ventana).
- **CE-1405**: Con el servicio de envío caído, guardar un movimiento tarda lo mismo que sin
  avisos y no da error.
- **CE-1406**: Tocar un aviso abre el hogar y la pantalla correctos en el 100 % de las pruebas,
  también cuando estaba elegido otro hogar.

## Supuestos

- Usa Expo Push, que ya está en el stack de la constitución; no hace falta otro servicio.
- La agrupación puede retrasar un poco el aviso (unos segundos) a cambio de no saturar.
- Los avisos que no se puedan entregar (móvil apagado mucho tiempo) los gestiona el sistema;
  no hay historial de avisos en la app.
- iOS sigue fuera de alcance, como en el MVP.
- La preferencia de avisos es nueva e independiente de la de recordatorios (`reminders_enabled`
  del MVP).
