import { describe, expect, it } from 'vitest';
import { uuidV7 } from './ids';

const random = Uint8Array.from({ length: 10 }, (_, i) => i * 17);

describe('uuidV7', () => {
  it('tiene el formato, la versión 7 y la variante del RFC', () => {
    expect(uuidV7(1_793_000_000_000, random)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('empieza por la marca de tiempo en milisegundos', () => {
    const id = uuidV7(0x0189_abcd_ef01, random);
    expect(id.replace(/-/g, '').slice(0, 12)).toBe('0189abcdef01');
  });

  it('se ordena por fecha de creación', () => {
    const a = uuidV7(1_000, random);
    const b = uuidV7(1_001, random);
    expect(a < b).toBe(true);
  });

  it('rechaza entradas no válidas', () => {
    expect(() => uuidV7(-1, random)).toThrow();
    expect(() => uuidV7(1.5, random)).toThrow();
    expect(() => uuidV7(1, new Uint8Array(5))).toThrow();
  });
});
