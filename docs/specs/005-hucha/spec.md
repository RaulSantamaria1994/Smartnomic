# Especificación: Huchas para objetivos de ahorro

**Rama de la funcionalidad**: `005-hucha`
**Creada**: 2026-10-30
**Estado**: Implementada
**Plan**: [`plan.md`](plan.md)
**Entrada**: "Quiero añadir una hucha para objetivos que establezca el usuario, para ahorrar
una cantidad en un plazo establecido."

> Esta especificación describe **qué** debe hacer la funcionalidad y **por qué**, desde el
> punto de vista de quien la usa. El **cómo** va en el plan técnico, que debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md). Parte del MVP
> ([`001-mvp-hogar`](../001-mvp-hogar/spec.md)): hogar, roles, resumen del mes, avisos.

## Aclaraciones

### Sesión 2026-10-30

- P: ¿De quién son las huchas? → R: Del hogar. Las ven todos los miembros; el propietario
  y los editores las crean y aportan, los lectores solo las ven.
- P: ¿Cómo se aparta el dinero? → R: Cada hucha tiene un día del mes elegido por el
  usuario. Ese día la aportación aparece como pendiente (en «Mes», en el calendario y con
  un aviso), igual que un pago programado. Al confirmarla se aparta; se puede cambiar el
  importe o saltar ese mes.
- P: ¿Cómo afecta al resumen del mes? → R: Lo apartado se resta de «Te quedan este mes»
  y se muestra como «Apartado para objetivos», separado de los gastos.
- P: ¿Qué hace la app con el plazo? → R: Calcula cuánto hay que apartar cada mes para
  llegar a tiempo y enseña el progreso y si se va al día. No crea pagos programados.

## Escenarios de usuario y pruebas _(obligatorio)_

Las historias están ordenadas por prioridad. Cada una se puede desarrollar, probar y
enseñar por separado.

### Historia 1: Crear una hucha y ver cuánto apartar (Prioridad: P1) 🎯

Lucía quiere juntar 1.200 € para las vacaciones de agosto. Crea la hucha «Vacaciones» con
ese objetivo, el plazo el 31 de julio y el día 1 para apartar. La app le dice que tiene
que apartar 133,34 € al mes.

**Por qué esta prioridad**: es la funcionalidad en sí: poner un objetivo con plazo y saber
qué esfuerzo mensual supone.

**Prueba independiente**: se crea una hucha y se comprueba la cuota mensual, el progreso
(0 %) y que aparece en la lista de huchas del hogar.

**Escenarios de aceptación**:

1. **Dado** un editor o el propietario, **cuando** crea una hucha con nombre, icono,
   importe objetivo, fecha límite y día del mes para apartar, **entonces** la hucha
   aparece en la lista con su progreso y la cuota mensual.
2. **Dado** una hucha, **cuando** se muestra, **entonces** la cuota es lo que falta
   dividido entre las aportaciones que quedan hasta la fecha límite (los días de apartar
   que caen entre hoy y el plazo), redondeada al céntimo hacia arriba.
3. **Dado** una hucha, **cuando** se muestra, **entonces** se ve lo ahorrado, lo que falta,
   el porcentaje, el plazo y si va al día o retrasada respecto a lo previsto.
4. **Dado** un lector, **cuando** abre las huchas, **entonces** las ve pero no puede
   crear, editar ni aportar.

---

### Historia 2: Apartar la cuota el día elegido (Prioridad: P2)

El día 1 de cada mes, Lucía recibe un aviso: «Hoy apartas para Vacaciones». En «Mes» ve la
aportación pendiente; la confirma con la cuota propuesta o con otro importe, o se la salta
ese mes.

**Por qué esta prioridad**: convierte el objetivo en un hábito y mantiene la hucha igual
que el dinero que de verdad se ha movido.

**Prueba independiente**: con una hucha con día de apartar hoy, se comprueba que aparece la
aportación pendiente en «Mes» y en el calendario, que confirmarla suma a la hucha y resta
de «Te quedan este mes», y que saltarla no cambia nada y recalcula la cuota.

**Escenarios de aceptación**:

1. **Dado** una hucha en curso, **cuando** llega su día de apartar, **entonces** aparece una
   aportación pendiente con la cuota en «Próximos pagos», en el calendario y, en Android,
   un aviso a la hora de avisos del miembro (sin el importe, como el resto de avisos).
2. **Dado** una aportación pendiente, **cuando** un editor la confirma con la cuota u otro
   importe, **entonces** la hucha suma ese importe y el resumen de ese mes muestra la
   cantidad en «Apartado para objetivos» y la resta de «Te quedan este mes».
3. **Dado** una aportación pendiente, **cuando** se salta, **entonces** no se aparta nada
   y la cuota de los meses siguientes se recalcula.
4. **Dado** una aportación que no se confirma ni se salta, **cuando** pasa su día,
   **entonces** aparece como atrasada, igual que un pago.
5. **Dado** un día 31 para apartar, **cuando** el mes tiene menos días, **entonces** la
   aportación cae el último día del mes (como RF-026 del MVP).
6. **Dado** dos miembros que confirman la misma aportación a la vez, **cuando** llegan las
   dos peticiones, **entonces** solo se aparta una vez.

---

### Historia 3: Aportar o sacar cuando se quiera (Prioridad: P3)

Lucía cobra una paga extra y mete 300 € más en la hucha. Otro mes le surge un imprevisto y
saca 100 €.

**Escenarios de aceptación**:

