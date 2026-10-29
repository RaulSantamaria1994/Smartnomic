# Especificación: Calendario de pagos programados

**Rama de la funcionalidad**: `002-calendario`
**Creada**: 2026-10-29
**Estado**: Borrador
**Plan**: pendiente (`plan.md`, cuando se apruebe esta especificación)
**Entrada**: "Vamos a implementar la opción de ver los pagos programados en un calendario."

> Esta especificación describe **qué** debe hacer la funcionalidad y **por qué**, desde el
> punto de vista de quien la usa. El **cómo** va en el plan técnico, que debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). Parte del MVP
> ([`001-mvp-hogar`](../001-mvp-hogar/spec.md)): pagos recurrentes, vencimientos, roles.

## Aclaraciones

### Sesión 2026-10-29

- P: ¿Qué se muestra en el calendario? → [NECESITA ACLARACIÓN: propuesta: solo los
  vencimientos de los pagos y cobros recurrentes (pendientes, atrasados, pagados y
  omitidos); los movimientos puntuales siguen en la pantalla «Mes».]
- P: ¿El calendario va por mes natural (del 1 al último día) o por el periodo del hogar
  (por ejemplo, del 25 al 24)? → [NECESITA ACLARACIÓN: propuesta: mes natural, que es lo
  que se espera de un calendario.]
- P: ¿Hasta dónde se puede navegar? → [NECESITA ACLARACIÓN: propuesta: hasta 12 meses
  hacia delante y, hacia atrás, hasta el mes del pago recurrente más antiguo.]

## Escenarios de usuario y pruebas _(obligatorio)_

Las historias están ordenadas por prioridad. Cada una se puede desarrollar, probar y
enseñar por separado.

### Historia 1: Ver los pagos del mes en un calendario (Prioridad: P1)

Lucía tiene dados de alta el alquiler (día 1), la luz (día 15), el gimnasio (cada lunes) y
la nómina (día 28). Quiere ver de un vistazo en qué días del mes le toca pagar o cobrar,
para saber qué semanas van a ser más justas.

**Por qué esta prioridad**: es la funcionalidad en sí. La lista de "Próximos pagos" solo
enseña 30 días y en orden; el calendario enseña el mes entero por días.

**Prueba independiente**: con varios pagos recurrentes de distintas frecuencias, se abre
el calendario y se comprueba que cada vencimiento aparece en su día, con su estado, y que
al tocar un día se ven sus pagos.

**Escenarios de aceptación**:

1. **Dado** un hogar con pagos recurrentes, **cuando** un miembro abre el calendario,
   **entonces** ve el mes actual con los días de la semana (empezando en lunes), el día
   de hoy destacado y una marca en cada día que tiene vencimientos.
2. **Dado** un día con vencimientos, **cuando** el miembro lo toca, **entonces** ve la
   lista de pagos y cobros de ese día con su nombre, importe, categoría y estado
   (pendiente, atrasado, pagado u omitido).
3. **Dado** el calendario de un mes, **cuando** el miembro pasa al mes siguiente o al
   anterior, **entonces** ve los vencimientos de ese mes, también los de pagos semanales,
   cada N meses o anuales.
4. **Dado** un pago el día 31, **cuando** se ve un mes de 30 días o febrero, **entonces**
   el vencimiento aparece el último día de ese mes (RF-026 del MVP).
5. **Dado** un vencimiento ya pagado, **cuando** se ve en el calendario, **entonces**
   aparece como pagado con el importe real, no con el previsto.
6. **Dado** un mes, **cuando** el miembro abre el calendario, **entonces** ve el total
   previsto de pagos y de cobros de ese mes y cuánto queda pendiente.

---

### Historia 2: Pagar u omitir desde el calendario (Prioridad: P2)

Al ver que la luz vence mañana, Lucía la paga desde el mismo calendario sin tener que
buscarla en otra pantalla.

**Por qué esta prioridad**: ahorra pasos, pero el calendario ya es útil solo para mirar.

**Prueba independiente**: desde el calendario se paga un vencimiento y se omite otro, y se
comprueba que cambian de estado en el calendario, en "Próximos pagos" y en el mes.

**Escenarios de aceptación**:

