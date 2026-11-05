import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { animate, DURATION, useReduceMotion } from './motion';
import { color, radius } from './tokens';

export type ChartTone = 'fill' | 'income' | 'expense';

/**
 * Barra horizontal de las gráficas (especificación 008), de 8 px. `share` va de 0 a 1 y
 * sale de `barShare` del dominio (con su mínimo visible). Al aparecer se rellena desde cero
 * y, si cambia, va del valor anterior al nuevo; con «reducir movimiento», sin animación.
 * Decorativa: la fila dice la cifra en texto.
 */
export function ChartBar({ share, tone = 'fill' }: { share: number; tone?: ChartTone }) {
  const reduce = useReduceMotion();
  const target = Math.min(1, Math.max(0, share));
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = animate(fill, target, DURATION.slow, reduce);
    animation.start();
    return () => animation.stop();
  }, [fill, target, reduce]);
  return (
    <View style={styles.track} accessible={false} aria-hidden>
      <Animated.View
        style={[styles.fill, { backgroundColor: color.chart[tone], transform: [{ scaleX: fill }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.control,
    backgroundColor: color.chart.track,
    overflow: 'hidden',
  },
  fill: { height: 8, width: '100%', transformOrigin: 'left' },
});
