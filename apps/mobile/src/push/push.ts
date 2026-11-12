// En la web no hay avisos push (especificación 014, RF-1412; constitución, art. IX.3): solo se ve
// y se cambia la preferencia. La app nativa usa push.native.ts.

export const pushSupported = false;

export const ACTIVITY_CHANNEL = 'actividad';

export async function ensureActivityChannel(): Promise<void> {}

export async function getPushToken(): Promise<string | null> {
  return null;
}

export function onPushTokenChanged(_handler: () => void): () => void {
  return () => {};
}
