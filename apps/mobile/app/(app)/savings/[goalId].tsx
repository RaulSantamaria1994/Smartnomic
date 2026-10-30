import type { SavingsEntryDto } from '@smartnomic/api';
import { parseAmount } from '@smartnomic/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../../src/api/client';
import { ApiError } from '../../../src/api/http';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { Screen } from '../../../src/components/Screen';
import { SegmentedControl } from '../../../src/components/SegmentedControl';
import { TextField } from '../../../src/components/TextField';
import { Amount } from '../../../src/design/Amount';
import { Card } from '../../../src/design/Card';
import { ListRow } from '../../../src/design/ListRow';
import { SavingsCard } from '../../../src/design/SavingsCard';
import { AppText } from '../../../src/design/Text';
import { spacing } from '../../../src/design/tokens';
import {
  amountErrorMessage,
  formatDayMonth,
  formatDueDate,
  formatMoney,
  formatShortDate,
  parseShortDate,
} from '../../../src/format';
import { todayIn, useCan, useMe, useSavings, useSavingsEntries } from '../../../src/hooks/data';
import { useRefreshSavings } from '../../../src/hooks/useRuleMutations';
import { es } from '../../../src/i18n/es';
import { newTransactionId } from '../../../src/ids';

type Kind = 'deposit' | 'withdrawal';

/** Detalle de una hucha: progreso, aportar, sacar, historial y deshacer (especificación 005). */
export default function SavingsDetail() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const me = useMe();
  const household = me.data?.household;
  const savings = useSavings(household?.id);
  const entries = useSavingsEntries(household?.id, goalId);
  const refresh = useRefreshSavings(household?.id);
  const canWrite = useCan()('savings.write');
  // Un id por movimiento: reintentar no lo duplica. Se renueva tras guardar.
  const entryId = useRef(newTransactionId());
  const [kind, setKind] = useState<Kind>('deposit');
  const [amount, setAmount] = useState('');
  const [dateText, setDateText] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: 'error' | 'success' } | null>(null);
  const [busy, setBusy] = useState(false);

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
        <Button label={es.settings.back} onPress={() => router.back()} />
      </Screen>
    );
  }

  const today = todayIn(household.timezone);
  const open = goal.plan.status !== 'closed';
  const date = dateText ?? formatShortDate(today);
  const list = entries.data?.entries ?? [];

  function fail(e: unknown) {
    setMessage({
      kind: 'error',
      text:
        e instanceof ApiError && e.code === 'network'
          ? es.transaction.errors.offline
          : e instanceof Error
            ? e.message
            : es.auth.errors.unknown,
    });
  }

  async function save() {
    setMessage(null);
    const parsed = parseAmount(amount);
    if (!parsed.ok) return setMessage({ kind: 'error', text: amountErrorMessage(parsed.error) });
    const on = parseShortDate(date);
    if (!on) return setMessage({ kind: 'error', text: es.transaction.errors.date });
    setBusy(true);
    try {
      await api.saveSavingsEntry(household!.id, goal!.id, entryId.current, {
        kind,
        amountCents: parsed.value,
        date: on,
      });
      entryId.current = newTransactionId();
      setAmount('');
      setDateText(null);
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function undo(entry: SavingsEntryDto) {
    setMessage(null);
    try {
      await api.undoSavingsEntry(household!.id, goal!.id, entry.id);
      await refresh();
      setMessage({ kind: 'success', text: es.savings.undone });
    } catch (e) {
      fail(e);
    }
  }

  return (
    <Screen title={goal.name} align="top">
      <SavingsCard goal={goal} />

      {canWrite && open && goal.plan.nextDueDate && (
        <Button
          label={es.savings.payDue(formatDueDate(goal.plan.nextDueDate, today))}
          onPress={() => router.push(`/savings/${goal.id}/due/${goal.plan.nextDueDate}`)}
        />
      )}

      {canWrite && open && (
        <Card style={styles.form}>
          <SegmentedControl
            accessibilityLabel={es.savings.entryKind}
            value={kind}
            onChange={(value) => setKind(value)}
            options={[
              { value: 'deposit', label: es.savings.deposit },
              { value: 'withdrawal', label: es.savings.withdraw },
            ]}
          />
          <TextField
            label={es.savings.entryAmount}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0,00"
          />
          <TextField
            label={es.savings.entryDate}
            value={date}
            onChangeText={setDateText}
            keyboardType="numbers-and-punctuation"
          />
          <Button
            label={kind === 'deposit' ? es.savings.saveDeposit : es.savings.saveWithdrawal}
            loading={busy}
            onPress={() => void save()}
          />
        </Card>
      )}

      {message && <Message text={message.text} kind={message.kind} />}

      <View style={styles.section}>
        <AppText variant="heading" accessibilityRole="header">
          {es.savings.history}
        </AppText>
        {entries.isPending && <ActivityIndicator accessibilityLabel={es.common.loading} />}
        {entries.data && list.length === 0 && (
          <AppText variant="body" tone="muted">
            {es.savings.noHistory}
          </AppText>
        )}
        {list.length > 0 && (
          <Card padded={false}>
            {list.map((entry, index) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                first={index === 0}
                onUndo={canWrite && open && index === 0 ? () => void undo(entry) : undefined}
              />
            ))}
          </Card>
        )}
      </View>

      <Button variant="link" label={es.settings.back} onPress={() => router.back()} />
    </Screen>
  );
}

function EntryRow({
  entry,
  first,
  onUndo,
}: {
  entry: SavingsEntryDto;
  first: boolean;
  onUndo: (() => void) | undefined;
}) {
  const title = es.savings.kinds[entry.kind];
  const detail = [
    formatShortDate(entry.date),
    entry.dueDate && es.savings.forMonth(formatDayMonth(entry.dueDate)),
    entry.memberName && es.household.byMember(entry.memberName),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View>
      <ListRow
        first={first}
        title={title}
        detail={detail}
        trailing={
          entry.kind === 'skip' ? undefined : (
            <Amount
              cents={entry.amountCents}
              kind={entry.kind === 'deposit' ? 'income' : 'expense'}
            />
          )
        }
        accessibilityLabel={`${title}, ${entry.kind === 'skip' ? '' : `${formatMoney(entry.amountCents)}, `}${detail}`}
      />
      {onUndo && (
        <View style={styles.undo}>
          <Button
            variant="link"
            label={es.savings.undo}
            accessibilityLabel={es.savings.undoLabel(title)}
            onPress={onUndo}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.ms },
  section: { gap: spacing.sm },
  undo: { alignItems: 'flex-end', paddingHorizontal: spacing.md },
});
