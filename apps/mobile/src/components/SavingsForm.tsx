import type { SavingsGoalDto, SavingsGoalInput } from '@smartnomic/api';
import {
  compareDates,
  isCategoryIcon,
  parseAmount,
  savingsPlan,
  type CategoryIconId,
  type DateString,
} from '@smartnomic/domain';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiError } from '../api/http';
import { AppText } from '../design/Text';
import { color, radius, spacing } from '../design/tokens';
import {
  amountErrorMessage,
  formatAmountInput,
  formatMoney,
  formatShortDate,
  parseShortDate,
} from '../format';
import { es } from '../i18n/es';
import { Button } from './Button';
import { IconPicker } from './IconPicker';
import { Message } from './Message';
import { TextField } from './TextField';

interface Props {
  initial?: SavingsGoalDto;
  today: DateString;
  onSubmit: (input: SavingsGoalInput) => Promise<void>;
}

/** Crear o editar una hucha (especificación 005, RF-501). */
export function SavingsForm({ initial, today, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState<CategoryIconId>(
    initial && isCategoryIcon(initial.icon) ? initial.icon : 'savings',
  );
  const [amount, setAmount] = useState(initial ? formatAmountInput(initial.targetCents) : '');
  const [deadline, setDeadline] = useState(initial ? formatShortDate(initial.deadline) : '');
  const [day, setDay] = useState(String(initial?.contributionDay ?? 1));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Cuota que saldría con lo escrito, para una hucha nueva (aún sin ahorros).
  const parsedAmount = parseAmount(amount);
  const parsedDeadline = parseShortDate(deadline);
  const dayNumber = Number(day);
  const preview =
    !initial &&
    parsedAmount.ok &&
    parsedDeadline &&
    compareDates(parsedDeadline, today) >= 0 &&
    Number.isInteger(dayNumber) &&
    dayNumber >= 1 &&
    dayNumber <= 31
      ? savingsPlan(
          {
            targetCents: parsedAmount.value,
            deadline: parsedDeadline,
            contributionDay: dayNumber,
            startDate: today,
            closedAt: null,
          },
          [],
          today,
        )
      : null;

  async function submit() {
    setError(null);
    if (!name.trim()) return setError(es.savings.errors.name);
    if (!parsedAmount.ok) return setError(amountErrorMessage(parsedAmount.error));
    if (!parsedDeadline || compareDates(parsedDeadline, today) < 0) {
      return setError(es.savings.errors.deadline);
    }
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) {
      return setError(es.savings.errors.day);
    }
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        icon,
        targetCents: parsedAmount.value,
        deadline: parsedDeadline,
        contributionDay: dayNumber,
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
      <TextField
        label={es.savings.name}
        value={name}
        onChangeText={setName}
        maxLength={40}
        placeholder={es.savings.namePlaceholder}
      />
      <TextField
        label={es.savings.target}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0,00"
      />
      <TextField
        label={es.savings.deadline}
        value={deadline}
        onChangeText={setDeadline}
        keyboardType="numbers-and-punctuation"
        placeholder={formatShortDate(today)}
      />
      <TextField
        label={es.savings.day}
        hint={es.savings.dayHint}
        value={day}
        onChangeText={setDay}
        keyboardType="number-pad"
      />
      {preview && (
        <View style={styles.preview} accessibilityLiveRegion="polite">
          <AppText variant="bodyStrong" tone="accent">
            {es.savings.preview(formatMoney(preview.quotaCents), preview.contributionsLeft)}
          </AppText>
        </View>
      )}
      <AppText variant="label">{es.savings.icon}</AppText>
      <IconPicker
        value={icon}
        onChange={setIcon}
        tone={color.text.accent}
        accessibilityLabel={es.savings.icon}
      />
      {error && <Message text={error} />}
      <Button
        label={initial ? es.savings.save : es.savings.create}
        onPress={() => void submit()}
        loading={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  preview: {
    backgroundColor: color.bg.accentSoft,
    borderRadius: radius.md,
    padding: spacing.ms,
  },
});
