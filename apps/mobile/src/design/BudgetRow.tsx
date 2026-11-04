import { budgetProgress, type BudgetLevel } from '@smartnomic/domain';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatMoney } from '../format';
import { es } from '../i18n/es';
import { CategoryIcon } from './CategoryIcon';
import { ProgressBar } from './ProgressBar';
import { AppText } from './Text';
import { color, spacing } from './tokens';

/** Color del estado: normal en verde, cerca en ámbar y pasado en rojo (RF-705). */
const LEVEL_COLOR: Record<BudgetLevel, string> = {
  ok: color.status.paid,
  near: color.status.soon,
  over: color.status.overdue,
};

/**
 * Fila de un presupuesto en «Mes» (especificación 007): la categoría, lo gastado de lo
 * previsto, una barra y lo que queda o lo que se ha pasado. Para el lector de pantalla es un
 * único bloque con todo dicho.
 */
export function BudgetRow({
  name,
  icon,
  tone,
  amountCents,
  spentCents,
  onPress,
}: {
  name: string;
  icon: string | undefined;
  tone: string | undefined;
  amountCents: number;
  spentCents: number;
  onPress?: () => void;
}) {
  const progress = budgetProgress(amountCents, spentCents);
  const spent = es.budgets.spentOf(formatMoney(spentCents), formatMoney(amountCents));
  const status =
    progress.level === 'over'
      ? es.budgets.over(formatMoney(progress.overCents))
      : es.budgets.left(formatMoney(progress.remainingCents));
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessible
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${name}, ${spent}, ${status}`}
      android_ripple={onPress ? { color: color.bg.sunken } : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <CategoryIcon icon={icon} tone={tone} />
      <View style={styles.text}>
        <View style={styles.line}>
          <AppText variant="body" numberOfLines={1} style={styles.name}>
            {name}
          </AppText>
          <AppText variant="caption" tone="muted" tabular>
            {spent}
          </AppText>
        </View>
        <View style={styles.bar}>
          <ProgressBar
            value={progress.share}
            tone={progress.level === 'ok' ? undefined : progress.level}
          />
        </View>
        <AppText variant="caption" style={{ color: LEVEL_COLOR[progress.level] }}>
          {status}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.ms,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.bg.surface,
  },
  pressed: { backgroundColor: color.bg.sunken },
  text: { flex: 1, minWidth: 0, gap: spacing.xxs },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  name: { flex: 1, minWidth: 0 },
  bar: { paddingVertical: spacing.xs + 2 },
});
