import { describe, expect, it } from 'vitest';
import { DELETION_SECTIONS, PRIVACY_PROCESSORS, PRIVACY_SECTIONS, legalPlainText } from './privacy';

describe('política de privacidad (especificación 017, CE-1702)', () => {
  it('nombra a cada encargado o vía de datos', () => {
    const text = legalPlainText(PRIVACY_SECTIONS);
    for (const name of PRIVACY_PROCESSORS) {
      expect(text, name).toContain(name);
    }
  });

  it('explica el borrado de la cuenta y del hogar de un único miembro', () => {
    const text = `${legalPlainText(PRIVACY_SECTIONS)}\n${legalPlainText(DELETION_SECTIONS)}`;
    expect(text).toMatch(/borrar/i);
    expect(text).toMatch(/único miembro/i);
  });
});
