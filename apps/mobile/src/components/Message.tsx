import { StyleSheet, View } from 'react-native';
import { Icon } from '../design/Icon';
import { AppText } from '../design/Text';
import { color, radius, spacing } from '../design/tokens';

/** Mensaje de error o de éxito, anunciado por los lectores de pantalla. */
export function Message({ text, kind = 'error' }: { text: string; kind?: 'error' | 'success' }) {
  const status = kind === 'error' ? color.status.overdue : color.status.paid;
  return (
    <View
      style={[styles.box, { backgroundColor: status.bg }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Icon name={kind === 'error' ? 'alert' : 'check'} size={18} tint={status.fg} />
      <AppText variant="caption" style={[styles.text, { color: status.fg }]}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.sm,
  },
  text: { flex: 1 },
});
