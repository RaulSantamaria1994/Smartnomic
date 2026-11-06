# Especificación: Cambios en tiempo real

**Rama de la funcionalidad**: `012-tiempo-real`
**Creada**: 2026-11-06
**Plan**: [`plan.md`](plan.md)
**Estado**: Aprobada
**Entrada**: "Vamos con cambios en tiempo real." (Pendiente del MVP: «Los cambios de otros
miembros se ven al actualizar o reabrir la app; las actualizaciones en tiempo real […] quedan
para más adelante».)

> Esta especificación describe **qué** debe conseguir la funcionalidad y **por qué**. El
> **cómo** va en el plan técnico, que debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md).

## Aclaraciones

### Sesión 2026-11-06

- P: ¿Qué se actualiza al momento? → R: Todo lo del hogar: movimientos, pagos recurrentes,
  huchas, presupuestos, categorías, ajustes y miembros.
- P: ¿Se avisa de cada cambio? → R: No: las cifras y listas se actualizan solas, sin mensajes.
- P: ¿Con la app cerrada o en segundo plano? → R: No, solo con la app abierta; al abrirla ya
  está todo al día, como ahora. Sin notificaciones push.
- P: ¿En qué plataformas? → R: En Android y en el navegador, igual.

## Escenarios de usuario y pruebas _(obligatorio)_

### Historia 1: Ver al momento lo que apunta otro miembro (Prioridad: P1) 🎯

Lucía y Juan comparten hogar. Lucía tiene «Mes» abierto en el móvil; Juan apunta en el
navegador 45,30 € de Supermercado. Sin tocar nada, a Lucía le aparece el gasto en la lista y el
resumen y el presupuesto de Supermercado cambian.

**Por qué esta prioridad**: es la funcionalidad entera.

**Prueba independiente**: con dos sesiones abiertas de dos miembros, cada cambio de uno se ve
en la otra en pocos segundos, sin recargar, en cualquier pantalla.

**Escenarios de aceptación**:

1. **Dado** dos miembros con la app abierta, **cuando** uno apunta, edita o borra un
   movimiento, **entonces** el otro lo ve en «Mes», «Gráficas», la búsqueda y «Calendario» en
   menos de 2 segundos, sin hacer nada.
2. **Dado** lo mismo, **cuando** uno marca un pago como pagado u omitido, crea o cambia un pago
   recurrente, aporta o saca de una hucha, cambia un presupuesto, una categoría o los ajustes
   del hogar, **entonces** el otro lo ve igual.
3. **Dado** un cambio de miembros (alguien entra, sale, cambia de rol), **cuando** ocurre,
   **entonces** los demás ven la lista de miembros al día y, si a uno le cambian el rol, lo que
   puede hacer cambia sin cerrar la app.
4. **Dado** un cambio propio, **cuando** se guarda, **entonces** se ve como hasta ahora (no
   llega dos veces ni parpadea).
5. **Dado** que no se avisa, **cuando** llega un cambio, **entonces** no salen mensajes: solo
   cambian las cifras y listas, y si el lector de pantalla está leyendo una lista, no se le
   interrumpe con avisos.
6. **Dado** una pantalla de edición abierta (por ejemplo, editar un movimiento), **cuando**
   otro cambia ese mismo movimiento, **entonces** lo que se está escribiendo no se borra; al
   guardar, se guarda lo último, como hasta ahora.

---

### Historia 2: Conexión que va y viene (Prioridad: P2)

Lucía entra en el metro y pierde la conexión un minuto. Al salir, la app se pone al día sola,
también con lo que Juan apuntó mientras tanto.

**Por qué esta prioridad**: en el móvil la conexión se corta a menudo; sin esto, el tiempo
real dejaría de funcionar sin que nadie lo note.

**Prueba independiente**: se corta la conexión, otro miembro hace cambios, se recupera la
conexión y en pocos segundos se ve todo, sin recargar.

**Escenarios de aceptación**:

1. **Dado** que se pierde la conexión, **cuando** vuelve, **entonces** la app se reconecta sola
   y recarga lo que pueda haber cambiado mientras tanto.
2. **Dado** que la app pasa a segundo plano o se cierra la pestaña, **cuando** vuelve,
   **entonces** se reconecta y se pone al día.
3. **Dado** que el servidor se reinicia (una actualización), **cuando** vuelve, **entonces**
   las apps abiertas se reconectan solas en pocos segundos.
4. **Dado** que no hay conexión en tiempo real (por lo que sea), **cuando** se usa la app,
   **entonces** todo funciona como hasta ahora: los datos se actualizan al volver a la app o al
   recargar.

### Casos límite

- Privacidad: a cada miembro solo le llegan avisos de su hogar, y los avisos no llevan
  importes, notas ni nombres: solo qué tipo de cosa cambió, para que la app la recargue.
- Quien sale o es quitado de un hogar deja de recibir sus cambios en ese momento.
- Cerrar sesión corta la conexión en tiempo real.
- Muchos cambios seguidos (por ejemplo, 20 movimientos sin conexión enviados de golpe): la app no
  recarga 20 veces; agrupa lo que llega casi a la vez.
- Varios dispositivos de la misma persona: los cambios hechos en uno se ven en los otros.
- Los movimientos apuntados sin conexión (especificación 011) que se envían al volver se ven en
  los demás al llegar.
- Con muchos hogares a la vez, el servidor no se ralentiza para las peticiones normales.

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-1201**: Con la app abierta, cualquier cambio que haga un miembro en su hogar DEBE verse
  en las apps abiertas de los demás miembros (y en sus otros dispositivos) sin recargar.
- **RF-1202**: Las actualizaciones NO DEBEN mostrar mensajes ni interrumpir lo que se está
  haciendo o escribiendo.
- **RF-1203**: Solo los miembros del hogar DEBEN recibir sus avisos; los avisos NO DEBEN llevar
  datos personales ni importes.
- **RF-1204**: La app DEBE reconectarse sola tras cortes de conexión, segundo plano o reinicios
  del servidor, y ponerse al día al reconectar.
- **RF-1205**: Sin tiempo real, la app DEBE seguir funcionando como hasta ahora.
- **RF-1206**: Con la app cerrada o en segundo plano no hay avisos (sin notificaciones push).
- **RF-1207**: Igual en Android y en el navegador.

## Criterios de éxito _(obligatorio)_

- **CE-1201**: En una prueba con dos miembros, cada tipo de cambio (movimientos, pagos,
  huchas, presupuestos, categorías, ajustes y miembros) se ve en la otra sesión en menos de 2 s.
- **CE-1202**: Tras cortar la conexión 30 s con cambios por medio, todo está al día menos de
  10 s después de recuperarla, sin recargar.
- **CE-1203**: Un miembro de otro hogar no recibe ningún aviso, y quien sale de un hogar deja
  de recibirlos en el momento.
- **CE-1204**: 20 cambios casi a la vez no provocan más de unas pocas recargas en las demás
  sesiones.
- **CE-1205**: Las pruebas de punta a punta anteriores siguen pasando y el tiempo de respuesta
  de las rutas no empeora de forma apreciable con 50 conexiones abiertas.

## Supuestos

- Sustituye al criterio CE-009 del MVP («visible en menos de 5 s tras actualizar la pantalla»):
  ahora es sin actualizar.
- La app sigue pidiendo los datos como siempre: los avisos solo le dicen qué recargar.
