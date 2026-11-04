import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Icon } from '../design/Icon';
import { color, radius, shadow, size, spacing } from '../design/tokens';
import { es } from '../i18n/es';

/**
 * Botón flotante «+» de Android, abajo a la derecha sobre la barra de pestañas
 * (especificación 006, RF-605). Abre «Apuntar».
 */
export function Fab() {
  return (
    <Pressable
      onPress={() => router.push('/new')}
      accessibilityRole="button"
      accessibilityLabel={es.tabs.add}
      android_ripple={{ color: color.text.onAccentMuted, borderless: false }}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Icon name="plus" tint={color.text.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: size.fab,
    height: size.fab,
    borderRadius: radius.fab,
    backgroundColor: color.bg.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadow.raised,
  },
  pressed: { opacity: 0.9 },
});
