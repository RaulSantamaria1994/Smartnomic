import type { Category, TransactionInput } from '@smartnomic/api';
import { addDays, parseAmount, type DateString, type TransactionKind } from '@smartnomic/domain';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextStyle } from 'react-native';
import { ApiError } from '../api/http';
import { amountErrorMessage, formatAmountInput, formatShortDate, parseShortDate } from '../format';
import { es } from '../i18n/es';
import { AppText } from '../design/Text';
import { color, spacing, typography } from '../design/tokens';
import { Button } from './Button';
import { CategoryPicker } from './CategoryPicker';
import { Chip } from './Chip';
import { Message } from './Message';
import { SegmentedControl } from './SegmentedControl';
import { TextField } from './TextField';

const FOCUS_DELAY_MS = 400;

export interface TransactionFormValues {
  kind: TransactionKind;
  amountCents?: number;
  categoryId?: string;
  date: DateString;
  note?: string | null;
}

interface Props {
  initial: TransactionFormValues;
  categories: Category[];
  today: DateString;
  onSubmit: (input: TransactionInput) => Promise<void>;
  /** Se muestra tras guardar o borrar. */
  extraActions?: React.ReactNode;
}

/**
 * Formulario de un movimiento. Para apuntar un gasto bastan tres pasos: escribir el
 * importe, tocar la categoría y guardar (RF-012). Si falla, lo escrito se conserva.
 */
export function TransactionForm({ initial, categories, today, onSubmit, extraActions }: Props) {
  const [kind, setKind] = useState<TransactionKind>(initial.kind);
  const [amount, setAmount] = useState(
    initial.amountCents !== undefined ? formatAmountInput(initial.amountCents) : '',
  );
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [date, setDate] = useState<DateString>(initial.date);
  const [dateText, setDateText] = useState(formatShortDate(initial.date));
  const [note, setNote] = useState(initial.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  // Al apuntar, el cursor va directo al importe. Se espera a que termine la transición de
  // la pantalla: si no, en la web el navegador desplaza la vista para enseñar el campo.
  const isNew = initial.amountCents === undefined;
  useEffect(() => {
    if (!isNew) return;
    const timer = setTimeout(() => amountRef.current?.focus(), FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isNew]);

  // Las archivadas no se ofrecen, salvo la que ya tenía el movimiento (RF-021).
  const options = categories.filter(
    (c) => c.kind === kind && (!c.archived || c.id === initial.categoryId),
  );
  const yesterday = addDays(today, -1);

  function changeKind(next: TransactionKind) {
    setKind(next);
    if (categories.find((c) => c.id === categoryId)?.kind !== next) setCategoryId(undefined);
  }

  function pickDate(next: DateString) {
    setDate(next);
    setDateText(formatShortDate(next));
  }

  async function submit() {
    setError(null);
    const parsed = parseAmount(amount);
    if (!parsed.ok) return setError(amountErrorMessage(parsed.error));
    if (!categoryId) return setError(es.transaction.errors.category);
    const typedDate = parseShortDate(dateText);
    if (!typedDate) return setError(es.transaction.errors.date);

    setSaving(true);
    try {
      await onSubmit({
        kind,
        amountCents: parsed.value,
        categoryId,
        date: typedDate,
        note: note.trim() || null,
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
      <SegmentedControl
        accessibilityLabel={es.transaction.kind}
        value={kind}
        onChange={changeKind}
        options={[
          { value: 'expense', label: es.transaction.expense },
          { value: 'income', label: es.transaction.income },
        ]}
      />

      <View style={styles.amountBlock}>
        <View style={styles.amountBox}>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0,00"
            placeholderTextColor={color.text.muted}
            keyboardType="decimal-pad"
            ref={amountRef}
            accessibilityLabel={es.transaction.amount}
            style={styles.amount}
          />
          <AppText variant="headline" tone="muted">
            €
          </AppText>
        </View>
      </View>

      <AppText variant="label">{es.transaction.category}</AppText>
      <CategoryPicker
        accessibilityLabel={es.transaction.category}
        categories={options}
        value={categoryId}
        onChange={setCategoryId}
      />

      <AppText variant="label">{es.transaction.date}</AppText>
      <View style={styles.row}>
        <Chip
          label={es.transaction.today}
          selected={date === today && dateText === formatShortDate(today)}
          onPress={() => pickDate(today)}
        />
        <Chip
          label={es.transaction.yesterday}
          selected={date === yesterday && dateText === formatShortDate(yesterday)}
          onPress={() => pickDate(yesterday)}
        />
      </View>
      <TextField
        label={es.transaction.otherDate}
        value={dateText}
        onChangeText={(text) => {
          setDateText(text);
          const parsed = parseShortDate(text);
          if (parsed) setDate(parsed);
        }}
        keyboardType="numbers-and-punctuation"
      />
      <TextField label={es.transaction.note} value={note} onChangeText={setNote} maxLength={500} />

      {error && <Message text={error} />}
      <Button label={es.transaction.save} onPress={submit} loading={saving} />
      {extraActions}
    </View>
  );
}

// `outlineStyle: 'none'` existe en la web pero no en los tipos de React Native.
const webWithoutOutline: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {};

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  amountBlock: { alignItems: 'center', paddingVertical: spacing.sm },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderBottomWidth: 3,
    borderColor: color.border.focus,
    alignSelf: 'stretch',
  },
  amount: {
    ...typography.display,
    flex: 1,
    // En la web un <input> no se encoge por debajo de su ancho propio sin esto.
    minWidth: 0,
    color: color.text.primary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    // El subrayado verde ya indica el foco; sin esto el navegador añade su recuadro.
    ...webWithoutOutline,
  },
});
