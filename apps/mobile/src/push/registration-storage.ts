import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PushRegistration } from './registration';

/** Lo último que se registró en el servidor desde este dispositivo (solo en Android). */
const KEY = 'smartnomic:push-registration';

export async function readRegistration(): Promise<PushRegistration | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as PushRegistration).token === 'string' &&
      typeof (value as PushRegistration).sessionId === 'string'
    ) {
      return value as PushRegistration;
    }
  } catch {
    // Un valor ilegible equivale a no haber registrado nada: se vuelve a registrar.
  }
  return null;
}

export async function writeRegistration(registration: PushRegistration): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(registration));
}

export async function clearRegistration(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
