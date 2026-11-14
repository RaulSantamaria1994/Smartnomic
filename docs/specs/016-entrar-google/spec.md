# Especificación: Entrar con Google

**Rama de la funcionalidad**: `016-entrar-google`
**Creada**: 2026-11-14
**Plan**: [`plan.md`](plan.md)
**Estado**: Implementada
**Entrada**: "vamos a implementar entrar con google" (Pendiente del MVP: «Inicio de sesión
solo con email y contraseña; Google llega más adelante».)

> Esta especificación describe **qué** debe conseguir la funcionalidad y **por qué**. El
> **cómo** va en el plan técnico, que debe cumplir
> [`docs/CONSTITUTION.md`](../../CONSTITUTION.md).

## Aclaraciones

### Sesión 2026-11-14

- P: ¿En qué plataformas y pantallas? → R: Android y web. Email y contraseña se quedan. El
  mismo botón «Continuar con Google» en **Entrar** y en **Crear cuenta** (si no hay cuenta, se
  crea). iOS sigue fuera.
- P: Si ya hay una cuenta con ese email y contraseña, ¿entrar con Google abre la misma? → R:
  Sí: se vinculan. Google ha comprobado que el email es suyo.
- P: ¿Cómo se borra la cuenta si no hay contraseña? → R: Si hay contraseña, se sigue pidiendo.
  Si no (solo Google), se confirma escribiendo el email y con dos toques. No se vuelve a
  abrir Google ni se obliga a poner una contraseña para borrar.
- P: ¿Se usa la foto de Google? → R: No. Solo nombre y email, como ahora.

## Escenarios de usuario y pruebas _(obligatorio)_

### Historia 1: Entrar o crear la cuenta con Google (Prioridad: P1) 🎯

Lucía oye hablar de Smartnomic y no quiere inventar otra contraseña. En **Entrar** pulsa
«Continuar con Google», elige su cuenta y entra: tiene un hogar propio, con euros y las
categorías de siempre. Otro día, desde el navegador, vuelve a pulsar el mismo botón y
encuentra sus datos.

**Por qué esta prioridad**: es la funcionalidad entera. Sin esto, seguiría haciendo falta
email y contraseña para empezar.

**Prueba independiente**: una persona sin cuenta entra con Google en Android y en el
navegador; se crea el hogar; cierra sesión y vuelve a entrar con Google; ve los mismos datos.

**Escenarios de aceptación**:

1. **Dado** alguien sin cuenta, **cuando** pulsa «Continuar con Google» en **Entrar** o en
   **Crear cuenta** y elige una cuenta de Google, **entonces** entra en la app con un hogar
   propio del que es propietario, con euros, inicio de mes el día 1, la zona horaria del
   dispositivo y las categorías predefinidas (igual que RF-002 / RF-1309).
2. **Dado** alguien que ya entró con Google, **cuando** cierra sesión y vuelve a pulsar
   «Continuar con Google» con la misma cuenta, **entonces** entra en la misma cuenta y ve sus
   datos; no se le crea otro hogar.
3. **Dado** **Entrar** y **Crear cuenta**, **cuando** se abren, **entonces** se ve el botón
   «Continuar con Google» además del formulario de email y contraseña, y se puede seguir
   registrándose o entrando como hasta ahora.
4. **Dado** un enlace de invitación sin sesión, **cuando** entra con Google y vuelve, **entonces**
   puede aceptar la invitación igual que si hubiera entrado con email.
5. **Dado** el botón, **cuando** se mira, **entonces** junto a él se explica que Google nos da
   el nombre y el email (no hay política de privacidad aparte, igual que la nota de los avisos
   de la 014).
6. **Dado** que cancela en la ventana de Google o no concede el permiso, **cuando** vuelve a
   la app, **entonces** sigue en **Entrar** o **Crear cuenta**, sin cuenta creada y sin un
   error alarmante: puede intentarlo de nuevo o usar email y contraseña.
7. **Dado** que entrar con Google no está disponible (aún no está configurado), **cuando** se
   abre **Entrar** o **Crear cuenta**, **entonces** el botón no se muestra y se puede entrar
   solo con email y contraseña.

---

### Historia 2: La misma cuenta, da igual cómo se entre (Prioridad: P2)

Juan se registró hace meses con su email y una contraseña. Un día pulsa «Continuar con
Google» con el Gmail de ese mismo email y entra: sus movimientos, hogares y ajustes siguen
ahí. Puede entrar las dos formas.

