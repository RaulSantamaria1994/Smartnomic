import type { TransactionInput } from '@smartnomic/api';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { api, queryKeys } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { Screen } from '../../../src/components/Screen';
import { TransactionForm } from '../../../src/components/TransactionForm';
import { todayIn, useCategories, useMe } from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';
import { useUndo } from '../../../src/state/undo';
import type { PeriodResponse, Transaction } from '@smartnomic/api';

/** Busca el movimiento en los periodos ya cargados. */
function useCachedTransaction(
  householdId: string | undefined,
  id: string,
): Transaction | undefined {
  const queryClient = useQueryClient();
  if (!householdId) return undefined;
  for (const [, data] of queryClient.getQueriesData<PeriodResponse>({
    queryKey: queryKeys.periods(householdId),
  })) {
    const found = data?.transactions.find((t) => t.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Editar o borrar un movimiento (T051). */
export default function EditTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const me = useMe();
  const household = me.data?.household;
  const categories = useCategories(household?.id);
  const transaction = useCachedTransaction(household?.id, id);
  const offerUndo = useUndo((state) => state.offer);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!household || !categories.data) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }
  if (!transaction) {
    return (
      <Screen title={es.transaction.editTitle}>
        <Message text={es.transaction.notFound} />
        <Button label={es.common.retry} onPress={() => router.back()} />
      </Screen>
    );
  }

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.periods(household.id) });

  async function save(input: TransactionInput) {
    await api.saveTransaction(household!.id, id, input);
    await refresh();
    router.back();
  }

  async function remove() {
    setError(null);
    setDeleting(true);
    try {
      await api.deleteTransaction(household!.id, id);
      await refresh();
      offerUndo(household!.id, id);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.auth.errors.unknown);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen title={es.transaction.editTitle}>
      <TransactionForm
        initial={transaction}
        categories={categories.data.categories}
        today={todayIn(household.timezone)}
        onSubmit={save}
        extraActions={
          <>
            {error && <Message text={error} />}
            <Button
              variant="link"
              label={es.transaction.delete}
              onPress={remove}
              loading={deleting}
            />
          </>
        }
      />
    </Screen>
  );
}
