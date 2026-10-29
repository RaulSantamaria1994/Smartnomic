import { describe, expect, it } from 'vitest';
import { redactUrl, safeError, loggerOptions } from '../src/logging';
import { buildServer } from '../src/server';

describe('redactUrl', () => {
  it('quita la consulta y tapa códigos y tokens', () => {
    expect(redactUrl('/api/invitations/ABCDE23456')).toBe('/api/invitations/***');
    expect(redactUrl('/api/invitations/ABCDE23456/accept')).toBe('/api/invitations/***/accept');
    expect(redactUrl('/api/auth/reset-password/tok3n?callbackURL=x')).toBe(
      '/api/auth/reset-password/***',
    );
    expect(redactUrl('/invitacion/ABCDE23456')).toBe('/invitacion/***');
    expect(redactUrl('/restablecer?token=secreto')).toBe('/restablecer');
    expect(redactUrl('/api/households/1/upcoming?days=30')).toBe('/api/households/1/upcoming');
  });
});

describe('safeError', () => {
  it('no incluye el mensaje, que puede llevar los parámetros de la consulta', () => {
    const cause = Object.assign(new Error('duplicate key value (lucia@example.com)'), {
      code: '23505',
    });
    const error = new Error('Failed query: insert ...\nparams: 1234,Cena con Ana', { cause });
    error.name = 'DrizzleQueryError';

    const safe = safeError(error);

    const text = JSON.stringify(safe);
    expect(safe).toMatchObject({ type: 'DrizzleQueryError', cause: { code: '23505' } });
    expect(text).not.toContain('Cena con Ana');
    expect(text).not.toContain('1234');
    expect(text).not.toContain('lucia@example.com');
    expect(text).toContain('logging.test.ts');
  });
});

describe('logs de las peticiones', () => {
  it('no escriben códigos de invitación, tokens ni la IP', async () => {
    const lines: string[] = [];
    const app = await buildServer({ logger: loggerOptions({ write: (line) => lines.push(line) }) });
    await app.inject({ method: 'GET', url: '/api/invitations/ABCDE23456' });
    await app.inject({
      method: 'GET',
      url: '/api/auth/reset-password/tok3n-secreto?callbackURL=x',
    });
    await app.close();

    const log = lines.join('');
    expect(log).toContain('/api/invitations/***');
    expect(log).not.toContain('ABCDE23456');
    expect(log).not.toContain('tok3n-secreto');
    expect(log).not.toContain('remoteAddress');
  });
});
