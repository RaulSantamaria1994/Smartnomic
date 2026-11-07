# Especificación: Pertenecer a varios hogares

**Rama de la funcionalidad**: `013-varios-hogares`
**Creada**: 2026-11-07
**Plan**: [`plan.md`](plan.md)
**Estado**: Borrador
**Entrada**: "Pertenecer a varios hogares a la vez." (Pendiente del MVP: «Cada usuario
pertenece a un solo hogar en el MVP; pertenecer a varios hogares queda para más adelante».)

> Esta especificación describe **qué** debe conseguir la funcionalidad y **por qué**. El
> **cómo** va en el plan técnico, que debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md).

## Aclaraciones

### Sesión 2026-11-07

- P: ¿Cómo se cambia de hogar? → R: Tocando el nombre del hogar en la barra de arriba (bajo
  el mes en «Mes» y en las demás pestañas), que abre la lista de hogares. La app recuerda el
  último elegido.
- P: Al aceptar una invitación, ¿qué pasa con el hogar que ya se tiene? → R: Se conserva: se
  pasa a estar en los dos. Ya no se avisa de que se pierden datos.
- P: ¿Se puede crear un hogar a mano? → R: Sí, con «Crear hogar»: se le pone nombre y se queda
  como propietario, con las categorías de siempre.
- P: ¿De qué hogares llegan los recordatorios en Android? → R: De todos, cada uno diciendo de
  qué hogar es; al tocarlo se abre en ese hogar.
- P: ¿Cuántos hogares como mucho? → R: 5 por persona.
- P: ¿Y si alguien se queda sin ningún hogar (sale del último o lo quitan)? → R: Una pantalla
  para crear uno o unirse con una invitación; ya no se crea uno vacío solo.
- P: ¿Al registrarse se sigue creando un hogar? → R: Sí, como ahora.
- P: ¿Hay alguna vista que junte varios hogares? → R: No: «Mes», «Gráficas», «Calendario»,
  la búsqueda y el CSV son siempre del hogar elegido.
- P: ¿Borrar la cuenta siendo propietario de hogares con más miembros? → R: Como ahora: antes
  hay que pasar la propiedad en cada uno; se dice en cuáles.
- P: ¿Cómo se quita un hogar que ya no se usa siendo su propietario? → R: Si es su único
  miembro, puede borrarlo (con confirmación y ofreciendo exportar antes). Con más miembros,
  primero pasa la propiedad y luego sale.

## Escenarios de usuario y pruebas _(obligatorio)_

### Historia 1: Estar en dos hogares y cambiar entre ellos (Prioridad: P1) 🎯

Lucía tiene su hogar con Juan y comparte piso los fines de semana con Marta. Marta la invita
a «Piso de la playa». Lucía acepta y sigue en su hogar de siempre. En «Mes» toca el nombre
del hogar, elige «Piso de la playa» y ve sus gastos; vuelve a su hogar con el mismo gesto.

**Por qué esta prioridad**: es la funcionalidad entera; sin ella, unirse a otro hogar obliga
a dejar el propio.

**Prueba independiente**: una persona en dos hogares ve en cada uno solo sus datos, cambia
entre ellos sin cerrar sesión y lo que apunta va al hogar elegido.

**Escenarios de aceptación**:

1. **Dado** un miembro de un hogar con datos, **cuando** acepta una invitación a otro,
   **entonces** pasa a estar en los dos, sin perder nada ni tener que confirmar que pierde
   datos, y la app le lleva al hogar nuevo.
2. **Dado** un miembro de varios hogares, **cuando** toca el nombre del hogar en la barra de
   arriba, **entonces** ve la lista de sus hogares, con el elegido marcado y su rol en cada
   uno, y al tocar otro la app pasa a ese hogar.
3. **Dado** un hogar elegido, **cuando** se usa «Mes», «Gráficas», «Calendario», «Pagos», la
   búsqueda, el CSV o «Hogar», **entonces** todo es de ese hogar, y lo que se apunta, edita o
   borra va a ese hogar.
