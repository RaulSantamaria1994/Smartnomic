import type { SavingsGoalInput } from '@smartnomic/api';
import { useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import { api } from '../../../src/api/client';
import { SavingsForm } from '../../../src/components/SavingsForm';
import { goBack, Screen } from '../../../src/components/Screen';
import { todayIn } from '../../../src/hooks/data';
import { useRefreshSavings } from '../../../src/hooks/useRuleMutations';
import { es } from '../../../src/i18n/es';
import { newTransactionId } from '../../../src/ids';
import { useHousehold } from '../../../src/households/active';

/** Crear una hucha (especificación 005, historia 1). */
export default function NewSavingsGoal() {
  const { household } = useHousehold();
  // Refresca también próximos pagos y calendario: la hucha trae aportaciones pendientes.
  const refresh = useRefreshSavings(household?.id);
  // Un id por formulario: reintentar no crea dos huchas.
  const id = useRef(newTransactionId()).current;

  if (!household) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }

  async function save(input: SavingsGoalInput) {
    await api.saveSavingsGoal(household!.id, id, input);
    await refresh();
    goBack();
  }

  return (
    <Screen title={es.savings.newTitle} back>
      <SavingsForm today={todayIn(household.timezone)} onSubmit={save} />
    </Screen>
  );
}
