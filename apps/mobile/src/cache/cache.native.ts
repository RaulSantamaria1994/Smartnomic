// En Android se guardan los últimos datos consultados para verlos sin conexión
// (constitución, art. IX.2). Nunca la sesión, que va en expo-secure-store.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Persister } from '@tanstack/react-query-persist-client';

export const persister: Persister | undefined = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'smartnomic-cache',
});
