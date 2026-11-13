import { describe, expect, it } from 'vitest';
import { activityNotification, type ActivityChange } from '../src/push/messages';

const HOUSEHOLD = '0190a0b0-0000-7000-8000-000000000001';

const expense = (amountCents: number, categoryName: string | null = 'Supermercado') =>
  ({ kind: 'expense', amountCents, categoryName, date: '2026-10-27' }) satisfies ActivityChange;
const income = (amountCents: number, categoryName: string | null = 'Nómina') =>
  ({ kind: 'income', amountCents, categoryName, date: '2026-10-27' }) satisfies ActivityChange;
const payment = (ruleName = 'Alquiler', amountCents = 75000) =>
  ({
    kind: 'payment',
    ruleId: '0190a0b0-0000-7000-8000-0000000000aa',
    dueDate: '2026-11-01',
    ruleName,
    amountCents,
  }) satisfies ActivityChange;
const deposit = (amountCents = 5000, goalName = 'Vacaciones') =>
  ({ kind: 'deposit', goalId: 'g1', goalName, amountCents }) satisfies ActivityChange;
const withdrawal = (amountCents = 5000, goalName = 'Vacaciones') =>
  ({ kind: 'withdrawal', goalId: 'g1', goalName, amountCents }) satisfies ActivityChange;

function notify(changes: ActivityChange[], authorName: string | null = 'Juan', currency = 'EUR') {
  const message = activityNotification({
    householdId: HOUSEHOLD,
    householdName: 'Casa',
    currency,
    authorName,
    changes,
  });
  return { ...message, body: message.body.replace(/\u00a0/g, ' ') };
}

describe('texto de un solo cambio (especificación 014, RF-1402)', () => {
  it('un gasto dice quién, el importe y la categoría', () => {
    const message = notify([expense(4530)]);
    expect(message.title).toBe('Casa');
    expect(message.body).toBe('Juan ha apuntado 45,30 € en Supermercado');
  });

  it('un ingreso lo dice con su importe y su categoría', () => {
    expect(notify([income(180000)]).body).toBe(
      'Juan ha apuntado un ingreso de 1.800,00 € en Nómina',
    );
  });

  it('un movimiento sin categoría solo dice el importe', () => {
    expect(notify([expense(1200, null)]).body).toBe('Juan ha apuntado 12,00 €');
    expect(notify([income(1200, null)]).body).toBe('Juan ha apuntado un ingreso de 12,00 €');
  });

  it('un pago dice qué pago y cuánto', () => {
    expect(notify([payment()]).body).toBe('Juan ha pagado Alquiler (750,00 €)');
  });

  it('aportar y sacar de una hucha', () => {
    expect(notify([deposit()]).body).toBe('Juan ha aportado 50,00 € a Vacaciones');
    expect(notify([withdrawal()]).body).toBe('Juan ha sacado 50,00 € de Vacaciones');
  });

  it('con otra moneda lleva su código, y con importes grandes, puntos de miles', () => {
    expect(notify([expense(123456789)], 'Juan', 'USD').body).toBe(
      'Juan ha apuntado 1.234.567,89 USD en Supermercado',
    );
  });

  it('el espacio entre la cifra y el símbolo es duro, para que no se parta la línea', () => {
    const message = activityNotification({
      householdId: HOUSEHOLD,
      householdName: 'Casa',
      currency: 'EUR',
      authorName: 'Juan',
      changes: [expense(4530)],
    });
    expect(message.body).toContain('45,30\u00a0€');
  });
});

