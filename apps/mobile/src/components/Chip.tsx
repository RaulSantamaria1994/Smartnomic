import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Icon } from '../design/Icon';
import { AppText } from '../design/Text';
import { color, radius, size, spacing } from '../design/tokens';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Icono delante del texto; al elegirlo se cambia por la marca. */
  icon?: ReactNode;
}

/** Chip de Material para elegir una opción (especificación 006). */
export function Chip({ label, selected, onPress, icon }: Props) {
  const leading = selected ? <Icon name="check" size={18} tint={color.text.accent} /> : icon;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      // react-native-web no pasa `checked` a `aria-checked`, que el rol radio necesita.
      aria-checked={selected}
      accessibilityLabel={label}
      android_ripple={{ color: color.bg.accentSoft }}
      // El chip mide 36 px; el área que se puede tocar llega a 44.
      hitSlop={(size.touch - CHIP_HEIGHT) / 2}
      style={({ pressed }) => [
        styles.chip,
        leading ? styles.withIcon : null,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      {leading}
      <AppText variant={selected ? 'label' : 'caption'} tone={selected ? 'accent' : 'primary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const CHIP_HEIGHT = 36;

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderWidth: 1,
    borderColor: color.border.strong,
    backgroundColor: color.bg.surface,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.ms,
    minHeight: CHIP_HEIGHT,
    overflow: 'hidden',
  },
  withIcon: { paddingLeft: spacing.sm },
  selected: { backgroundColor: color.bg.accentSoft, borderColor: color.bg.accentSoft },
  pressed: { opacity: 0.8 },
});
