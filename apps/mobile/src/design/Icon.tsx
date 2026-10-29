import Feather from '@expo/vector-icons/Feather';
import { color, size as sizes } from './tokens';

/**
 * Iconos de interfaz (trazo fino, Feather). Los nombres son los de la app, no los del
 * juego de iconos, para poder cambiarlo sin tocar las pantallas. Son decorativos: quien
 * los usa en un botón le pone su propia etiqueta.
 */
const NAMES = {
  home: 'home',
  calendar: 'calendar',
  plus: 'plus',
  recurring: 'repeat',
  household: 'users',
  back: 'chevron-left',
  forward: 'chevron-right',
  bell: 'bell',
  close: 'x',
  check: 'check',
  alert: 'alert-circle',
  settings: 'settings',
  signOut: 'log-out',
  download: 'download',
  trash: 'trash-2',
  share: 'share-2',
  tag: 'tag',
  user: 'user',
  wifiOff: 'wifi-off',
} as const;

export type IconName = keyof typeof NAMES;

export function Icon({
  name,
  size = sizes.icon,
  tint = color.text.primary,
}: {
  name: IconName;
  size?: number;
  tint?: string;
}) {
  return (
    <Feather
      name={NAMES[name]}
      size={size}
      color={tint}
      accessible={false}
      importantForAccessibility="no"
      aria-hidden
    />
  );
}
