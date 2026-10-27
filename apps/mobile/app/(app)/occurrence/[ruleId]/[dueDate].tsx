import { addDays, parseAmount } from '@smartnomic/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api } from '../../../../src/api/client';
import { ApiError } from '../../../../src/api/http';
import { Button } from '../../../../src/components/Button';
import { Chip } from '../../../../src/components/Chip';
import { Message } from '../../../../src/components/Message';
import { Screen } from '../../../../src/components/Screen';
import { TextField } from '../../../../src/components/TextField';
import {
  amountErrorMessage,
  formatAmountInput,
  formatDueDate,
  formatMoney,
  formatShortDate,
  parseShortDate,
} from '../../../../src/format';
import { todayIn, useCategories, useMe, useRecurring } from '../../../../src/hooks/data';
import { useRefreshRecurring } from '../../../../src/hooks/useRuleMutations';
import { es } from '../../../../src/i18n/es';
import { newTransactionId } from '../../../../src/ids';
import { colors, spacing } from '../../../../src/theme';

/** Pagar (con el importe real) u omitir un vencimiento (T064, RF-024 y RF-025). */
export default function Occurrence() {
  const { ruleId, dueDate } = useLocalSearchParams<{ ruleId: string; dueDate: string }>();
  const me = useMe();
  const household = me.data?.household;
  const rules = useRecurring(household?.id);
  const categories = useCategories(household?.id);
  const refresh = useRefreshRecurring(household?.id);
  const rule = rules.data?.rules.find((r) => r.id === ruleId);
  const today = household ? todayIn(household.timezone) : undefined;
  // Un id por pantalla: reintentar el pago no crea dos movimientos.
  const transactionId = useRef(newTransactionId()).current;

  const [amount, setAmount] = useState<string | null>(null);
  const [dateText, setDateText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'pay' | 'skip' | null>(null);

  if (!household || !rules.data || !today) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }
  if (!rule) {
    return (
      <Screen>
        <Message text={es.recurring.notFound} />
        <Button label={es.transaction.cancel} onPress={() => router.back()} />
      </Screen>
    );
  }

  const amountValue = amount ?? formatAmountInput(rule.amountCents);
  const date = dateText ?? formatShortDate(today);
  const category = categories.data?.categories.find((c) => c.id === rule.categoryId);
  const overdue = dueDate < today;

  async function run(action: 'pay' | 'skip') {
    setError(null);
    if (action === 'pay') {
      const parsed = parseAmount(amountValue);
      if (!parsed.ok) return setError(amountErrorMessage(parsed.error));
      const paidOn = parseShortDate(date);
      if (!paidOn) return setError(es.transaction.errors.date);
      setBusy('pay');
      try {
        await api.pay(household!.id, rule!.id, dueDate, {
          transactionId,
          amountCents: parsed.value,
          date: paidOn,
        });
      } catch (e) {
        setBusy(null);
        return handle(e);
      }
    } else {
      setBusy('skip');
      try {
        await api.skip(household!.id, rule!.id, dueDate);
      } catch (e) {
        setBusy(null);
        return handle(e);
      }
    }
    await refresh();
    router.back();
  }

  function handle(e: unknown) {
    if (e instanceof ApiError && e.code === 'conflict') void refresh();
    setError(
      e instanceof ApiError && e.code === 'network'
        ? es.transaction.errors.offline
        : e instanceof Error
          ? e.message
          : es.auth.errors.unknown,
    );
  }

  return (
    <Screen title={`${category?.icon ?? ''} ${rule.name}`.trim()}>
      <View style={styles.info}>
        <Text style={[styles.due, overdue && { color: colors.error }]}>
          {es.recurring.dueOn(formatDueDate(dueDate, today))}
          {overdue ? ` · ${es.recurring.overdue}` : ''}
        </Text>
        <Text style={styles.muted}>
          {es.recurring.expectedAmount}: {formatMoney(rule.amountCents)}
        </Text>
      </View>
      <TextField
        label={es.recurring.realAmount}
        value={amountValue}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <Text style={styles.label}>{es.recurring.paidOn}</Text>
      <View style={styles.row}>
        <Chip
          label={es.transaction.today}
          selected={date === formatShortDate(today)}
          onPress={() => setDateText(formatShortDate(today))}
        />
        <Chip
          label={es.transaction.yesterday}
          selected={date === formatShortDate(addDays(today, -1))}
          onPress={() => setDateText(formatShortDate(addDays(today, -1)))}
        />
      </View>
      <TextField
        label={es.transaction.otherDate}
        value={date}
        onChangeText={setDateText}
        keyboardType="numbers-and-punctuation"
      />
      {error && <Message text={error} />}
      <Button
        label={rule.kind === 'income' ? es.recurring.collect : es.recurring.pay}
        onPress={() => run('pay')}
        loading={busy === 'pay'}
        disabled={busy !== null}
      />
      <Button
        variant="link"
        label={es.recurring.skip}
        onPress={() => run('skip')}
        loading={busy === 'skip'}
        disabled={busy !== null}
      />
      <Button variant="link" label={es.transaction.cancel} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { gap: spacing.xs },
  due: { fontSize: 17, fontWeight: '600', color: colors.text },
  muted: { fontSize: 15, color: colors.muted },
  label: { fontSize: 16, fontWeight: '600', color: colors.text },
  row: { flexDirection: 'row', gap: spacing.sm },
});
