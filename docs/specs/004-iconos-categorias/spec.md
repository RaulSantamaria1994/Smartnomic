# Especificación: Iconos de categoría en lugar de emoji

**Rama de la funcionalidad**: `004-iconos-categorias`
**Creada**: 2026-10-29
**Estado**: Aprobada
**Plan**: [`plan.md`](plan.md)
**Entrada**: "Sustituye los emojis de la app por logos o símbolos de librería."

> Esta especificación describe **qué** debe conseguir el cambio y **por qué**. El **cómo**
> va en el plan técnico, que debe cumplir [`docs/CONSTITUTION.md`](../../CONSTITUTION.md).
> Parte del rediseño [`003-diseno-visual`](../003-diseno-visual/spec.md), cuyo supuesto
> «los iconos de categoría siguen siendo emoji» deja de valer.

## Aclaraciones

### Sesión 2026-10-29

- P: ¿De qué librería salen los iconos? → R: Material Community Icons (ya incluida con
  la app), con un icono propio para cada categoría predefinida.
- P: ¿Cómo se elige el icono de una categoría? → R: En una cuadrícula de unos 40 iconos
  escogidos para la economía del hogar, sin escribir nada.
- P: ¿Dónde va el cambio? → R: En su propia rama y PR, a partir del rediseño.

## Escenarios de usuario y pruebas _(obligatorio)_

### Historia 1: Las categorías se ven con iconos coherentes (Prioridad: P1) 🎯

Lucía ve sus categorías (Vivienda, Supermercado, Transporte…) con iconos de trazo del
mismo estilo que el resto de la app, en lugar de emoji que cambian de aspecto según el
móvil o el navegador.

**Por qué esta prioridad**: es el cambio en sí; los emoji se ven distintos en cada sistema
y desentonan con el estilo «Calma».

**Prueba independiente**: se recorren «Mes», «Apuntar», «Calendario», «Pagos», el detalle
de un pago y «Categorías», y en ninguna aparece un emoji: cada categoría lleva su icono
sobre el fondo suave de su color.

**Escenarios de aceptación**:

1. **Dado** un hogar nuevo, **cuando** se crea, **entonces** sus categorías predefinidas
   llevan cada una su icono de la librería (no un emoji).
2. **Dado** un hogar existente con las categorías predefinidas, **cuando** se actualiza la
   app, **entonces** esas categorías pasan a tener el icono equivalente sin perder nada.
3. **Dado** una categoría creada por el usuario con un emoji que no tiene equivalente,
   **cuando** se actualiza la app, **entonces** pasa a tener un icono genérico (etiqueta)
   y el usuario puede cambiarlo.
4. **Dado** cualquier pantalla que muestra una categoría, **cuando** se muestra,
   **entonces** usa el icono con el color de la categoría sobre su fondo suave, con el
   contraste de la guía de estilo.
5. **Dado** el detalle de un pago recurrente, **cuando** se abre, **entonces** el título
   ya no empieza con un emoji: el icono de la categoría aparece junto al nombre.

---

### Historia 2: Elegir el icono de una categoría (Prioridad: P2)

Lucía crea la categoría «Mascotas» y elige un icono de patita tocándolo en una
cuadrícula, sin tener que escribir ni buscar un emoji.

**Escenarios de aceptación**:

1. **Dado** la pantalla de crear o editar una categoría, **cuando** se abre, **entonces**
   se ve una cuadrícula de iconos con el elegido marcado.
2. **Dado** la cuadrícula, **cuando** se usa con lector de pantalla, **entonces** cada
   icono se anuncia con un nombre en español («Mascotas», «Viajes»…) y su estado
   (seleccionado o no).
3. **Dado** una categoría nueva, **cuando** no se elige icono, **entonces** se guarda con
   el icono genérico.

### Casos límite

- Un icono guardado que la app no conoce (dato antiguo o de otra versión): se muestra el
  icono genérico, nunca un hueco ni un texto raro.
- Clientes antiguos de la app que todavía envían un emoji al crear una categoría: el
  servidor lo rechaza con un error claro; tras actualizar, funciona.
- La exportación de datos no incluye iconos, así que no cambia.
- Texto grande del sistema y pantallas de 320 px: la cuadrícula sigue siendo usable.

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-401**: Cada categoría DEBE guardar un identificador de icono de un catálogo
  cerrado de la app, no un emoji ni texto libre.
- **RF-402**: Las categorías predefinidas DEBEN tener cada una un icono propio del
  catálogo.
- **RF-403**: Las categorías existentes DEBEN migrarse: los emoji predefinidos a su icono
  equivalente y cualquier otro valor al icono genérico.
- **RF-404**: Al crear o editar una categoría, el icono DEBE elegirse en una cuadrícula
  accesible (nombre en español, estado seleccionado, 44 px de objetivo táctil).
- **RF-405**: Ninguna pantalla de la app DEBE mostrar emoji.
- **RF-406**: El servidor DEBE rechazar iconos fuera del catálogo.

## Criterios de éxito _(obligatorio)_

- **CE-401**: Ningún emoji en el código de la app ni en los datos tras la migración
  (comprobación automática).
- **CE-402**: axe-core sin problemas WCAG 2.1 AA en las pantallas con categorías,
  incluida la cuadrícula de iconos.
- **CE-403**: Las pruebas de punta a punta del MVP y del calendario siguen pasando; «Mes»
  sigue por debajo de 1 s con 500 movimientos.

## Supuestos

- Material Community Icons ya viene con `@expo/vector-icons`, que la app usa; no hace
  falta instalar nada.
- El catálogo puede crecer en el futuro sin otra migración (los identificadores
  desconocidos se ven como el genérico).
