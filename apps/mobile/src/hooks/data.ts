import { civilDateIn, periodOf, type DateString } from '@smartnomic/domain';
import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '../api/client';

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: api.me });
}

export function useCategories(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.categories(householdId ?? ''),
    queryFn: () => api.categories(householdId!),
    enabled: Boolean(householdId),
  });
}

export function usePeriod(householdId: string | undefined, start: DateString | undefined) {
  return useQuery({
    queryKey: queryKeys.period(householdId ?? '', start ?? ''),
    queryFn: () => api.period(householdId!, start!),
    enabled: Boolean(householdId && start),
  });
}

/** Fecha de hoy en la zona horaria del hogar (RF-019). */
export function todayIn(timeZone: string): DateString {
  return civilDateIn(new Date(), timeZone);
}

export function currentPeriodStart(timeZone: string, monthStartDay: number): DateString {
  return periodOf(todayIn(timeZone), monthStartDay).start;
}
