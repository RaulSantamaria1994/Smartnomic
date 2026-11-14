import { describe, expect, it } from 'vitest';
import { cookieFromAuthCallbackUrl } from './google-callback-url';

describe('cookieFromAuthCallbackUrl (G025: Android abre la app de cero)', () => {
  it('lee cookie del esquema de la app y de una ruta con query', () => {
    expect(cookieFromAuthCallbackUrl('smartnomic:///?cookie=session%3Dabc')).toBe('session=abc');
    expect(cookieFromAuthCallbackUrl('/entrar?foo=1&cookie=token%3Dxyz')).toBe('token=xyz');
  });

  it('sin cookie o vacía, no hay sesión que guardar', () => {
    expect(cookieFromAuthCallbackUrl('smartnomic:///entrar')).toBeNull();
    expect(cookieFromAuthCallbackUrl('smartnomic:///?cookie=')).toBeNull();
    expect(cookieFromAuthCallbackUrl('/')).toBeNull();
  });
});
