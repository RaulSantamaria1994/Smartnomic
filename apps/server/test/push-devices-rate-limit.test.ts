import { describe, expect, it } from 'vitest';
import { signUp, TEST_ORIGIN, useTestServer } from './helpers';

const ctx = useTestServer({ authRateLimit: { max: 3, timeWindow: '1 minute' } });

describe('límite de peticiones en el registro de dispositivos (especificación 014)', () => {
  it('impide registrar tokens en masa', async () => {
    const user = await signUp(ctx.app);
    const statuses: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      statuses.push(
        (
          await ctx.app.inject({
            method: 'PUT',
            url: '/api/push-device',
            headers: { cookie: user.cookie, origin: TEST_ORIGIN },
            payload: { token: `ExponentPushToken[t${i}]` },
          })
        ).statusCode,
      );
    }
    expect(statuses).toEqual([204, 204, 204, 429]);
  });
});
