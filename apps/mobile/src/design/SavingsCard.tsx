import type { SavingsGoalDto } from '@smartnomic/api';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatMoney, formatShortDate } from '../format';
import { es } from '../i18n/es';
import { CategoryIcon } from './CategoryIcon';
import { StatusPill, type PillKind } from './StatusPill';
import { AppText } from './Text';
import { color, radius, spacing } from './tokens';

/** Etiqueta del estado de una hucha, con texto y color (RF-204). */
export function savingsPill(goal: SavingsGoalDto): { kind: PillKind; label: string } {
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
 * Tarjeta de una hucha (RF-502): lo ahorrado de lo que se quiere, barra de progreso, la
 * cuota y el plazo. Para el lector de pantalla es un único bloque con todo dicho.
 */
export function SavingsCard({ goal, onPress }: { goal: SavingsGoalDto; onPress?: () => void }) {
  const { plan } = goal;
  const pill = savingsPill(goal);
  const progress = es.savings.progress(formatMoney(plan.savedCents), formatMoney(goal.targetCents));
  const quota =
    plan.status === 'active' && plan.quotaCents > 0
      ? es.savings.quota(formatMoney(plan.quotaCents), goal.contributionDay)
      : null;
  const until = es.savings.until(formatShortDate(goal.deadline));
  const label = [goal.name, pill.label, progress, `${plan.percent} %`, quota, until]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <CategoryIcon icon={goal.icon} tone={color.text.accent} />
        <View style={styles.title}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {goal.name}
          </AppText>
          <AppText variant="caption" tone="muted">
            {until}
          </AppText>
        </View>
        <StatusPill kind={pill.kind} label={pill.label} />
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${plan.percent}%` }]} />
      </View>
      <View style={styles.row}>
        <AppText variant="body" tabular>
          {progress}
        </AppText>
        <AppText variant="label" tone="accent" tabular>
          {plan.percent} %
        </AppText>
      </View>
      {quota && (
        <AppText variant="caption" tone="muted">
          {quota}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.bg.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border.default,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms },
  title: { flex: 1, gap: spacing.xxs },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: color.bg.sunken,
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: color.bg.accent },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
