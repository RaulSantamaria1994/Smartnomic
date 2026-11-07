import type { Household, Member } from '@smartnomic/api';
import { activeHousehold } from '@smartnomic/domain';
import { useMe } from '../hooks/me';

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
  const current = me.data ? activeHousehold(me.data.households, null) : null;
  return { me, household: current?.household, member: current?.member };
}
