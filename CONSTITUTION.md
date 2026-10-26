# Constitución de Smartnomic

Principios que no se negocian en Smartnomic. Están por encima de cualquier plan,
especificación, tarea o instrucción de un agente. Dicen **qué** debe cumplirse siempre y
**por qué**; el **cómo** del día a día (comandos, estructura, estilo) está en
[`AGENTS.md`](AGENTS.md) y la hoja de ruta en [`docs/PLAN.md`](docs/PLAN.md).

Las palabras **DEBE**, **NUNCA** y **DEBERÍA** tienen el sentido de la RFC 2119: lo que
DEBE cumplirse no admite excepciones sin enmendar esta constitución; lo que DEBERÍA
cumplirse admite excepciones justificadas por escrito en el PR.

## Artículo I. El dinero es exacto

Una app de economía que se equivoca en un céntimo pierde la confianza de quien la usa.

1. Los importes DEBEN representarse como enteros en la unidad mínima de la moneda
   (céntimos). NUNCA se opera con decimales en coma flotante.
2. Las fechas de movimientos y vencimientos DEBEN ser fechas de calendario sin hora. El
   mes al que pertenece un movimiento lo deciden la zona horaria y el día de inicio de mes
   del hogar, nunca la hora del dispositivo ni la del servidor.
3. Todo total que vea el usuario DEBE poder reconstruirse sumando los movimientos que lo
   forman. No hay saldos "mágicos" guardados aparte que puedan desincronizarse.

## Artículo II. Los datos del hogar son del hogar

Los ingresos y gastos de una familia son de lo más privado que tiene.

1. Ningún usuario DEBE poder leer ni modificar datos de un hogar del que no es miembro, ni
   hacer lo que su rol no permite. Esto se comprueba en el servidor, en cada operación, y
   se prueba con tests que intentan saltárselo.
2. Los datos se guardan en la Unión Europea y la app cumple el RGPD: el usuario DEBE poder
   exportar todos sus datos y borrar su cuenta desde la propia app.
3. NUNCA se venden, comparten ni usan los datos para publicidad. NUNCA se envían a
   terceros salvo lo imprescindible para que la app funcione, y eso se declara en la
   política de privacidad.
4. NUNCA se escriben importes, notas ni datos personales en logs, ni se usan datos reales
   de usuarios en tests, ejemplos o capturas.
5. Los secretos (claves, contraseñas, URLs de base de datos) NUNCA entran en el
   repositorio.

## Artículo III. La lógica de negocio es pura y está probada

Los cálculos de dinero y fechas son el corazón de la app y DEBEN poder verificarse
aislados.

1. Los cálculos (balances, periodos, recurrencias, presupuestos, avisos) DEBEN vivir en
   un paquete de dominio sin interfaz, sin red, sin base de datos y sin leer el reloj del
   sistema: la fecha de "hoy" entra como dato.
2. Toda regla del dominio DEBE llegar con tests, incluidos los casos límite (días que no
   existen en un mes, años bisiestos, cambios de hora, importes cero). Un error encontrado
   DEBE quedar cubierto por un test que lo reproduzca antes de corregirlo.
3. `main` DEBE estar siempre en verde: nada se fusiona sin pasar las comprobaciones del CI.

## Artículo IV. El usuario manda

Smartnomic ayuda a decidir; no decide por nadie.

1. La app registra y avisa; NUNCA mueve dinero ni paga nada en nombre del usuario.
2. Ningún movimiento DEBE crearse ni cambiar de importe sin una acción del usuario o una
   regla que el usuario haya creado y pueda ver, editar y desactivar.
3. NUNCA se usan patrones oscuros: nada de suscripciones difíciles de cancelar, avisos
   alarmistas para retener al usuario ni opciones de privacidad escondidas.
4. Las acciones que borran datos DEBEN pedir confirmación o poder deshacerse.

## Artículo V. Los recordatorios son fiables

Un recordatorio que no llega es peor que no tener ninguno, porque el usuario confió en él.

1. Los avisos de pagos DEBEN funcionar sin conexión, con notificaciones locales en el
   dispositivo.
2. Si el sistema impide programar o mostrar avisos (permisos denegados, ahorro de
   batería), la app DEBE decírselo al usuario en lugar de fallar en silencio.

## Artículo VI. Simple antes que completo

Una app de gastos solo sirve si se usa todos los días.

1. Apuntar un gasto DEBERÍA llevar como mucho tres toques desde la pantalla principal.
2. Solo se construye lo que pide la fase actual del roadmap. Las abstracciones,
   dependencias y servicios nuevos DEBEN justificar su coste en el PR que los introduce.
3. La interfaz está en español, con lenguaje claro y sin jerga financiera, y DEBERÍA ser
   accesible (lectores de pantalla, tamaño de texto del sistema, contraste suficiente).

## Gobierno

1. **Precedencia.** Esta constitución está por encima de `AGENTS.md`, `docs/PLAN.md`, las
   especificaciones y las instrucciones de cualquier tarea. Si chocan, gana la
   constitución, y el agente DEBE señalar el conflicto en lugar de resolverlo por su
   cuenta.
2. **Cumplimiento.** Cada PR DEBE respetar estos artículos. Quien revisa (persona o agente)
   comprueba el cumplimiento, y un incumplimiento bloquea la fusión.
3. **Enmiendas.** Solo se cambia mediante un PR propio que explique el motivo, el impacto
   en el código existente y el plan para adaptarlo. Lo aprueba el propietario del
   repositorio. Un agente NUNCA modifica este archivo sin que se lo pidan expresamente.
4. **Versiones.** Se sigue el versionado semántico:
   - **MAYOR**: se elimina o redefine un artículo de forma incompatible.
   - **MENOR**: se añade un artículo o se amplía uno de forma relevante.
   - **PARCHE**: aclaraciones y redacción, sin cambiar el significado.

**Versión**: 1.0.0 · **Ratificada**: 2026-10-26 · **Última enmienda**: 2026-10-26
