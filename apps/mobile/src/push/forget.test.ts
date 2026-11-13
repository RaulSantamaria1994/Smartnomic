import { afterEach, describe, expect, it, vi } from 'vitest';
import { forgetPushDevice } from './forget';

const registration = { token: 'ExponentPushToken[abc]', sessionId: 's1' };

function deps(overrides: Partial<Parameters<typeof forgetPushDevice>[0]> = {}) {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      read: async () => registration,
      clear: async () => {
        calls.push('clear');
      },
      unregister: async (token: string) => {
        calls.push(`unregister:${token}`);
      },
      timeoutMs: 3000,
      ...overrides,
    },
  };
}

afterEach(() => vi.useRealTimers());

describe('forgetPushDevice (especificación 014, RF-1409, escenario 3.3)', () => {
  it('da de baja el token registrado y olvida el registro', async () => {
    const { calls, deps: d } = deps();
    await forgetPushDevice(d);
    expect(calls).toContain(`unregister:${registration.token}`);
    expect(calls).toContain('clear');
  });

  it('da de baja antes de que se cierre la sesión: se espera al servidor', async () => {
    const order: string[] = [];
    await forgetPushDevice({
      ...deps().deps,
      unregister: async () => {
        await Promise.resolve();
        order.push('unregister');
      },
    });
    order.push('despues');
    expect(order).toEqual(['unregister', 'despues']);
  });

  it('sin registro, no llama al servidor', async () => {
    const { calls, deps: d } = deps({ read: async () => null });
    await forgetPushDevice(d);
    expect(calls.filter((c) => c.startsWith('unregister'))).toHaveLength(0);
  });

  it('si el servidor falla (sin conexión), no lanza y el registro se olvida igual', async () => {
    const { calls, deps: d } = deps({
      unregister: async () => {
        throw new Error('sin conexión');
      },
    });
    await expect(forgetPushDevice(d)).resolves.toBeUndefined();
    expect(calls).toContain('clear');
  });

  it('si el servidor no contesta, no bloquea el cierre de sesión más allá del tiempo máximo', async () => {
    vi.useFakeTimers();
    const { calls, deps: d } = deps({ unregister: () => new Promise<void>(() => undefined) });
    let done = false;
    const result = forgetPushDevice(d).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(2999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    await result;
    expect(done).toBe(true);
    expect(calls).toContain('clear');
  });

  it('si no se puede leer el registro, no lanza', async () => {
    const { deps: d } = deps({
      read: async () => {
        throw new Error('almacenamiento roto');
      },
    });
    await expect(forgetPushDevice(d)).resolves.toBeUndefined();
  });
});
