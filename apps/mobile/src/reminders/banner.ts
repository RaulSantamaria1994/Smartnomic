import type { PermissionStatus } from './reminders';

/**
 * ¿Hay que avisar de que falta el permiso de notificaciones? Sí, en Android, si está denegado y
 * hay algo que avisar: recordatorios de pagos activados (RF-035) o avisos de lo que apuntan otros
 * miembros en un hogar con más gente (especificación 014, RF-1410). Nunca falla en silencio
 * (constitución, art. IX.2.3); en la web no hay notificaciones.
 */
export function permissionBannerVisible(input: {
  supported: boolean;
  permission: PermissionStatus | null;
  /** Hay pagos recurrentes y los recordatorios están activados en este hogar. */
  hasReminders: boolean;
  /** Los avisos de actividad están activados en este hogar y tiene más de un miembro. */
  activityAlerts: boolean;
}): boolean {
  return (
    input.supported && input.permission === 'denied' && (input.hasReminders || input.activityAlerts)
  );
}
