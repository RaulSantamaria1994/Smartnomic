import { DEFAULT_CATEGORIES } from '@smartnomic/domain';
import { describe, expect, it } from 'vitest';
import { contrastRatio, iconTone, mix, tint } from './color';
import { categoryPalette, color } from './tokens';

describe('mix y tint', () => {
  it('mezcla dos colores en la proporción pedida', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('tint aclara un color hacia el blanco', () => {
    expect(tint('#000000', 0.14)).toBe('#DBDBDB');
    expect(tint('#0E5A4C', 1)).toBe('#0E5A4C');
    expect(tint('#0e5a4c', 0)).toBe('#FFFFFF');
  });

  it('rechaza colores mal escritos', () => {
    expect(() => tint('rojo')).toThrow();
    expect(() => tint('#FFF')).toThrow();
  });
});

describe('contrastRatio', () => {
  it('ratios WCAG conocidos', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
    expect(contrastRatio('#FFFFFF', '#767676')).toBeCloseTo(4.54, 2);
  });
});

describe('iconTone sobre blanco (especificación 006)', () => {
  const NON_TEXT = 3;
  const tones = [
    ...categoryPalette.map((c) => c.value),
    ...DEFAULT_CATEGORIES.map((c) => c.color),
    // Colores claros que podrían venir de datos antiguos.
    '#FFFF00',
    '#FFFFFF',
    '#FFD54F',
    '#7FDBFF',
  ];

  it('el icono contrasta 3:1 con el blanco (WCAG 1.4.11)', () => {
    for (const tone of tones) {
      expect(contrastRatio(iconTone(tone), color.bg.surface), tone).toBeGreaterThanOrEqual(
        NON_TEXT,
      );
    }
  });

  it('los colores de serie y de la paleta no cambian', () => {
    for (const tone of [
      ...categoryPalette.map((c) => c.value),
      ...DEFAULT_CATEGORIES.map((c) => c.color),
    ]) {
      expect(iconTone(tone), tone).toBe(tone);
    }
  });

  it('un color claro se oscurece hacia la tinta, sin llegar a ella si no hace falta', () => {
    const toned = iconTone('#FFD54F');
    expect(toned).not.toBe('#FFD54F');
    expect(toned).not.toBe(color.text.primary);
  });

  it('también contrasta sobre el fondo de un chip elegido', () => {
    for (const tone of tones) {
      expect(
        contrastRatio(iconTone(tone, color.bg.accentSoft), color.bg.accentSoft),
        tone,
      ).toBeGreaterThanOrEqual(NON_TEXT);
    }
  });
});