1. **Dado** una hucha, **cuando** un editor aporta un importe con fecha, **entonces** la
   hucha lo suma y cuenta como apartado en el mes de esa fecha.
2. **Dado** una hucha con saldo, **cuando** un editor saca un importe no mayor que el
   saldo, **entonces** la hucha lo resta y ese mes «Apartado para objetivos» baja en esa
   cantidad (el dinero vuelve a lo que queda del mes).
3. **Dado** una hucha, **cuando** se abre, **entonces** se ve su historial de aportaciones
   y retiradas con fecha, importe y quién las hizo, y se puede deshacer la última.

---

### Historia 4: Conseguir el objetivo o cambiar de planes (Prioridad: P4)

Lucía llega a los 1.200 € antes de julio. La hucha queda como conseguida y deja de pedir
aportaciones. En agosto usa el dinero para el viaje.

**Escenarios de aceptación**:

1. **Dado** una hucha que llega al objetivo, **cuando** se aparta lo que faltaba,
   **entonces** queda como conseguida, lo celebra y no genera más aportaciones.
2. **Dado** una hucha conseguida, **cuando** el usuario la cierra para usar el dinero,
   **entonces** el saldo vuelve a lo que queda de ese mes como retirada, para que los
   gastos que apunte del viaje no cuenten dos veces, y la hucha pasa a cerradas.
3. **Dado** una hucha cuya fecha límite pasa sin llegar al objetivo, **cuando** se abre,
   **entonces** se indica que el plazo ha vencido y se puede ampliar el plazo, cambiar el
   objetivo o cerrarla.
4. **Dado** una hucha, **cuando** se edita el objetivo, el plazo o el día de apartar,
   **entonces** la cuota y las aportaciones pendientes futuras se recalculan; las ya
   hechas no cambian.

### Casos límite

- Plazo muy cercano: si la fecha límite cae antes del próximo día de apartar, la cuota es
  todo lo que falta y se propone apartarlo ya.
- Objetivo menor o igual que lo ahorrado al editar: la hucha pasa a conseguida.
- Importes: en céntimos, como el resto de la app; objetivo mayor que 0 y como mucho el
  máximo de un movimiento.
- Sacar más que el saldo: se rechaza.
- Muchas huchas (por ejemplo 20): la lista sigue siendo legible; «Mes» enseña solo las
  aportaciones del periodo.
- El periodo del hogar no empieza el día 1 (RF del MVP): lo apartado cuenta en el periodo
  de su fecha, igual que los movimientos.
- Borrar una hucha con aportaciones: no se borra; se cierra devolviendo el saldo, para no
  cambiar los resúmenes de meses pasados.
- Exportar los datos y borrar la cuenta (RF-038/039 del MVP) incluyen las huchas.
- Sin conexión en Android: se ven los últimos datos; aportar necesita conexión, como pagar.

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-501**: El propietario y los editores DEBEN poder crear, editar y cerrar huchas con
  nombre, icono, importe objetivo, fecha límite y día del mes para apartar; todos los
  miembros DEBEN poder verlas.
- **RF-502**: Cada hucha DEBE mostrar lo ahorrado, lo que falta, el porcentaje, la cuota
  mensual para llegar a tiempo y si va al día o retrasada.
- **RF-503**: Cada mes, en el día elegido, DEBE aparecer una aportación pendiente con la
  cuota, en «Próximos pagos», en el calendario y como aviso en Android.
- **RF-504**: Una aportación pendiente DEBE poderse confirmar (con la cuota u otro importe)
  o saltar; confirmarla dos veces no aparta dos veces.
- **RF-505**: Se DEBE poder aportar o sacar dinero en cualquier momento, sin sacar más que
  el saldo, y ver el historial de movimientos de la hucha.
- **RF-506**: El resumen del mes DEBE mostrar «Apartado para objetivos» (aportado menos
  sacado en el periodo) y restarlo de «Te quedan este mes»; los gastos no lo incluyen.
- **RF-507**: Al llegar al objetivo la hucha DEBE quedar como conseguida y dejar de pedir
  aportaciones; al cerrarla, su saldo DEBE volver al mes como retirada.
- **RF-508**: Las huchas y sus movimientos DEBEN incluirse en la exportación de datos y
  cumplir los mismos permisos y el mismo aislamiento entre hogares que el resto.
- **RF-509**: Las pantallas de huchas DEBEN ser accesibles (WCAG 2.1 AA) y funcionar igual
  en Android y en el navegador.

### Entidades clave

- **Hucha**: hogar, nombre, icono, importe objetivo, fecha límite, día del mes para
  apartar, estado (en curso, conseguida, cerrada) y fechas.
- **Movimiento de hucha**: aportación o retirada, con importe, fecha, quién la hizo y, si
  viene de una aportación pendiente, a qué mes corresponde (para no repetirla).

## Criterios de éxito _(obligatorio)_

### Resultados medibles

- **CE-501**: Crear una hucha lleva menos de 1 minuto y como mucho una pantalla.
- **CE-502**: Confirmar la aportación del mes lleva como mucho 2 toques desde «Mes».
- **CE-503**: En el 100 % de los casos de prueba, lo ahorrado en las huchas coincide con la
  suma de «Apartado para objetivos» de todos los meses.
- **CE-504**: «Mes» sigue mostrándose en menos de 1 s con 500 movimientos y 10 huchas.

## Supuestos

- Las huchas no mueven dinero real ni se conectan con el banco: registran lo que el hogar
  aparta.
- El icono de la hucha sale del catálogo de iconos de la especificación 004.
- Los avisos usan la hora de avisos de cada miembro, como los de los pagos.
