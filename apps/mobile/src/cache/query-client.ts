import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/http';
import { persister } from './cache';

/** Cuánto se conservan los datos guardados para verlos sin conexión. */
export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * `onError` recibe los errores de todas las consultas y cambios (para detectar una sesión
 * terminada).
 */
export function createQueryClient(onError?: (error: unknown) => void): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: (error) => onError?.(error) }),
    mutationCache: new MutationCache({ onError: (error) => onError?.(error) }),
    defaultOptions: {
      queries: {
        // Con caché guardada se muestran los últimos datos aunque no haya conexión.
        networkMode: 'offlineFirst',
        gcTime: CACHE_MAX_AGE,
        staleTime: 30_000,
        retry: (failures, error) =>
          failures < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
      mutations: { networkMode: 'always', retry: false },
    },
  });
}

/** Borra la caché en memoria y la guardada (al cerrar sesión). */
export async function clearCache(queryClient: QueryClient): Promise<void> {
  queryClient.clear();
  await persister?.removeClient();
}
