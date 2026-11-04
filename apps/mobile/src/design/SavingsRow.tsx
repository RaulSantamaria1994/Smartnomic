import type { SavingsGoalDto } from '@smartnomic/api';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { formatMoney, formatShortDate } from '../format';
import { es } from '../i18n/es';
import { CategoryIcon } from './CategoryIcon';
import { Icon } from './Icon';
import { ProgressBar } from './ProgressBar';
import { type StatusKind } from './StatusText';
import { AppText } from './Text';
import { color, spacing } from './tokens';
import { useBounce } from './useBounce';

/** Estado de una hucha en texto de color (RF-204, RF-604). */
export function savingsStatus(goal: SavingsGoalDto): { kind: StatusKind; label: string } {
  switch (goal.plan.status) {
    case 'achieved':
      return { kind: 'paid', label: es.savings.achieved };
    case 'expired':
      return { kind: 'overdue', label: es.savings.expired };
    case 'closed':
      return { kind: 'skipped', label: es.savings.closedStatus };
    default:
      return goal.plan.onTrack
        ? { kind: 'paid', label: es.savings.onTrack }
        : { kind: 'soon', label: es.savings.behind };
  }
}

/**
 * Fila de una hucha (RF-502, especificación 006): nombre, plazo y estado, barra de progreso
 * y lo ahorrado con la cuota. Para el lector de pantalla es un único bloque con todo dicho.
 */
export function SavingsRow({ goal, onPress }: { goal: SavingsGoalDto; onPress?: () => void }) {
  const { plan } = goal;
  const status = savingsStatus(goal);
  // Al conseguirla, su icono da un bote una vez (animación 8).
  const bounce = useBounce(goal.id, plan.status === 'achieved');
  const progress = es.savings.progress(formatMoney(plan.savedCents), formatMoney(goal.targetCents));
  const quota =
    plan.status === 'active' && plan.quotaCents > 0
      ? es.savings.quota(formatMoney(plan.quotaCents), goal.contributionDay)
      : null;
  const until = es.savings.until(formatShortDate(goal.deadline));
  const label = [goal.name, status.label, progress, `${plan.percent} %`, quota, until]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      android_ripple={onPress ? { color: color.bg.sunken } : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Animated.View style={{ transform: [{ translateY: bounce }] }}>
        <CategoryIcon icon={goal.icon} tone={color.text.muted} />
      </Animated.View>
      <View style={styles.text}>
        <AppText variant="body" numberOfLines={2}>
          {goal.name}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {until} ·{' '}
          <AppText variant="caption" style={{ color: color.status[status.kind] }}>
            {status.label}
          </AppText>
        </AppText>
        <View style={styles.bar}>
          <ProgressBar value={plan.percent / 100} />
        </View>
        <AppText variant="caption" tone="muted" tabular>
          {[`${progress} (${plan.percent} %)`, quota].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      {onPress && <Icon name="forward" size={20} tint={color.text.muted} />}
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
  text: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  bar: { paddingVertical: spacing.xs + 2 },
});
