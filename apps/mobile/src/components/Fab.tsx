import { router } from 'expo-router';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { Icon } from '../design/Icon';
import { animate, DURATION, useReduceMotion } from '../design/motion';
import { color, radius, shadow, size, spacing } from '../design/tokens';
import { es } from '../i18n/es';

/**
 * Botón flotante «+» de Android, abajo a la derecha sobre la barra de pestañas
 * (especificación 006, RF-605). Abre «Apuntar» al pulsar, mientras el «+» gira un cuarto de
 * vuelta (animación 2): como el «+» es simétrico, al terminar vuelve a 0 sin que se note.
 */
export function Fab() {
  const reduce = useReduceMotion();
  const turn = useRef(new Animated.Value(0)).current;
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const press = () => {
    turn.stopAnimation();
    turn.setValue(0);
    animate(turn, 1, DURATION.fast, reduce).start(() => turn.setValue(0));
    router.push('/new');
  };
  return (
    <Pressable
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={es.tabs.add}
      android_ripple={{ color: color.text.onAccentMuted, borderless: false }}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Icon name="plus" tint={color.text.onAccent} />
      </Animated.View>
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
