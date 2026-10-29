import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color, radius, spacing } from './tokens';

/** Superficie blanca con borde suave; `accent` la pinta de verde pino (resumen). */
export function Card({
  children,
  accent,
  padded = true,
  style,
}: {
  children: ReactNode;
  accent?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, accent && styles.accent, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.bg.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border.default,
    overflow: 'hidden',
  },
  accent: {
    backgroundColor: color.bg.accent,
    borderColor: color.bg.accent,
    borderRadius: radius.xxl,
  },
  padded: { padding: spacing.md },
});
