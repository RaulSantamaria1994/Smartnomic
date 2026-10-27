import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'link';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled }: Props) {
  const inactive = Boolean(disabled || loading);
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole={variant === 'link' ? 'link' : 'button'}
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      style={({ pressed }) => [
        variant === 'primary' ? styles.primary : styles.link,
        (pressed || inactive) && styles.dimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <Text style={variant === 'primary' ? styles.primaryText : styles.linkText}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  link: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: { color: colors.primary, fontSize: 16, fontWeight: '500' },
  dimmed: { opacity: 0.6 },
});
