import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { animate, DURATION, useReduceMotion } from './motion';

// Huchas que ya han dado el bote en esta sesión: no se repite al volver a la pantalla.
const bounced = new Set<string>();

/**
 * Bote de la hucha conseguida (especificación 006, animación 8): sube 6 px y vuelve, una
 * vez por sesión, cuando `active` se cumple. Devuelve el desplazamiento para `translateY`.
 */
export function useBounce(id: string, active: boolean): Animated.Value {
  const reduce = useReduceMotion();
  const offset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active || bounced.has(id)) return;
    bounced.add(id);
    if (reduce) return;
    const half = DURATION.slow / 2;
    Animated.sequence([
      animate(offset, -6, half, reduce),
      animate(offset, 0, half, reduce),
    ]).start();
  }, [id, active, reduce, offset]);
  return offset;
}
