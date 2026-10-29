# Auditoría de seguridad — 29 de octubre de 2026

Objetivo: buscar filtraciones de datos (importes, notas, emails, datos de otros hogares) en
el servidor, la web, la app Android, el repositorio y la integración continua. Se probó
sobre `main` (`36a86f4`) con el servidor en modo producción contra PostgreSQL local. El
servidor de Railway no se pudo probar desde el entorno de la auditoría (su dominio está
bloqueado por la red), así que todo lo dinámico es local.

## Qué se probó

| Área                     | Cómo                                                                                                                             | Resultado                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Control de acceso        | Revisión de todas las rutas y de `requireMember`; 13 rutas sin sesión; 22 ataques de un usuario de otro hogar                    | Correcto (401 y 403)          |
| IDOR                     | Ids de movimientos, reglas, categorías, miembros e invitaciones de otro hogar usados desde el hogar propio                       | **1 fallo** (H1), corregido   |
| Roles                    | Lector y editor intentando escribir, gestionar miembros, crear un segundo propietario                                            | Correcto                      |
| Asignación masiva        | `householdId`, `memberId`, `role`, `email`, `emailVerified` de más en los cuerpos                                                | Se ignoran                    |
| Inyección                | SQL y HTML en notas, nombres, rutas y parámetros; JSON roto, `text/plain`, `__proto__`, cuerpo de 2 MB, importes fuera de rango  | Literales, sin errores 500    |
| Sesión                   | Cookie, salir, borrar la cuenta, reutilizar la cookie después                                                                    | Correcto                      |
| Origen y CSRF            | Entrar desde otro origen, preflight CORS, `SameSite`                                                                             | Correcto                      |
| Fuerza bruta             | Límite al entrar y al probar códigos de invitación, cambiando `X-Forwarded-For`                                                  | **1 fallo** (H2), corregido   |
| Enumeración de cuentas   | Entrar con email existente/inexistente; registrarse con email usado                                                              | 1 riesgo aceptado (R1)        |
| Cabeceras                | CSP, anti-iframe, `nosniff`, Referrer-Policy, HSTS, caché de la API                                                              | **Faltaban** (H3), corregido  |
| Archivos estáticos       | Recorrido de rutas (`..`, `%2e%2e`), `.env`, `.git` y carpetas con punto                                                         | Correcto                      |
| Errores y logs           | Mensajes de error; 776 líneas de log buscando emails, notas, importes, cookies e IPs                                             | Limpios                       |
| Exportación e invitación | Contenido de la exportación, lista de miembros y previo de una invitación                                                        | Sin emails ni datos ajenos    |
| Secretos                 | Archivos versionados e historial completo de git (claves de Brevo, `BETTER_AUTH_SECRET`, URLs de base de datos, claves privadas) | Nada                          |
| Bundle web               | Variables y secretos en el JavaScript publicado                                                                                  | Solo nombres de la librería   |
| App Android              | Manifiesto generado, almacenamiento de la sesión y de la caché                                                                   | **2 ajustes** (H4), corregido |
| Dependencias             | `pnpm audit --prod`                                                                                                              | Solo herramientas (R2)        |
| GitHub Actions           | Permisos del token, secretos en PR                                                                                               | Endurecido (H5)               |

## Hallazgos corregidos

**H1 — Importe de un movimiento de otro hogar visible en el calendario (medio).** Al pagar
un vencimiento, el id del movimiento lo elige la app. Si ese id ya existía en otro hogar,
no se creaba el movimiento pero el vencimiento quedaba enlazado al ajeno, y el calendario
mostraba su importe real (y sus cambios). Hacía falta conocer el id (por ejemplo, alguien
que salió del hogar y lo conserva en su caché). Ahora el pago se rechaza con 409 si el
movimiento no es del hogar, y el calendario solo une movimientos del propio hogar
(`routes/recurring.ts`, `routes/calendar.ts`; test en `recurring.test.ts`).

**H2 — Límite de intentos saltable con `X-Forwarded-For` (alto).** Con `trustProxy: true`,
la IP del límite era la primera de `X-Forwarded-For`, que inventa el cliente: cambiándola
se podían probar contraseñas o códigos de invitación sin freno (30 de 30 intentos
procesados). Ahora, en producción, los límites de Fastify y de Better Auth cuentan por
`X-Real-IP`, que Railway escribe y sustituye en cada petición (`server.ts`, `auth.ts`,
`index.ts`; test en `client-ip.test.ts`). Conviene confirmarlo en Railway: tras 10 intentos
fallidos desde un móvil, el 11.º debe dar «Demasiados intentos».

**H3 — Sin cabeceras de seguridad (medio).** Ahora todas las respuestas llevan CSP
(scripts solo del propio dominio, sin iframes), `X-Frame-Options: DENY`, `nosniff`,
`Referrer-Policy: no-referrer` (las invitaciones llevan el código en la URL),
`Permissions-Policy` y, en producción, HSTS; las de la API, `Cache-Control: no-store`
(`plugins/security-headers.ts`; test en `security-headers.test.ts`). Las pruebas de punta a
punta y un recorrido de 11 pantallas no muestran ninguna violación de la CSP.

**H4 — App Android (bajo).** `allowBackup` estaba activo: la copia de seguridad de Android
podía llevarse la caché con movimientos y notas. Ahora está desactivado, y se quitan
permisos que la app no usa (`SYSTEM_ALERT_WINDOW`, almacenamiento externo) en `app.json`.
La sesión ya iba en `expo-secure-store`.

**H5 — Permisos del token de GitHub (bajo).** Los flujos de CI y del APK ahora piden solo
`contents: read`.

## Riesgos aceptados y recomendaciones

- **R1 — Registrarse revela si un email ya tiene cuenta** (Better Auth responde
  `USER_ALREADY_EXISTS`). Evitarlo exige verificar el email por correo antes de crear la
  cuenta, que es una funcionalidad nueva. Mitigado por el límite de peticiones.
- **R2 — Avisos de `pnpm audit`** (`node-forge`, `zod` 3, `esbuild`, `deepmerge`): están en
  la CLI de Expo y en `drizzle-kit`, herramientas de desarrollo que no van ni en el servidor
  ni en la app. El `zod` del servidor (4.6.7) ya está corregido.
- **Notificaciones en la pantalla de bloqueo**: muestran el importe del pago. Si se quiere
  ocultar con el móvil bloqueado, el canal de avisos debe crearse con visibilidad privada
  (cambia cómo se ven los avisos: decisión de producto).
- **Clave de firma del APK**: se usa la de depuración de la plantilla de Expo. Para
  publicar, crear una clave propia (README, «APK de Android»).
- **Repetir la prueba de H2 en producción** tras desplegar, y revisar la configuración de
  Railway si algún día se pone una CDN delante (cambiaría la cabecera con la IP real).
