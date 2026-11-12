import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { AppText } from '../design/Text';
import { color, radius, size, spacing } from '../design/tokens';

type Variant = 'primary' | 'secondary' | 'link' | 'danger' | 'destructive';

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
  secondary: 'link',
  link: 'link',
  danger: 'danger',
  destructive: 'onAccent',
} as const;

/** Variantes con fondo de color: el ripple y el indicador de carga van en claro. */
const FILLED: readonly Variant[] = ['primary', 'destructive'];

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
      android_ripple={{
        color: FILLED.includes(variant) ? color.text.onAccentMuted : color.bg.accentSoft,
      }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={FILLED.includes(variant) ? color.text.onAccent : color.text.link}
        />
      ) : (
        <AppText variant="bodyStrong" tone={TEXT_TONE[variant]}>
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
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    minHeight: size.button,
    overflow: 'hidden',
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
  destructive: { backgroundColor: color.bg.destructive },
  link: { minHeight: size.touch, paddingHorizontal: spacing.sm },
  pressed: { opacity: 0.8 },
  inactive: { opacity: 0.5 },
});