**Por qué esta prioridad**: si no se vinculan, Juan vería una cuenta vacía o un error y
creería que ha perdido los datos.

**Prueba independiente**: una cuenta creada con email y contraseña se abre con Google (mismo
email) y conserva hogares y movimientos; después se puede entrar otra vez con la contraseña.

**Escenarios de aceptación**:

1. **Dado** una cuenta creada con email y contraseña, **cuando** se pulsa «Continuar con
   Google» con una cuenta de Google de ese mismo email, **entonces** entra en esa cuenta, con
   los mismos hogares y datos; no se crea una segunda cuenta.
2. **Dado** esa cuenta ya vinculada, **cuando** entra con email y contraseña, **entonces**
   también funciona.
3. **Dado** una cuenta que solo ha usado Google, **cuando** alguien intenta **Crear cuenta**
   con ese mismo email y una contraseña, **entonces** no se crea otra cuenta: se dice que ya
   hay una con ese email (el mensaje de hoy) y puede entrar con Google.
4. **Dado** emails distintos (Gmail de Juan y la cuenta de Lucía), **cuando** cada uno entra
   con Google, **entonces** son cuentas distintas y no ven los datos del otro.

---

### Historia 3: Borrar la cuenta si se entra con Google (Prioridad: P3)

Lucía quiere irse. Entra en «Borrar mi cuenta». Como nunca puso contraseña, la app le pide
que escriba su email y que pulse dos veces. Se borra igual que hoy. Juan, que sí tiene
contraseña (aunque también entre con Google), sigue teniendo que escribirla: no basta con el
email.

**Por qué esta prioridad**: borrar la cuenta no se puede deshacer (RF-039) y hoy exige una
contraseña que quien solo usa Google no tiene.

**Prueba independiente**: se borra una cuenta que solo ha usado Google escribiendo el email y
confirmando; se intenta borrar una cuenta con contraseña escribiendo solo el email y no se
borra.

**Escenarios de aceptación**:

1. **Dado** una cuenta que tiene contraseña (con o sin Google), **cuando** se abre «Borrar mi
   cuenta», **entonces** se pide la contraseña como ahora (RF-1506) y escribir el email no
   basta.
2. **Dado** una cuenta que no tiene contraseña (solo Google), **cuando** se abre «Borrar mi
   cuenta», **entonces** no hay campo de contraseña: se pide escribir el email de la cuenta, y
   el botón de borrar sigue siendo el rojo relleno de la 015.
3. **Dado** esa pantalla, **cuando** el email escrito no coincide o está vacío, **entonces** se
   dice y no se borra.
4. **Dado** el email correcto, **cuando** se pulsa borrar, **entonces** se pide la misma
   confirmación de dos toques de hoy y, al confirmar, se borra igual (sesión terminada, vuelta
   a **Entrar**, datos personales fuera; hogares de los que era único miembro, fuera;
   propietario con más miembros, igual que ahora: primero pasar la propiedad).
5. **Dado** quien es propietario de un hogar con más miembros, **cuando** abre «Borrar mi
   cuenta», **entonces** ve el aviso y el enlace a «Miembros», sin campo de contraseña ni de
   email ni botón, igual que hoy.

### Casos límite

- El nombre de la cuenta es el que trae Google; se puede seguir viendo en «Hogar» / miembros
  como el nombre de hoy. No hay foto.
- Mayúsculas y espacios en el email al borrar: se comparan sin distinguir mayúsculas y
  recortando espacios.
- Recuperar la contraseña no cambia: si la cuenta tiene (o puede tener) email, el flujo de
  hoy sigue; no es la forma de borrar.
- Cancelar en Google, cerrar la ventana o volver atrás no deja una sesión a medias.
- Sin conexión, pulsar «Continuar con Google» muestra el error de red de hoy, no un fallo
  opaco.
- Dos dispositivos: entrar con Google en el móvil y en el navegador son la misma cuenta, como
  con email y contraseña.
- El email que escribe Google es el de esa cuenta de Google; no se pide ni se cambia a mano
  en el registro.
- Quien entra con Google y acepta una invitación no pierde el hogar que se le creó al
  registrarse (especificación 013): pasa a estar en los dos, hasta el máximo de 5.
- Lo que se apunta, los hogares y el resto de datos no se envían a Google: Google solo nos da
  nombre y email para identificar a la persona.

