import { DEFAULT_CATEGORIES } from '@smartnomic/domain';
import { describe, expect, it } from 'vitest';
import { categoryBackground, contrastRatio, iconTone, mix, tint } from './color';
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

describe('contraste de los tokens «Calma» (WCAG 2.1 AA)', () => {
  const AA = 4.5;
  const pairs: [string, string, string][] = [
    ['texto sobre el fondo', color.text.primary, color.bg.canvas],
    ['texto secundario sobre el fondo', color.text.muted, color.bg.canvas],
    ['texto secundario sobre tarjeta', color.text.muted, color.bg.surface],
    ['enlace sobre el fondo', color.text.link, color.bg.canvas],
    ['texto sobre el botón principal', color.text.onAccent, color.bg.accent],
    ['texto claro sobre la tarjeta de resumen', color.text.onAccentMuted, color.bg.accent],
    ['ingresos sobre tarjeta', color.amount.income, color.bg.surface],
    ['error sobre tarjeta', color.text.danger, color.bg.surface],
  ];
  for (const [name, fg, bg] of pairs) {
    it(name, () => expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA));
  }

  for (const [status, { fg, bg }] of Object.entries(color.status)) {
    it(`etiqueta de estado «${status}»`, () =>
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA));
  }

  it('bordes de campos y foco: 3:1 sobre tarjeta y fondo (WCAG 1.4.11)', () => {
    for (const bg of [color.bg.surface, color.bg.canvas]) {
      expect(contrastRatio(color.border.strong, bg)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(color.border.focus, bg)).toBeGreaterThanOrEqual(3);
    }
  });

  it('la tinta se lee sobre el fondo suave de cada categoría predefinida', () => {
    for (const category of DEFAULT_CATEGORIES) {
      expect(
        contrastRatio(color.text.primary, tint(category.color)),
        category.name,
      ).toBeGreaterThanOrEqual(AA);
    }
  });
});

describe('iconTone (especificación 004)', () => {
  const NON_TEXT = 3;
  const tones = [
    ...categoryPalette.map((c) => c.value),
    ...DEFAULT_CATEGORIES.map((c) => c.color),
    // Colores claros que podrían venir de datos antiguos.
    '#FFFF00',
    '#FFFFFF',
    '#C28A00',
    '#7FDBFF',
  ];

  it('el icono contrasta 3:1 con el fondo suave de su categoría (WCAG 1.4.11)', () => {
    for (const tone of tones) {
      expect(contrastRatio(iconTone(tone), categoryBackground(tone)), tone).toBeGreaterThanOrEqual(
        NON_TEXT,
      );
    }
  });

  it('un color que ya contrasta no cambia', () => {
    expect(iconTone('#1F5FBF')).toBe('#1F5FBF');
    expect(iconTone('#455A64')).toBe('#455A64');
  });

  it('un color claro se oscurece hacia la tinta, sin llegar a ella si no hace falta', () => {
    const toned = iconTone('#C28A00');
    expect(toned).not.toBe('#C28A00');
    expect(toned).not.toBe(color.text.primary);
  });
});
