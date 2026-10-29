/**
 * Catálogo cerrado de iconos de categoría (especificación 004, RF-401). Cada categoría
 * guarda uno de estos identificadores; la app decide con qué glifo y nombre se muestra.
 */
export const CATEGORY_ICONS = [
  // Ingresos
  'salary',
  'cash',
  'savings',
  'gift',
  'investment',
  'aid',
  // Gastos de las categorías predefinidas
  'home',
  'utilities',
  'groceries',
  'car',
  'health',
  'education',
  'leisure',
  'clothes',
  'subscriptions',
  'insurance',
  'other',
  // Genérico
  'tag',
  // Otros gastos frecuentes
  'restaurant',
  'coffee',
  'bus',
  'fuel',
  'travel',
  'pet',
  'baby',
  'kids',
  'sport',
  'pharmacy',
  'water',
  'gas',
  'internet',
  'phone',
  'repairs',
  'furniture',
  'cleaning',
  'books',
  'games',
  'music',
  'bank',
  'card',
  'taxes',
  'donations',
  'haircut',
  'garden',
] as const;

export type CategoryIconId = (typeof CATEGORY_ICONS)[number];

/** Icono de una categoría sin icono elegido o con uno que no se reconoce. */
export const DEFAULT_CATEGORY_ICON: CategoryIconId = 'tag';

const ICON_SET: ReadonlySet<string> = new Set(CATEGORY_ICONS);

export function isCategoryIcon(value: string | null | undefined): value is CategoryIconId {
  return value !== null && value !== undefined && ICON_SET.has(value);
}

/**
 * Emoji que usaban las categorías antes de la 004 y su icono equivalente. Las claves van
 * sin el selector de variante (U+FE0F). La migración `0005_category_icons.sql` repite
 * esta tabla tal como estaba al crearla y un test comprueba que no se contradicen.
 * Escapes para no tener emoji en el código.
 */
export const EMOJI_TO_CATEGORY_ICON: Readonly<Record<string, CategoryIconId>> = {
  // Las predefinidas y el valor por defecto de antes
  '\u{1F4BC}': 'salary',
  '\u{1F4B0}': 'cash',
  '\u{1F3E0}': 'home',
  '\u{1F4A1}': 'utilities',
  '\u{1F6D2}': 'groceries',
  '\u{1F697}': 'car',
  '\u{1FA7A}': 'health',
  '\u{1F393}': 'education',
  '\u{1F389}': 'leisure',
  '\u{1F455}': 'clothes',
  '\u{1F4FA}': 'subscriptions',
  '\u{1F6E1}': 'insurance',
  '\u{1F4E6}': 'other',
  '\u{1F3F7}': 'tag',
  // Frecuentes en categorías creadas a mano
  '\u{1F436}': 'pet',
  '\u{1F431}': 'pet',
  '\u{2708}': 'travel',
  '\u{1F37D}': 'restaurant',
  '\u{26FD}': 'fuel',
  '\u{1F48A}': 'pharmacy',
  '\u{1F381}': 'gift',
  '\u{1F68C}': 'bus',
};

/**
 * Icono para un valor guardado antes de la 004: un identificador se queda igual, un emoji
 * conocido pasa a su equivalente y cualquier otra cosa al genérico (RF-403).
 */
export function iconFromEmoji(value: string): CategoryIconId {
  const trimmed = value.trim();
  if (isCategoryIcon(trimmed)) return trimmed;
  return EMOJI_TO_CATEGORY_ICON[trimmed.replaceAll('\u{FE0F}', '')] ?? DEFAULT_CATEGORY_ICON;
}