describe('sin autor: el miembro ya no existe (caso límite)', () => {
  it('el aviso sale sin nombre', () => {
    expect(notify([expense(4530)], null).body).toBe('Se ha apuntado 45,30 € en Supermercado');
    expect(notify([income(4530)], null).body).toBe(
      'Se ha apuntado un ingreso de 45,30 € en Nómina',
    );
    expect(notify([payment()], null).body).toBe('Se ha pagado Alquiler (750,00 €)');
    expect(notify([deposit()], null).body).toBe('Se ha aportado 50,00 € a Vacaciones');
    expect(notify([withdrawal()], null).body).toBe('Se ha sacado 50,00 € de Vacaciones');
  });

  it('varios cambios también salen sin nombre', () => {
    expect(notify([expense(100), expense(200)], null).body).toBe('Se han apuntado 2 movimientos');
    expect(notify([payment(), payment('Luz')], null).body).toBe('Se han pagado 2 recibos');
    expect(notify([deposit(), withdrawal()], null).body).toBe(
      'Se han hecho 2 movimientos en huchas',
    );
    expect(notify([expense(100), payment()], null).body).toBe('Se han hecho 2 cambios');
  });
});

describe('varios cambios agrupados (RF-1405)', () => {
  it('varios movimientos, gastos e ingresos, dicen cuántos', () => {
    expect(notify(Array.from({ length: 20 }, () => expense(100))).body).toBe(
      'Juan ha apuntado 20 movimientos',
    );
    expect(notify([expense(100), income(200)]).body).toBe('Juan ha apuntado 2 movimientos');
  });

  it('varios pagos', () => {
    expect(notify([payment(), payment('Luz'), payment('Agua')]).body).toBe(
      'Juan ha pagado 3 recibos',
    );
  });

  it('varios movimientos de huchas', () => {
    expect(notify([deposit(), withdrawal()]).body).toBe('Juan ha hecho 2 movimientos en huchas');
    expect(notify([deposit(), deposit(100, 'Coche')]).body).toBe(
      'Juan ha hecho 2 movimientos en huchas',
    );
  });

  it('mezclados de distintos tipos, un total de cambios', () => {
    expect(notify([expense(100), payment(), deposit(), expense(300), income(400)]).body).toBe(
      'Juan ha hecho 5 cambios',
    );
  });

  it('no filtra importes, categorías ni nombres en un aviso agrupado', () => {
    const body = notify([expense(4530), expense(1999, 'Médico'), income(180000)]).body;
    expect(body).not.toMatch(/45,30|19,99|1\.800|Supermercado|Médico|Nómina/);
  });
});

describe('datos del aviso, canal y entrega', () => {
  it('lleva el tipo, el hogar y el destino de un movimiento', () => {
    expect(notify([expense(4530)]).data).toEqual({
      type: 'activity',
      householdId: HOUSEHOLD,
      target: { kind: 'transaction', date: '2026-10-27' },
    });
  });

  it('un pago lleva su regla y su fecha de vencimiento', () => {
    expect(notify([payment()]).data).toEqual({
      type: 'activity',
      householdId: HOUSEHOLD,
      target: {
        kind: 'occurrence',
        ruleId: '0190a0b0-0000-7000-8000-0000000000aa',
        dueDate: '2026-11-01',
      },
    });
  });

  it('una hucha lleva su id', () => {
    expect(notify([deposit()]).data.target).toEqual({ kind: 'savings', goalId: 'g1' });
    expect(notify([withdrawal()]).data.target).toEqual({ kind: 'savings', goalId: 'g1' });
  });

  it('varios cambios llevan siempre a «Mes» del hogar', () => {
    expect(notify([expense(100), expense(200)]).data.target).toEqual({ kind: 'month' });
    expect(notify([expense(100), payment()]).data.target).toEqual({ kind: 'month' });
    expect(notify([deposit(), withdrawal()]).data.target).toEqual({ kind: 'month' });
  });

  it('el canal es «actividad», con prioridad alta y un día de vida', () => {
    const message = notify([expense(4530)]);
    expect(message.channelId).toBe('actividad');
    expect(message.priority).toBe('high');
    expect(message.ttl).toBe(86_400);
  });

  it('los datos no llevan importes, categorías, notas ni nombres', () => {
    const data = JSON.stringify(notify([expense(4530), income(100)]).data);
    expect(data).not.toMatch(/45,30|4530|Supermercado|Nómina|Juan/);
  });
});