4. **Dado** que se cierra la app o se recarga la página, **cuando** se vuelve a abrir,
   **entonces** sigue en el último hogar elegido en ese dispositivo.
5. **Dado** un miembro de un solo hogar, **cuando** mira la barra de arriba, **entonces** el
   nombre del hogar también abre la lista (con ese hogar y «Crear hogar»).
6. **Dado** roles distintos en cada hogar (por ejemplo, propietaria en uno y lectora en otro),
   **cuando** cambia de hogar, **entonces** lo que puede hacer es lo de su rol en ese hogar.

---

### Historia 2: Crear un hogar y quitar los que no se usan (Prioridad: P2)

Juan quiere llevar aparte los gastos de la asociación de vecinos. Crea «Comunidad», invita a
la presidenta, y cuando deja el cargo le pasa la propiedad y sale. Otro hogar que creó para
probar, en el que está solo, lo borra.

**Por qué esta prioridad**: sin crear hogares solo se podría estar en los que te invitan; sin
poder quitarlos, el límite de 5 se llenaría para siempre.

**Prueba independiente**: se crea un hogar con nombre, se usa, y luego se sale de él o se
borra según sea propietario y esté solo o no.

**Escenarios de aceptación**:

1. **Dado** un usuario con menos de 5 hogares, **cuando** elige «Crear hogar» y le pone
   nombre, **entonces** se crea con él como propietario, euro, inicio de mes el día 1, la zona
   horaria del dispositivo y las categorías de siempre, y la app pasa a él.
2. **Dado** un usuario con 5 hogares, **cuando** intenta crear otro o aceptar una invitación,
   **entonces** se le explica que el máximo es 5 y que antes tiene que salir de uno o
   borrarlo; no se crea ni se une.
3. **Dado** un miembro que no es propietario, **cuando** sale de un hogar, **entonces** deja
   de verlo (sus movimientos se conservan en él, como ahora) y la app pasa a otro de sus
   hogares.
4. **Dado** el propietario de un hogar con más miembros, **cuando** quiere salir, **entonces**
   se le pide antes pasar la propiedad, como ahora.
5. **Dado** el propietario y único miembro de un hogar, **cuando** elige borrarlo, **entonces**
   se le ofrece exportar los datos, se le pide confirmación y, al confirmar, el hogar y todos
   sus datos se borran y la app pasa a otro de sus hogares.

---

### Historia 3: Quedarse sin hogar (Prioridad: P3)

A Marta la quitan del único hogar en el que estaba. Al abrir la app le sale una pantalla para
crear un hogar nuevo o unirse a otro con una invitación.

**Por qué esta prioridad**: ahora es posible quedarse sin ninguno, y la app tiene que seguir
siendo usable.

**Prueba independiente**: se deja a un usuario sin hogares (salir del último, que lo quiten o
borrar el último) y se comprueba que puede crear uno o unirse a uno.

**Escenarios de aceptación**:

1. **Dado** un usuario sin ningún hogar, **cuando** abre la app, **entonces** ve una pantalla
   que le explica que no está en ningún hogar, con «Crear hogar» y la forma de unirse con un
   enlace o código de invitación.
2. **Dado** esa pantalla, **cuando** crea un hogar o acepta una invitación, **entonces** entra
   en ese hogar.
3. **Dado** un usuario sin hogar, **cuando** abre un enlace de invitación, **entonces** se une
   directamente, como ahora.
4. **Dado** un usuario sin hogar, **cuando** intenta llegar a «Mes» u otra pantalla de un
   hogar (por ejemplo, con un enlace antiguo), **entonces** va a esa pantalla, sin errores.

### Casos límite

- Privacidad: estar en dos hogares no deja ver los datos de uno desde el otro; quien está solo
  en uno de ellos no ve nada del otro.
- Los movimientos apuntados sin conexión (especificación 011) se envían al hogar en el que se
  apuntaron, aunque luego se haya cambiado de hogar; si ya no se es miembro de él, se rechazan
  con su motivo, como ahora.
- Tiempo real (especificación 012): los avisos llegan del hogar elegido; al cambiar de hogar,
  la app se pone al día con el nuevo. Quitar a alguien de un hogar solo le corta los avisos de
  ese hogar.
