import type { SavingsEntryDto } from '@smartnomic/api';
import { parseAmount } from '@smartnomic/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { api } from '../../../src/api/client';
import { ApiError } from '../../../src/api/http';
import { AnimatedList } from '../../../src/components/AnimatedList';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { goBack, Screen } from '../../../src/components/Screen';
import { SegmentedControl } from '../../../src/components/SegmentedControl';
import { TextField } from '../../../src/components/TextField';
import { Amount } from '../../../src/design/Amount';
import { CategoryIcon } from '../../../src/design/CategoryIcon';
import { ProgressBar } from '../../../src/design/ProgressBar';
import { savingsStatus } from '../../../src/design/SavingsRow';
import { Section } from '../../../src/design/Section';
import { AppText } from '../../../src/design/Text';
import { color, spacing } from '../../../src/design/tokens';
import { useBounce } from '../../../src/design/useBounce';
import {
  amountErrorMessage,
  formatDayMonth,
  formatDueDate,
  formatMoney,
  formatShortDate,
  parseShortDate,
} from '../../../src/format';
import { todayIn, useCan, useSavings, useSavingsEntries } from '../../../src/hooks/data';
import { useRefreshSavings } from '../../../src/hooks/useRuleMutations';
import { es } from '../../../src/i18n/es';
import { newTransactionId } from '../../../src/ids';
import { useHousehold } from '../../../src/households/active';

type Kind = 'deposit' | 'withdrawal';

