import { router } from 'expo-router';
import type { AppBarSwitcher } from '../design/AppBar';
import { es } from '../i18n/es';
import { useHousehold } from './active';

/** El nombre del hogar elegido en la barra de las pestañas, que abre la lista (RF-1303). */
export function useHouseholdSwitcher(): AppBarSwitcher | undefined {
  const { household } = useHousehold();
  if (!household) return undefined;
  return {
    name: household.name,
    label: es.households.switchLabel(household.name),
    onPress: () => router.push('/households'),
  };
}
