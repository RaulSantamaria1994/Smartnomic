import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { Icon } from '../design/Icon';
import { animate, DURATION, useReduceMotion } from '../design/motion';
import { AppText } from '../design/Text';
import { color, radius, size, spacing } from '../design/tokens';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Icono delante del texto; al elegirlo se cambia por la marca. */
  icon?: ReactNode;
  /** Se pueden elegir varios a la vez (filtros): rol `checkbox` en lugar de `radio`. */
  multiple?: boolean;
}

/** Chip de Material para elegir una opción (especificación 006). */
export function Chip({ label, selected, onPress, icon, multiple }: Props) {
  const reduce = useReduceMotion();
  // La marca crece al elegir el chip (animación 4); si ya venía elegido, está quieta.
  const mark = useRef(new Animated.Value(1)).current;
  const wasSelected = useRef(selected);
  useEffect(() => {
    if (selected && !wasSelected.current) {
      mark.setValue(0);
      animate(mark, 1, DURATION.fast, reduce).start();
    }
    wasSelected.current = selected;
  }, [selected, reduce, mark]);
  const leading = selected ? (
    <Animated.View style={{ transform: [{ scale: mark }] }}>
      <Icon name="check" size={18} tint={color.text.accent} />
    </Animated.View>
  ) : (
    icon
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ selected, checked: selected }}
      // react-native-web no pasa `checked` a `aria-checked`, que los roles radio y checkbox
      // necesitan.
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
