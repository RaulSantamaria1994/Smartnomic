// Avisos locales en Android: llegan aunque no haya conexión (constitución, art. IX.2).
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { es } from '../i18n/es';
import { reminderInstant, type PlannedReminder } from './plan';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export const remindersSupported = true;

const CHANNEL_ID = 'vencimientos';

// Si la app está abierta, el aviso también se muestra.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: es.reminders.channel,
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/** Sustituye los avisos programados por los de ahora (al abrir, al volver y tras cambios). */
export async function syncReminders(planned: readonly PlannedReminder[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (planned.length === 0 || (await permissionStatus()) !== 'granted') return;
  await ensureChannel();
  for (const { reminder, title, body } of planned) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: { title, body, data: { ruleId: reminder.ruleId, dueDate: reminder.dueDate } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderInstant(reminder),
        channelId: CHANNEL_ID,
      },
    });
  }
}

function toStatus(status: Notifications.PermissionStatus): PermissionStatus {
  if (status === Notifications.PermissionStatus.GRANTED) return 'granted';
  if (status === Notifications.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

export async function permissionStatus(): Promise<PermissionStatus> {
  return toStatus((await Notifications.getPermissionsAsync()).status);
}

export async function requestPermission(): Promise<PermissionStatus> {
  await ensureChannel();
  return toStatus((await Notifications.requestPermissionsAsync()).status);
}

export async function openNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

/** Al tocar un aviso se abre su vencimiento (RF-034), también si la app estaba cerrada. */
export function onReminderOpened(
  handler: (target: { ruleId: string; dueDate: string }) => void,
): () => void {
  const open = (response: Notifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data as
      { ruleId?: unknown; dueDate?: unknown } | undefined;
    if (typeof data?.ruleId === 'string' && typeof data.dueDate === 'string') {
      handler({ ruleId: data.ruleId, dueDate: data.dueDate });
    }
  };
  void Notifications.getLastNotificationResponseAsync().then(open);
  const subscription = Notifications.addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
}
