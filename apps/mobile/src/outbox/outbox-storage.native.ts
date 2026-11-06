import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OutboxStorage } from './outbox';

/**
 * En Android la bandeja va en el almacenamiento privado de la app, como la caché: sobrevive a
 * cerrar la app y a reiniciar el móvil (especificación 011, RF-1102).
 */
export const outboxStorage: OutboxStorage | null = {
  load: (key) => AsyncStorage.getItem(key),
  save: (key, value) => AsyncStorage.setItem(key, value),
  remove: (key) => AsyncStorage.removeItem(key),
};
