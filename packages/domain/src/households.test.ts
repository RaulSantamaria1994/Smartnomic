import { describe, expect, it } from 'vitest';
import { activeHousehold, MAX_HOUSEHOLDS } from './households';

const home = { household: { id: 'h1' } };
const beach = { household: { id: 'h2' } };

describe('activeHousehold (especificación 013)', () => {
  it('el guardado, si sigue siendo miembro', () => {
    expect(activeHousehold([home, beach], 'h2')).toBe(beach);
  });

  it('si ya no está (lo quitaron o lo borró), el primero', () => {
    expect(activeHousehold([home, beach], 'h9')).toBe(home);
  });

  it('sin guardado, el primero', () => {
    expect(activeHousehold([home, beach], null)).toBe(home);
    expect(activeHousehold([home, beach], undefined)).toBe(home);
  });

  it('sin hogares, ninguno', () => {
    expect(activeHousehold([], 'h1')).toBeNull();
    expect(activeHousehold([], null)).toBeNull();
  });

  it('como mucho 5 hogares por persona', () => {
    expect(MAX_HOUSEHOLDS).toBe(5);
  });
});
