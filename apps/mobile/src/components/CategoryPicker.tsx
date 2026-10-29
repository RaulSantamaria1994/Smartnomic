import type { Category } from '@smartnomic/api';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CategoryIcon } from '../design/CategoryIcon';
import { AppText } from '../design/Text';
import { color, radius, spacing } from '../design/tokens';

/** En un móvil caben 3 por fila sin partir los nombres; en pantallas anchas, 4. */
const columnsFor = (width: number) => (width >= 440 ? 4 : 3);
const GAP = spacing.sm;

/** Cuadrícula de categorías con su icono y color (RF-205). */
export function CategoryPicker({
  categories,
  value,
  onChange,
  accessibilityLabel,
}: {
  categories: Category[];
  value: string | undefined;
  onChange: (id: string) => void;
  accessibilityLabel: string;
}) {
  const [width, setWidth] = useState(0);
  const columns = columnsFor(width);
  const itemWidth = width > 0 ? (width - GAP * (columns - 1)) / columns : undefined;
  return (
    <View
      style={styles.grid}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {categories.map((c) => {
        const selected = c.id === value;
        return (
          <Pressable
            key={c.id}
            onPress={() => onChange(c.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            aria-checked={selected}
            accessibilityLabel={c.name}
            style={({ pressed }) => [
              styles.item,
              itemWidth !== undefined ? { width: itemWidth } : styles.fallback,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}
          >
            <CategoryIcon icon={c.icon} tone={c.color} />
            <AppText variant="small" numberOfLines={2} align="center">
              {c.name}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  item: {
    minHeight: 88,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: color.border.default,
    backgroundColor: color.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  fallback: { width: '30%' },
  selected: { borderColor: color.border.accent, backgroundColor: color.bg.accentSoft },
  pressed: { opacity: 0.8 },
});
