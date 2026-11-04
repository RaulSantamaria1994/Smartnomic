import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated } from 'react-native';
import { animate, DURATION, useReduceMotion } from '../design/motion';
import { trackList, withoutKey, type Tracked } from './animatedList';

/**
 * Lista cuyas filas nuevas aparecen fundidas y las que se borran o se deshacen desaparecen
 * fundidas (especificación 006, animación 7). En la primera carga no se anima nada.
 */
export function AnimatedList<T>({
  items,
  keyOf,
  render,
}: {
  items: readonly T[];
  keyOf: (item: T) => string;
  render: (item: T) => ReactNode;
}) {
  const reduce = useReduceMotion();
  const [rows, setRows] = useState(() => trackList(null, items, keyOf));
  const latest = useRef(items);
  useEffect(() => {
    if (latest.current === items) return;
    latest.current = items;
    setRows((previous) => {
      const next = trackList(previous, items, keyOf);
      return reduce ? next.filter((row) => row.state !== 'leave') : next;
    });
    // `keyOf` es una función nueva en cada pintado y no cambia el resultado.
  }, [items, reduce]);
  return (
    <>
      {rows.map((row) => (
        <FadeRow
          key={row.key}
          row={row}
          reduce={reduce}
          onGone={() => setRows((current) => withoutKey(current, row.key))}
        >
          {render(row.item)}
        </FadeRow>
      ))}
    </>
  );
}

function FadeRow<T>({
  row,
  reduce,
  onGone,
  children,
}: {
  row: Tracked<T>;
  reduce: boolean;
  onGone: () => void;
  children: ReactNode;
}) {
  const opacity = useRef(new Animated.Value(row.state === 'enter' ? 0 : 1)).current;
  useEffect(() => {
    if (row.state === 'enter') animate(opacity, 1, DURATION.base, reduce).start();
    if (row.state === 'leave') {
      animate(opacity, 0, DURATION.base, reduce).start(({ finished }) => finished && onGone());
    }
    // Solo cuando cambia el estado de la fila.
  }, [row.state]);
  return (
    <Animated.View
      style={{ opacity }}
      pointerEvents={row.state === 'leave' ? 'none' : 'auto'}
      aria-hidden={row.state === 'leave'}
    >
      {children}
    </Animated.View>
  );
}
