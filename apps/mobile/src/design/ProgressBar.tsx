import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { animate, DURATION, useReduceMotion } from './motion';
import { color, radius } from './tokens';

/**
 * Barra de progreso lineal de Material, de 4 px (especificación 006). `value` va de 0 a 1;
 * si pasa de 1 se pinta llena y en rojo. Al aparecer se rellena desde cero y, si cambia,
 * va del valor anterior al nuevo (animación 5). Decorativa: el texto de al lado dice la cifra.
 */
export function ProgressBar({ value }: { value: number }) {
  const reduce = useReduceMotion();
  const target = Math.min(1, Math.max(0, value));
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = animate(fill, target, DURATION.slow, reduce);
    animation.start();
    return () => animation.stop();
  }, [fill, target, reduce]);
  return (
    <View style={styles.track} accessible={false} aria-hidden>
      <Animated.View
        style={[styles.fill, value > 1 && styles.over, { transform: [{ scaleX: fill }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.progress.track,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    width: '100%',
    backgroundColor: color.progress.fill,
    transformOrigin: 'left',
  },
  over: { backgroundColor: color.progress.over },
});
