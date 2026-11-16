# Especificación: Privacidad y ficha de Play

**Rama de la funcionalidad**: `017-play-privacidad`
**Creada**: 2026-11-16
**Plan**: [`plan.md`](plan.md)
**Estado**: Aprobada
**Entrada**: revisión de publicación en Google Play (2026-11-16). Play exige una URL de
privacidad y una URL web para borrar la cuenta antes de aceptar un AAB.

> Describe **qué** debe ver quien no tiene la app instalada. El **cómo** va en el plan.

## Aclaraciones

- P: ¿Texto legal aparte de las notas de Google y de los avisos? → R: Sí. Play no acepta
  solo las notas junto a los botones.
- P: ¿Hay que dar un email de contacto en el código? → R: No hace falta inventar uno. Se
  remite al correo de la ficha de Play. Cuando haya dominio propio, se añade.
- P: ¿El AAB entra en esta funcionalidad? → R: El perfil `production` de EAS (AAB). La
  clave de firma la crea el propietario y no entra en el repositorio.

## Historias

### Historia 1: Leer la privacidad sin instalar la app (P1)

Quien abre `https://<dominio>/privacidad` (Play Console, un navegador) lee qué datos se
guardan, quién los trata y cómo se borran, sin cuenta.

### Historia 2: Borrar la cuenta desde la web (P1)

Quien abre `https://<dominio>/borrar-cuenta` entiende qué se borra y puede entrar (web) para
confirmarlo, sin instalar Android. Con sesión, va a la pantalla de borrar de hoy.

### Historia 3: Perfil de producción (P2)

Se puede pedir a EAS un AAB firmado para Play, distinto del APK de prueba.

## Requisitos

- **RF-1701**: `/privacidad` es pública (sin sesión) y nombra: cuenta (nombre, email,
  contraseña o Google), hogares y movimientos, Railway (UE), Brevo (UE, recuperar
  contraseña), Google (entrar), Expo Push y FCM (texto del aviso de actividad, desactivable).
- **RF-1702**: `/borrar-cuenta` es pública. Explica el borrado (cuenta, dispositivos, hogares
  de un único miembro; movimientos de un hogar compartido quedan como de un antiguo
  miembro) y lleva a entrar y a borrar.
- **RF-1703**: En **Entrar**, **Crear cuenta** y **Hogar** hay un enlace a la privacidad.
- **RF-1704**: Tras entrar desde `/borrar-cuenta`, se abre **Borrar mi cuenta**.
- **RF-1705**: `eas.json` tiene un perfil `production` que genera AAB contra el servidor
  público. Sin clave en el repo.

## Criterios de éxito

- **CE-1701**: las dos URLs responden en la web exportada (mismo origen que la API).
- **CE-1702**: un test comprueba que el texto de privacidad nombra a Railway, Brevo, Google,
  Expo y Firebase.
- **CE-1703**: `safeNext` acepta `/delete-account` y sigue rechazando URLs ajenas.
