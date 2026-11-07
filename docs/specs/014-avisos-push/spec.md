# Especificación: Avisos push de cambios de otros miembros

**Rama de la funcionalidad**: `014-avisos-push`
**Creada**: 2026-11-07
**Plan**: [`plan.md`](plan.md)
**Estado**: Borrador
**Entrada**: "Vamos con los avisos push." (Pendiente del MVP: «las actualizaciones en tiempo real y
los avisos push de cambios de otros miembros quedan para más adelante»; el tiempo real se hizo en
la especificación 012.)

> Esta especificación describe **qué** debe conseguir la funcionalidad y **por qué**. El
> **cómo** va en el plan técnico, que debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md).

## Aclaraciones

### Sesión 2026-11-07

- P: ¿De qué cambios de otros miembros llega un aviso con la app cerrada? → R: Movimientos
  nuevos, pagos recurrentes marcados como pagados u omitidos, cambios de miembros (alguien entra
  o sale, o te cambian el rol) y presupuesto superado.
- P: ¿Qué muestra el aviso? → R: Sin importe ni nota, por ejemplo «Juan apuntó un gasto en
  Supermercado». Así no se ven cifras en la pantalla de bloqueo ni pasan por los servicios que
  entregan los avisos, como ya se decidió para los recordatorios (especificación 001,
  auditoría del 29 de octubre de 2026). El importe se ve al abrir la app.
- P: ¿Y si alguien apunta muchas cosas seguidas? → R: Se agrupan: si llegan varios cambios en
  pocos minutos, un solo aviso («Juan apuntó 5 movimientos»).
- P: ¿En qué plataformas? → R: Solo Android, como los recordatorios. En el navegador no hay
  avisos push.
- P: ¿Qué puede ajustar cada persona? → R: Un interruptor general, qué tipos de aviso quiere,
  de qué hogares y unas horas de silencio.
- P: ¿Cómo empiezan? → R: Activados, los cuatro tipos, de todos sus hogares y sin horas de
  silencio. El permiso de notificaciones se pide la primera vez, como con los recordatorios.
- P: ¿Quién crea las cuentas necesarias (Expo y Firebase)? → R: El propietario del proyecto,
  siguiendo los pasos del README; las claves van como secretos, nunca en el repositorio ni en
  el chat.

## Escenarios de usuario y pruebas _(obligatorio)_

### Historia 1: Enterarse de lo que apuntan los demás sin abrir la app (Prioridad: P1) 🎯

Lucía tiene el móvil en el bolsillo con la app cerrada. Juan apunta en el súper un gasto de
Supermercado. A Lucía le llega un aviso: «Juan apuntó un gasto en Supermercado». Lo toca y se
abre «Mes» de ese hogar, donde ve el importe.

**Por qué esta prioridad**: es la funcionalidad entera.

**Prueba independiente**: con dos miembros, uno con la app cerrada, cada tipo de cambio del otro
le hace llegar un aviso con el texto esperado, sin importes, y tocarlo abre el hogar correcto.

**Escenarios de aceptación**:

1. **Dado** dos miembros de un hogar y uno con la app cerrada o en segundo plano, **cuando** el
   otro apunta un movimiento, **entonces** le llega «Juan apuntó un gasto en Supermercado» (o
   «un ingreso en Nómina»), sin importe ni nota.
2. **Dado** lo mismo, **cuando** el otro marca un pago recurrente como pagado u omitido,
   **entonces** le llega «Juan marcó Alquiler como pagado» (u «omitido»).
3. **Dado** lo mismo, **cuando** alguien entra o sale del hogar, o le cambian el rol a quien
   recibe, **entonces** le llega «Marta se ha unido a Casa», «Marta ha salido de Casa» o «Ahora
   eres lector en Casa».
4. **Dado** un presupuesto en una categoría, **cuando** un gasto de otro miembro hace que el mes
   pase de ese presupuesto, **entonces** le llega «Supermercado ha pasado del presupuesto del
   mes», una vez por categoría y mes.
5. **Dado** varios cambios del mismo miembro en el mismo hogar en pocos minutos, **cuando** se
   envían, **entonces** llega un solo aviso que los resume («Juan apuntó 5 movimientos»).
6. **Dado** un aviso, **cuando** se toca, **entonces** se abre la app en el hogar del aviso, en
   la pantalla que corresponde («Mes», los pagos o los miembros).
7. **Dado** varios hogares, **cuando** llega un aviso, **entonces** dice de qué hogar es.
8. **Dado** un cambio propio, **cuando** se guarda, **entonces** no le llega aviso a quien lo
   hizo, tampoco en sus otros dispositivos.
9. **Dado** la app abierta y a la vista, **cuando** otro cambia algo, **entonces** no salta un
   aviso: ya se ve en la pantalla (especificación 012).

---

### Historia 2: Elegir qué avisos llegan (Prioridad: P2)

Juan no quiere avisos de noche ni de cada gasto del piso compartido. En «Ajustes» deja solo los
avisos de su casa, quita los de presupuesto y pone silencio de 22:00 a 8:00. Lo que pasa de noche
le llega agrupado por la mañana.

**Por qué esta prioridad**: sin poder ajustarlos, quien comparte hogares activos los acabaría
desactivando del todo en el sistema, y también perdería los recordatorios de pagos.

**Prueba independiente**: con cada ajuste cambiado, llegan solo los avisos que corresponden.

**Escenarios de aceptación**:

