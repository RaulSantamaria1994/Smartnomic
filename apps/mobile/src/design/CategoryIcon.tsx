import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { DEFAULT_CATEGORY_ICON, isCategoryIcon } from '@smartnomic/domain';
import { CATEGORY_GLYPHS } from './categoryGlyphs';
import { iconTone } from './color';
import { color, size as sizes } from './tokens';

/**
 * Icono de la categoría pintado con su color, sin fondo (especificación 006, RF-603). Un
 * icono que no está en el catálogo se ve como el genérico. Decorativo.
 */
export function CategoryIcon({
  icon,
  tone,
  size = 'md',
  background,
}: {
  icon: string | undefined;
  /** Color de la categoría (`#RRGGBB`). */
  tone: string | undefined;
  size?: 'sm' | 'md' | 'lg';
  /** Fondo sobre el que va, si no es blanco, para ajustar el contraste. */
  background?: string;
}) {
  let foreground: string = color.text.muted;
  try {
    if (tone) foreground = iconTone(tone, background);
  } catch {
    // Un color mal guardado no rompe la fila: se usa el gris.
  }
  return (
    <MaterialCommunityIcons
      name={CATEGORY_GLYPHS[isCategoryIcon(icon) ? icon : DEFAULT_CATEGORY_ICON]}
      size={
        size === 'lg'
          ? sizes.categoryGlyphLarge
          : size === 'sm'
            ? sizes.iconSmall
            : sizes.categoryGlyph
      }
      color={foreground}
      accessible={false}
      importantForAccessibility="no"
      aria-hidden
    />
  );
}
