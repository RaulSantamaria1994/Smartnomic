// En la web no hay notificaciones en el MVP (constitución, art. IX.3): la pantalla
// principal destaca los vencimientos. La app nativa usa reminders.native.ts.
import type { PlannedReminder } from './plan';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export const remindersSupported = false;

export async function syncReminders(_planned: readonly PlannedReminder[]): Promise<void> {}

export async function permissionStatus(): Promise<PermissionStatus> {
  return 'unsupported';
}

export async function requestPermission(): Promise<PermissionStatus> {
  return 'unsupported';
}

export async function openNotificationSettings(): Promise<void> {}

/** Al tocar un aviso. En la web no hay avisos: no hace nada. */
export function onReminderOpened(
  _handler: (target: { ruleId: string; dueDate: string }) => void,
): () => void {
  return () => {};
}
