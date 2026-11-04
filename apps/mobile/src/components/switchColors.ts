import { color } from '../design/tokens';

/** Colores del interruptor de Android con el verde de la app (especificación 006). */
export function switchColors(on: boolean) {
  return {
    trackColor: { true: color.switch.track, false: color.border.strong },
    thumbColor: on ? color.switch.thumb : color.bg.surface,
  };
}
