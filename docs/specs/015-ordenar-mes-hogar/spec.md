# Especificación: Ordenar «Mes» y «Hogar»

**Rama de la funcionalidad**: `015-ordenar-mes-hogar`
**Creada**: 2026-11-12
**Plan**: [`plan.md`](plan.md)
**Estado**: Aprobada
**Entrada**: Revisión visual de toda la app (2026-11-12), prioridad 2: «Mes apila cinco
bloques y los movimientos quedan al final de un scroll largo» y «Hogar mezcla navegación y
acciones de cuenta: borrar la cuenta, con su campo de contraseña, queda a un scroll de cerrar
sesión».

> Esta especificación describe **qué** debe conseguir el cambio y **por qué**. El **cómo**
> va en el plan técnico, que debe cumplir [`docs/CONSTITUTION.md`](../../CONSTITUTION.md).
> No cambia lo que la app hace ni sus datos: cambia cómo se ordena y qué se enseña de entrada
> en dos pantallas. Sigue las reglas visuales de la
> [006](../006-estilo-android/spec.md) (listas con separadores, sin tarjetas ni pastillas).
>
> **Depende de [`014-avisos-push`](../014-avisos-push/spec.md)**, que añade a «Hogar» el
> interruptor de avisos por hogar y su nota sobre Expo. Esta funcionalidad se implementa
> después y conserva esa sección tal como la deje la 014.

## Aclaraciones

### Sesión 2026-11-12

- P: ¿Qué se arregla? → R: Solo la prioridad 2 de la revisión: «Mes» y «Hogar». Quedan fuera
  el título descentrado de «Mes», la fecha repetida del formulario de movimientos y el modo
  oscuro.
- P: ¿Cambia algo de lo que hace la app? → R: No. Las mismas cosas, en el mismo sitio de
  acceso, con otro reparto en pantalla.

- P: ¿Se mantiene el orden de «Mes» (resumen, presupuestos, próximos pagos, huchas,
  movimientos)? → R: Sí, se mantiene (es el de las especificaciones 003 y 007); la altura se
  gana con los límites de abajo.
- P: ¿Los límites son 3 presupuestos y 5 próximos pagos (las huchas ya enseñan 3)? → R: Sí,
  con los atrasados siempre delante y siempre a la vista.
- P: En «Hogar», ¿«Cerrar sesión» se queda en la pestaña o pasa a la pantalla nueva? → R: Se
  queda en la pestaña (se usa a menudo y no es destructiva); solo «Borrar cuenta» se aparta.

## Escenarios de usuario y pruebas _(obligatorio)_

### Historia 1: «Mes» llega antes a los movimientos (Prioridad: P1) 🎯

Lucía abre «Mes» para ver qué ha gastado y apuntar algo. Hoy, entre el resumen y la lista de
movimientos tiene que pasar cuatro bloques, aunque algunos estén vacíos o solo digan «Empieza
tu primer presupuesto».

**Por qué esta prioridad**: «Mes» es la pantalla que más se abre, y lo que más se consulta en
ella es la lista de movimientos, que es lo que queda más abajo.

**Prueba independiente**: se abre «Mes» a 390 × 844 px con un hogar nuevo y con un hogar
completo (6 presupuestos, 8 próximos pagos, 3 huchas) y se mide dónde empieza «Movimientos».

**Escenarios de aceptación**:

1. **Dado** un hogar sin presupuestos, sin pagos recurrentes y sin huchas, **cuando** se abre
   «Mes», **entonces** cada uno de esos tres bloques ocupa una sola fila (su título y su
   invitación a empezar, con la acción que ya tiene), sin el icono grande ni los márgenes
   amplios del estado vacío de hoy, y la lista de movimientos (o su mensaje de «aún no hay
   movimientos») empieza a la vista sin desplazarse.
2. **Dado** un hogar con más de 3 presupuestos, **cuando** se abre «Mes», **entonces** se ven
   los 3 más gastados (el orden de hoy) y debajo «Ver todos», que abre la pantalla de
   presupuestos.
3. **Dado** un hogar con más de 5 próximos pagos (vencimientos y aportaciones a huchas),
   **cuando** se abre «Mes», **entonces** se ven 5, con los atrasados siempre delante, y debajo
   «Ver todos», que abre «Pagos».
