import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { color, size as sizes } from './tokens';

/**
 * Iconos de interfaz de Material Community Icons, el mismo juego que las categorías
 * (especificación 006, RF-603). Los nombres son los de la app, no los del juego de iconos,
 * para poder cambiarlo sin tocar las pantallas. Son decorativos: quien
 * los usa en un botón le pone su propia etiqueta.
 */
const NAMES = {
  home: 'home-outline',
  calendar: 'calendar-blank-outline',
  plus: 'plus',
  recurring: 'repeat',
  household: 'account-group-outline',
  back: 'chevron-left',
  arrowBack: 'arrow-left',
  forward: 'chevron-right',
  bell: 'bell-outline',
  close: 'close',
  check: 'check',
  alert: 'alert-circle-outline',
  settings: 'cog-outline',
  signOut: 'logout',
  download: 'download',
  trash: 'trash-can-outline',
  share: 'share-variant-outline',
  tag: 'tag-outline',
  savings: 'piggy-bank-outline',
  budget: 'wallet-outline',
  chart: 'chart-bar',
  user: 'account-outline',
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
    <MaterialCommunityIcons
      name={NAMES[name]}
      size={size}
      color={tint}
      accessible={false}
      importantForAccessibility="no"
      aria-hidden
    />
  );
}
