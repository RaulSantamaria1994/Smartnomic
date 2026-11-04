import { StyleSheet, View } from 'react-native';
import { color, radius } from './tokens';

/**
 * Barra de progreso lineal de Material, de 4 px (especificación 006). `value` va de 0 a 1;
 * si pasa de 1 se pinta llena y en rojo. Decorativa: el texto de al lado dice la cifra.
 */
export function ProgressBar({ value }: { value: number }) {
  const over = value > 1;
  const width = `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` as const;
  return (
    <View style={styles.track} accessible={false} aria-hidden>
      <View style={[styles.fill, { width }, over && styles.over]} />
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
  fill: { height: 4, borderRadius: radius.pill, backgroundColor: color.progress.fill },
  over: { backgroundColor: color.progress.over },
});
