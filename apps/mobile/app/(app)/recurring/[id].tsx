import type { RecurringInput } from '@smartnomic/api';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { api } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { RuleForm } from '../../../src/components/RuleForm';
import { goBack, Screen } from '../../../src/components/Screen';
import { todayIn, useCategories, useRecurring } from '../../../src/hooks/data';
import { useRefreshRecurring } from '../../../src/hooks/useRuleMutations';
import { es } from '../../../src/i18n/es';
import { useHousehold } from '../../../src/households/active';

export default function EditRule() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { household } = useHousehold();
  const categories = useCategories(household?.id);
  const rules = useRecurring(household?.id);
  const refresh = useRefreshRecurring(household?.id);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!household || !categories.data || !rules.data) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }
  const rule = rules.data.rules.find((r) => r.id === id);
  if (!rule) {
    return (
      <Screen title={es.recurring.editTitle} back>
        <Message text={es.recurring.notFound} />
        <Button label={es.transaction.cancel} onPress={() => goBack()} />
      </Screen>
    );
  }

  async function save(input: RecurringInput) {
    await api.saveRule(household!.id, id, input);
    await refresh();
    goBack();
  }

  // Borrar pide una segunda pulsación (los movimientos ya apuntados se conservan).
  async function remove() {
    if (!confirming) return setConfirming(true);
    setError(null);
    setDeleting(true);
    try {
      await api.deleteRule(household!.id, id);
      await refresh();
      goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.auth.errors.unknown);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen title={es.recurring.editTitle} back>
      <RuleForm
        initial={rule}
        categories={categories.data.categories}
        today={todayIn(household.timezone)}
        onSubmit={save}
        extraActions={
          <>
            {confirming && <Message text={es.recurring.confirmDelete} />}
            {error && <Message text={error} />}
            <Button
              variant="link"
              label={es.recurring.delete}
              onPress={remove}
              loading={deleting}
            />
          </>
        }
      />
    </Screen>
  );
}
