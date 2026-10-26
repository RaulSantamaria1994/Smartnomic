# Smartnomic: arquitectura y roadmap

> Documento de planificación. Todavía no hay código. Las decisiones marcadas como
> **(propuesta)** están abiertas a cambio antes de empezar la fase 0.

## 1. Qué es la app

Una app móvil para que un hogar (una persona o varias que conviven) apunte sus **ingresos**
y **gastos** de cada mes y sepa en todo momento cómo va su economía:

- Cuánto ha entrado, cuánto ha salido y cuánto queda este mes.
- En qué se va el dinero (por categorías) y cómo evoluciona mes a mes.
- Qué pagos están por llegar (alquiler, luz, seguros, suscripciones…) y **avisos** antes de
  que venzan.

### Principios de producto

- **El usuario manda.** La app registra y avisa; nunca mueve dinero ni crea o cambia
  movimientos sin una acción del usuario o una regla que él pueda ver y desactivar.
- **Sin trucos.** Nada de suscripciones difíciles de cancelar, avisos alarmistas para
  retener ni opciones de privacidad escondidas. Los datos nunca se venden ni se usan para
  publicidad.
- **Rápido de usar.** Apuntar un gasto lleva como mucho tres toques desde la pantalla
  principal.
- **Claro.** Español sencillo, sin jerga financiera.
- **Borrar es seguro.** Borrar pide confirmación o se puede deshacer.

### Fuera de alcance al principio

- Conexión automática con el banco (se estudia en la fase 5).
- Inversiones, criptomonedas, contabilidad de autónomos o declaración de la renta.
- Varias monedas en el mismo hogar (se guarda la moneda, pero solo se usa una).

## 2. Conceptos del dominio

| Concepto            | Qué es                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Hogar**           | La unidad que comparte la economía. Tiene moneda, día de inicio de mes y zona horaria.       |
| **Miembro**         | Persona del hogar, con rol `propietario`, `editor` o `lector`.                               |
| **Movimiento**      | Un ingreso o un gasto: importe, fecha, categoría, quién lo hizo, nota.                       |
| **Categoría**       | Vivienda, Supermercado, Transporte, Ocio… (predefinidas y editables), con subcategorías.     |
| **Pago recurrente** | Una regla que se repite: "Alquiler, 750 €, el día 1 de cada mes". También ingresos fijos.    |
| **Vencimiento**     | Cada aparición concreta de un pago recurrente (1 de noviembre). Pendiente, pagado u omitido. |
| **Presupuesto**     | Límite por categoría y mes ("Ocio: 150 €").                                                  |
| **Recordatorio**    | Aviso de un vencimiento X días antes y el mismo día; también avisos de presupuesto.          |

Reglas importantes que conviene fijar desde el principio:

- **Dinero en céntimos enteros** (`amountCents: number`, nunca decimales con coma
  flotante). El formateo (`1.234,56 €`) solo ocurre en la interfaz, con `Intl.NumberFormat`.
- **Fechas de calendario sin hora** (`2026-11-01`) para movimientos y vencimientos, y la
  zona horaria del hogar para decidir "qué mes es". Así un gasto apuntado a las 23:30 no
  salta de mes.
- **Mes configurable**: mucha gente cobra el 25 o el 28; el hogar puede decir que su mes
  empieza ese día.
- **Marcar un vencimiento como pagado crea el movimiento** correspondiente (con el importe
  real, que puede diferir del previsto: la luz nunca cuesta lo mismo).

## 3. Arquitectura

### Decisiones

| Decisión         | Elección **(propuesta)**                                                      | Motivo                                                              |
| ---------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Lenguaje         | TypeScript en todo                                                            | Tipos compartidos entre app y servidor                              |
| Monorepo         | pnpm workspaces                                                               | El dominio y los esquemas se comparten entre móvil y servidor       |
| Móvil            | Expo + Expo Router                                                            | Android/iOS (y web) con una base de código; stack ya conocido       |
| Estado en la app | TanStack Query (datos del servidor) + Zustand (UI)                            | Caché, reintentos y modo sin conexión básico sin escribirlos a mano |
| Gráficas         | Victory Native o react-native-gifted-charts                                   | Tarta por categorías y barras por mes                               |
| Backend          | Node + Fastify, API REST                                                      | Ya conocido; no hace falta tiempo real                              |
| Base de datos    | PostgreSQL + Drizzle ORM (migraciones)                                        | Datos relacionales y sumas por mes/categoría en SQL                 |
| Autenticación    | Better Auth (email + contraseña, luego Google/Apple)                          | Sesiones seguras sin montar el sistema a mano; integra con Expo     |
| Validación       | zod (esquemas compartidos en `packages/api`)                                  | Mismos tipos y validación en los dos lados                          |
| Recordatorios    | expo-notifications: locales en la fase 1, push desde el servidor en la fase 3 | Los locales funcionan sin conexión y sin infraestructura            |
| Tests            | Vitest                                                                        | Rápido, sintaxis de Jest                                            |
| Despliegue       | Railway (servidor + Postgres, región UE) y EAS Build                          | Ya conocido; los datos se quedan en la UE (RGPD)                    |