## Requisitos _(obligatorio)_

### Requisitos funcionales

- **RF-1601**: En **Entrar** y en **Crear cuenta**, en Android y en el navegador, DEBE haber un
  botón «Continuar con Google» además del formulario de email y contraseña. iOS sigue fuera.
- **RF-1602**: Email y contraseña DEBEN seguir funcionando igual (RF-001): registrarse,
  entrar, cerrar sesión y recuperar la contraseña.
- **RF-1603**: Quien pulsa «Continuar con Google» y elige una cuenta de Google DEBE entrar. Si
  no tenía cuenta, se le crea y se le crea un hogar como al registrarse con email (RF-002,
  RF-1309). Si ya tenía cuenta, entra en esa.
- **RF-1604**: Si ya existe una cuenta con el mismo email (creada con contraseña), entrar con
  Google DEBE abrir esa cuenta y DEBE permitir seguir entrando también con la contraseña. NO
  DEBE crear una segunda cuenta.
- **RF-1605**: Intentar **Crear cuenta** con email y contraseña cuando ese email ya existe
  (también si solo se ha usado Google) DEBE seguir rechazándose con el mensaje de hoy.
- **RF-1606**: Junto al botón DEBE explicarse que Google nos da el nombre y el email. NO DEBE
  usarse ni mostrarse la foto de Google.
- **RF-1607**: Si entrar con Google no está disponible, el botón NO DEBE mostrarse. Cancelar o
  denegar en Google NO DEBE crear cuenta ni dejar la sesión a medias.
- **RF-1608**: Un enlace de invitación DEBE poder completarse tras entrar con Google, igual
  que tras entrar con email.
- **RF-1609**: Borrar la cuenta (RF-039) DEBE seguir exigiendo la contraseña si la cuenta
  tiene una. Si no la tiene, DEBE exigirse escribir el email de la cuenta (sin distinguir
  mayúsculas, recortando espacios) y la confirmación en dos toques. Escribir el email NO DEBE
  bastar cuando hay contraseña.
- **RF-1610**: El resto del borrado NO DEBE cambiar: propietario con más miembros, único
  miembro, movimientos que se quedan como de «un antiguo miembro», botón rojo relleno
  (RF-1506 y RF-1507, salvo el campo cuando no hay contraseña).

### Entidades clave

- **Cuenta de Google**: la identidad que Google nos confirma (nombre y email). Una persona
  entra en Smartnomic con ella; no es un hogar ni sustituye al email de la cuenta.
- **Vinculación**: la misma cuenta de Smartnomic se puede abrir con contraseña y con Google
  cuando el email coincide.

## Criterios de éxito _(obligatorio)_

- **CE-1601**: Una persona sin cuenta termina de entrar con Google y ve «Mes» de su hogar
  nuevo en menos de 2 minutos (el mismo listón que CE-001), en Android y en el navegador.
- **CE-1602**: El 100 % de las cuentas de prueba creadas con email y contraseña se abren con
  Google del mismo email y conservan hogares y movimientos; después se puede entrar otra vez
  con la contraseña.
- **CE-1603**: El 100 % de los intentos de borrar una cuenta que tiene contraseña fallan si
  solo se escribe el email (o se omite la contraseña); el 100 % de las cuentas sin
  contraseña se borran al escribir el email correcto y confirmar dos veces.
- **CE-1604**: Dos personas con cuentas de Google distintas no ven nunca los datos de la otra
  (el mismo listón que CE-007).
- **CE-1605**: axe-core sin problemas WCAG 2.1 AA en **Entrar**, **Crear cuenta** y **Borrar
  mi cuenta** (con y sin contraseña), a 320 y 1280 px.

## Supuestos

- Google es un servicio externo y gratis para este uso. El propietario configura el acceso
  (igual que Firebase para los avisos); sin esa configuración el botón no se muestra y el
  resto de la app funciona.
- Nombre y email pasan por Google (fuera de la UE) para identificarse; no se le envían
  movimientos, hogares ni importes. Se explica junto al botón. Escribir una política de
  privacidad queda fuera, como en la 014.
- iOS sigue fuera de alcance, como en el MVP.
- No se añaden otros proveedores (Apple, etc.).
- No hay pantalla para «poner una contraseña» después de entrar con Google; recuperar la
  contraseña por email, si aplica, sigue siendo el flujo de hoy.
- La foto de Google no se guarda para mostrarla: no hay avatares en la app.
