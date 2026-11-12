import { describe, expect, it } from 'vitest';
import { permissionBannerVisible } from './banner';

const base = {
  supported: true,
  permission: 'denied' as const,
  hasReminders: false,
  activityAlerts: false,
};

describe('permissionBannerVisible (especificación 014, RF-1410)', () => {
  it('sin permiso y con recordatorios de pagos activados, sale (RF-035)', () => {
    expect(permissionBannerVisible({ ...base, hasReminders: true })).toBe(true);
  });

  it('sin permiso y con avisos de actividad activados en un hogar con más miembros, sale', () => {
    expect(permissionBannerVisible({ ...base, activityAlerts: true })).toBe(true);
  });

  it('sin permiso y con las dos cosas, sale una sola vez (es un booleano)', () => {
    expect(permissionBannerVisible({ ...base, hasReminders: true, activityAlerts: true })).toBe(
      true,
    );
  });

  it('sin permiso pero sin nada que avisar (ni recordatorios ni avisos de actividad), no sale', () => {
    expect(permissionBannerVisible(base)).toBe(false);
  });

  it('con el permiso concedido, o aún sin decidir, no sale', () => {
    for (const permission of ['granted', 'undetermined', 'unsupported', null] as const) {
      expect(
        permissionBannerVisible({
          ...base,
          permission,
          hasReminders: true,
          activityAlerts: true,
        }),
        String(permission),
      ).toBe(false);
    }
  });

  it('en la web no hay notificaciones: nunca sale', () => {
    expect(
      permissionBannerVisible({
        ...base,
        supported: false,
        hasReminders: true,
        activityAlerts: true,
      }),
    ).toBe(false);
  });
});
