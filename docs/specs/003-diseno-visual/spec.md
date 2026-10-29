# Especificación: Diseño visual de la app

**Rama de la funcionalidad**: `003-diseno-visual`
**Creada**: 2026-10-29
**Estado**: Implementada
**Plan**: [`plan.md`](plan.md)
**Propuesta visual**: [lienzo «Smartnomic · Propuesta visual»](https://claude.ai/artifact/KrLAujuEQFQMcMccqHHPk5)
(privado del propietario)
**Entrada**: "Quiero dar a la app un aspecto atractivo para el usuario. Es una app de gestión
económica del hogar."

> Esta especificación describe **qué** debe conseguir el rediseño y **por qué**. El
> **cómo** va en el plan técnico, que debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). No cambia lo que la app hace: cambia
> cómo se ve y cómo se recorre.

## Aclaraciones

### Sesión 2026-10-29

- P: ¿Qué dirección visual? → R: «Calma», la del lienzo: verde pino de confianza, fondo
  arena cálido, cifras grandes, ámbar para lo que vence pronto y rojo solo para lo
  atrasado.
- P: ¿Se cambia la navegación a una barra inferior con pestañas? → R: Sí: Mes,
  Calendario, «+» (apuntar), Pagos y Hogar.
- P: ¿Modo oscuro? → R: No en esta funcionalidad. Los colores se definen como tokens para
  poder añadirlo después.

## Escenarios de usuario y pruebas _(obligatorio)_

### Historia 1: Una identidad visual coherente (Prioridad: P1)

Lucía abre la app y la percibe como un producto cuidado y de confianza para sus finanzas:
mismos colores, tipografía, esquinas y espaciados en todas las pantallas.

**Por qué esta prioridad**: es la base de todo lo demás; sin un sistema común, cada
pantalla se ve distinta.

**Prueba independiente**: se recorren todas las pantallas y se comprueba que usan la misma
paleta, tipografía, botones, campos, chips y tarjetas, y que pasan la auditoría de
accesibilidad.

**Escenarios de aceptación**:

1. **Dado** cualquier pantalla, **cuando** se muestra, **entonces** usa los colores,
   tipografía, tamaños y esquinas de la guía de estilo, sin valores sueltos.
2. **Dado** un importe, **cuando** se muestra, **entonces** usa cifras tabulares, los
   ingresos en verde y los gastos en tinta, nunca solo el color para distinguirlos (también
   el signo).
3. **Dado** un estado (atrasado, vence pronto, pagado, omitido), **cuando** se muestra,
   **entonces** usa la misma etiqueta con color y texto en todas las pantallas.
4. **Dado** un lector de pantalla o el texto grande del sistema, **cuando** se usa la app,
   **entonces** todo sigue siendo legible y usable (WCAG 2.1 AA).

---

### Historia 2: Una pantalla principal que se entiende de un vistazo (Prioridad: P2)

Al abrir la app, Lucía ve primero cuánto le queda este mes, qué parte de lo que ha entrado
ya ha gastado y qué pagos tiene cerca.

**Por qué esta prioridad**: es la pantalla que más se abre; resume el propósito de la app.

**Escenarios de aceptación**:

1. **Dado** un mes con movimientos, **cuando** se abre la app, **entonces** lo primero es
   una tarjeta con el balance del mes en grande, una barra de cuánto se ha gastado de lo
   ingresado y los totales de ingresos y gastos.
2. **Dado** pagos próximos o atrasados, **cuando** se abre la app, **entonces** aparecen en
   tarjetas con la fecha destacada y su estado.
3. **Dado** la lista de movimientos, **cuando** se muestra, **entonces** cada uno lleva el
   icono de su categoría sobre un fondo de su color, la fecha relativa (hoy, ayer) y, si
   el hogar es compartido, quién lo apuntó.
4. **Dado** un mes sin datos, **cuando** se abre, **entonces** se ve un estado vacío
   amable que invita a apuntar el primer movimiento.

---

### Historia 3: Moverse por la app sin buscar (Prioridad: P3)

Lucía pasa del mes al calendario, a sus pagos recurrentes o a los ajustes del hogar con un
toque desde cualquier pantalla principal, y apunta un gasto con el botón central.

**Escenarios de aceptación**:

1. **Dado** una pantalla principal, **cuando** Lucía mira abajo, **entonces** ve la barra
   de navegación con la pestaña actual marcada y el botón «+» destacado.
2. **Dado** un miembro con rol de lector, **cuando** usa la app, **entonces** el botón «+»
   no aparece, porque no puede apuntar.
3. **Dado** la pantalla de apuntar, **cuando** se abre, **entonces** el importe es grande y
   tiene el foco, y las categorías son botones con icono y color.

---

### Historia 4: Icono y pantalla de inicio (Prioridad: P4)

La app tiene un icono propio y una pantalla de carga con los colores de la marca en
Android y en el navegador (favicon).

### Casos límite

- Texto grande del sistema (200 %): nada se corta ni se solapa; la barra inferior sigue
  siendo usable.
- Pantallas estrechas (360 px) y anchas (navegador de escritorio): el contenido se centra
  con un ancho máximo legible.
- Importes muy grandes (250.000,00 €): caben en la tarjeta de balance sin cortarse.
- Categorías creadas por el usuario con colores poco contrastados: el icono y el texto
  siguen siendo legibles.
- Sin conexión: los avisos de estado mantienen el mismo estilo.
- El sistema en modo oscuro: la app se sigue viendo en claro, legible (sin modo oscuro
  en esta funcionalidad).

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-201**: La app DEBE usar un único conjunto de tokens de diseño (colores, tipografía,
  espaciado, esquinas, sombras) definido en un solo sitio.
- **RF-202**: Todas las pantallas existentes DEBEN usar esos tokens y los componentes
  comunes (botones, campos, chips, tarjetas, etiquetas de estado, filas de lista).
- **RF-203**: La pantalla «Mes» DEBE mostrar una tarjeta de resumen con el balance, la
  proporción gastada de lo ingresado y los totales.
- **RF-204**: Los estados de los vencimientos DEBEN mostrarse con la misma etiqueta (texto
  y color) en todas las pantallas.
- **RF-205**: Cada categoría DEBE mostrarse con su icono sobre un fondo suave de su color.
- **RF-206**: La app DEBE cumplir WCAG 2.1 AA: contraste 4,5:1 en texto, objetivos táctiles
  de 44 px, etiquetas para lector de pantalla y texto escalable.
- **RF-207**: La app DEBE tener icono, pantalla de carga y favicon propios.
- **RF-208**: La navegación principal DEBE hacerse con una barra inferior de pestañas (Mes,
  Calendario, «+», Pagos y Hogar).
- **RF-209**: El rediseño NO DEBE cambiar lo que hace la app ni romper sus pruebas.

## Criterios de éxito _(obligatorio)_

- **CE-201**: axe-core sin problemas WCAG 2.1 AA en todas las pantallas.
- **CE-202**: Ninguna pantalla usa colores, tamaños de letra ni espaciados fuera de los
  tokens (comprobación automática en el código).
- **CE-203**: La pantalla «Mes» sigue mostrándose en menos de 1 s con 500 movimientos
  (CE-003 del MVP).
- **CE-204**: Todas las pruebas de punta a punta del MVP y del calendario siguen pasando.

## Supuestos

- La tipografía puede cargarse como fuente propia en Android y web (dependencia nueva de
  Expo, a justificar en el plan).
- Los iconos de categoría siguen siendo los actuales (emoji) salvo que el plan proponga un
  juego de iconos sin coste ni dependencias pesadas.
