import { describe, expect, it } from 'vitest';
import { resolveBaseUrl } from '../src/config';

const dev = { production: false, port: 3000 };
const prod = { production: true, port: 3000 };

describe('resolveBaseUrl', () => {
  it('usa BETTER_AUTH_URL sin barra final', () => {
    expect(resolveBaseUrl({ BETTER_AUTH_URL: 'https://smartnomic.app/' }, prod)).toBe(
      'https://smartnomic.app',
    );
  });

  it('explica el error si falta el protocolo', () => {
    expect(() =>
      resolveBaseUrl({ BETTER_AUTH_URL: 'smartnomicserver-production.up.railway.app' }, prod),
    ).toThrow(/debe ser una dirección completa que empiece por https:\/\//);
  });

  it('sin BETTER_AUTH_URL usa el dominio público de Railway', () => {
    expect(
      resolveBaseUrl({ RAILWAY_PUBLIC_DOMAIN: 'smartnomicserver-production.up.railway.app' }, prod),
    ).toBe('https://smartnomicserver-production.up.railway.app');
  });

  it('BETTER_AUTH_URL tiene prioridad sobre Railway', () => {
    expect(
      resolveBaseUrl(
        {
          BETTER_AUTH_URL: 'https://api.smartnomic.app',
          RAILWAY_PUBLIC_DOMAIN: 'x.up.railway.app',
        },
        prod,
      ),
    ).toBe('https://api.smartnomic.app');
  });

  it('en producción sin ninguna de las dos, falla', () => {
    expect(() => resolveBaseUrl({}, prod)).toThrow(/Falta BETTER_AUTH_URL/);
  });

  it('en desarrollo usa localhost', () => {
    expect(resolveBaseUrl({}, dev)).toBe('http://localhost:3000');
  });
});
