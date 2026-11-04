import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import icon from '../../assets/icon.png';
import { animate, DURATION, useReduceMotion } from './motion';
import { AppText } from './Text';
import { radius, spacing } from './tokens';

/**
 * Marca de Smartnomic para las pantallas sin sesión: el icono de la app y el nombre. El icono
 * aparece suave al abrir, una vez (especificación 006, animación 3).
 */
export function Brand() {
  const reduce = useReduceMotion();
  const shown = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    animate(shown, 1, DURATION.slow, reduce).start();
  }, [shown, reduce]);
  const scale = shown.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  return (
    <View style={styles.row}>
      <Animated.Image
        source={icon}
        style={[styles.mark, { opacity: shown, transform: [{ scale }] }]}
        accessible={false}
        aria-hidden
      />
      <AppText variant="heading">Smartnomic</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, marginBottom: spacing.sm },
  mark: { width: 48, height: 48, borderRadius: radius.chip },
});