4. **Dado** más de 5 pagos atrasados, **cuando** se abre «Mes», **entonces** se ven todos los
   atrasados (nunca se esconde uno) y no se muestran pagos al día hasta «Ver todos».
5. **Dado** un bloque con 3 filas o menos, **cuando** se abre «Mes», **entonces** no aparece
   «Ver todos».
6. **Dado** cualquier hogar, **cuando** se abre «Mes», **entonces** el resumen, el cambio de
   mes, el botón «+», tirar para recargar y los avisos de arriba funcionan como hasta ahora.
7. **Dado** quien solo puede leer, **cuando** se abre «Mes», **entonces** los bloques vacíos que
   hoy no se le muestran siguen sin mostrarse.

---

### Historia 2: «Hogar» deja aparte lo irreversible (Prioridad: P1)

Lucía entra en «Hogar» a cambiar la hora de los avisos y, unas pantallas más abajo, encuentra
el campo de contraseña y el botón rojo de borrar su cuenta, pegados a «Cerrar sesión». Un
toque equivocado en esa zona es un daño grande.

**Por qué esta prioridad**: borrar la cuenta no se puede deshacer y hoy está al mismo nivel y a
la misma distancia que acciones inocuas.

**Prueba independiente**: se abre «Hogar», se recorre hasta el final y se comprueba que no hay
ningún campo de contraseña ni botón de borrar; se entra en la pantalla nueva y se borra una
cuenta de prueba.

**Escenarios de aceptación**:

1. **Dado** «Hogar», **cuando** se abre, **entonces** en lugar del bloque de borrar cuenta hay
   una fila «Borrar cuenta» (con su flecha) que abre su propia pantalla; en «Hogar» ya no hay
   campo de contraseña.
2. **Dado** la pantalla «Borrar cuenta», **cuando** se abre, **entonces** lleva la barra
   superior con la flecha atrás, explica qué se pierde (los textos de hoy), pide la contraseña
   y tiene el botón de borrar.
3. **Dado** esa pantalla, **cuando** se mira el botón de borrar, **entonces** se distingue de
   los demás botones de la app: relleno en rojo con texto blanco, en lugar del contorno rojo de
   hoy, que pesa lo mismo que «Cerrar sesión».
4. **Dado** la pantalla «Borrar cuenta», **cuando** se escribe la contraseña y se pulsa borrar,
   **entonces** se pide la misma confirmación que ahora (RF-039 de la 001) y, si se confirma, se
   borra igual que hoy: la sesión termina y se vuelve a «Entrar».
5. **Dado** quien es propietario de un hogar con más miembros, **cuando** abre «Borrar
   cuenta», **entonces** ve el mismo aviso y el mismo enlace a «Miembros» que hoy, sin campo de
   contraseña ni botón.
6. **Dado** «Hogar», **cuando** se recorre, **entonces** conserva, en este orden: la lista de
   accesos (Miembros, Ajustes, Categorías, Presupuestos, Huchas), «Avisos» (como la deje la
   014), «Exportar», «Cerrar sesión» y la fila «Borrar cuenta».
7. **Dado** «Cerrar sesión» con movimientos sin enviar, **cuando** se pulsa, **entonces** se
   avisa y se pide confirmar igual que hoy (011).

### Casos límite

- Texto grande del sistema y pantallas de 320 px: las filas «Ver todos» y «Borrar cuenta» no se
  cortan ni obligan a desplazar en horizontal.
- Un hogar con justo 3 presupuestos o 5 pagos: se ven todos, sin «Ver todos».
- Se borra o se salda un pago desde «Mes» y quedan menos de 5: el bloque se ajusta y
  «Ver todos» desaparece si ya no hace falta.
- Se apunta algo sin conexión (011): los pendientes siguen contando en el resumen, los
  presupuestos y la lista, igual que ahora.
- Se vuelve de «Borrar cuenta» con la flecha atrás: «Hogar» queda como estaba, sin la
  contraseña escrita.
- Un enlace directo a la pantalla «Borrar cuenta» sin sesión: se va a «Entrar» como cualquier
  otra pantalla protegida.
