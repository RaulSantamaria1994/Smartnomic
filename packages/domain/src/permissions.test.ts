import { describe, expect, it } from 'vitest';
import { ACTIONS, can, ROLES, type Action, type Role } from './permissions';

const expected: Record<Role, Action[]> = {
  // Todo salvo salir: antes tiene que pasar la propiedad a otro miembro.
  owner: ACTIONS.filter((action) => action !== 'household.leave'),
  editor: [
    'household.view',
    'transactions.write',
    'recurring.write',
    'occurrences.resolve',
    'categories.write',
    'data.export',
    'reminders.manageOwn',
    'household.leave',
  ],
  viewer: ['household.view', 'data.export', 'reminders.manageOwn', 'household.leave'],
};

describe('can', () => {
  for (const role of ROLES) {
    for (const action of ACTIONS) {
      const allowed = expected[role].includes(action);
      it(`${role} ${allowed ? 'puede' : 'no puede'} ${action}`, () => {
        expect(can(role, action)).toBe(allowed);
      });
    }
  }

  it('el propietario no puede salir del hogar sin pasar antes la propiedad', () => {
    expect(can('owner', 'household.leave')).toBe(false);
  });
});
