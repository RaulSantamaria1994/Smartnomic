import { describe, expect, it } from 'vitest';
import { contrastRatio } from './color';
import * as tokens from './tokens';
import { color, radius, typography } from './tokens';

/** Estilo Android estándar (especificación 006, RF-601, RF-602 y RF-610). */
describe('tokens del estilo Android', () => {
  it('esquinas de 4 px (controles), 8 px (chips) y 16 px (botón flotante)', () => {
    expect(radius).toEqual({ control: 4, chip: 8, fab: 16, pill: 999 });
  });

  it('fondo blanco', () => {
    expect(color.bg.canvas).toBe('#FFFFFF');
    expect(color.bg.surface).toBe('#FFFFFF');
  });

  it('fuente del sistema: ningún estilo de texto fija la familia', () => {
    expect('fontFamily' in tokens).toBe(false);
    for (const [name, style] of Object.entries(typography)) {
      expect(style.fontFamily, name).toBeUndefined();
      expect(['400', '500'], name).toContain(style.fontWeight);
    }
  });

  it('sin sombra para cosas en reposo: solo la del botón flotante', () => {
    expect(Object.keys(tokens.shadow)).toEqual(['raised']);
  });
});

describe('contraste del estilo Android (WCAG 2.1 AA)', () => {
  const AA = 4.5;
  const text: [string, string, string][] = [
    ['texto', color.text.primary, color.bg.surface],
    ['texto secundario', color.text.muted, color.bg.surface],
    ['enlace', color.text.link, color.bg.surface],
    ['texto sobre la barra superior', color.text.onAccent, color.bg.accent],
    ['subtítulo de la barra superior', color.text.onAccentMuted, color.bg.accent],
    ['texto sobre un chip elegido', color.text.accent, color.bg.accentSoft],
    ['ingresos', color.amount.income, color.bg.surface],
    ['error', color.text.danger, color.bg.surface],
    ['texto de ejemplo de un campo', color.text.placeholder, color.bg.surface],
  ];
  for (const [name, fg, bg] of text) {
    it(name, () => expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA));
  }

  for (const [status, fg] of Object.entries(color.status)) {
    it(`estado «${status}» en texto sobre blanco`, () =>
      expect(contrastRatio(fg, color.bg.surface)).toBeGreaterThanOrEqual(AA));
  }

  it('bordes de campos, chips y foco: 3:1 sobre blanco (WCAG 1.4.11)', () => {
    expect(contrastRatio(color.border.strong, color.bg.surface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(color.border.focus, color.bg.surface)).toBeGreaterThanOrEqual(3);
  });
});
