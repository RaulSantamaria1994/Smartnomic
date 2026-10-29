import { StyleSheet, Text, View } from 'react-native';
import { tint } from './color';
import { color, radius, typography } from './tokens';

/** Emoji de la categoría sobre un fondo suave de su color (RF-205). Decorativo. */
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
  try {
    if (tone) background = tint(tone, 0.16);
  } catch {
    // Un color mal guardado no rompe la fila: se usa el fondo neutro.
  }
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[styles.box, { width: box, height: box, backgroundColor: background }]}
    >
      <Text style={size === 'lg' ? typography.emojiLarge : typography.emoji}>{icon ?? '•'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
