import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/client';

/** Refresca lo que depende de los pagos recurrentes. */
export function useRefreshRecurring(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return async () => {
    if (!householdId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.recurring(householdId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.upcoming(householdId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.periods(householdId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.calendars(householdId) }),
    ]);
  };
}