**¿Por qué servidor desde el principio y no solo datos en el móvil?** Porque la idea es un
_hogar_: en cuanto dos personas comparten gastos, hace falta un sitio común. Empezar solo
en local y añadir sincronización después obliga a resolver conflictos entre dispositivos,
que es la parte más difícil. Con el servidor como fuente de verdad, la app guarda en caché
lo último que vio (para consultarlo sin conexión) y los cambios hechos sin conexión se
reintentan al volver.

### Capas

```
apps/mobile ──┐
              ├──> packages/api ──> packages/domain
apps/server ──┘                         ▲
       └──────────> (Postgres) ─────────┘ (el servidor usa el dominio para calcular)
```

- **packages/domain** — lógica pura, sin React, sin red, sin `Date.now()` (la fecha de
  "hoy" entra como parámetro). Es el corazón y lo que más tests lleva:
  - Dinero: sumar, repartir, formatear importes en céntimos.
  - Periodos: qué fechas forman "el mes" de un hogar según su día de inicio.
  - Recurrencias: dada una regla, generar los vencimientos entre dos fechas (mensual,
    cada N meses, anual, semanal; "el día 31" en febrero cae el 28/29).
  - Resúmenes: balance del mes, gasto por categoría, comparación con el mes anterior,
    progreso de presupuestos, previsión de fin de mes (lo ya gastado + lo que falta por
    vencer).
  - Recordatorios: qué avisos tocan para una fecha dada.
- **packages/api** — contrato entre app y servidor: esquemas zod de peticiones y
  respuestas, y los tipos que se derivan de ellos.
- **apps/server** — API REST con Fastify. Comprueba que el usuario es miembro del hogar y
  tiene el rol adecuado en **cada** petición, guarda en Postgres y usa el dominio para los
  resúmenes y para generar vencimientos. En la fase 3, un proceso programado envía los
  avisos push.
- **apps/mobile** — pantallas, formularios y gráficas. Programa las notificaciones
  locales a partir de los vencimientos próximos.

### Modelo de datos (primera versión)

```
users            id, email, name, created_at
households       id, name, currency ('EUR'), month_start_day (1-28), timezone
memberships      household_id, user_id, role, reminders_enabled
categories       id, household_id, name, kind (income|expense), parent_id, icon, color, archived
transactions     id, household_id, kind, amount_cents, date, category_id, member_id,
                 note, recurring_id?, occurrence_date?, created_by, created_at, updated_at, deleted_at
recurring_rules  id, household_id, kind, name, amount_cents, category_id,
                 frequency (weekly|monthly|yearly), interval, day_of_month?, start_date, end_date?,
                 remind_days_before, autopay (bool)
occurrences      recurring_id, due_date, status (pending|paid|skipped), transaction_id?, resolved_by
budgets          household_id, category_id, month (YYYY-MM), limit_cents
push_tokens      user_id, token, platform            (fase 3)
invitations      household_id, role, code, expires_at, status
```

- Los vencimientos (`occurrences`) solo se guardan cuando cambian de estado; los pendientes
  se calculan al vuelo con el dominio. Así, editar una regla no deja filas viejas
  colgando.
- Borrado lógico (`deleted_at`) en movimientos para poder deshacer.
- Todas las tablas cuelgan de `household_id`: es la frontera de permisos.

### Recordatorios en detalle

