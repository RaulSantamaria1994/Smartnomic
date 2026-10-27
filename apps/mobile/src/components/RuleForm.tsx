import type { Category, RecurringInput, RecurringRule } from '@smartnomic/api';
import { REMIND_DAYS_OPTIONS } from '@smartnomic/api';
import {
  parseAmount,
  type DateString,
  type Frequency,
  type TransactionKind,
} from '@smartnomic/domain';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { ApiError } from '../api/http';
import {
  amountErrorMessage,
  formatAmountInput,
  formatShortDate,
  monthName,
  parseShortDate,
  WEEKDAYS,
} from '../format';
import { es } from '../i18n/es';
import { colors, spacing } from '../theme';
import { Button } from './Button';
import { Chip } from './Chip';
import { Message } from './Message';
import { TextField } from './TextField';

type RemindDays = (typeof REMIND_DAYS_OPTIONS)[number];

interface Props {
  initial?: RecurringRule;
  categories: Category[];
  today: DateString;
  onSubmit: (input: RecurringInput) => Promise<void>;
  extraActions?: React.ReactNode;
}

// Lunes primero, como en el calendario español (0 = domingo).
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Formulario de un pago o cobro recurrente (especificación 001, RF-022). */
export function RuleForm({ initial, categories, today, onSubmit, extraActions }: Props) {
  const [kind, setKind] = useState<TransactionKind>(initial?.kind ?? 'expense');
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(initial ? formatAmountInput(initial.amountCents) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId);
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'monthly');
  const [interval, setInterval] = useState(String(initial?.interval ?? 1));
  const [day, setDay] = useState(String(initial?.dayOfMonth ?? Number(today.slice(8))));
  const [month, setMonth] = useState<number | null>(
    initial?.monthOfYear ?? Number(today.slice(5, 7)),
  );
  const [weekday, setWeekday] = useState<number | null>(initial?.weekday ?? null);
  const [start, setStart] = useState(formatShortDate(initial?.startDate ?? today));
  const [end, setEnd] = useState(initial?.endDate ? formatShortDate(initial.endDate) : '');
  const [remind, setRemind] = useState<RemindDays>(initial?.remindDaysBefore ?? 1);
  const [active, setActive] = useState(initial?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const options = categories.filter(
    (c) => c.kind === kind && (!c.archived || c.id === initial?.categoryId),
  );

  function changeKind(next: TransactionKind) {
    setKind(next);
    if (categories.find((c) => c.id === categoryId)?.kind !== next) setCategoryId(undefined);
  }

  async function submit() {
    setError(null);
    if (!name.trim()) return setError(es.recurring.errors.name);
    const parsed = parseAmount(amount);
    if (!parsed.ok) return setError(amountErrorMessage(parsed.error));
    if (!categoryId) return setError(es.transaction.errors.category);
    const every = Number(interval);
    if (!Number.isInteger(every) || every < 1 || every > 12)
      return setError(es.recurring.errors.interval);
    const dayOfMonth = Number(day);
    if (
      frequency !== 'weekly' &&
      (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31)
    ) {
      return setError(es.recurring.errors.day);
    }
    if (frequency === 'weekly' && weekday === null) return setError(es.recurring.errors.weekday);
    if (frequency === 'yearly' && month === null) return setError(es.recurring.errors.month);
    const startDate = parseShortDate(start);
    if (!startDate) return setError(es.recurring.errors.startDate);
    const endDate = end.trim() ? parseShortDate(end) : null;
    if (end.trim() && (!endDate || endDate < startDate))
      return setError(es.recurring.errors.endDate);

    setSaving(true);
    try {
      await onSubmit({
        kind,
        name: name.trim(),
        amountCents: parsed.value,
        categoryId,
        frequency,
        interval: every,
        dayOfMonth: frequency === 'weekly' ? null : dayOfMonth,
        monthOfYear: frequency === 'yearly' ? month : null,
        weekday: frequency === 'weekly' ? weekday : null,
        startDate,
        endDate,
        remindDaysBefore: remind,
        active,
      });
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === 'network'
          ? es.transaction.errors.offline
          : e instanceof Error
            ? e.message
            : es.auth.errors.unknown,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <View style={styles.row} accessibilityRole="radiogroup">
        <Chip
          label={es.transaction.expense}
          selected={kind === 'expense'}
          onPress={() => changeKind('expense')}
        />
        <Chip
          label={es.transaction.income}
          selected={kind === 'income'}
          onPress={() => changeKind('income')}
          color={colors.success}
        />
      </View>
      <TextField label={es.recurring.name} value={name} onChangeText={setName} maxLength={60} />
      <TextField
        label={es.recurring.expectedAmount}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0,00"
      />

      <Text style={styles.label}>{es.transaction.category}</Text>
      <View style={styles.wrap} accessibilityRole="radiogroup">
        {options.map((c) => (
          <Chip
            key={c.id}
            label={`${c.icon} ${c.name}`}
            selected={c.id === categoryId}
            onPress={() => setCategoryId(c.id)}
            color={c.color}
          />
        ))}
      </View>

      <Text style={styles.label}>{es.recurring.frequency}</Text>
      <View style={styles.wrap} accessibilityRole="radiogroup">
        {(['monthly', 'weekly', 'yearly'] as const).map((f) => (
          <Chip
            key={f}
            label={es.recurring[f]}
            selected={frequency === f}
            onPress={() => setFrequency(f)}
          />
        ))}
      </View>
      <TextField
        label={es.recurring.interval}
        value={interval}
        onChangeText={setInterval}
        keyboardType="number-pad"
      />

      {frequency === 'weekly' ? (
        <>
          <Text style={styles.label}>{es.recurring.weekday}</Text>
          <View style={styles.wrap} accessibilityRole="radiogroup">
            {WEEKDAY_ORDER.map((d) => (
              <Chip
                key={d}
                label={WEEKDAYS[d]!}
                selected={weekday === d}
                onPress={() => setWeekday(d)}
              />
            ))}
          </View>
        </>
      ) : (
        <TextField
          label={es.recurring.dayOfMonth}
          hint={es.recurring.dayOfMonthHint}
          value={day}
          onChangeText={setDay}
          keyboardType="number-pad"
        />
      )}
      {frequency === 'yearly' && (
        <>
          <Text style={styles.label}>{es.recurring.month}</Text>
          <View style={styles.wrap} accessibilityRole="radiogroup">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <Chip
                key={m}
                label={monthName(m)}
                selected={month === m}
                onPress={() => setMonth(m)}
              />
            ))}
          </View>
        </>
      )}

      <TextField
        label={es.recurring.startDate}
        value={start}
        onChangeText={setStart}
        keyboardType="numbers-and-punctuation"
      />
      <TextField
        label={es.recurring.endDate}
        value={end}
        onChangeText={setEnd}
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.label}>{es.recurring.remind}</Text>
      <View style={styles.wrap} accessibilityRole="radiogroup">
        {REMIND_DAYS_OPTIONS.map((d) => (
          <Chip
            key={d}
            label={es.recurring.remindOptions[d]}
            selected={remind === d}
            onPress={() => setRemind(d)}
          />
        ))}
      </View>

      {initial && (
        <View style={styles.switchRow}>
          <Text style={styles.label}>{es.recurring.active}</Text>
          <Switch
            value={active}
            onValueChange={setActive}
            accessibilityLabel={es.recurring.active}
          />
        </View>
      )}

      {error && <Message text={error} />}
      <Button label={es.transaction.save} onPress={submit} loading={saving} />
      {extraActions}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  label: { fontSize: 16, fontWeight: '600', color: colors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
