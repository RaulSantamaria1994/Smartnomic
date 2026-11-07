import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChoiceStorage } from './choice';

const KEY = 'smartnomic-household';

/** En Android, el hogar elegido va con los demás datos de la app (especificación 013). */
export const choiceStorage: ChoiceStorage | null = {
  load: () => AsyncStorage.getItem(KEY),
  save: (value) => AsyncStorage.setItem(KEY, value),
};
