import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';
import { duration } from './timing';

export { DURATION } from './timing';

/** En Android la animación va en el hilo nativo; en la web no existe. */
const useNativeDriver = Platform.OS !== 'web';

// Se lee al arrancar y se sigue: así ninguna pantalla anima mientras se consulta.
let reduceMotion = false;
const listeners = new Set<(value: boolean) => void>();
void AccessibilityInfo.isReduceMotionEnabled()
  .then((value) => {
    reduceMotion = value;
    listeners.forEach((listener) => listener(value));
  })
  .catch(() => undefined);
AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
  reduceMotion = value;
  listeners.forEach((listener) => listener(value));
});

/** `true` si el sistema pide no animar («Quitar animaciones», «reducir movimiento»). */
export function useReduceMotion(): boolean {
  const [value, setValue] = useState(reduceMotion);
  useEffect(() => {
    listeners.add(setValue);
    setValue(reduceMotion);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

/** Lleva `value` a `toValue` en `ms` (0 si hay que reducir el movimiento). */
export function animate(
  value: Animated.Value,
  toValue: number,
  ms: number,
  reduce: boolean,
): Animated.CompositeAnimation {
  return Animated.timing(value, {
    toValue,
    duration: duration(ms, reduce),
    easing: Easing.out(Easing.quad),
    useNativeDriver,
  });
}
