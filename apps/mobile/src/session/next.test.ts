import { describe, expect, it } from 'vitest';
import { safeNext } from './next';

describe('safeNext', () => {
  it('acepta rutas de invitación', () => {
    expect(safeNext('/invitacion/ABCDE23456')).toBe('/invitacion/ABCDE23456');
  });

  it('rechaza cualquier otra cosa', () => {
    expect(safeNext('https://malo.example')).toBeNull();
    expect(safeNext('//malo.example/invitacion/X')).toBeNull();
    expect(safeNext('/invitacion/../account')).toBeNull();
    expect(safeNext('/account')).toBeNull();
    expect(safeNext(undefined)).toBeNull();
    expect(safeNext(['/invitacion/A'])).toBeNull();
  });
});
