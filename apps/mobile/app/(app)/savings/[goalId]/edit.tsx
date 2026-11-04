import type { SavingsGoalInput } from '@smartnomic/api';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { api } from '../../../../src/api/client';
import { Button } from '../../../../src/components/Button';
import { Message } from '../../../../src/components/Message';
import { SavingsForm } from '../../../../src/components/SavingsForm';
import { goBack, Screen } from '../../../../src/components/Screen';
import { todayIn, useMe, useSavings } from '../../../../src/hooks/data';
import { useRefreshSavings } from '../../../../src/hooks/useRuleMutations';
import { es } from '../../../../src/i18n/es';

/** Editar una hucha: nombre, icono, objetivo, plazo o día (especificación 005, historia 4). */
export default function EditSavingsGoal() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const me = useMe();
  const household = me.data?.household;
  const savings = useSavings(household?.id);
  const refresh = useRefreshSavings(household?.id);

  if (!household || !savings.data) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }
  const goal = savings.data.goals.find((g) => g.id === goalId);
  if (!goal) {
    return (
      <Screen>
        <Message text={es.savings.notFound} />
        <Button label={es.settings.back} onPress={() => goBack()} />
      </Screen>
    );
  }

  async function save(input: SavingsGoalInput) {
    await api.saveSavingsGoal(household!.id, goal!.id, input);
    await refresh();
    goBack();
  }

  return (
    <Screen title={es.savings.editTitle} back>
      <SavingsForm initial={goal} today={todayIn(household.timezone)} onSubmit={save} />
    </Screen>
  );
}
