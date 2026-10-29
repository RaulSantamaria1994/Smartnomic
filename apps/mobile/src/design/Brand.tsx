import { StyleSheet, View } from 'react-native';
import { AppText } from './Text';
import { color, radius, spacing } from './tokens';

/** Marca de Smartnomic para las pantallas sin sesión: símbolo, nombre y lema. */
export function Brand({ tagline }: { tagline: string }) {
  return (
    <View style={styles.row} accessibilityRole="header">
      <View style={styles.mark} aria-hidden accessible={false}>
        <AppText variant="title" tone="onAccent">
          S
        </AppText>
        <View style={styles.dot} />
      </View>
      <View style={styles.text}>
        <AppText variant="heading">Smartnomic</AppText>
        <AppText variant="caption" tone="muted">
          {tagline}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, marginBottom: spacing.md },
  mark: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: color.bg.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    right: 9,
    top: 9,
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: color.progress.fill,
  },
  text: { flex: 1 },
});