/** Detalle de una hucha: progreso, aportar, sacar, historial y deshacer (especificación 005). */
export default function SavingsDetail() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const { household } = useHousehold();
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
  const [confirmClose, setConfirmClose] = useState(false);
  // El icono da un bote la primera vez que se ve conseguida (animación 8).
  const bounce = useBounce(
    `detalle-${goalId}`,
    savings.data?.goals.find((g) => g.id === goalId)?.plan.status === 'achieved',
  );

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
        <Button label={es.settings.back} onPress={() => goBack()} />
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

  async function close() {
    setMessage(null);
    setBusy(true);
    try {
      await api.closeSavingsGoal(household!.id, goal!.id);
      setConfirmClose(false);
      await refresh();
      setMessage({ kind: 'success', text: es.savings.closed });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setMessage(null);
    try {
      await api.deleteSavingsGoal(household!.id, goal!.id);
      await refresh();
      goBack();
    } catch (e) {
      fail(e);
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

  const status = savingsStatus(goal);
  const quota =
    goal.plan.status === 'active' && goal.plan.quotaCents > 0
      ? es.savings.quota(formatMoney(goal.plan.quotaCents), goal.contributionDay)
      : null;

  return (
    <Screen title={goal.name} back bleed>
      <Section padded separated>
        <View style={styles.progress}>
          <AppText variant="caption" tone="muted">
            {es.savings.until(formatShortDate(goal.deadline))} ·{' '}
            <AppText variant="caption" style={{ color: color.status[status.kind] }}>
              {status.label}
            </AppText>
          </AppText>
          <AppText variant="title" tabular>
            {es.savings.progress(formatMoney(goal.plan.savedCents), formatMoney(goal.targetCents))}{' '}
            ({goal.plan.percent} %)
          </AppText>
          <ProgressBar value={goal.plan.percent / 100} />
          {quota && (
            <AppText variant="caption" tone="muted">
              {quota}
            </AppText>
          )}
        </View>
        {goal.closedAt && (
          <AppText variant="body" tone="muted">
            {es.savings.closedTitle(formatShortDate(goal.closedAt.slice(0, 10)))}
          </AppText>
        )}
        {canWrite && open && goal.plan.nextDueDate && (
          <Button
            label={es.savings.payDue(formatDueDate(goal.plan.nextDueDate, today))}
            onPress={() => router.push(`/savings/${goal.id}/due/${goal.plan.nextDueDate}`)}
          />
        )}
      </Section>

      {canWrite && open && confirmClose && (
        <Section padded separated>
          <AppText variant="bodyStrong">
            {goal.plan.savedCents > 0
              ? es.savings.closeConfirm(formatMoney(goal.plan.savedCents))
              : es.savings.closeConfirmEmpty}
          </AppText>
          <Button
            variant="danger"
            label={es.savings.closeYes}
            loading={busy}
            onPress={() => void close()}
          />
          <Button
            variant="link"
            label={es.transaction.cancel}
            onPress={() => setConfirmClose(false)}
          />
        </Section>
      )}

      {goal.plan.status === 'achieved' && (
        <Section padded separated>
          <View style={styles.achieved}>
            <Animated.View style={{ transform: [{ translateY: bounce }] }}>
              <CategoryIcon icon={goal.icon} tone={color.text.accent} size="lg" />
            </Animated.View>
            <AppText variant="title" tone="accent" accessibilityRole="header">
              {es.savings.achievedTitle}
            </AppText>
          </View>
          <AppText variant="body">{es.savings.achievedHint}</AppText>
          {canWrite && !confirmClose && (
            <Button label={es.savings.closeAndUse} onPress={() => setConfirmClose(true)} />
          )}
        </Section>
      )}
      {goal.plan.status === 'expired' && (
        <Section padded separated>
          <Message text={es.savings.expiredTitle(formatShortDate(goal.deadline))} />
          <AppText variant="body">{es.savings.expiredHint}</AppText>
          {canWrite && (
            <Button
              label={es.savings.extend}
              onPress={() => router.push(`/savings/${goal.id}/edit`)}
            />
          )}
        </Section>
      )}

      {canWrite && open && (
        <Section padded separated>
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
            suffix="€"
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
          {message && <Message text={message.text} kind={message.kind} />}
        </Section>
      )}
      {message && !(canWrite && open) && (
        <View style={styles.pad}>
          <Message text={message.text} kind={message.kind} />
        </View>
      )}

      <Section title={es.savings.history}>
        {entries.isPending && <ActivityIndicator accessibilityLabel={es.common.loading} />}
        {entries.data && list.length === 0 && (
          <AppText variant="body" tone="muted" style={styles.none}>
            {es.savings.noHistory}
          </AppText>
        )}
        <AnimatedList
          items={list}
          keyOf={(entry) => entry.id}
          render={(entry) => (
            <EntryRow
              entry={entry}
              onUndo={
                canWrite && open && entry.id === list[0]?.id ? () => void undo(entry) : undefined
              }
            />
          )}
        />
      </Section>

      {canWrite && open && !confirmClose && (
        <View style={styles.pad}>
          <Button
            variant="secondary"
            label={es.savings.edit}
            onPress={() => router.push(`/savings/${goal.id}/edit`)}
          />
          {entries.data && list.length === 0 ? (
            <Button variant="danger" label={es.savings.remove} onPress={() => void remove()} />
          ) : (
            <Button
              variant="secondary"
              label={es.savings.close}
              onPress={() => setConfirmClose(true)}
            />
          )}
        </View>
      )}
    </Screen>
  );
}

function EntryRow({ entry, onUndo }: { entry: SavingsEntryDto; onUndo: (() => void) | undefined }) {
  const title = es.savings.kinds[entry.kind];
  const detail = [
    formatShortDate(entry.date),
    entry.dueDate && es.savings.forMonth(formatDayMonth(entry.dueDate)),
    entry.memberName && es.household.byMember(entry.memberName),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={styles.entry}>
      <View
        style={styles.entryText}
        accessible
        accessibilityLabel={`${title}, ${entry.kind === 'skip' ? '' : `${formatMoney(entry.amountCents)}, `}${detail}`}
      >
        <AppText variant="body">{title}</AppText>
        <AppText variant="caption" tone="muted">
          {detail}
        </AppText>
      </View>
      <View style={styles.entrySide}>
        {entry.kind !== 'skip' && (
          <Amount
            cents={entry.amountCents}
            kind={entry.kind === 'deposit' ? 'income' : 'expense'}
          />
        )}
        {onUndo && (
          <Button
            variant="link"
            label={es.savings.undo}
            accessibilityLabel={es.savings.undoLabel(title)}
            onPress={onUndo}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { gap: spacing.xs + 2 },
  achieved: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms },
  pad: { padding: spacing.md, gap: spacing.ms },
  none: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    minHeight: 64,
    borderBottomWidth: 1,
    borderColor: color.border.default,
  },
  entryText: { flex: 1, gap: spacing.xxs, minWidth: 0, paddingVertical: spacing.sm },
  entrySide: { alignItems: 'flex-end', paddingRight: spacing.sm },
});
