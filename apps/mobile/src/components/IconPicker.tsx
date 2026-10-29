import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CATEGORY_ICONS, type CategoryIconId } from '@smartnomic/domain';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CATEGORY_GLYPHS } from '../design/categoryGlyphs';
import { categoryBackground, iconTone } from '../design/color';
import { color, radius, size, spacing } from '../design/tokens';
import { es } from '../i18n/es';
import { iconColumnsFor, MIN_ICON_CELL } from './iconGrid';

const GAP = spacing.sm;

/**
 * Cuadrícula para elegir el icono de una categoría (especificación 004, historia 2). El
 * elegido se pinta con el color de la categoría, como se verá en la app.
 */
export function IconPicker({
  value,
  onChange,
  tone,
  accessibilityLabel,
}: {
  value: CategoryIconId;
  onChange: (icon: CategoryIconId) => void;
  /** Color de la categoría (`#RRGGBB`). */
  tone: string;
  accessibilityLabel: string;
}) {
  const [width, setWidth] = useState(0);
  const columns = iconColumnsFor(width, GAP);
  const cell = width > 0 ? (width - GAP * (columns - 1)) / columns : MIN_ICON_CELL;
  return (
    <View
      style={styles.grid}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {CATEGORY_ICONS.map((icon) => {
        const selected = icon === value;
        return (
          <Pressable
            key={icon}
            onPress={() => onChange(icon)}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            aria-checked={selected}
            accessibilityLabel={es.categoryIcons[icon]}
            style={({ pressed }) => [
              styles.cell,
              { width: cell, height: Math.max(cell, MIN_ICON_CELL) },
              selected && {
                backgroundColor: categoryBackground(tone),
                borderColor: iconTone(tone),
              },
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name={CATEGORY_GLYPHS[icon]}
              size={size.categoryGlyph}
              color={selected ? iconTone(tone) : color.text.muted}
              accessible={false}
              importantForAccessibility="no"
              aria-hidden
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: {
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.border.default,
    backgroundColor: color.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
});
