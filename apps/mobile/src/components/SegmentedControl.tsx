import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '../design/Icon';
import { AppText } from '../design/Text';
import { color, radius, size, spacing } from '../design/tokens';

/** Botones segmentados de Material para elegir entre pocas opciones (gasto o ingreso). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}) {
  return (
    <View
      style={styles.track}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            aria-checked={selected}
            accessibilityLabel={option.label}
            android_ripple={{ color: color.bg.accentSoft }}
            style={[styles.segment, index > 0 && styles.divider, selected && styles.selected]}
          >
            {selected && <Icon name="check" size={18} tint={color.text.accent} />}
            <AppText variant="bodyStrong" tone={selected ? 'accent' : 'primary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: color.border.strong,
    borderRadius: radius.control,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    minHeight: size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { borderLeftWidth: 1, borderColor: color.border.strong },
  selected: { backgroundColor: color.bg.accentSoft },
});