- Recordatorios en Android: llegan los de todos los hogares; el texto dice de qué hogar son y
  al tocarlos se abre el vencimiento en ese hogar.
- Lo guardado para ver sin conexión en Android es por hogar: al cambiar de hogar sin conexión
  se ve lo último cargado de ese hogar, si lo hay.
- Si el hogar elegido deja de estar disponible (te quitan o lo borras desde otro dispositivo),
  la app pasa a otro de tus hogares o a la pantalla de sin hogar.
- Borrar la cuenta: hay que pasar antes la propiedad en cada hogar con más miembros del que se
  es propietario (se dice en cuáles); los hogares en los que se es el único miembro se borran
  con la cuenta.
- Exportar todos los datos (RGPD, RF-038) sigue siendo por hogar, del hogar elegido.
- Dos hogares con el mismo nombre: se distinguen en la lista por el rol y por los otros
  miembros.
- Nombres de hogar: las mismas reglas que al cambiar el nombre en «Ajustes del hogar».

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-1301**: Un usuario DEBE poder ser miembro de hasta 5 hogares a la vez, con un rol en
  cada uno. Sustituye a RF-008 del MVP.
- **RF-1302**: Aceptar una invitación DEBE añadir el hogar sin salir de los demás.
- **RF-1303**: La app DEBE mostrar un hogar elegido cada vez y permitir cambiarlo desde el
  nombre del hogar en la barra de arriba; DEBE recordar el último elegido en cada dispositivo.
- **RF-1304**: Todas las pantallas, cifras, búsquedas, exportaciones y cambios DEBEN ser del
  hogar elegido, con los permisos del rol en ese hogar.
- **RF-1305**: Un usuario con menos de 5 hogares DEBE poder crear uno con nombre, del que es
  propietario.
- **RF-1306**: Un miembro que no es propietario DEBE poder salir de un hogar; ya no se le crea
  uno vacío. Sustituye a RF-007 del MVP.
- **RF-1307**: El propietario que es el único miembro de un hogar DEBE poder borrarlo, con
  confirmación y ofreciendo antes exportar sus datos.
- **RF-1308**: Un usuario sin hogares DEBE ver una pantalla para crear uno o unirse con una
  invitación.
- **RF-1309**: Al registrarse se DEBE seguir creando un hogar, como en RF-002.
- **RF-1310**: Los recordatorios en Android DEBEN ser de todos los hogares y decir de cuál es
  cada uno.
- **RF-1311**: Ningún usuario DEBE poder ver ni cambiar datos de un hogar del que no es
  miembro (RF-040), aunque sea miembro de otro con quien sí lo es.
- **RF-1312**: Todo DEBE cumplir WCAG 2.1 AA y el estilo de la especificación 006.

## Criterios de éxito _(obligatorio)_

- **CE-1301**: Una persona en dos hogares cambia de uno a otro en 2 toques y en menos de 2 s
  ve los datos del nuevo.
- **CE-1302**: En una prueba con dos hogares y tres personas, nadie ve ni puede cambiar nada
  de un hogar del que no es miembro (batería de ataques: pedir datos y cambiar cosas del otro
  hogar con cada ruta).
- **CE-1303**: Aceptar una invitación teniendo un hogar con datos conserva el 100 % de ellos.
- **CE-1304**: Un usuario que se queda sin hogar llega a la pantalla de crear o unirse, sin
  errores, en todos los casos (salir, que lo quiten, borrar el último).
- **CE-1305**: axe-core sin problemas en la lista de hogares, crear hogar, borrar hogar y la
  pantalla de sin hogar, a 320 y 1280 px; las pruebas de punta a punta anteriores siguen
  pasando.

## Supuestos

- El hogar elegido se recuerda en cada dispositivo, no en la cuenta: el móvil y el navegador
  pueden tener elegidos hogares distintos.
- Salir de un hogar conserva los movimientos que se apuntaron en él, como ahora (RF-007).
- Los datos de cada hogar no cambian: los movimientos, categorías, presupuestos y huchas ya
  son de un hogar.
