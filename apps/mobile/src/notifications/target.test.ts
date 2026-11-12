import { describe, expect, it } from 'vitest';
import { notificationTarget, routeIfExists } from './target';

const HOUSEHOLD = '0190a0b0-0000-7000-8000-000000000001';
const RULE = '0190a0b0-0000-7000-8000-0000000000aa';
const GOAL = '0190a0b0-0000-7000-8000-0000000000bb';

describe('notificationTarget: recordatorios (especificación 001, 013)', () => {
  it('un recordatorio de un pago abre su vencimiento en su hogar', () => {
    expect(
      notificationTarget({ ruleId: RULE, dueDate: '2026-11-01', householdId: HOUSEHOLD }),
    ).toEqual({ householdId: HOUSEHOLD, route: { pathname: `/occurrence/${RULE}/2026-11-01` } });
  });

  it('un recordatorio de una hucha abre su aportación del mes', () => {
    expect(
      notificationTarget({
        ruleId: `savings:${GOAL}`,
        dueDate: '2026-11-01',
        householdId: HOUSEHOLD,
      }),
    ).toEqual({
      householdId: HOUSEHOLD,
      route: { pathname: `/savings/${GOAL}/due/2026-11-01` },
    });
  });

  it('un recordatorio anterior a varios hogares no lleva hogar y abre igual', () => {
    expect(notificationTarget({ ruleId: RULE, dueDate: '2026-11-01' })).toEqual({
      route: { pathname: `/occurrence/${RULE}/2026-11-01` },
    });
  });
});

describe('notificationTarget: avisos de actividad (especificación 014, RF-1406)', () => {
  const activity = (target: unknown) => ({ type: 'activity', householdId: HOUSEHOLD, target });

  it('un movimiento abre «Mes» en el mes de su fecha, en su hogar', () => {
    expect(notificationTarget(activity({ kind: 'transaction', date: '2026-10-27' }))).toEqual({
      householdId: HOUSEHOLD,
      route: { pathname: '/', params: { date: '2026-10-27' } },
    });
  });

  it('un pago abre su vencimiento', () => {
    expect(
      notificationTarget(activity({ kind: 'occurrence', ruleId: RULE, dueDate: '2026-11-01' })),
    ).toEqual({ householdId: HOUSEHOLD, route: { pathname: `/occurrence/${RULE}/2026-11-01` } });
  });

  it('una hucha abre su pantalla', () => {
    expect(notificationTarget(activity({ kind: 'savings', goalId: GOAL }))).toEqual({
      householdId: HOUSEHOLD,
      route: { pathname: `/savings/${GOAL}` },
    });
  });

  it('varios cambios abren «Mes» de ese hogar', () => {
    expect(notificationTarget(activity({ kind: 'month' }))).toEqual({
      householdId: HOUSEHOLD,
      route: { pathname: '/' },
    });
  });

  it('un destino desconocido abre «Mes» de ese hogar, sin error', () => {
    expect(notificationTarget(activity({ kind: 'algo-nuevo' }))).toEqual({
      householdId: HOUSEHOLD,
      route: { pathname: '/' },
    });
    expect(notificationTarget(activity(undefined))).toEqual({
      householdId: HOUSEHOLD,
      route: { pathname: '/' },
    });
  });

  it('un movimiento con la fecha mal formada abre «Mes» sin mes', () => {
    expect(notificationTarget(activity({ kind: 'transaction', date: '27/10/2026' }))).toEqual({
      householdId: HOUSEHOLD,
      route: { pathname: '/' },
    });
    expect(notificationTarget(activity({ kind: 'transaction', date: '2026-02-31' }))).toEqual({
      householdId: HOUSEHOLD,
      route: { pathname: '/' },
    });
  });

  it('un pago o una hucha con los datos incompletos abre «Mes»', () => {
    expect(notificationTarget(activity({ kind: 'occurrence', ruleId: RULE }))).toEqual({
      householdId: HOUSEHOLD,
      route: { pathname: '/' },
    });
    expect(notificationTarget(activity({ kind: 'savings' }))).toEqual({
      householdId: HOUSEHOLD,
      route: { pathname: '/' },
    });
  });

  it('un identificador con barras o puntos no se cuela en la ruta', () => {
    expect(
      notificationTarget(
        activity({ kind: 'occurrence', ruleId: '../../budgets', dueDate: '2026-11-01' }),
      ),
    ).toEqual({ householdId: HOUSEHOLD, route: { pathname: '/' } });
    expect(notificationTarget(activity({ kind: 'savings', goalId: '../x?y=1' }))).toEqual({
      householdId: HOUSEHOLD,
      route: { pathname: '/' },
    });
  });
});

describe('notificationTarget: datos que no son de la app', () => {
  it('sin datos, datos que no son un objeto o de otro tipo no hacen nada', () => {
    for (const data of [undefined, null, 42, 'texto', [], {}, { type: 'otra-cosa' }]) {
      expect(notificationTarget(data), JSON.stringify(data)).toBeNull();
    }
  });

  it('un aviso de actividad sin hogar o con un hogar mal formado no hace nada', () => {
    expect(notificationTarget({ type: 'activity', target: { kind: 'month' } })).toBeNull();
    expect(
      notificationTarget({ type: 'activity', householdId: 7, target: { kind: 'month' } }),
    ).toBeNull();
    expect(
      notificationTarget({
        type: 'activity',
        householdId: '../../x',
        target: { kind: 'month' },
      }),
    ).toBeNull();
  });
});

describe('routeIfExists: lo que ya no existe lleva a «Mes» (RF-1406)', () => {
  const known = { goalIds: new Set([GOAL]), ruleIds: new Set([RULE]) };
  const month = { pathname: '/' };

  it('una hucha que ya no existe abre «Mes»', () => {
    expect(routeIfExists({ pathname: '/savings/otra-hucha' }, known)).toEqual(month);
    expect(routeIfExists({ pathname: `/savings/${GOAL}` }, known)).toEqual({
      pathname: `/savings/${GOAL}`,
    });
  });

  it('un pago que ya no existe abre «Mes»', () => {
    expect(routeIfExists({ pathname: '/occurrence/otro-pago/2026-11-01' }, known)).toEqual(month);
    expect(routeIfExists({ pathname: `/occurrence/${RULE}/2026-11-01` }, known)).toEqual({
      pathname: `/occurrence/${RULE}/2026-11-01`,
    });
  });

  it('la aportación de una hucha comprueba su hucha', () => {
    expect(routeIfExists({ pathname: '/savings/otra-hucha/due/2026-11-01' }, known)).toEqual(month);
    expect(routeIfExists({ pathname: `/savings/${GOAL}/due/2026-11-01` }, known)).toEqual({
      pathname: `/savings/${GOAL}/due/2026-11-01`,
    });
  });

  it('si no se conocen los datos de ese hogar (aún sin cargar), la ruta se respeta', () => {
    const unknown = { goalIds: null, ruleIds: null };
    expect(routeIfExists({ pathname: '/savings/otra-hucha' }, unknown)).toEqual({
      pathname: '/savings/otra-hucha',
    });
    expect(routeIfExists({ pathname: '/occurrence/otro/2026-11-01' }, unknown)).toEqual({
      pathname: '/occurrence/otro/2026-11-01',
    });
  });

  it('las demás rutas no cambian', () => {
    expect(routeIfExists({ pathname: '/', params: { date: '2026-10-27' } }, known)).toEqual({
      pathname: '/',
      params: { date: '2026-10-27' },
    });
  });
});
