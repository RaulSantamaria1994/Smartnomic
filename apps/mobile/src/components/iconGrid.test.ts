import { describe, expect, it } from 'vitest';
import { iconColumnsFor, MIN_ICON_CELL } from './iconGrid';

const GAP = 8;
const cellWidth = (width: number) => {
  const columns = iconColumnsFor(width, GAP);
  return (width - GAP * (columns - 1)) / columns;
};

describe('iconColumnsFor', () => {
  it('ninguna celda baja de 48 px, del móvil más estrecho al escritorio', () => {
    for (const width of [200, 256, 296, 358, 440, 576]) {
      expect(cellWidth(width), String(width)).toBeGreaterThanOrEqual(MIN_ICON_CELL);
    }
  });

  it('caben más columnas cuanto más ancho', () => {
    expect(iconColumnsFor(256, GAP)).toBe(4);
    expect(iconColumnsFor(358, GAP)).toBe(6);
    expect(iconColumnsFor(576, GAP)).toBe(10);
  });

  it('siempre hay al menos una columna', () => {
    expect(iconColumnsFor(0, GAP)).toBe(1);
    expect(iconColumnsFor(20, GAP)).toBe(1);
  });
});
