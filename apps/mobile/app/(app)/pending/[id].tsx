import type { TransactionInput } from '@smartnomic/api';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { goBack, Screen } from '../../../src/components/Screen';
import { TransactionForm } from '../../../src/components/TransactionForm';
import { AppText } from '../../../src/design';
import { spacing } from '../../../src/design/tokens';
import { todayIn, useCategories } from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';
import { useOutbox } from '../../../src/outbox/useOutbox';
import { useHousehold } from '../../../src/households/active';

/**
 * Corregir o descartar un movimiento apuntado sin conexión que aún no se ha enviado
 * (especificación 011, historia 1 escenario 7 e historia 2). Funciona sin conexión: solo
 * cambia la bandeja del móvil.
 */
export default function PendingTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { household } = useHousehold();
  const categories = useCategories(household?.id);
  const outbox = useOutbox();
  const [confirming, setConfirming] = useState(false);
  const pending = outbox.items.find((p) => p.id === id);

  if (!household || !categories.data) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }
  if (!pending) {
    return (
      <Screen title={es.outbox.editTitle} back>
        <Message text={es.outbox.notFound} />
        <Button label={es.common.retry} onPress={() => goBack()} />
      </Screen>
    );
  }

  async function save(input: TransactionInput) {
    // Vuelve a la cola sin el motivo del rechazo y se intenta enviar enseguida.
    await outbox.update(pending!.id, input);
    goBack();
  }

  async function discard() {
    await outbox.discard(pending!.id);
    goBack();
  }

  return (
    <Screen title={es.outbox.editTitle} back>
      <View style={styles.status}>
        {pending.status === 'rejected' ? (
          <Message text={es.outbox.rejected(pending.reason ?? es.outbox.rejectedShort)} />
        ) : (
          <AppText variant="caption" tone="muted">
            {es.outbox.editHint}
          </AppText>
        )}
      </View>
      <TransactionForm
        initial={{ ...pending.input, note: pending.input.note ?? null }}
        categories={categories.data.categories}
        today={todayIn(household.timezone)}
        onSubmit={save}
        extraActions={
          confirming ? (
            <View style={styles.confirm} accessibilityLiveRegion="polite">
              <AppText variant="body">{es.outbox.discardConfirm}</AppText>
              <Button
                variant="danger"
                label={es.outbox.discardYes}
                onPress={() => void discard()}
              />
              <Button
                variant="secondary"
                label={es.outbox.keep}
                onPress={() => setConfirming(false)}
              />
            </View>
          ) : (
            <Button variant="link" label={es.outbox.discard} onPress={() => setConfirming(true)} />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { paddingBottom: spacing.md },
  confirm: { gap: spacing.sm },
});
