import type { RecurringInput } from '@smartnomic/api';
import { router } from 'expo-router';
import { useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import { api } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { RuleForm } from '../../../src/components/RuleForm';
import { Screen } from '../../../src/components/Screen';
import { todayIn, useCategories, useMe } from '../../../src/hooks/data';
import { useRefreshRecurring } from '../../../src/hooks/useRuleMutations';
import { es } from '../../../src/i18n/es';
import { newTransactionId } from '../../../src/ids';

export default function NewRule() {
  const me = useMe();
  const household = me.data?.household;
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
    router.back();
  }

  return (
    <Screen title={es.recurring.newTitle}>
      <RuleForm
        categories={categories.data.categories}
        today={todayIn(household.timezone)}
        onSubmit={save}
      />
      <Button variant="link" label={es.transaction.cancel} onPress={() => router.back()} />
    </Screen>
  );
}
