import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from './health';

describe('healthResponseSchema', () => {
  it('acepta la respuesta del servidor', () => {
    expect(healthResponseSchema.parse({ ok: true })).toEqual({ ok: true });
  });

  it('rechaza cualquier otra cosa', () => {
    expect(healthResponseSchema.safeParse({ ok: false }).success).toBe(false);
    expect(healthResponseSchema.safeParse('ok').success).toBe(false);
  });
});
