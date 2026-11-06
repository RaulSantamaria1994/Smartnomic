import { describe, expect, it } from 'vitest';
import { realtimeUrl, reconnectDelay } from './url';

describe('realtimeUrl (especificación 012)', () => {
  it('https → wss y http → ws', () => {
    expect(realtimeUrl('https://smartnomic.example', undefined)).toBe(
      'wss://smartnomic.example/api/realtime',
    );
    expect(realtimeUrl('http://192.168.1.20:3000/', undefined)).toBe(
      'ws://192.168.1.20:3000/api/realtime',
    );
  });

  it('sin dirección de la API, la de la página', () => {
    expect(realtimeUrl('', 'https://app.smartnomic.example')).toBe(
      'wss://app.smartnomic.example/api/realtime',
    );
  });
});

describe('reconnectDelay (RF-1204)', () => {
  it('esperas crecientes que se quedan en 5 s, para estar al día en menos de 10 s (CE-1202)', () => {
    expect([0, 1, 2, 3, 20].map(reconnectDelay)).toEqual([1000, 2000, 5000, 5000, 5000]);
  });
});
