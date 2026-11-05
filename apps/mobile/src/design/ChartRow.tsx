import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChartBar, type ChartTone } from './ChartBar';
import { AppText } from './Text';
import { color, spacing } from './tokens';

export interface ChartRowBar {
  share: number;
  tone?: ChartTone;
  /** Texto encima de la barra cuando hay más de una («Ingresos 1.800,00 €»). */
  caption?: string;
}

/**
 * Fila de una gráfica (especificación 008): delante, opcionalmente, un icono; el nombre y
 * su cifra en una línea y, debajo, una o varias barras. Para el lector de pantalla es un
 * único bloque con todo dicho (RF-807); las barras son decorativas.
 */
export function ChartRow({
  label,
  value,
  detail,
  leading,
  bars,
  accessibilityLabel,
  accessibilityHint,
  onPress,
}: {
  label: string;
  value: string;
  /** Texto pequeño junto a la cifra (el porcentaje). */
  detail?: string;
  leading?: ReactNode;
  bars: ChartRowBar[];
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessible
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      android_ripple={onPress ? { color: color.bg.sunken } : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {leading}
      <View style={styles.text}>
        <View style={styles.line}>
          <AppText variant="body" numberOfLines={2} style={styles.name}>
            {label}
          </AppText>
          <AppText variant="amount" tabular>
            {value}
          </AppText>
        </View>
        {detail && (
          <AppText variant="caption" tone="muted" tabular>
            {detail}
          </AppText>
        )}
        {bars.map((bar, index) => (
          <View key={index} style={styles.bar}>
            {bar.caption && (
              <AppText variant="caption" tone="muted" tabular>
                {bar.caption}
              </AppText>
            )}
            <ChartBar share={bar.share} tone={bar.tone} />
          </View>
        ))}
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
  bar: { gap: spacing.xxs, paddingTop: spacing.xs },
});
