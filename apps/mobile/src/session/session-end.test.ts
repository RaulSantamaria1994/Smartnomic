import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/http';
import { createSessionEnd, isUnauthenticated } from './session-end';

const unauthenticated = new ApiError('unauthenticated', 401, 'Inicia sesión para continuar.');

function setup() {
  const clearDevice = vi.fn(async () => undefined);
  const forgetSession = vi.fn(async () => undefined);
  const end = createSessionEnd({ clearDevice, forgetSession });
  end.started();
  return { end, clearDevice, forgetSession };
}

describe('isUnauthenticated', () => {
  it('solo un 401 de la API cuenta como sesión terminada', () => {
    expect(isUnauthenticated(unauthenticated)).toBe(true);
    expect(isUnauthenticated(new ApiError('forbidden', 403, 'x'))).toBe(false);
    expect(isUnauthenticated(new ApiError('network', 0, 'x'))).toBe(false);
    expect(isUnauthenticated(new Error('x'))).toBe(false);
  });
});

describe('createSessionEnd', () => {
  it('un 401 borra lo del dispositivo, olvida la sesión y deja el aviso para «Entrar»', async () => {
    const { end, clearDevice, forgetSession } = setup();
    await end.onError(unauthenticated);
    expect(clearDevice).toHaveBeenCalledTimes(1);
    expect(forgetSession).toHaveBeenCalledTimes(1);
    expect(end.takeNotice()).toBe(true);
    // El aviso se muestra una vez.
    expect(end.takeNotice()).toBe(false);
  });

  it('varios 401 a la vez solo terminan la sesión una vez', async () => {
    const { end, clearDevice, forgetSession } = setup();
    await Promise.all([end.onError(unauthenticated), end.onError(unauthenticated)]);
    await end.onError(unauthenticated);
    expect(clearDevice).toHaveBeenCalledTimes(1);
    expect(forgetSession).toHaveBeenCalledTimes(1);
  });

  it('otros errores no hacen nada', async () => {
    const { end, clearDevice } = setup();
    await end.onError(new ApiError('internal', 500, 'x'));
    await end.onError(new ApiError('network', 0, 'x'));
    expect(clearDevice).not.toHaveBeenCalled();
    expect(end.takeNotice()).toBe(false);
  });

  it('al cerrar sesión o borrar la cuenta a propósito, los 401 no avisan', async () => {
    const { end, clearDevice } = setup();
    end.leaving();
    await end.onError(unauthenticated);
    expect(clearDevice).not.toHaveBeenCalled();
    expect(end.takeNotice()).toBe(false);
  });

  it('al volver a entrar, un 401 posterior vuelve a contar', async () => {
    const { end, clearDevice } = setup();
    await end.onError(unauthenticated);
    expect(end.takeNotice()).toBe(true);
    end.started();
    await end.onError(unauthenticated);
    expect(clearDevice).toHaveBeenCalledTimes(2);
    expect(end.takeNotice()).toBe(true);
  });

  it('sin sesión iniciada (antes de entrar) un 401 no hace nada', async () => {
    const clearDevice = vi.fn(async () => undefined);
    const end = createSessionEnd({ clearDevice, forgetSession: vi.fn(async () => undefined) });
    await end.onError(unauthenticated);
    expect(clearDevice).not.toHaveBeenCalled();
  });

  it('si olvidar la sesión falla (sin conexión), el aviso sigue y no se rompe', async () => {
    const end = createSessionEnd({
      clearDevice: vi.fn(async () => undefined),
      forgetSession: vi.fn(async () => {
        throw new Error('sin conexión');
      }),
    });
    end.started();
    await expect(end.onError(unauthenticated)).resolves.toBeUndefined();
    expect(end.takeNotice()).toBe(true);
  });
});
