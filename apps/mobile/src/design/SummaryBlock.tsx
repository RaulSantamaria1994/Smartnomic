import type { Cents } from '@smartnomic/domain';
import { StyleSheet, View } from 'react-native';
import { formatMoney } from '../format';
import { es } from '../i18n/es';
import { ProgressBar } from './ProgressBar';
import { spentShare } from './summary';
import { AppText } from './Text';
import { color, spacing } from './tokens';

/**
 * Resumen del periodo (especificación 006): lo que queda en grande, una barra con cuánto
 * se ha gastado de lo que ha entrado y tres líneas con los totales. Lo apartado en huchas
 * se resta de lo que queda y se enseña aparte, sin contarlo como gasto (005, RF-506). Para
 * el lector de pantalla es un único bloque con todo dicho.
 */
export function SummaryBlock({
  incomeCents,
  expenseCents,
  balanceCents,
  setAsideCents = 0,
  current,
}: {
  incomeCents: Cents | undefined;
  expenseCents: Cents | undefined;
  balanceCents: Cents | undefined;
  /** Apartado para objetivos en el periodo (aportado menos sacado). */
  setAsideCents?: Cents;
  /** Es el periodo actual («Te quedan este mes») u otro («Balance del periodo»). */
  current: boolean;
}) {
  const loaded =
    incomeCents !== undefined && expenseCents !== undefined && balanceCents !== undefined;
  const share = loaded ? spentShare(incomeCents, expenseCents) : null;
  const percent = share === null ? null : Math.round(share * 100);
  const title = current ? es.summary.leftThisMonth : es.summary.balance;
  const value = (cents: Cents | undefined) => (cents === undefined ? '—' : formatMoney(cents));
  const remaining = balanceCents === undefined ? undefined : balanceCents - setAsideCents;
  const setAsideText = setAsideCents !== 0 ? es.summary.setAside(formatMoney(setAsideCents)) : null;
  const spentText =
    percent === null ? (loaded ? es.summary.noIncome : '') : es.summary.spentShare(percent);
  const label = loaded
    ? `${title}: ${value(remaining)}. ${es.month.income}: ${value(incomeCents)}. ${es.month.expenses}: ${value(expenseCents)}. ${setAsideText ? `${setAsideText}. ` : ''}${spentText}`
    : title;

  return (
    <View style={styles.block} accessible accessibilityLabel={label}>
      <AppText variant="caption" tone="muted">
        {title}
      </AppText>
      <AppText variant="display" tabular>
        {value(remaining)}
      </AppText>
      {loaded && (
        <View style={styles.spent}>
          {share !== null && <ProgressBar value={share} />}
          <AppText variant="small" tone="muted">
            {spentText}
          </AppText>
        </View>
      )}
      <View style={styles.lines}>
        <Line label={es.month.income} value={value(incomeCents)} income />
        <Line label={es.month.expenses} value={value(expenseCents)} />
        {loaded && setAsideCents !== 0 && (
          <Line label={es.summary.setAsideLabel} value={formatMoney(setAsideCents)} />
        )}
      </View>
    </View>
  );
}

function Line({ label, value, income }: { label: string; value: string; income?: boolean }) {
  return (
    <View style={styles.line}>
      <AppText variant="body" tone="muted">
        {label}
      </AppText>
      <AppText variant="bodyStrong" tabular style={income && styles.income}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { padding: spacing.md, gap: spacing.xs },
  spent: { gap: spacing.xs + 2, marginTop: spacing.xs, marginBottom: spacing.sm },
  lines: { gap: spacing.xs },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  income: { color: color.amount.income },
});
