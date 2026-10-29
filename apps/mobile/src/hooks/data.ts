import { can, civilDateIn, periodOf, type Action, type DateString } from '@smartnomic/domain';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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

export function useRecurring(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.recurring(householdId ?? ''),
    queryFn: () => api.recurring(householdId!),
    enabled: Boolean(householdId),
  });
}

/** Vencimientos pendientes: los de los próximos `days` días y los atrasados. */
export function useUpcoming(householdId: string | undefined, days = 30) {
  return useQuery({
    queryKey: queryKeys.upcoming(householdId ?? '', days),
    queryFn: () => api.upcoming(householdId!, days),
    enabled: Boolean(householdId),
  });
}

export function useMembers(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.members(householdId ?? ''),
    queryFn: () => api.members(householdId!),
    enabled: Boolean(householdId),
  });
}

export function useInvitations(householdId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.invitations(householdId ?? ''),
    queryFn: () => api.invitations(householdId!),
    enabled: Boolean(householdId) && enabled,
  });
}

/** ¿Puede el usuario hacer esto en su hogar? Mismas reglas que el servidor (RF-006). */
export function useCan(): (action: Action) => boolean {
  const role = useMe().data?.member.role;
  return (action) => (role ? can(role, action) : false);
}

/** Vencimientos de un mes natural para el calendario (especificación 002). */
export function useCalendar(householdId: string | undefined, month: string | undefined) {
  return useQuery({
    queryKey: queryKeys.calendar(householdId ?? '', month ?? ''),
    queryFn: () => api.calendar(householdId!, month!),
    enabled: Boolean(householdId && month),
    // Al cambiar de mes se sigue viendo el anterior hasta que llega el nuevo.
    placeholderData: keepPreviousData,
  });
}
