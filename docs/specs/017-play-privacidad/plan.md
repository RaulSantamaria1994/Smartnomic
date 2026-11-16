# Plan: Privacidad y ficha de Play

**Especificación**: [`spec.md`](spec.md)
**Estado**: Aprobado

## Constitución

| Artículo | Encaje                                                                          |
| -------- | ------------------------------------------------------------------------------- |
| VI.6     | Exportar y borrar ya existen; ahora hay URL pública de privacidad y de borrado. |
| VI.3     | La clave de Play no entra en el repo.                                           |
| IX.1     | Las páginas son rutas Expo; en Android también se pueden abrir.                 |
| II.4     | El texto legal vive en un módulo, no repartido por pantallas.                   |

## Decisiones

| Decisión | Elegido                                                                   | Descartado                                              |
| -------- | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| Dónde    | Rutas Expo públicas `/privacidad` y `/borrar-cuenta` (como `/invitacion`) | HTML estático en el servidor: dos orígenes de texto     |
| Contacto | Correo de la ficha de Play                                                | Email inventado en el código                            |
| AAB      | Perfil `production` de EAS                                                | Cambiar el flujo de GitHub (sigue siendo APK de prueba) |

El servidor ya sirve `index.html` en GET que no son `/api/` (`server.ts`), así que las dos
rutas funcionan en Railway sin cambio de Fastify.

`safeNext` pasa a aceptar también `/delete-account` (RF-1704).

## Archivos

- `apps/mobile/src/legal/privacy.ts` — secciones y lista de encargados (test)
- `apps/mobile/app/privacidad.tsx`, `app/borrar-cuenta.tsx`
- `apps/mobile/src/session/next.ts` y su test
- `apps/mobile/eas.json` — `build.production`
- `README.md`, `AGENTS.md`
