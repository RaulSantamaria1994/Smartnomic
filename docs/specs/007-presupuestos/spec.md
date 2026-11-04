# Especificación: Presupuestos por categoría

**Rama de la funcionalidad**: `007-presupuestos`
**Creada**: 2026-11-04
**Plan**: [`plan.md`](plan.md)
**Estado**: Aprobada
**Entrada**: "Vamos con los presupuestos por categoría." (Pendiente del MVP: «Presupuestos,
gráficas, búsqueda y exportación a CSV con filtros quedan para más adelante».)

> Esta especificación describe **qué** debe conseguir la funcionalidad y **por qué**. El
> **cómo** va en el plan técnico, que debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md).

## Aclaraciones

### Sesión 2026-11-04

- P: ¿El importe vale para un mes o para todos? → R: El mismo cada mes, hasta que se
  cambia. Cambiarlo afecta al mes en curso y a los siguientes; los meses pasados conservan el
  que tenían.
- P: ¿Lo que sobra o falta pasa al mes siguiente? → R: No: cada mes empieza de cero.
- P: ¿Cómo avisa al acercarse al límite o pasarlo? → R: Solo dentro de la app (en Android y
  en el navegador), sin notificaciones.
- P: ¿Hay también un presupuesto total del mes? → R: No, solo por categoría.

## Escenarios de usuario y pruebas _(obligatorio)_

### Historia 1: Ponerle un límite a una categoría (Prioridad: P1) 🎯

Lucía quiere gastar como mucho 400 € al mes en el supermercado. En «Presupuestos» elige
Supermercado, escribe 400 y lo guarda. Desde ese momento ese límite vale para el mes en curso
y los siguientes.

**Por qué esta prioridad**: sin poner presupuestos no hay nada más que ver.

**Prueba independiente**: se pone un presupuesto a una categoría, se cambia, se quita; los
miembros del hogar lo ven y un lector no puede tocarlo.

**Escenarios de aceptación**:

1. **Dado** la pantalla «Presupuestos» (desde «Hogar» y desde «Mes»), **cuando** se abre,
   **entonces** muestra las categorías de gasto en uso, cada una con su presupuesto o «Sin
   presupuesto».
2. **Dado** una categoría sin presupuesto, **cuando** el propietario o un editor escribe un
   importe y guarda, **entonces** la categoría tiene ese presupuesto desde el mes en curso.
3. **Dado** una categoría con presupuesto, **cuando** se cambia el importe, **entonces** el
   mes en curso y los siguientes usan el nuevo, y los meses pasados siguen con el anterior.
4. **Dado** una categoría con presupuesto, **cuando** se quita, **entonces** deja de tenerlo
   desde el mes en curso; los meses pasados lo conservan.
5. **Dado** un lector, **cuando** abre «Presupuestos», **entonces** los ve pero no puede
   cambiarlos.
6. **Dado** un importe no válido (vacío, cero, negativo, más de dos decimales o desmesurado),
   **cuando** se guarda, **entonces** se explica el error y no se guarda.

---

### Historia 2: Ver cómo va cada presupuesto en el mes (Prioridad: P2)

Lucía abre «Mes» y ve, debajo del resumen, cada categoría con presupuesto: lo gastado de lo
previsto, una barra y lo que le queda. La de Ocio está naranja porque ya lleva el 85 %; la de
Restaurantes, roja: se ha pasado 12 €.

**Por qué esta prioridad**: es para lo que sirve el presupuesto.

**Prueba independiente**: con varios presupuestos y gastos, cada barra y cada texto coinciden
con la suma de los gastos de esa categoría en el periodo, también al cambiar de mes.

**Escenarios de aceptación**:

1. **Dado** un mes con presupuestos, **cuando** se abre «Mes», **entonces** aparece la sección
   «Presupuestos» con una fila por categoría: «320,00 € de 400,00 €», una barra y «Te quedan
   80,00 €».
