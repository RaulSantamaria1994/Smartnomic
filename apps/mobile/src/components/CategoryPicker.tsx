import type { Category } from '@smartnomic/api';
import { StyleSheet, View } from 'react-native';
import { CategoryIcon } from '../design/CategoryIcon';
import { spacing } from '../design/tokens';
import { Chip } from './Chip';

/**
 * Categorías como chips con su icono pintado de su color; la elegida, en verde claro con la
 * marca (especificación 006).
 */
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
  return (
    <View
      style={styles.wrap}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {categories.map((c) => (
        <Chip
          key={c.id}
          label={c.name}
          selected={c.id === value}
          onPress={() => onChange(c.id)}
          icon={<CategoryIcon icon={c.icon} tone={c.color} size="sm" />}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
