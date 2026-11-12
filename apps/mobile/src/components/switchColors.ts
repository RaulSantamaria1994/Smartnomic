import { color } from '../design/tokens';

/**
 * Colores del interruptor de Android con el verde de la app (especificación 006): pista verde
 * oscuro con el mando blanco al activarlo (3:1 con el fondo, WCAG 1.4.11) y pista gris con el
 * mando blanco al desactivarlo. Además del color, los distingue la posición del mando.
 */
export function switchColors() {
  return {
    trackColor: { true: color.switch.track, false: color.border.strong },
    thumbColor: color.switch.thumb,
  };
}
