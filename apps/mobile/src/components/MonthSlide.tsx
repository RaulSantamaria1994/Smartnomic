import { useEffect, useRef, type ReactNode } from 'react';
import { Animated } from 'react-native';
import { animate, DURATION, useReduceMotion } from '../design/motion';

/**
 * Al cambiar de mes con las flechas, el contenido entra deslizando 24 px desde el lado de la
 * flecha y fundiéndose (especificación 006, animación 6). `direction` es 1 si se avanzó y -1
 * si se retrocedió; al abrir la pantalla no se mueve.
 */
export function MonthSlide({
  month,
  direction,
  children,
}: {
  month: string;
  direction: 1 | -1;
  children: ReactNode;
}) {
  const reduce = useReduceMotion();
  const progress = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    progress.stopAnimation();
    progress.setValue(0);
    animate(progress, 1, DURATION.base, reduce).start();
  }, [month, progress, reduce]);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [24 * direction, 0] });
  return (
    <Animated.View style={{ opacity: progress, transform: [{ translateX }] }}>
      {children}
    </Animated.View>
  );
}
