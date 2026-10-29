import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { CategoryIconId } from '@smartnomic/domain';
import type { ComponentProps } from 'react';

type GlyphName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Glifo de Material Community Icons de cada icono de categoría (especificación 004). Al
 * ser un `Record` del catálogo, el compilador avisa si falta alguno.
 */
export const CATEGORY_GLYPHS: Record<CategoryIconId, GlyphName> = {
  salary: 'briefcase-outline',
  cash: 'cash-multiple',
  savings: 'piggy-bank-outline',
  gift: 'gift-outline',
  investment: 'chart-line',
  aid: 'hand-coin-outline',
  home: 'home-outline',
  utilities: 'lightbulb-outline',
  groceries: 'cart-outline',
  car: 'car-outline',
  health: 'stethoscope',
  education: 'school-outline',
  leisure: 'party-popper',
  clothes: 'tshirt-crew-outline',
  subscriptions: 'television-classic',
  insurance: 'shield-check-outline',
  other: 'package-variant-closed',
  tag: 'tag-outline',
  restaurant: 'silverware-fork-knife',
  coffee: 'coffee-outline',
  bus: 'bus',
  fuel: 'gas-station-outline',
  travel: 'airplane',
  pet: 'paw',
  baby: 'baby-carriage',
  kids: 'account-child-outline',
  sport: 'dumbbell',
  pharmacy: 'pill',
  water: 'water-outline',
  gas: 'fire',
  internet: 'wifi',
  phone: 'cellphone',
  repairs: 'tools',
  furniture: 'sofa-outline',
  cleaning: 'spray-bottle',
  books: 'book-open-variant',
  games: 'gamepad-variant-outline',
  music: 'music-note',
  bank: 'bank-outline',
  card: 'credit-card-outline',
  taxes: 'file-document-outline',
  donations: 'heart-outline',
  haircut: 'content-cut',
  garden: 'flower-outline',
};
