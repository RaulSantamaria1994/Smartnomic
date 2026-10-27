import { describe, expect, it } from 'vitest';
import {
  centsSchema,
  dateSchema,
  invitableRoleSchema,
  monthStartDaySchema,
  timeOfDaySchema,
  timeZoneSchema,
  uuidV7Schema,
} from './common';

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) =>
  schema.safeParse(value).success;

describe('esquemas comunes', () => {
  it('uuidV7Schema solo acepta UUID v7', () => {
    expect(ok(uuidV7Schema, '019a2b3c-4d5e-7f60-8a1b-2c3d4e5f6a7b')).toBe(true);
    expect(ok(uuidV7Schema, '3b241101-e2bb-4255-8caf-4136c566a962')).toBe(false); // v4
    expect(ok(uuidV7Schema, 'no-es-un-uuid')).toBe(false);
  });

  it('dateSchema solo acepta fechas reales sin hora', () => {
    expect(ok(dateSchema, '2024-02-29')).toBe(true);
    expect(ok(dateSchema, '2026-02-29')).toBe(false);
    expect(ok(dateSchema, '2026-10-27T00:00:00Z')).toBe(false);
  });

  it('centsSchema solo acepta enteros positivos hasta el máximo', () => {
    expect(ok(centsSchema, 4530)).toBe(true);
    expect(ok(centsSchema, 0)).toBe(false);
    expect(ok(centsSchema, -1)).toBe(false);
    expect(ok(centsSchema, 45.3)).toBe(false);
    expect(ok(centsSchema, 10_000_000_000)).toBe(false);
    expect(ok(centsSchema, '4530')).toBe(false);
  });

  it('invitableRoleSchema no permite invitar como propietario', () => {
    expect(ok(invitableRoleSchema, 'editor')).toBe(true);
    expect(ok(invitableRoleSchema, 'viewer')).toBe(true);
    expect(ok(invitableRoleSchema, 'owner')).toBe(false);
  });

  it('monthStartDaySchema va del 1 al 28', () => {
    expect(ok(monthStartDaySchema, 1)).toBe(true);
    expect(ok(monthStartDaySchema, 28)).toBe(true);
    expect(ok(monthStartDaySchema, 29)).toBe(false);
    expect(ok(monthStartDaySchema, 0)).toBe(false);
  });

  it('timeOfDaySchema acepta HH:MM', () => {
    expect(ok(timeOfDaySchema, '09:00')).toBe(true);
    expect(ok(timeOfDaySchema, '23:59')).toBe(true);
    expect(ok(timeOfDaySchema, '24:00')).toBe(false);
    expect(ok(timeOfDaySchema, '9:00')).toBe(false);
  });

  it('timeZoneSchema acepta zonas IANA', () => {
    expect(ok(timeZoneSchema, 'Europe/Madrid')).toBe(true);
    expect(ok(timeZoneSchema, 'Atlantic/Canary')).toBe(true);
    expect(ok(timeZoneSchema, 'Marte/Olympus')).toBe(false);
  });
});
