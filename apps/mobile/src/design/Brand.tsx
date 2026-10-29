import { Image, StyleSheet, View } from 'react-native';
import icon from '../../assets/icon.png';
import { AppText } from './Text';
import { radius, spacing } from './tokens';

/** Marca de Smartnomic para las pantallas sin sesión: símbolo, nombre y lema. */
export function Brand({ tagline }: { tagline: string }) {
  return (
    <View style={styles.row} accessibilityRole="header">
      <Image source={icon} style={styles.mark} accessible={false} aria-hidden />
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
  mark: { width: 48, height: 48, borderRadius: radius.lg },
  text: { flex: 1 },
});
