# Especificación: Estilo Android estándar y animaciones pequeñas

**Rama de la funcionalidad**: `006-estilo-android`
**Creada**: 2026-11-04
**Estado**: Borrador
**Propuesta visual**: [Figma «Smartnomic · Rediseño Android»](https://www.figma.com/design/usEbYElEcWOxla6P0M7owK)
(seis pantallas, componentes, colores y la tabla de animaciones)
**Entrada**: "Quiero mejorar el apartado visual de la aplicación. La idea es que no parezca
hecha por IA, sino por un desarrollador junior. No inventes nada." · "Hay que meter
animaciones pequeñas, en símbolos y logos y donde veas que pueden quedar bien."

> Esta especificación describe **qué** debe conseguir el cambio y **por qué**. El **cómo**
> va en el plan técnico, que debe cumplir [`docs/CONSTITUTION.md`](../../CONSTITUTION.md).
> No cambia lo que la app hace: cambia cómo se ve. Sustituye el estilo «Calma» de
> [`003-diseno-visual`](../003-diseno-visual/spec.md): dejan de valer sus RF-203 (tarjeta
> de resumen), RF-205 (icono sobre fondo suave) y la parte de RF-208 que pone el «+» en la
> barra de pestañas.

## Aclaraciones

### Sesión 2026-11-04

- P: ¿Qué estilo? → R: El de una app Android normal: barra superior, listas con
  separadores, esquinas poco redondeadas, iconos sin fondo y componentes típicos de
  Material.
- P: ¿Qué fuente? → R: La del sistema (Roboto en Android, la del sistema en el navegador).
- P: ¿Colores e icono? → R: Se mantienen el verde actual y el icono de la app.
- P: ¿Se revisa antes en Figma? → R: Sí; la propuesta está en el archivo enlazado.
- P: ¿El eslogan «La economía de tu hogar, en calma.» y el saludo «Hola, Lucía» con el
  círculo de iniciales? → R: Se quitan los dos.
- P: ¿Qué pasa con el color de cada categoría? → R: El icono se pinta con el color de su
  categoría, sin el cuadradito de fondo.
- P: ¿Qué animaciones? → R: Las ocho de la tabla de Figma: icono de la pestaña, botón «+»,
  logo al entrar, marca de los chips, barras de progreso, cambio de mes, filas que entran
  y salen, y hucha conseguida.

## Escenarios de usuario y pruebas _(obligatorio)_

### Historia 1: La app parece una app Android normal (Prioridad: P1) 🎯

Lucía abre la app y la ve como cualquier otra app de su móvil: barra superior verde con el
título, listas sencillas con separadores, botones planos y la letra del sistema. Nada de
tarjetas grandes, cuadraditos de color ni pastillas.

**Por qué esta prioridad**: es el cambio en sí. Los rasgos que delatan un diseño generado
(tarjetas muy redondeadas dentro de otras, iconos en cuadraditos de color, pastillas,
eslogan, fuente de moda) son los que hay que quitar.

**Prueba independiente**: se recorren todas las pantallas a 390 px y se comparan con la
propuesta de Figma; las seis dibujadas coinciden y el resto sigue las mismas reglas.

**Escenarios de aceptación**:

1. **Dado** cualquier pantalla, **cuando** se abre, **entonces** tiene una barra superior
   verde con su título; las pantallas secundarias llevan una flecha atrás en esa barra en
   lugar de un botón «Volver» o «Cancelar» abajo.
2. **Dado** «Mes» y «Calendario», **cuando** se abren, **entonces** la barra superior
   muestra el mes con flechas a los lados (en «Mes», con el nombre del hogar debajo).
3. **Dado** «Mes», **cuando** se abre, **entonces** el resumen es una cifra grande («Te
   quedan este mes»), una barra de progreso y tres líneas (ingresos, gastos y apartado para
   objetivos), sin bloque de color ni cajitas.
4. **Dado** una lista (movimientos, próximos pagos, huchas, pagos, menú de «Hogar»,
   miembros, categorías), **cuando** se muestra, **entonces** son filas con separadores,
   sin tarjetas, y los grupos llevan un subtítulo pequeño en verde.
5. **Dado** una categoría, **cuando** se muestra su icono, **entonces** va pintado con el
   color de la categoría, sin fondo detrás, con contraste de 3:1 sobre blanco.
6. **Dado** un estado («Al día», «Retrasada», «En 6 días», «Atrasado»…), **cuando** se
   muestra, **entonces** es texto de color, sin pastilla.
7. **Dado** «Apuntar», **cuando** se abre, **entonces** Gasto/Ingreso son botones
   segmentados, el importe un campo normal con «€», y las categorías y Hoy/Ayer, chips.
8. **Dado** las pestañas de abajo, **cuando** se muestran, **entonces** son cuatro (Mes,
   Calendario, Pagos, Hogar) y el «+» es un botón flotante abajo a la derecha, encima de
   la barra.
9. **Dado** «Entrar» y «Registro», **cuando** se abren, **entonces** se ve el icono de la
   app pequeño y el título, sin tarjeta del logo ni eslogan.

---

### Historia 2: Animaciones pequeñas (Prioridad: P2)

Al usar la app, algunos símbolos se mueven un poco para confirmar lo que ha pasado: el
icono de la pestaña da un salto, el «+» gira, la barra de la hucha se rellena.

**Por qué esta prioridad**: da vida a la app, pero es un adorno sobre la historia 1.

**Prueba independiente**: se hace cada acción de la tabla de Figma y se ve su animación;
con «Quitar animaciones» activado no se mueve nada y todo funciona igual.

**Escenarios de aceptación**:

1. **Dado** las pestañas, **cuando** se toca una, **entonces** su icono crece un poco y
   vuelve (200 ms).
2. **Dado** el botón «+», **cuando** se pulsa, **entonces** el «+» gira un cuarto de vuelta
   (150 ms) y se abre «Apuntar».
3. **Dado** «Entrar» o «Registro», **cuando** se abren, **entonces** el icono de la app
   aparece de transparente a visible y de un poco más pequeño a su tamaño (300 ms), una vez.
4. **Dado** un chip, **cuando** se elige, **entonces** su marca aparece creciendo (150 ms).
5. **Dado** una barra de progreso (resumen del mes, huchas), **cuando** se abre la pantalla,
   **entonces** se rellena desde cero hasta su valor (300 ms); si el valor cambia, va del
   anterior al nuevo.
6. **Dado** «Mes» o «Calendario», **cuando** se cambia de mes con las flechas,
   **entonces** el contenido entra deslizando 24 px desde el lado de la flecha y
   fundiéndose (200 ms).
7. **Dado** una lista de movimientos, pagos o el historial de una hucha, **cuando** se
   añade, borra o deshace una fila, **entonces** aparece o desaparece fundida (200 ms).
8. **Dado** una hucha, **cuando** llega al objetivo, **entonces** su icono da un bote una
   vez (300 ms).
9. **Dado** «Quitar animaciones» en Android (o «reducir movimiento» en el navegador),
   **cuando** está activado, **entonces** no hay ninguna de estas animaciones y todo
   aparece directamente en su sitio.

### Casos límite

- Texto grande del sistema y pantallas de 320 px: la barra superior, las filas y los chips
  no se cortan ni obligan a desplazar en horizontal; los títulos largos se acortan con «…».
- Una categoría con un color claro (elegido por el usuario): su icono se oscurece lo justo
  para contrastar 3:1 sobre blanco.
- Pulsar varias veces seguidas una pestaña o una flecha de mes: las animaciones no se
  acumulan ni dejan el contenido a medio camino.
- Una animación nunca retrasa una acción: el «+» abre «Apuntar» al pulsar, sin esperar.
- Navegador de escritorio (1280 px): mismo estilo, centrado y con el ancho máximo actual.

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-601**: Todas las pantallas DEBEN seguir el estilo de la propuesta de Figma: barra
  superior verde con título, listas con separadores, esquinas de 4 px en botones y campos
  (8 px en chips, 16 px en el botón flotante), sin tarjetas anidadas ni sombras salvo en el
  botón flotante.
- **RF-602**: La app DEBE usar la fuente del sistema y dejar de cargar Plus Jakarta Sans.
- **RF-603**: Los iconos de la interfaz y los de categoría DEBEN salir de Material
  Community Icons; los de categoría, pintados con el color de su categoría y sin fondo.
- **RF-604**: Los estados DEBEN mostrarse como texto de color, sin pastillas.
- **RF-605**: La navegación DEBE ser una barra inferior de cuatro pestañas y un botón
  flotante «+» que abre «Apuntar».
- **RF-606**: Se DEBEN quitar el eslogan, el saludo «Hola, …» y el círculo de iniciales.
- **RF-607**: La app DEBE tener las ocho animaciones de la historia 2, de 150 a 300 ms, y
  ninguna otra nueva.
- **RF-608**: Con «Quitar animaciones» / «reducir movimiento» activado, NO DEBE haber
  ninguna de esas animaciones.
- **RF-609**: El cambio NO DEBE cambiar lo que hace la app, sus textos (salvo los
  quitados en RF-606 y los botones «Volver»/«Cancelar» que pasan a la flecha atrás), sus
  datos ni su API.
- **RF-610**: La app DEBE seguir cumpliendo WCAG 2.1 AA: contraste 4,5:1 en texto y 3:1 en
  iconos y bordes de campos, objetivos táctiles de 44 px y nombres para el lector de
  pantalla (la flecha atrás se anuncia «Volver»; el botón flotante, «Apuntar»).

## Criterios de éxito _(obligatorio)_

- **CE-601**: Las seis pantallas de Figma coinciden con la app a 390 px (comparación de
  capturas una al lado de la otra, revisada por el propietario).
- **CE-602**: axe-core sin problemas WCAG 2.1 AA en todas las pantallas, a 320 y 1280 px.
- **CE-603**: Ningún uso de Plus Jakarta Sans, de pastillas ni de fondos de color detrás
  de iconos en el código de la app (comprobación automática).
- **CE-604**: Todas las pruebas de punta a punta (MVP, calendario, categorías, huchas)
  siguen pasando; «Mes» sigue por debajo de 1 s con 500 movimientos.
- **CE-605**: Con reducir movimiento activado, ninguna de las ocho animaciones se ejecuta
  (prueba automática en el navegador).

## Supuestos

- Las animaciones se hacen con `Animated` de React Native; no hace falta instalar nada.
- `@expo/vector-icons` ya trae Material Community Icons y la app ya lo usa.
- Las pantallas que no están en Figma (Pagos, Registro, Recuperar, Categorías, Miembros,
  Ajustes, lista y formulario de huchas, detalle de un pago y de un movimiento,
  invitación) siguen las mismas reglas sin una maqueta propia.
- No hay modo oscuro en esta funcionalidad, igual que en la 003.
