import { parseAmount } from '@smartnomic/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../../../../src/api/client';
import { ApiError } from '../../../../../src/api/http';
import { Button } from '../../../../../src/components/Button';
import { Message } from '../../../../../src/components/Message';
import { Screen } from '../../../../../src/components/Screen';
import { TextField } from '../../../../../src/components/TextField';
import { CategoryIcon } from '../../../../../src/design/CategoryIcon';
import { AppText } from '../../../../../src/design/Text';
import { color, spacing } from '../../../../../src/design/tokens';
import {
  amountErrorMessage,
  formatAmountInput,
  formatDueDate,
  formatMoney,
} from '../../../../../src/format';
import { todayIn, useMe, useSavings } from '../../../../../src/hooks/data';
import { useRefreshSavings } from '../../../../../src/hooks/useRuleMutations';
import { es } from '../../../../../src/i18n/es';
import { newTransactionId } from '../../../../../src/ids';

/** Confirmar o saltar la aportación de un mes (especificación 005, historia 2). */
export default function SavingsDue() {
  const { goalId, dueDate } = useLocalSearchParams<{ goalId: string; dueDate: string }>();
  const me = useMe();
  const household = me.data?.household;
  const savings = useSavings(household?.id);
  const refresh = useRefreshSavings(household?.id);
  // Un id por pantalla: reintentar no aparta dos veces.
  const entryId = useRef(newTransactionId()).current;
  const [amount, setAmount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'skip' | null>(null);

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
        <Button label={es.transaction.cancel} onPress={() => router.back()} />
      </Screen>
    );
  }

  const today = todayIn(household.timezone);
  const amountValue = amount ?? formatAmountInput(goal.plan.quotaCents);
  const overdue = dueDate < today;

  async function run(action: 'save' | 'skip') {
    setError(null);
    try {
      if (action === 'save') {
        const parsed = parseAmount(amountValue);
        if (!parsed.ok) return setError(amountErrorMessage(parsed.error));
        setBusy('save');
        await api.saveSavingsEntry(household!.id, goal!.id, entryId, {
          kind: 'deposit',
          amountCents: parsed.value,
          date: today,
          dueDate,
        });
      } else {
        setBusy('skip');
        await api.skipSavings(household!.id, goal!.id, dueDate);
      }
    } catch (e) {
      setBusy(null);
      if (e instanceof ApiError && e.code === 'conflict') void refresh();
      return setError(
        e instanceof ApiError && e.code === 'network'
          ? es.transaction.errors.offline
          : e instanceof Error
            ? e.message
            : es.auth.errors.unknown,
      );
    }
    await refresh();
    router.back();
  }

  return (
    <Screen title={es.savings.dueTitle(goal.name)}>
      <View style={styles.info}>
        <View style={styles.goal}>
          <CategoryIcon icon={goal.icon} tone={color.text.accent} />
          <AppText variant="bodyStrong" tone={overdue ? 'danger' : 'primary'}>
            {es.savings.dueOn(formatDueDate(dueDate, today))}
            {overdue ? ` · ${es.recurring.overdue}` : ''}
          </AppText>
        </View>
        <AppText variant="body" tone="muted">
          {es.savings.quotaHint(formatMoney(goal.plan.quotaCents))}
        </AppText>
      </View>
      <TextField
        label={es.savings.amount}
        value={amountValue}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      {error && <Message text={error} />}
      <Button
        label={es.savings.confirm}
        loading={busy === 'save'}
        onPress={() => void run('save')}
      />
      <Button
        variant="secondary"
        label={es.savings.skip}
        loading={busy === 'skip'}
        onPress={() => void run('skip')}
      />
      <Button variant="link" label={es.transaction.cancel} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { gap: spacing.xs },
  goal: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
