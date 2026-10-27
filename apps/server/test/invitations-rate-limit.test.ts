import { describe, expect, it } from 'vitest';
import { signUp, useTestServer } from './helpers';

const ctx = useTestServer({ invitationRateLimit: { max: 3, timeWindow: '1 minute' } });

describe('límite de peticiones en las invitaciones', () => {
  it('impide probar códigos a ciegas', async () => {
    const user = await signUp(ctx.app);
    const statuses = [];
    for (let i = 0; i < 4; i += 1) {
      statuses.push(
        (
          await ctx.app.inject({
            method: 'GET',
            url: '/api/invitations/ABCDEFGHJK',
            headers: { cookie: user.cookie },
          })
        ).statusCode,
      );
    }
    expect(statuses).toEqual([404, 404, 404, 429]);
  });
});
