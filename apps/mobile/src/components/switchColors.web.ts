import { color } from '../design/tokens';

/**
 * Colores del interruptor en el navegador: los de `switchColors.ts`, más `activeThumbColor`.
 * react-native-web pinta el mando con `activeThumbColor` cuando el interruptor está activado
 * (por defecto, un verde azulado) y con `thumbColor` cuando no; con el mismo blanco en los dos
 * se ve igual que en Android.
 */
export function switchColors() {
  return {
    trackColor: { true: color.switch.track, false: color.border.strong },
    thumbColor: color.switch.thumb,
    activeThumbColor: color.switch.thumb,
  };
}