1. **Dado** un editor o el propietario, **cuando** toca un vencimiento pendiente o
   atrasado del calendario, **entonces** puede pagarlo (con importe y fecha reales) u
   omitirlo, igual que desde "Próximos pagos".
2. **Dado** un lector, **cuando** toca un vencimiento, **entonces** ve su detalle pero no
   puede pagarlo ni omitirlo.
3. **Dado** un vencimiento que otro miembro acaba de pagar, **cuando** alguien intenta
   pagarlo desde el calendario, **entonces** ve quién lo pagó y no se crea un segundo
   movimiento (RF-015 del MVP).

---

### Casos límite

- Un mes sin vencimientos: el calendario se ve igual, con un mensaje que invita a dar de
  alta un pago recurrente.
- Un día con muchos vencimientos (por ejemplo, 6 el día 1): la marca del día lo indica sin
  romper la cuadrícula, y la lista del día los enseña todos.
- Pagos con fecha de fin o desactivados: no aparecen después de su fin; los vencimientos
  ya pagados u omitidos sí se siguen viendo.
- Un pago editado (RF-027 del MVP): los vencimientos futuros reflejan el cambio y los ya
  resueltos conservan sus datos.
- Cambio de mes y de año (diciembre → enero) y años bisiestos (29 de febrero).
- "Hoy" se calcula en la zona horaria del hogar, como en el resto de la app.
- Pantallas estrechas (móvil de 360 px de ancho) y texto grande: la cuadrícula sigue
  siendo legible y cada día se puede tocar.
- Sin conexión en Android: se ven los últimos datos cargados del calendario.

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-101**: Todos los miembros DEBEN poder abrir el calendario desde la pantalla
  principal.
- **RF-102**: El calendario DEBE mostrar un mes con las semanas empezando en lunes, el día
  de hoy destacado y una marca en cada día con vencimientos que distinga si hay alguno
  atrasado, pendiente o solo resueltos.
- **RF-103**: El calendario DEBE mostrar los vencimientos de todos los pagos y cobros
  recurrentes del hogar en ese mes, con su estado: pendiente, atrasado, pagado u omitido.
- **RF-104**: Tocar un día DEBE mostrar sus vencimientos con nombre, importe (real si está
  pagado, previsto si no), categoría y estado.
- **RF-105**: El miembro DEBE poder pasar al mes anterior y al siguiente, dentro de los
  límites acordados, y volver al mes actual con un toque.
- **RF-106**: El calendario DEBE mostrar, para el mes visible, el total previsto de pagos,
  el de cobros y lo que queda pendiente de pagar.
- **RF-107**: Los editores y el propietario DEBEN poder pagar u omitir un vencimiento
  pendiente o atrasado desde el calendario; los lectores solo pueden verlo.
- **RF-108**: El calendario DEBE ser accesible: cada día se anuncia con su fecha y cuántos
  vencimientos tiene, y se puede usar con lector de pantalla y con texto grande.
- **RF-109**: El calendario DEBE funcionar igual en Android y en el navegador.

### Entidades clave

- **Vencimiento**: el del MVP (un pago recurrente en una fecha), con su estado. El
  calendario no crea entidades nuevas.

## Criterios de éxito _(obligatorio)_

### Resultados medibles

- **CE-101**: El calendario de un mes se muestra en menos de 1 segundo con 50 pagos
  recurrentes en el hogar.
- **CE-102**: El 100 % de los vencimientos de las pruebas aparecen en el mismo día en el
  calendario que en "Próximos pagos" y en los recordatorios.
- **CE-103**: Pagar un vencimiento desde el calendario lleva como mucho 3 toques desde
  abrirlo.
- **CE-104**: La pantalla no tiene problemas de accesibilidad (WCAG 2.1 AA) en las
  comprobaciones automáticas.

## Supuestos

- Los vencimientos se calculan con las mismas reglas que "Próximos pagos" y los
  recordatorios, para que nunca discrepen.
- No hace falta sincronizar con calendarios externos (Google Calendar, etc.); queda fuera
  de esta funcionalidad.
- Los movimientos puntuales no se muestran en el calendario salvo que se decida lo
  contrario en las aclaraciones.
