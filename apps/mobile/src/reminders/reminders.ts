// En la web no hay notificaciones en el MVP (constitución, art. IX.3): la pantalla
// principal destaca los vencimientos. La app nativa usa reminders.native.ts.
import type { PlannedHouseholdReminder } from './plan';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export const remindersSupported = false;

export async function syncReminders(_planned: readonly PlannedHouseholdReminder[]): Promise<void> {}

export async function permissionStatus(): Promise<PermissionStatus> {
  return 'unsupported';
}

export async function requestPermission(): Promise<PermissionStatus> {
  return 'unsupported';
}

export async function openNotificationSettings(): Promise<void> {}

/** Al tocar una notificación. En la web no hay avisos: no hace nada. */
export function onNotificationOpened(_handler: (data: unknown) => void): () => void {
  return () => {};
}