- Navegador de escritorio (1280 px): mismo reparto, centrado y con el ancho máximo actual.

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-1501**: Un bloque de «Mes» sin contenido (presupuestos, próximos pagos o huchas) DEBE
  mostrarse como una sola fila con su invitación a empezar, no como un estado vacío grande.
- **RF-1502**: «Presupuestos» en «Mes» DEBE mostrar como máximo 3 filas y, si hay más, una fila
  «Ver todos» que abre la pantalla de presupuestos.
- **RF-1503**: «Próximos pagos» en «Mes» DEBE mostrar como máximo 5 filas, con los atrasados
  siempre delante y sin límite para ellos, y, si hay más, «Ver todos», que abre «Pagos».
- **RF-1504**: «Ver todos» NO DEBE aparecer si ya se ve todo lo que hay.
- **RF-1505**: «Hogar» NO DEBE contener el campo de contraseña ni el botón de borrar la cuenta;
  DEBE tener una fila «Borrar cuenta» que abre su pantalla.
- **RF-1506**: La pantalla «Borrar cuenta» DEBE conservar el flujo, las comprobaciones, los
  mensajes y los textos de hoy (contraseña obligatoria, confirmación en dos pasos, aviso al
  propietario de un hogar con más miembros).
- **RF-1507**: El botón que borra la cuenta DEBE ser rojo relleno con texto blanco, con
  contraste 4,5:1.
- **RF-1508**: El cambio NO DEBE cambiar lo que hace la app, sus datos ni su API. El único
  texto nuevo es «Ver todos» (con su nombre para el lector de pantalla); la fila y la pantalla
  de borrar la cuenta usan el «Borrar mi cuenta» de hoy y el resto son los que ya existen.
- **RF-1509**: Los dos cambios DEBEN cumplir la 006 (sin tarjetas, pastillas ni «Volver»
  al pie) y WCAG 2.1 AA: objetivos de 44 px, nombres para el lector de pantalla («Ver todos los
  presupuestos», «Ver todos los pagos», «Borrar cuenta»).
- **RF-1510**: NO DEBEN añadirse animaciones nuevas (RF-607 de la 006): las filas de
  presupuestos y próximos pagos de «Mes» no se animan hoy y los límites no cambian eso. Las
  animaciones que ya hay (lista de movimientos, cambio de mes, barras de progreso) DEBEN seguir
  igual.

## Criterios de éxito _(obligatorio)_

- **CE-1501**: A 390 × 844 px, con un hogar nuevo, la lista de movimientos de «Mes» empieza a
  la vista sin desplazarse.
- **CE-1502**: Con un hogar completo (6 presupuestos, 8 próximos pagos, 3 huchas), el título
  «Movimientos» queda al menos 300 px más arriba que antes del cambio (comparación de capturas;
  el plan comprueba la cifra con las alturas reales).
- **CE-1503**: En «Hogar» no existe ningún campo de contraseña (prueba automática en el
  navegador).
- **CE-1504**: Borrar una cuenta de prueba desde la pantalla nueva funciona de punta a punta
  (pasada con Playwright contra la pila local, como en las especificaciones anteriores).
- **CE-1505**: axe-core sin problemas WCAG 2.1 AA en «Mes», «Hogar» y «Borrar cuenta», a 320 y
  1280 px.
- **CE-1506**: Todas las pruebas de punta a punta anteriores siguen pasando; «Mes» sigue por
  debajo de 1 s con 500 movimientos.

## Supuestos

- Los 3 y 5 de los límites (confirmados por el propietario) salen de que las huchas ya
  enseñan 3 y de que 5 es lo que cabe en una pantalla de móvil junto al resumen. Si más
  adelante se quieren otros, solo cambia una constante.
- «Pagos» y la pantalla de presupuestos ya existen y enseñan la lista completa; esta
  funcionalidad no los cambia.
- «Exportar» sigue en «Hogar»: es una acción sobre los datos del hogar, no de la cuenta.
- La 014 ya está implementada cuando se hace esta; si no, «Avisos» se queda como esté.

## Fuera de alcance

El título de «Mes» descentrado cuando hay lupa, la fecha repetida en el formulario de
movimiento, el cambio a una barra de gráficas más gruesa, el modo oscuro y la migración de
`ReminderBanners` a `Message`. Cada uno puede ser su propia funcionalidad.
