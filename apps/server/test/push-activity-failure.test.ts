import { categoriesResponseSchema, periodResponseSchema } from '@smartnomic/api';
import { describe, expect, it } from 'vitest';
import { PushError, type PushSender } from '../src/push/expo';
import { pushDevices, sessions } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { joinHousehold, me, newId, signUp, useTestServer } from './helpers';

// Con el servicio de envío caído, guardar un cambio no falla ni cambia (RF-1411, CE-1405).
let attempts = 0;
const brokenSender: PushSender = {
  async send() {
    attempts += 1;
    throw new PushError(503);
  },
  async receipts() {
    throw new PushError(503);
  },
};

const ctx = useTestServer({ pushSender: brokenSender });

describe('servicio de envío caído (RF-1411, CE-1405)', () => {
  it('guardar un movimiento responde 200 y el movimiento queda guardado', async () => {
    attempts = 0;
    const ana = await signUp(ctx.app, { name: 'Ana' });
    const juan = await signUp(ctx.app, { name: 'Juan' });
    await joinHousehold(ctx.db, ana, juan, 'editor');
    const householdId = (await me(ctx.app, ana)).household.id;
    const [session] = await ctx.db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, ana.id));
    await ctx.db
      .insert(pushDevices)
      .values({ token: 'ExponentPushToken[ana]', userId: ana.id, sessionId: session!.id });
    const categories = categoriesResponseSchema.parse(
      (
        await ctx.app.inject({
          method: 'GET',
          url: `/api/households/${householdId}/categories`,
          headers: { cookie: ana.cookie },
        })
      ).json(),
    ).categories;

    const id = newId();
    const response = await ctx.app.inject({
      method: 'PUT',
      url: `/api/households/${householdId}/transactions/${id}`,
      headers: { cookie: juan.cookie },
      payload: {
        kind: 'expense',
        amountCents: 4530,
        date: '2026-10-27',
        categoryId: categories.find((c) => c.kind === 'expense')!.id,
      },
    });
    expect(response.statusCode).toBe(200);

    // El envío se intenta (y falla) aparte: no lanza ni cambia lo guardado.
    await expect(ctx.push.flush()).resolves.toBeUndefined();
    expect(attempts).toBe(1);
    const period = periodResponseSchema.parse(
      (
        await ctx.app.inject({
          method: 'GET',
          url: `/api/households/${householdId}/periods/2026-10-01`,
          headers: { cookie: ana.cookie },
        })
      ).json(),
    );
    expect(period.transactions.map((t) => t.id)).toContain(id);
    // El dispositivo sigue registrado: un fallo del servicio no lo da de baja.
    expect(await ctx.db.select().from(pushDevices)).toHaveLength(1);
  });
});
