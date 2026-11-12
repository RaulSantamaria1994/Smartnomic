// Avisos push en Android (especificación 014): el token de Expo Push de este dispositivo y el
// canal de los avisos de actividad. En la web se usa push.ts, que no hace nada.
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { es } from '../i18n/es';

export const pushSupported = true;

/** Canal de Android de los avisos de otros miembros, separado de `vencimientos` (RF-1408). */
export const ACTIVITY_CHANNEL = 'actividad';

/** El canal tiene que existir antes de que llegue el primer aviso. */
export async function ensureActivityChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ACTIVITY_CHANNEL, {
    name: es.reminders.activityChannel,
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/**
 * Token de Expo Push de este dispositivo, o `null` si falta el `projectId` de EAS. Hace falta el
 * permiso de notificaciones concedido. Puede lanzar (sin Firebase configurado en la compilación,
 * sin conexión): quien lo llama lo reintenta más tarde.
 */
export async function getPushToken(): Promise<string | null> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (typeof projectId !== 'string') return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/** Android puede cambiar el token del dispositivo: hay que volver a pedirlo y registrarlo. */
export function onPushTokenChanged(handler: () => void): () => void {
  const subscription = Notifications.addPushTokenListener(() => handler());
  return () => subscription.remove();
}
