import { describe, expect, it } from 'vitest';
import { spentShare } from './summary';

describe('spentShare', () => {
  it('proporción gastada de lo ingresado', () => {
    expect(spentShare(180000, 123456)).toBeCloseTo(0.6858, 3);
    expect(spentShare(100000, 120000)).toBeCloseTo(1.2, 5);
    expect(spentShare(100000, 0)).toBe(0);
  });

  it('sin ingresos no hay proporción', () => {
    expect(spentShare(0, 5000)).toBeNull();
  });
});
