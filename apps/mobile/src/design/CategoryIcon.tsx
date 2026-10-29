import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { DEFAULT_CATEGORY_ICON, isCategoryIcon } from '@smartnomic/domain';
import { StyleSheet, View } from 'react-native';
import { CATEGORY_GLYPHS } from './categoryGlyphs';
import { categoryBackground, iconTone } from './color';
import { color, radius, size as sizes } from './tokens';

/**
 * Icono de la categoría con su color sobre un fondo suave del mismo (RF-205, especificación
 * 004). Un icono que no está en el catálogo se ve como el genérico. Decorativo.
 */
export function CategoryIcon({
  icon,
  tone,
  size = 'md',
}: {
  icon: string | undefined;
  /** Color de la categoría (`#RRGGBB`). */
  tone: string | undefined;
  size?: 'md' | 'lg';
}) {
  const box = size === 'lg' ? 48 : 40;
  let background: string = color.bg.sunken;
  let foreground: string = color.text.muted;
  try {
    if (tone) {
      background = categoryBackground(tone);
      foreground = iconTone(tone);
    }
  } catch {
    // Un color mal guardado no rompe la fila: se usan los colores neutros.
  }
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[styles.box, { width: box, height: box, backgroundColor: background }]}
    >
      <MaterialCommunityIcons
        name={CATEGORY_GLYPHS[isCategoryIcon(icon) ? icon : DEFAULT_CATEGORY_ICON]}
        size={size === 'lg' ? sizes.categoryGlyphLarge : sizes.categoryGlyph}
        color={foreground}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
