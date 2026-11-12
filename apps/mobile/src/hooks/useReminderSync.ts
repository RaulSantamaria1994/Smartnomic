import { useQueries, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { api, queryKeys } from '../api/client';
import { useHousehold, useSwitchHousehold } from '../households/active';
import { notificationTarget, routeIfExists, type KnownHousehold } from '../notifications/target';
import { planAllReminders, type HouseholdReminders } from '../reminders/plan';
import {
  onNotificationOpened,
  permissionStatus,
  remindersSupported,
  requestPermission,
  syncReminders,
} from '../reminders/reminders';
import { useNotificationPermission } from '../state/permission';

/** Ventana de avisos programados (plan: 60 días, con tope de 50 avisos). */
const REMINDER_WINDOW_DAYS = 60;

/**
 * Mantiene programados los avisos del dispositivo (RF-029 a RF-035) de todos los hogares
 * (especificación 013, RF-1310): al abrir la app, al volver a primer plano y cada vez que
 * cambian los datos. Al tocar un aviso, elige su hogar y abre su vencimiento. En la web no hay
 * avisos: no pide nada.
 */
export function useReminderSync(): void {
  const queryClient = useQueryClient();
  const { me, household } = useHousehold();
  const switchTo = useSwitchHousehold();
  const setPermission = useNotificationPermission((state) => state.set);
  const list = remindersSupported ? (me.data?.households ?? []) : [];

  // Pagos recurrentes, vencimientos y huchas de cada hogar (3 consultas por hogar).
  const results = useQueries({
    queries: list.flatMap(({ household: h }) => [
      { queryKey: queryKeys.recurring(h.id), queryFn: () => api.recurring(h.id) },
      {
        queryKey: queryKeys.upcoming(h.id, REMINDER_WINDOW_DAYS),
        queryFn: () => api.upcoming(h.id, REMINDER_WINDOW_DAYS),
      },
      { queryKey: queryKeys.savings(h.id), queryFn: () => api.savings(h.id) },
    ]),
  });

  // Solo se planifica con los datos de todos los hogares: si no, un hogar aún sin cargar
  // borraría sus avisos un momento.
  const loaded = results.length > 0 && results.every((r) => r.data !== undefined);
  const inputs: HouseholdReminders[] | null = useMemo(() => {
    if (!loaded) return null;
    return list.map(({ household: h, member }, i) => {
      const rules = results[i * 3]!.data as Awaited<ReturnType<typeof api.recurring>>;
      const upcoming = results[i * 3 + 1]!.data as Awaited<ReturnType<typeof api.upcoming>>;
      const savings = results[i * 3 + 2]!.data as Awaited<ReturnType<typeof api.savings>>;
      return {
        household: h,
        member,
        occurrences: upcoming.occurrences,
        rules: rules.rules,
        savings: { pending: upcoming.savings, goals: savings.goals },
      };
    });
    // `results` cambia de identidad en cada render; sus datos, no.
  }, [loaded, ...results.map((r) => r.data), list]);

  // Permiso: se pide la primera vez que hay pagos recurrentes de los que avisar.
  const hasRules = inputs?.some((i) => i.rules.length > 0 && i.member.remindersEnabled) ?? false;
  useEffect(() => {
    if (!remindersSupported) return;
    void (async () => {
      let status = await permissionStatus();
      if (status === 'undetermined' && hasRules) status = await requestPermission();
      setPermission(status);
    })();
  }, [hasRules, setPermission]);

  // Reprogramar con los últimos datos conocidos. Sin ningún hogar, no queda nada que avisar.
  const noHouseholds = me.data?.households.length === 0;
  useEffect(() => {
    if (!remindersSupported) return;
    if (noHouseholds) void syncReminders([]);
    else if (inputs) void syncReminders(planAllReminders(inputs, new Date()));
  }, [inputs, noHouseholds]);

  // Al volver a primer plano: refrescar (otro miembro pudo pagar algo) y el permiso.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const ids = remindersSupported
        ? (me.data?.households ?? []).map((h) => h.household.id)
        : household
          ? [household.id]
          : [];
      for (const id of ids) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.upcoming(id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.recurring(id) });
      }
      if (remindersSupported) void permissionStatus().then(setPermission);
    });
    return () => subscription.remove();
  }, [me.data, household, queryClient, setPermission]);

  // Tocar una notificación, de un recordatorio o de actividad, elige su hogar y abre su pantalla
  // (RF-034, RF-1310, especificación 014, RF-1406). Los datos se traducen en `target.ts`.
  useEffect(
    () =>
      onNotificationOpened((data) => {
        const target = notificationTarget(data);
        if (!target) return;
        if (target.householdId) switchTo(target.householdId);
        // Una hucha o un pago que ya no existen llevan a «Mes» de ese hogar (RF-1406), según lo
        // que se sepa de él; sin datos cargados, la pantalla ya avisa de que no existe.
        const route = target.householdId
          ? routeIfExists(target.route, knownIn(queryClient, target.householdId))
          : target.route;
        // «Mes» es una pestaña: se va a ella en lugar de apilarla sobre lo que hubiera.
        if (route.pathname === '/') {
          router.navigate(
            route.params
              ? { ...route, params: { ...route.params, at: String(Date.now()) } }
              : route,
          );
        } else router.push(route);
      }),
    [switchTo, queryClient],
  );
}

/** Huchas y pagos de un hogar que ya están en la caché, o `null` si aún no se han cargado. */
function knownIn(queryClient: QueryClient, householdId: string): KnownHousehold {
  const savings = queryClient.getQueryData<Awaited<ReturnType<typeof api.savings>>>(
    queryKeys.savings(householdId),
  );
  const rules = queryClient.getQueryData<Awaited<ReturnType<typeof api.recurring>>>(
    queryKeys.recurring(householdId),
  );
  return {
    goalIds: savings ? new Set(savings.goals.map((g) => g.id)) : null,
    ruleIds: rules ? new Set(rules.rules.map((r) => r.id)) : null,
  };
}