2. **Dado** una categoría que llega al 80 % de su presupuesto, **cuando** se muestra,
   **entonces** la barra y el texto pasan al color de «vence pronto»; al pasarlo, al de
   «atrasado», con «Te has pasado 12,00 €».
3. **Dado** un gasto apuntado, editado (importe, fecha o categoría) o borrado, **cuando** se
   vuelve a «Mes», **entonces** los presupuestos afectados ya están al día.
4. **Dado** un pago recurrente marcado como pagado, **cuando** crea su gasto, **entonces**
   cuenta en el presupuesto de su categoría como cualquier otro gasto.
5. **Dado** otro mes (anterior o siguiente), **cuando** se navega a él, **entonces** se ven los
   presupuestos que valían ese mes con lo gastado en ese mes.
6. **Dado** las filas de presupuestos, **cuando** se ordenan, **entonces** primero las que más
   porcentaje llevan gastado.
7. **Dado** un mes sin ningún presupuesto, **cuando** se abre «Mes», **entonces** la sección no
   ocupa sitio salvo, para quien puede editarlos, una fila para empezar.

### Casos límite

- El día de inicio de mes del hogar (por ejemplo, el 25): el presupuesto va del 25 al 24,
  como el resto de «Mes».
- Lo apartado en huchas no es un gasto y no cuenta en ningún presupuesto.
- Una categoría archivada deja de mostrarse en «Presupuestos» y en «Mes»; si se restaura,
  vuelve con su presupuesto.
- Cambiar el presupuesto el último día del mes: el mes en curso ya usa el nuevo.
- Sin conexión en Android: se ven los últimos datos cargados; guardar avisa de que no hay
  conexión, como el resto de la app.
- Importes grandes y texto grande del sistema: las filas no se cortan a 320 px.
- La exportación de datos incluye los presupuestos con sus importes y desde cuándo valen.

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-701**: El propietario y los editores DEBEN poder poner, cambiar y quitar el
  presupuesto mensual de cualquier categoría de gasto del hogar; los lectores solo verlo.
- **RF-702**: Un presupuesto DEBE valer desde el periodo en que se pone hasta que se cambia o
  se quita; los periodos pasados DEBEN conservar el que tenían.
- **RF-703**: Lo gastado de un presupuesto DEBE ser la suma de los gastos de su categoría en
  el periodo, calculada siempre a partir de los movimientos (nunca guardada).
- **RF-704**: Cada periodo DEBE empezar de cero: no se arrastra lo que sobra ni lo que falta.
- **RF-705**: «Mes» DEBE mostrar los presupuestos del periodo con lo gastado, una barra y lo
  que queda o lo que se ha pasado, con el estado en texto y color (normal, a partir del 80 % y
  pasado), siguiendo el estilo de la especificación 006.
- **RF-706**: No DEBE haber notificaciones de presupuestos; solo lo que se ve en la app.
- **RF-707**: Solo hay presupuestos por categoría de gasto; no hay presupuesto total ni de
  ingresos.
- **RF-708**: La exportación de datos DEBE incluir los presupuestos.
- **RF-709**: Todo DEBE cumplir WCAG 2.1 AA y funcionar igual en Android y en el navegador.

## Criterios de éxito _(obligatorio)_

- **CE-701**: Poner un presupuesto a una categoría lleva como mucho tres pasos desde «Mes»
  (abrir «Presupuestos», escribir el importe, guardar).
- **CE-702**: En una prueba con cientos de gastos de varias categorías y meses, lo gastado de
  cada presupuesto coincide al céntimo con la suma de sus gastos en ese periodo.
- **CE-703**: «Mes» sigue mostrándose en menos de 1 s con 500 movimientos y 15 presupuestos.
- **CE-704**: axe-core sin problemas en las pantallas nuevas a 320 y 1280 px; las pruebas de
  punta a punta anteriores siguen pasando.

## Supuestos

- «Mes» es el periodo del hogar según su día de inicio de mes, como en el resto de la app.
- Los importes van en la moneda del hogar (euro), con dos decimales.
- Una categoría tiene como mucho un presupuesto vigente cada periodo.