1. **Fase 1 (locales):** al abrir la app y tras cada cambio, la app calcula los
   vencimientos de los próximos 60 días y reprograma sus notificaciones locales ("Mañana
   vence el seguro del coche: 320 €"). iOS limita a 64 notificaciones programadas, por eso
   la ventana es corta y se renueva. Ventaja: funciona sin servidor de avisos y sin
   conexión.
2. **Fase 3 (push):** un trabajo programado en el servidor (cada hora, por zona horaria)
   envía los avisos con Expo Push. Necesario para hogares compartidos ("Ana ha marcado
   el alquiler como pagado") y para avisar de presupuestos superados.
3. Desde la notificación se puede ir directo al pago y marcarlo como pagado.

### Seguridad y privacidad

Son datos económicos personales, así que desde el principio:

- HTTPS siempre; contraseñas con hash (lo gestiona Better Auth); sesión guardada en
  `expo-secure-store`, no en AsyncStorage.
- Comprobación de pertenencia al hogar en el servidor en cada consulta (tests que
  intenten leer datos de otro hogar).
- Límite de peticiones en login y registro.
- RGPD: base de datos en la UE, exportar todos los datos (CSV/JSON) y borrar la cuenta
  desde la app; política de privacidad antes de publicar en las tiendas.
- Bloqueo opcional de la app con huella/Face ID (`expo-local-authentication`).

## 4. Roadmap

Cada fase termina con algo usable y su APK de prueba. Las duraciones son orientativas
para una persona a tiempo parcial.

### Fase 0 — Fundaciones (≈1 semana)

- Monorepo en este repositorio (pnpm, TypeScript, ESLint, Prettier, Vitest, CI en
  GitHub Actions con `pnpm check`).
- Esqueleto de `apps/mobile`, `apps/server`, `packages/domain`, `packages/api`.
- Postgres en local (Docker) y en Railway; Drizzle con la primera migración.
- `packages/domain`: dinero en céntimos y periodos mensuales, con tests.

**Hecho cuando:** el CI pasa y la app abre una pantalla que habla con `GET /health`.

### Fase 1 — MVP del hogar (≈5-6 semanas)

Especificación: [`specs/001-mvp-hogar/spec.md`](../specs/001-mvp-hogar/spec.md).
Plataformas: Android y navegador.

- Registro e inicio de sesión; al registrarse se crea un hogar del que el usuario es
  propietario.
- Categorías predefinidas (editables).
- Apuntar, editar y borrar ingresos y gastos (formulario rápido: importe → categoría →
  guardar en 3 toques).
- Pantalla **Mes**: ingresos, gastos, balance, lista de movimientos, cambiar de mes.
- Pagos recurrentes: crear la regla, ver los próximos vencimientos y marcarlos como
  pagados.
- **Recordatorios locales** de vencimientos en Android; en el navegador, vencimientos
  destacados en la pantalla principal.
- **Hogar compartido:** invitar miembros por enlace o código, roles (propietario, editor,
  lector), quién apuntó o pagó cada cosa.
- Ajustes: moneda, día de inicio del mes.

**Hecho cuando:** dos personas llevan juntas el mes de su hogar, desde Android o el
navegador, y reciben en Android el aviso del alquiler el día antes.

### Fase 2 — Entender el dinero (≈2-3 semanas)

- Gráfica por categorías del mes y evolución de los últimos 6-12 meses.
- Presupuestos por categoría con barra de progreso y aviso al 80 % y al 100 %.
- Previsión de fin de mes (lo que queda por pagar de los recurrentes).
- Búsqueda y filtros de movimientos.
- Exportar a CSV.

### Fase 3 — Hogar en tiempo real (≈2-3 semanas)

- Cambios de otros miembros al instante, sin actualizar la pantalla.
- Filtro de movimientos por miembro.
- Pertenecer a varios hogares.
- Notificaciones push desde el servidor (vencimientos y cambios de otros miembros).
- Modo sin conexión mejorado: cola de cambios pendientes que se envía al volver la red.

### Fase 4 — Publicación (≈2 semanas)

- Pulido de interfaz, accesibilidad, modo oscuro.
- Bloqueo con biometría, exportar y borrar cuenta, política de privacidad.
- Inicio de sesión con Google y Apple (Apple es obligatorio en iOS si hay otros sociales).
- Monitorización de errores (Sentry) y copias de seguridad de Postgres.
- Publicación en Google Play.
- App para iOS (y App Store si hay cuenta de desarrollador).

### Fase 5 — Más adelante (ideas, sin orden)

- Importar extractos bancarios (CSV/Excel de los bancos españoles más comunes).
- Conexión bancaria automática vía un agregador PSD2 (p. ej. Tink o Salt Edge): coste y
  requisitos legales a estudiar.
- Foto del ticket con lectura automática del importe.
- Metas de ahorro ("Vacaciones: 1.200 € para julio").
- Reparto de gastos entre miembros ("quién debe a quién").
- Widget de pantalla de inicio con el balance del mes.

## 5. Riesgos

| Riesgo                                                | Cómo se mitiga                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| Apuntar a mano cansa y la gente deja de usarla        | Formulario de 3 toques, recurrentes automáticos, importación en fase 5 |
| Notificaciones que no llegan (Android ahorra batería) | Reprogramar al abrir; push del servidor como respaldo en la fase 3     |
| Errores de redondeo o de mes por zona horaria         | Céntimos enteros y fechas sin hora, con tests en `packages/domain`     |
| Fuga de datos entre hogares                           | Filtro por `household_id` en todas las consultas y tests específicos   |

## 6. Decisiones

Tomadas (2026-10-26):

1. **Hogar compartido en el MVP:** sí, con invitaciones y roles desde la fase 1.
2. **Plataformas del MVP:** Android y navegador. iOS más adelante.

Pendiente:

1. **Publicación:** si se piensa publicar en tiendas o es de uso propio/familiar (cambia
   la prioridad de la fase 4).
