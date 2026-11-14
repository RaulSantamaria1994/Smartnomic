import { describe, expect, it } from 'vitest';
import { deleteAccountSchema, loginOptionsSchema, putTimezoneSchema } from './account';

describe('deleteAccountSchema (especificación 016, RF-1609)', () => {
  it('acepta contraseña o email, no un cuerpo vacío', () => {
    expect(deleteAccountSchema.parse({ password: 'secreto1' }).password).toBe('secreto1');
    expect(deleteAccountSchema.parse({ email: 'lucia@example.com' }).email).toBe(
      'lucia@example.com',
    );
    expect(deleteAccountSchema.safeParse({}).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ password: '' }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ email: '' }).success).toBe(false);
  });
});

describe('loginOptionsSchema', () => {
  it('google es un booleano', () => {
    expect(loginOptionsSchema.parse({ google: true })).toEqual({ google: true });
    expect(loginOptionsSchema.parse({ google: false })).toEqual({ google: false });
    expect(loginOptionsSchema.safeParse({}).success).toBe(false);
  });
});

describe('putTimezoneSchema', () => {
  it('acepta una zona IANA y rechaza el resto', () => {
    expect(putTimezoneSchema.parse({ timezone: 'Atlantic/Canary' }).timezone).toBe(
      'Atlantic/Canary',
    );
    expect(putTimezoneSchema.safeParse({ timezone: 'Marte/Olympus' }).success).toBe(false);
    expect(putTimezoneSchema.safeParse({}).success).toBe(false);
  });
});
