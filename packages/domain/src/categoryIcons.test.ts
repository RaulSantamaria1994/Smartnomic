import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from './categories';
import {
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_ICON,
  EMOJI_TO_CATEGORY_ICON,
  iconFromEmoji,
  isCategoryIcon,
} from './categoryIcons';

// Los emoji van como escapes para que no haya ninguno en el código (CE-401).
const HOUSE = '\u{1F3E0}';
const SHIELD = '\u{1F6E1}\u{FE0F}';
const SHIELD_BARE = '\u{1F6E1}';
const LABEL = '\u{1F3F7}\u{FE0F}';
const DOG = '\u{1F436}';
const PLANE = '\u{2708}\u{FE0F}';

describe('CATEGORY_ICONS', () => {
  it('tiene 44 identificadores únicos, cortos y en minúsculas', () => {
    expect(CATEGORY_ICONS).toHaveLength(44);
    expect(new Set(CATEGORY_ICONS).size).toBe(CATEGORY_ICONS.length);
    for (const id of CATEGORY_ICONS) expect(id).toMatch(/^[a-z]{2,16}$/);
  });

  it('incluye el genérico', () => {
    expect(DEFAULT_CATEGORY_ICON).toBe('tag');
    expect(CATEGORY_ICONS).toContain(DEFAULT_CATEGORY_ICON);
  });

  it('cada categoría predefinida usa un icono del catálogo, sin repetir', () => {
    const icons = DEFAULT_CATEGORIES.map((c) => c.icon);
    for (const icon of icons) expect(isCategoryIcon(icon)).toBe(true);
    expect(new Set(icons).size).toBe(icons.length);
  });
});

describe('isCategoryIcon', () => {
  it('acepta solo identificadores del catálogo', () => {
    expect(isCategoryIcon('home')).toBe(true);
    expect(isCategoryIcon('pet')).toBe(true);
    expect(isCategoryIcon(HOUSE)).toBe(false);
    expect(isCategoryIcon('Home')).toBe(false);
    expect(isCategoryIcon('cart-outline')).toBe(false);
    expect(isCategoryIcon('')).toBe(false);
    expect(isCategoryIcon(undefined)).toBe(false);
  });
});

describe('iconFromEmoji', () => {
  it('convierte los emoji de las categorías predefinidas de antes', () => {
    const before: Record<string, string> = {
      Nómina: '\u{1F4BC}',
      'Otros ingresos': '\u{1F4B0}',
      Vivienda: HOUSE,
      Suministros: '\u{1F4A1}',
      Supermercado: '\u{1F6D2}',
      Transporte: '\u{1F697}',
      Salud: '\u{1FA7A}',
      Educación: '\u{1F393}',
      Ocio: '\u{1F389}',
      Ropa: '\u{1F455}',
      Suscripciones: '\u{1F4FA}',
      Seguros: SHIELD,
      'Otros gastos': '\u{1F4E6}',
    };
    for (const category of DEFAULT_CATEGORIES) {
      expect(iconFromEmoji(before[category.name]!), category.name).toBe(category.icon);
    }
  });

  it('convierte la etiqueta y algunos frecuentes', () => {
    expect(iconFromEmoji(LABEL)).toBe('tag');
    expect(iconFromEmoji(DOG)).toBe('pet');
    expect(iconFromEmoji(PLANE)).toBe('travel');
  });

  it('da igual el selector de variante y los espacios', () => {
    expect(iconFromEmoji(SHIELD_BARE)).toBe('insurance');
    expect(iconFromEmoji(` ${SHIELD} `)).toBe('insurance');
    expect(iconFromEmoji('\u{2708}')).toBe('travel');
  });

  it('deja igual lo que ya es un identificador y lo desconocido pasa al genérico', () => {
    expect(iconFromEmoji('groceries')).toBe('groceries');
    expect(iconFromEmoji('\u{1F984}')).toBe('tag');
    expect(iconFromEmoji('abc')).toBe('tag');
    expect(iconFromEmoji('')).toBe('tag');
  });

  it('la tabla solo apunta a iconos del catálogo y sus claves no llevan selector', () => {
    for (const [emoji, icon] of Object.entries(EMOJI_TO_CATEGORY_ICON)) {
      expect(isCategoryIcon(icon)).toBe(true);
      expect(emoji).not.toContain('\u{FE0F}');
    }
  });
});
