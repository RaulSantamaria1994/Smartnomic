import type { SavingsGoalInput } from '@smartnomic/api';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import { api, queryKeys } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { SavingsForm } from '../../../src/components/SavingsForm';
import { Screen } from '../../../src/components/Screen';
import { todayIn, useMe } from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';
import { newTransactionId } from '../../../src/ids';

/** Crear una hucha (especificación 005, historia 1). */
export default function NewSavingsGoal() {
  const me = useMe();
  const household = me.data?.household;
  const queryClient = useQueryClient();
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
    await queryClient.invalidateQueries({ queryKey: queryKeys.savings(household!.id) });
    router.back();
  }

  return (
    <Screen title={es.savings.newTitle}>
      <SavingsForm today={todayIn(household.timezone)} onSubmit={save} />
      <Button variant="link" label={es.transaction.cancel} onPress={() => router.back()} />
    </Screen>
  );
}
