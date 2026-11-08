import type { RecurringInput } from '@smartnomic/api';
import { useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import { api } from '../../../src/api/client';
import { RuleForm } from '../../../src/components/RuleForm';
import { goBack, Screen } from '../../../src/components/Screen';
import { todayIn, useCategories } from '../../../src/hooks/data';
import { useRefreshRecurring } from '../../../src/hooks/useRuleMutations';
import { es } from '../../../src/i18n/es';
import { newTransactionId } from '../../../src/ids';
import { useHousehold } from '../../../src/households/active';

export default function NewRule() {
  const { household } = useHousehold();
  const categories = useCategories(household?.id);
  const refresh = useRefreshRecurring(household?.id);
  // Un id por formulario: reintentar no crea dos reglas.
  const id = useRef(newTransactionId()).current;

  if (!household || !categories.data) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }

  async function save(input: RecurringInput) {
    await api.saveRule(household!.id, id, input);
    await refresh();
    goBack();
  }

  return (
    <Screen title={es.recurring.newTitle} back>
      <RuleForm
        categories={categories.data.categories}
        today={todayIn(household.timezone)}
        onSubmit={save}
      />
    </Screen>
  );
}
