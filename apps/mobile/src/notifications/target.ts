import { isValidDate } from '@smartnomic/domain';
import { reminderRoute } from '../reminders/plan';

/** Pantalla a la que lleva un aviso: ruta de Expo Router y, si hace falta, sus parámetros. */
export interface NotificationRoute {
  pathname: string;
  params?: Record<string, string>;
}

export interface NotificationTarget {
  /** Hogar que hay que elegir antes de navegar; los recordatorios antiguos no lo llevan. */
  householdId?: string;
  route: NotificationRoute;
}

const MONTH: NotificationRoute = { pathname: '/' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAVINGS_PREFIX = 'savings:';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isId = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

const isDate = (value: unknown): value is string => typeof value === 'string' && isValidDate(value);

/** `ruleId` de un recordatorio: el de un pago o `savings:` y el de una hucha. */
const isReminderRule = (value: unknown): value is string =>
  typeof value === 'string' &&
  isId(value.startsWith(SAVINGS_PREFIX) ? value.slice(SAVINGS_PREFIX.length) : value);

/**
 * De los datos de una notificación (un recordatorio de pago o un aviso de actividad, especificación
 * 014) a lo que hay que abrir. Lo que llega puede venir de cualquier parte: solo se acepta lo que
 * tiene la forma esperada, y un identificador que no es un UUID nunca llega a una ruta. Un destino
 * que no se entiende o que ya no existe lleva a «Mes» de ese hogar (RF-1406). Devuelve `null`
 * si la notificación no es de la app.
 */
export function notificationTarget(data: unknown): NotificationTarget | null {
  if (!isObject(data)) return null;

  // Aviso de actividad: lleva el hogar y el destino.
  if (data.type === 'activity') {
    if (!isId(data.householdId)) return null;
    return { householdId: data.householdId, route: activityRoute(data.target) };
  }

  // Recordatorio de un pago o de una hucha: ruleId y dueDate, y el hogar si lo lleva.
  if (isReminderRule(data.ruleId) && isDate(data.dueDate)) {
    return {
      ...(isId(data.householdId) && { householdId: data.householdId }),
      route: { pathname: reminderRoute(data.ruleId, data.dueDate) },
    };
  }
  return null;
}

function activityRoute(target: unknown): NotificationRoute {
  if (!isObject(target)) return MONTH;
  switch (target.kind) {
    case 'transaction':
      return isDate(target.date) ? { pathname: '/', params: { date: target.date } } : MONTH;
    case 'occurrence':
      return isId(target.ruleId) && isDate(target.dueDate)
        ? { pathname: reminderRoute(target.ruleId, target.dueDate) }
        : MONTH;
    case 'savings':
      return isId(target.goalId) ? { pathname: `/savings/${target.goalId}` } : MONTH;
    default:
      return MONTH;
  }
}

/** Lo que se sabe de un hogar al tocar el aviso; `null` si esos datos aún no se han cargado. */
export interface KnownHousehold {
  goalIds: ReadonlySet<string> | null;
  ruleIds: ReadonlySet<string> | null;
}

/**
 * Si el aviso lleva a una hucha o a un pago que ya no existe, lleva a «Mes» de ese hogar en lugar
 * de a una pantalla de error (RF-1406). Con datos aún sin cargar se respeta la ruta: esa pantalla
 * ya avisa de que ya no existe.
 */
export function routeIfExists(route: NotificationRoute, known: KnownHousehold): NotificationRoute {
  const savings = /^\/savings\/([^/]+)(?:\/due\/[^/]+)?$/.exec(route.pathname);
  if (savings && known.goalIds && !known.goalIds.has(savings[1]!)) return MONTH;
  const occurrence = /^\/occurrence\/([^/]+)\/[^/]+$/.exec(route.pathname);
  if (occurrence && known.ruleIds && !known.ruleIds.has(occurrence[1]!)) return MONTH;
  return route;
}
