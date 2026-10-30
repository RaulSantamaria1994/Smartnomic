import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { queryKeys } from '../api/client';
import { planReminders, reminderRoute } from '../reminders/plan';
import {
  onReminderOpened,
  permissionStatus,
  remindersSupported,
  requestPermission,
  syncReminders,
} from '../reminders/reminders';
import { useNotificationPermission } from '../state/permission';
import { useMe, useRecurring, useSavings, useUpcoming } from './data';

/** Ventana de avisos programados (plan: 60 días, con tope de 50 avisos). */
const REMINDER_WINDOW_DAYS = 60;

/**
 * Mantiene programados los avisos del dispositivo (RF-029 a RF-035): al abrir la app, al
 * volver a primer plano y cada vez que cambian los datos. Al tocar un aviso, abre su
 * vencimiento.
 */
export function useReminderSync(): void {
  const queryClient = useQueryClient();
  const me = useMe();
  const household = me.data?.household;
  const member = me.data?.member;
  const rules = useRecurring(household?.id);
  const upcoming = useUpcoming(household?.id, REMINDER_WINDOW_DAYS);
  const goals = useSavings(household?.id).data?.goals;
  const setPermission = useNotificationPermission((state) => state.set);

  // Permiso: se pide la primera vez que hay pagos recurrentes de los que avisar.
  const hasRules = (rules.data?.rules.length ?? 0) > 0;
  useEffect(() => {
    if (!remindersSupported) return;
    void (async () => {
      let status = await permissionStatus();
      if (status === 'undetermined' && hasRules && member?.remindersEnabled) {
        status = await requestPermission();
      }
      setPermission(status);
    })();
  }, [hasRules, member?.remindersEnabled, setPermission]);

  // Reprogramar con los últimos datos conocidos.
  const occurrences = upcoming.data?.occurrences;
  const ruleList = rules.data?.rules;
  const pendingSavings = upcoming.data?.savings;
  useEffect(() => {
    if (!remindersSupported || !occurrences || !ruleList || !member) return;
    void syncReminders(
      planReminders(occurrences, ruleList, member, new Date(), {
        pending: pendingSavings ?? [],
        goals: goals ?? [],
      }),
    );
  }, [occurrences, ruleList, member, pendingSavings, goals]);

  // Al volver a primer plano: refrescar (otro miembro pudo pagar algo) y el permiso.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !household) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.upcoming(household.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.recurring(household.id) });
      if (remindersSupported) void permissionStatus().then(setPermission);
    });
    return () => subscription.remove();
  }, [household, queryClient, setPermission]);

  // Tocar un aviso abre el vencimiento (RF-034).
  useEffect(
    () => onReminderOpened(({ ruleId, dueDate }) => router.push(reminderRoute(ruleId, dueDate))),
    [],
  );
}