1. **Dado** «Ajustes», **cuando** se abre, **entonces** hay un interruptor general «Avisos de
   cambios de otros», uno por cada tipo, uno por cada hogar y las horas de silencio.
2. **Dado** el interruptor general apagado, **cuando** otros cambian algo, **entonces** no llega
   ningún aviso push (los recordatorios de pagos siguen, son aparte).
3. **Dado** un tipo o un hogar desactivado, **cuando** hay un cambio de ese tipo o de ese hogar,
   **entonces** no llega aviso; de los demás, sí.
4. **Dado** horas de silencio de 22:00 a 8:00, **cuando** hay cambios en esas horas, **entonces**
   no se avisa en ese momento; a las 8:00 llega un aviso por hogar que los resume.
5. **Dado** que se cambian los ajustes en un dispositivo, **cuando** se mira en otro de la misma
   persona, **entonces** son los mismos (son de la cuenta).
6. **Dado** el permiso de notificaciones denegado en Android, **cuando** se abre «Ajustes»,
   **entonces** se avisa de que faltan permisos y cómo darlos, como con los recordatorios.

### Casos límite

- Privacidad: los avisos no llevan importes, notas ni emails; solo el nombre de quien hizo el
  cambio, la categoría, el nombre del pago o del hogar. A cada uno solo le llegan avisos de sus
  hogares.
- Quien sale o es quitado de un hogar deja de recibir sus avisos en ese momento; el aviso de que
  ha salido les llega a los demás.
- Cerrar sesión o borrar la cuenta en un dispositivo hace que ese dispositivo deje de recibir
  avisos de esa cuenta.
- Varios dispositivos de la misma persona: los avisos llegan a todos; ninguno recibe los de sus
  propios cambios.
- Muchos cambios a la vez (por ejemplo, 20 movimientos sin conexión enviados de golpe,
  especificación 011): llega un aviso agrupado, no 20.
- Editar o borrar un movimiento no avisa (solo los nuevos). Restaurar uno borrado tampoco.
- Presupuesto superado: solo una vez por categoría y periodo, aunque luego se siga gastando; si
  un borrado lo deja por debajo y otro gasto lo vuelve a pasar, no se repite ese mes.
- Si el servicio de avisos no está configurado (sin cuentas) o falla, la app y el servidor
  funcionan igual; solo no llegan avisos push.
- Un dispositivo cuyo token deja de valer (desinstalada la app) deja de recibir intentos.
- Horas de silencio que cruzan la medianoche (22:00–8:00) y las que no (14:00–16:00); en la hora
  de la zona del hogar del aviso.

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-1401**: Con la app cerrada o en segundo plano, en Android DEBE llegar un aviso cuando otro
  miembro de uno de sus hogares apunta un movimiento, marca un pago como pagado u omitido, entra
  o sale del hogar, le cambia el rol a quien lo recibe, o hace que un gasto pase del presupuesto
  de una categoría ese mes.
- **RF-1402**: Los avisos NO DEBEN llevar importes, notas ni emails.
- **RF-1403**: Los cambios del mismo miembro en el mismo hogar en pocos minutos DEBEN llegar
  agrupados en un solo aviso.
- **RF-1404**: Nadie DEBE recibir avisos de sus propios cambios ni de hogares de los que no es
  miembro.
- **RF-1405**: Tocar un aviso DEBE abrir la app en el hogar del aviso y la pantalla que
  corresponde.
- **RF-1406**: Cada persona DEBE poder activar o desactivar los avisos, cada tipo, cada hogar y
  unas horas de silencio; los ajustes son de la cuenta. Empiezan activados, todos los tipos y
  hogares, sin silencio.
- **RF-1407**: Lo que pasa en horas de silencio DEBE llegar agrupado al terminar.
- **RF-1408**: Sin servicio de avisos configurado o si falla, todo lo demás DEBE funcionar igual.
- **RF-1409**: Cerrar sesión o borrar la cuenta DEBE dejar al dispositivo sin avisos de esa
  cuenta.
- **RF-1410**: En el navegador no hay avisos push.
- **RF-1411**: Todo DEBE cumplir WCAG 2.1 AA y el estilo de la especificación 006.

## Criterios de éxito _(obligatorio)_

- **CE-1401**: En una prueba con el servicio de avisos simulado, cada uno de los cuatro tipos de
  cambio genera el aviso esperado para los demás miembros, ninguno para quien lo hizo, y ninguno
  lleva importes ni notas.
- **CE-1402**: 20 movimientos del mismo miembro en un minuto generan como mucho 2 avisos por
  destinatario.
- **CE-1403**: Cada ajuste (general, tipo, hogar, silencio) filtra los avisos como se espera,
  comprobado con el servicio simulado.
- **CE-1404**: En un Android real, con las cuentas configuradas, un movimiento de otro miembro
  hace llegar el aviso con la app cerrada en menos de 1 minuto (más lo que se agrupe).
- **CE-1405**: Las rutas no empeoran de forma apreciable por enviar avisos (se envían fuera de la
  petición), y axe-core no encuentra problemas en los ajustes nuevos a 320 y 1280 px.

## Supuestos

- Los avisos se entregan a través de Expo Push y Firebase Cloud Messaging (constitución, art.
  I). El propietario crea las cuentas; sin ellas, CE-1404 no se puede comprobar.
- «Pocos minutos» para agrupar se fija en el plan.
- Los avisos push son de la app nativa (constitución, art. IX); los recordatorios de pagos siguen
  siendo locales y no cambian.
