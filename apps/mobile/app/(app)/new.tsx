import type { TransactionInput } from '@smartnomic/api';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import { api, queryKeys } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { TransactionForm } from '../../src/components/TransactionForm';
import { todayIn, useCategories, useMe } from '../../src/hooks/data';
import { es } from '../../src/i18n/es';
import { newTransactionId } from '../../src/ids';

/** Apuntar un movimiento nuevo (T050). */
export default function NewTransaction() {
  const queryClient = useQueryClient();
  const me = useMe();
  const household = me.data?.household;
  const categories = useCategories(household?.id);
  // Un id por formulario: si se reintenta tras un fallo, no se duplica (RF-015).
  const id = useRef(newTransactionId()).current;

  if (!household || !categories.data) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }

  const today = todayIn(household.timezone);

  async function save(input: TransactionInput) {
    await api.saveTransaction(household!.id, id, input);
    await queryClient.invalidateQueries({ queryKey: queryKeys.periods(household!.id) });
    router.back();
  }

  return (
    <Screen title={es.transaction.newTitle}>
      <TransactionForm
        initial={{ kind: 'expense', date: today }}
        categories={categories.data.categories}
        today={today}
        onSubmit={save}
      />
      <Button variant="link" label={es.transaction.cancel} onPress={() => router.back()} />
    </Screen>
  );
}
