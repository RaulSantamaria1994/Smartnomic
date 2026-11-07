import type { Household, Member } from '@smartnomic/api';
import { activeHousehold } from '@smartnomic/domain';
import { useCallback, useSyncExternalStore } from 'react';
import { useMe } from '../hooks/me';
import { createHouseholdChoice } from './choice';
import { choiceStorage } from './choice-storage';

/** El hogar elegido por cada cuenta en este dispositivo. */
export const householdChoice = createHouseholdChoice(choiceStorage);

let loading: Promise<void> | null = null;

/** Se lee al abrir la app, antes de pintar nada: así no se ve un hogar y luego otro. */
export function loadHouseholdChoice(): Promise<void> {
  loading ??= householdChoice.load();
  return loading;
}

function useChosenId(userId: string | undefined): string | null {
  return useSyncExternalStore(
    householdChoice.subscribe,
    () => (userId ? householdChoice.get(userId) : null),
    () => null,
  );
}

/**
 * El hogar que muestra la app y el rol en él (especificación 013): el elegido en el
 * dispositivo si sigue siendo miembro, si no el primero. Sin hogares, `household` y `member`
 * son `undefined`.
 */
export function useHousehold(): {
  me: ReturnType<typeof useMe>;
  household: Household | undefined;
  member: Member | undefined;
} {
  const me = useMe();
  const chosen = useChosenId(me.data?.user.id);
  const current = me.data ? activeHousehold(me.data.households, chosen) : null;
  return { me, household: current?.household, member: current?.member };
}

/** Cambia el hogar elegido en este dispositivo (RF-1303). */
export function useSwitchHousehold(): (householdId: string) => void {
  const userId = useMe().data?.user.id;
  return useCallback(
    (householdId: string) => {
      if (userId) void householdChoice.set(userId, householdId);
    },
    [userId],
  );
}
