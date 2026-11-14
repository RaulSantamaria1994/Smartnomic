import { describe, expect, it } from 'vitest';
import { emailsMatch } from './email';

describe('emailsMatch (especificación 016, RF-1609)', () => {
  it('ignora mayúsculas y espacios alrededor', () => {
    expect(emailsMatch('  Lucia@Example.com ', 'lucia@example.com')).toBe(true);
    expect(emailsMatch('JUAN@GMAIL.COM', 'juan@gmail.com')).toBe(true);
  });

  it('distinto no coincide', () => {
    expect(emailsMatch('lucia@example.com', 'juan@example.com')).toBe(false);
    expect(emailsMatch('lucia@example.com', 'lucia@example.org')).toBe(false);
  });

  it('vacío recortado no coincide con un email', () => {
    expect(emailsMatch('   ', 'lucia@example.com')).toBe(false);
    expect(emailsMatch('lucia@example.com', '')).toBe(false);
    expect(emailsMatch('  ', '  ')).toBe(true);
  });
});
