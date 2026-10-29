import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { AppText } from '../design/Text';
import { color, radius, size, spacing } from '../design/tokens';

type Variant = 'primary' | 'secondary' | 'link' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  /** Lo que oye un lector de pantalla, si `label` no basta (por ejemplo, «Archivar Ropa»). */
  accessibilityLabel?: string;
}

const TEXT_TONE = {
  primary: 'onAccent',
  secondary: 'primary',
  link: 'link',
  danger: 'danger',
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  accessibilityLabel,
}: Props) {
  const inactive = Boolean(disabled || loading);
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole={variant === 'link' ? 'link' : 'button'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? color.text.onAccent : color.text.link} />
      ) : (
        <AppText variant={variant === 'link' ? 'label' : 'bodyStrong'} tone={TEXT_TONE[variant]}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    minHeight: size.button,
  },
  primary: { backgroundColor: color.bg.accent },
  secondary: {
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: color.border.strong,
  },
  danger: {
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: color.text.danger,
  },
  link: { minHeight: size.touch, paddingHorizontal: spacing.sm, borderRadius: radius.sm },
  pressed: { opacity: 0.8 },
  inactive: { opacity: 0.5 },
});
