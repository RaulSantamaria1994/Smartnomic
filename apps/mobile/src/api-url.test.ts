import { describe, expect, it } from 'vitest';
import { apiUrl } from './api-url';

const base = { configured: undefined, hostUri: undefined, isWeb: false, isDev: true };

describe('apiUrl', () => {
  it('usa la dirección configurada, sin barra final', () => {
    expect(apiUrl({ ...base, configured: 'https://api.example.com/' })).toBe(
      'https://api.example.com',
    );
  });

  it('en desarrollo usa el ordenador que sirve Expo', () => {
    expect(apiUrl({ ...base, hostUri: '192.168.1.20:8081' })).toBe('http://192.168.1.20:3000');
  });

  it('sin hostUri usa localhost', () => {
    expect(apiUrl(base)).toBe('http://localhost:3000');
  });

  it('en la web publicada usa el mismo origen', () => {
    expect(apiUrl({ ...base, isWeb: true, isDev: false })).toBe('');
  });
});
