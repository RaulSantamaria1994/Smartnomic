import { describe, expect, it } from 'vitest';
import { REALTIME_SCOPES, realtimeMessageSchema } from './realtime';

describe('realtimeMessageSchema (especificación 012)', () => {
  it('un aviso de cambio con su ámbito, o un ping', () => {
    for (const scope of REALTIME_SCOPES) {
      expect(realtimeMessageSchema.parse({ type: 'changed', scope })).toEqual({
        type: 'changed',
        scope,
      });
    }
    expect(realtimeMessageSchema.parse({ type: 'ping' })).toEqual({ type: 'ping' });
  });

  it('los ámbitos son los de la especificación', () => {
    expect([...REALTIME_SCOPES].sort()).toEqual(
      [
        'budgets',
        'categories',
        'household',
        'members',
        'recurring',
        'savings',
        'transactions',
      ].sort(),
    );
  });

  it('rechaza ámbitos desconocidos, otros tipos y datos de más', () => {
    expect(realtimeMessageSchema.safeParse({ type: 'changed', scope: 'otro' }).success).toBe(false);
    expect(realtimeMessageSchema.safeParse({ type: 'hola' }).success).toBe(false);
    expect(
      realtimeMessageSchema.safeParse({ type: 'changed', scope: 'transactions', amountCents: 1 })
        .success,
    ).toBe(false);
  });
});
