import type { Cents } from '@smartnomic/domain';
import { StyleSheet, View } from 'react-native';
import { formatMoney } from '../format';
import { es } from '../i18n/es';
import { spentShare } from './summary';
import { AppText } from './Text';
import { color, radius, spacing } from './tokens';

/**
 * Resumen del periodo (RF-203): lo que queda en grande, cuánto se ha gastado de lo que ha
 * entrado y los totales. Para el lector de pantalla es un único bloque con todo dicho.
 */
export function SummaryCard({
  incomeCents,
  expenseCents,
  balanceCents,
  current,
}: {
  incomeCents: Cents | undefined;
  expenseCents: Cents | undefined;
  balanceCents: Cents | undefined;
  /** Es el periodo actual («Te quedan este mes») u otro («Balance del periodo»). */
  current: boolean;
}) {
  const loaded =
    incomeCents !== undefined && expenseCents !== undefined && balanceCents !== undefined;
  const share = loaded ? spentShare(incomeCents, expenseCents) : null;
  const percent = share === null ? null : Math.round(share * 100);
  const title = current ? es.summary.leftThisMonth : es.summary.balance;
  const value = (cents: Cents | undefined) => (cents === undefined ? '—' : formatMoney(cents));
  const spentText =
    percent === null ? (loaded ? es.summary.noIncome : '') : es.summary.spentShare(percent);
  const label = loaded
    ? `${title}: ${value(balanceCents)}. ${es.month.income}: ${value(incomeCents)}. ${es.month.expenses}: ${value(expenseCents)}. ${spentText}`
    : title;

  return (
    <View style={styles.card} accessible accessibilityLabel={label}>
      <View style={styles.block}>
        <AppText variant="caption" tone="onAccentMuted">
          {title}
        </AppText>
        <AppText variant="display" tone="onAccent" tabular numberOfLines={1} adjustsFontSizeToFit>
          {value(balanceCents)}
        </AppText>
      </View>
      {loaded && (
        <View style={styles.block}>
          {share !== null && (
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.min(100, Math.max(0, share * 100))}%` },
                  share > 1 && styles.over,
                ]}
              />
            </View>
          )}
          <AppText variant="caption" tone="onAccentMuted">
            {spentText}
          </AppText>
        </View>
      )}
      <View style={styles.totals}>
        <View style={styles.total}>
          <AppText variant="caption" tone="onAccentMuted">
            {es.month.income}
          </AppText>
          <AppText variant="heading" tone="onAccent" tabular numberOfLines={1}>
            {value(incomeCents)}
          </AppText>
        </View>
        <View style={styles.total}>
          <AppText variant="caption" tone="onAccentMuted">
            {es.month.expenses}
          </AppText>
          <AppText variant="heading" tone="onAccent" tabular numberOfLines={1}>
            {value(expenseCents)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.bg.accent,
    borderRadius: radius.xxl,
    padding: spacing.ml,
    gap: spacing.md,
  },
  block: { gap: spacing.sm },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: color.progress.track,
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: color.progress.fill },
  over: { backgroundColor: color.status.overdue.bg },
  totals: { flexDirection: 'row', gap: spacing.sm },
  total: {
    flex: 1,
    backgroundColor: color.overlay.onAccent,
    borderRadius: radius.lg,
    padding: spacing.ms,
    gap: spacing.xxs,
  },
});
