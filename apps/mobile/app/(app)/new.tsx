import type { TransactionInput } from '@smartnomic/api';
import { useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { AccessibilityInfo, ActivityIndicator } from 'react-native';
import { api, queryKeys } from '../../src/api/client';
import { ApiError } from '../../src/api/http';
import { goBack, Screen } from '../../src/components/Screen';
import { TransactionForm } from '../../src/components/TransactionForm';
import { todayIn, useCategories, useMe } from '../../src/hooks/data';
import { es } from '../../src/i18n/es';
import { newTransactionId } from '../../src/ids';
import { useOutbox } from '../../src/outbox/useOutbox';

/** Apuntar un movimiento nuevo (T050). */
export default function NewTransaction() {
  const queryClient = useQueryClient();
  const me = useMe();
  const household = me.data?.household;
  const categories = useCategories(household?.id);
  // Un id por formulario: si se reintenta tras un fallo, no se duplica (RF-015).
  const id = useRef(newTransactionId()).current;
  const outbox = useOutbox();

  if (!household || !categories.data) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }

  const today = todayIn(household.timezone);

  async function save(input: TransactionInput) {
    try {
      await api.saveTransaction(household!.id, id, input);
    } catch (e) {
      // Sin conexión en Android: se guarda para enviarlo al volver (especificación 011,
      // RF-1101), con el mismo id para que reenviarlo no lo duplique.
      if (!(e instanceof ApiError && e.code === 'network' && outbox.available)) throw e;
      await outbox.add({ id, householdId: household!.id, input });
      AccessibilityInfo.announceForAccessibility(es.outbox.savedOffline);
      goBack();
      return;
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.periods(household!.id) });
    goBack();
  }

  return (
    <Screen title={es.transaction.newTitle} back>
      <TransactionForm
        initial={{ kind: 'expense', date: today }}
        categories={categories.data.categories}
        today={today}
        onSubmit={save}
      />
    </Screen>
  );
}
