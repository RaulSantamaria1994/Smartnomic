import { describe, expect, it } from 'vitest';
import { DURATION, duration } from './timing';

describe('duraciones de las animaciones (especificación 006, RF-607 y RF-608)', () => {
  it('cortas: de 150 a 300 ms', () => {
    expect(DURATION).toEqual({ fast: 150, base: 200, slow: 300 });
  });

  it('con reducir movimiento, todas duran 0 y saltan al final', () => {
    for (const ms of Object.values(DURATION)) {
      expect(duration(ms, true)).toBe(0);
      expect(duration(ms, false)).toBe(ms);
    }
  });
});
