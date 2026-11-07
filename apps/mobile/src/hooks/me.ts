import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '../api/client';

/** Quién soy y mis hogares (`GET /api/me`). */
export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: api.me });
}
