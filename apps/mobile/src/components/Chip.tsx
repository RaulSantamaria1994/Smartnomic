import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '../design/Text';
import { color as tokens, radius, size, spacing } from '../design/tokens';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Color de relleno cuando está elegido (por defecto, el verde pino). */
  color?: string;
}

export function Chip({ label, selected, onPress, color = tokens.bg.accent }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      // react-native-web no pasa `checked` a `aria-checked`, que el rol radio necesita.
      aria-checked={selected}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: color, borderColor: color },
        pressed && styles.pressed,
      ]}
    >
      <AppText variant="label" tone={selected ? 'onAccent' : 'primary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: tokens.border.strong,
    backgroundColor: tokens.bg.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: size.touch,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
});
