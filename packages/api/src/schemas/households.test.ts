import { describe, expect, it } from 'vitest';
import {
  createHouseholdSchema,
  memberSchema,
  meResponseSchema,
  updateHouseholdSchema,
  updateMyMemberSchema,
} from './households';
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

describe('preferencia de avisos de actividad (especificación 014, RF-1407)', () => {
  it('el miembro lleva activityAlertsEnabled', () => {
    expect(
      memberSchema.parse({ ...member, activityAlertsEnabled: false }).activityAlertsEnabled,
    ).toBe(false);
  });

  it('es opcional en la respuesta: un servidor anterior no lo envía (art. V.4)', () => {
    const parsed = memberSchema.parse(member);
    expect(parsed.activityAlertsEnabled).toBeUndefined();
    const me = meResponseSchema.parse({
      user,
      households: [{ household, member }],
      household,
      member,
    });
    expect(me.households[0]?.member.activityAlertsEnabled).toBeUndefined();
  });

  it('no es un booleano: se rechaza', () => {
    expect(memberSchema.safeParse({ ...member, activityAlertsEnabled: 'sí' }).success).toBe(false);
  });

  it('PATCH members/me lo acepta solo o junto a los recordatorios', () => {
    expect(updateMyMemberSchema.parse({ activityAlertsEnabled: false })).toEqual({
      activityAlertsEnabled: false,
    });
    expect(
      updateMyMemberSchema.safeParse({ remindersEnabled: true, activityAlertsEnabled: true })
        .success,
    ).toBe(true);
  });

  it('PATCH members/me rechaza un valor que no es booleano y un cuerpo vacío', () => {
    expect(updateMyMemberSchema.safeParse({ activityAlertsEnabled: 'no' }).success).toBe(false);
    expect(updateMyMemberSchema.safeParse({}).success).toBe(false);
  });

  it('PATCH members/me sigue aceptando solo los recordatorios, como la app instalada', () => {
    expect(updateMyMemberSchema.safeParse({ remindersEnabled: false }).success).toBe(true);
    expect(updateMyMemberSchema.safeParse({ reminderTime: '08:30' }).success).toBe(true);
  });
});
