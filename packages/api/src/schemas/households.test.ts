import { describe, expect, it } from 'vitest';
import { createHouseholdSchema, meResponseSchema, updateHouseholdSchema } from './households';
import { invitationPreviewSchema } from './members';

const household = {
  id: '0190a0b0-0000-7000-8000-000000000001',
  name: 'Casa',
  currency: 'EUR',
  monthStartDay: 1,
  timezone: 'Europe/Madrid',
};
const member = {
  id: '0190a0b0-0000-7000-8000-000000000002',
  role: 'owner',
  remindersEnabled: true,
  reminderTime: '09:00',
};
const user = { id: 'u1', name: 'Lucía', email: 'lucia@example.com' };

describe('me con varios hogares (especificación 013)', () => {
  it('lista los hogares y repite el primero para la app instalada', () => {
    const me = meResponseSchema.parse({
      user,
      households: [{ household, member }],
      household,
      member,
    });
    expect(me.households).toHaveLength(1);
  });

  it('sin hogares: lista vacía y household/member a null', () => {
    const me = meResponseSchema.parse({ user, households: [], household: null, member: null });
    expect(me.household).toBeNull();
  });

  it('exige la lista de hogares', () => {
    expect(meResponseSchema.safeParse({ user, household, member }).success).toBe(false);
  });
});

describe('nombre del hogar', () => {
  it('crear y cambiar usan las mismas reglas', () => {
    for (const name of ['', '   ', 'x'.repeat(61)]) {
      expect(createHouseholdSchema.safeParse({ name }).success).toBe(false);
      expect(updateHouseholdSchema.safeParse({ name }).success).toBe(false);
    }
    expect(createHouseholdSchema.parse({ name: '  Piso de la playa ' }).name).toBe(
      'Piso de la playa',
    );
  });
});

describe('vista previa de una invitación', () => {
  it('lleva atLimit y conserva los campos viejos para la app instalada', () => {
    const preview = {
      state: 'valid',
      householdName: 'Piso',
      invitedBy: 'Marta',
      role: 'editor',
      expiresAt: '2026-11-14T10:00:00.000Z',
      alreadyMember: false,
      atLimit: true,
      currentHousehold: 'leave',
      currentHouseholdHasData: false,
    };
    expect(invitationPreviewSchema.parse(preview).atLimit).toBe(true);
    expect(invitationPreviewSchema.safeParse({ ...preview, atLimit: undefined }).success).toBe(
      false,
    );
  });
});
