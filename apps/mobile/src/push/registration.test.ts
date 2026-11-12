import { describe, expect, it } from 'vitest';
import { needsRegistration } from './registration';

const token = 'ExponentPushToken[abc]';

describe('needsRegistration (especificación 014, escenarios 3.1 y 3.2)', () => {
  it('sin registro previo, hay que registrar', () => {
    expect(needsRegistration(null, { token, sessionId: 's1' })).toBe(true);
  });

  it('con el mismo token y la misma sesión, no hace falta repetirlo', () => {
    expect(needsRegistration({ token, sessionId: 's1' }, { token, sessionId: 's1' })).toBe(false);
  });

  it('si Android rota el token, hay que registrar el nuevo', () => {
    expect(
      needsRegistration(
        { token, sessionId: 's1' },
        { token: 'ExponentPushToken[otro]', sessionId: 's1' },
      ),
    ).toBe(true);
  });

  it('con otra sesión (se cerró sesión y se entró de nuevo, o entró otra cuenta), hay que registrar', () => {
    expect(needsRegistration({ token, sessionId: 's1' }, { token, sessionId: 's2' })).toBe(true);
  });
});
