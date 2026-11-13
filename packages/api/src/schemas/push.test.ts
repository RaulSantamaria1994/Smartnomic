import { describe, expect, it } from 'vitest';
import { deletePushDeviceSchema, pushDeviceSchema } from './push';

describe('pushDeviceSchema (especificación 014, RF-1409)', () => {
  it('acepta los dos formatos de token de Expo', () => {
    expect(pushDeviceSchema.safeParse({ token: 'ExponentPushToken[abc123_-XYZ]' }).success).toBe(
      true,
    );
    expect(pushDeviceSchema.safeParse({ token: 'ExpoPushToken[abc123_-XYZ]' }).success).toBe(true);
  });

  it('rechaza un token vacío o sin el cuerpo entre corchetes', () => {
    expect(pushDeviceSchema.safeParse({ token: '' }).success).toBe(false);
    expect(pushDeviceSchema.safeParse({ token: 'ExponentPushToken[]' }).success).toBe(false);
    expect(pushDeviceSchema.safeParse({ token: 'ExponentPushToken' }).success).toBe(false);
  });

  it('rechaza un token sin corchetes o con otro prefijo', () => {
    expect(pushDeviceSchema.safeParse({ token: 'ExponentPushToken[abc' }).success).toBe(false);
    expect(pushDeviceSchema.safeParse({ token: 'abc123' }).success).toBe(false);
    expect(pushDeviceSchema.safeParse({ token: 'FcmToken[abc]' }).success).toBe(false);
  });

  it('rechaza un token demasiado largo (más de 200 caracteres dentro)', () => {
    expect(
      pushDeviceSchema.safeParse({ token: `ExponentPushToken[${'a'.repeat(200)}]` }).success,
    ).toBe(true);
    expect(
      pushDeviceSchema.safeParse({ token: `ExponentPushToken[${'a'.repeat(201)}]` }).success,
    ).toBe(false);
  });

  it('rechaza caracteres raros: espacios, saltos de línea, comillas, HTML y SQL', () => {
    for (const body of ['a b', 'a\nb', "a'b", 'a"b', '<script>', "x'; DROP TABLE users;--", 'é']) {
      expect(
        pushDeviceSchema.safeParse({ token: `ExponentPushToken[${body}]` }).success,
        body,
      ).toBe(false);
    }
  });

  it('rechaza algo que no es una cadena y los campos que sobran no se aceptan', () => {
    expect(pushDeviceSchema.safeParse({ token: 42 }).success).toBe(false);
    expect(pushDeviceSchema.safeParse({}).success).toBe(false);
    expect(
      pushDeviceSchema.safeParse({ token: 'ExponentPushToken[abc]', userId: 'otro' }).success,
    ).toBe(false);
  });

  it('el cuerpo de DELETE usa el mismo token', () => {
    expect(deletePushDeviceSchema.safeParse({ token: 'ExponentPushToken[abc]' }).success).toBe(
      true,
    );
    expect(deletePushDeviceSchema.safeParse({ token: 'malo' }).success).toBe(false);
  });
});
