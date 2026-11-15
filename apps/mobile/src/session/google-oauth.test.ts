import { describe, expect, it } from 'vitest';
import {
  expoAuthorizationProxyUrl,
  googleSignInUrlFromResponse,
  waitForGoogleRedirect,
  type AppLifecycle,
} from './google-oauth';

describe('googleSignInUrlFromResponse (G025)', () => {
  it('usa el Location o el json con url https', () => {
    expect(
      googleSignInUrlFromResponse(null, 'https://accounts.google.com/o/oauth2/v2/auth?x=1'),
    ).toBe('https://accounts.google.com/o/oauth2/v2/auth?x=1');
    expect(
      googleSignInUrlFromResponse(
        { url: 'https://accounts.google.com/o/oauth2/v2/auth', redirect: true },
        undefined,
      ),
    ).toBe('https://accounts.google.com/o/oauth2/v2/auth');
  });

  it('ignora http, rutas relativas y cuerpos vacíos', () => {
    expect(googleSignInUrlFromResponse({ url: '/api/auth/callback/google' }, undefined)).toBeNull();
    expect(googleSignInUrlFromResponse({ url: 'http://evil.example' }, undefined)).toBeNull();
    expect(googleSignInUrlFromResponse({}, undefined)).toBeNull();
  });
});

describe('expoAuthorizationProxyUrl (G025)', () => {
  it('codifica la URL de Google como query del proxy', () => {
    expect(
      expoAuthorizationProxyUrl(
        'https://api.example/',
        'https://accounts.google.com/o/oauth2/v2/auth?state=ab',
      ),
    ).toBe(
      'https://api.example/api/auth/expo-authorization-proxy?authorizationURL=https%3A%2F%2Faccounts.google.com%2Fo%2Foauth2%2Fv2%2Fauth%3Fstate%3Dab',
    );
  });
});

describe('waitForGoogleRedirect (G025)', () => {
  it('resuelve al llegar el deep link con cookie', async () => {
    let sendUrl: (url: string) => void = () => undefined;
    const result = waitForGoogleRedirect({
      subscribeUrl: (handler) => {
        sendUrl = handler;
        return { remove() {} };
      },
      subscribeAppState: () => ({ remove() {} }),
      getInitialURL: async () => null,
      sleep: async () => undefined,
    });
    sendUrl('smartnomic:///?cookie=session%3Dabc');
    await expect(result).resolves.toBe('smartnomic:///?cookie=session%3Dabc');
  });

  it('cancela si la app vuelve al frente y no hay cookie', async () => {
    let sendState: (state: AppLifecycle) => void = () => undefined;
    let resumeSleep: () => void = () => undefined;
    const result = waitForGoogleRedirect({
      subscribeUrl: () => ({ remove() {} }),
      subscribeAppState: (handler) => {
        sendState = handler;
        return { remove() {} };
      },
      getInitialURL: async () => 'smartnomic:///',
      sleep: () =>
        new Promise((resolve) => {
          resumeSleep = resolve;
        }),
      settleMs: 1,
    });
    sendState('background');
    sendState('active');
    resumeSleep();
    await expect(result).resolves.toBeNull();
  });
});
