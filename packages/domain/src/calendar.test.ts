import { describe, expect, it } from 'vitest';
import {
  calendarBounds,
  calendarMonth,
  calendarTotals,
  isValidMonth,
  monthGrid,
  monthOf,
  monthRange,
  shiftMonth,
  type CalendarRule,
} from './calendar';
import { upcoming } from './upcoming';

describe('isValidMonth', () => {
  it('acepta YYYY-MM y rechaza lo demás', () => {
    expect(isValidMonth('2026-11')).toBe(true);
    expect(isValidMonth('2026-01')).toBe(true);
    expect(isValidMonth('2026-13')).toBe(false);
    expect(isValidMonth('2026-00')).toBe(false);
    expect(isValidMonth('2026-1')).toBe(false);
    expect(isValidMonth('2026-11-01')).toBe(false);
    expect(isValidMonth('')).toBe(false);
  });
});

describe('monthRange y monthOf', () => {
  it('primer y último día del mes natural', () => {
    expect(monthRange('2026-11')).toEqual({ start: '2026-11-01', end: '2026-11-30' });
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(monthRange('2028-02')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });

  it('mes de una fecha', () => {
    expect(monthOf('2026-10-29')).toBe('2026-10');
    expect(monthOf('2027-01-01')).toBe('2027-01');
  });

  it('lanza con un mes no válido', () => {
    expect(() => monthRange('2026-13')).toThrow();
  });
});

describe('shiftMonth', () => {
  it('avanza y retrocede cruzando años', () => {
    expect(shiftMonth('2026-11', 1)).toBe('2026-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-10', 12)).toBe('2027-10');
    expect(shiftMonth('2026-10', -22)).toBe('2024-12');
    expect(shiftMonth('2026-10', 0)).toBe('2026-10');
  });
});

describe('monthGrid', () => {
  it('semanas de lunes a domingo con huecos fuera del mes', () => {
    // Noviembre de 2026 empieza en domingo: 6 filas.
    const grid = monthGrid('2026-11');
    expect(grid).toHaveLength(6);
    expect(grid[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(grid[1]![0]).toBe('2026-11-02');
    expect(grid[5]).toEqual(['2026-11-30', null, null, null, null, null, null]);
  });

  it('cada fila tiene 7 días y están todos los del mes, en orden', () => {
    for (const month of ['2026-01', '2026-02', '2026-10', '2028-02', '2027-12']) {
      const grid = monthGrid(month);
      expect(grid.every((week) => week.length === 7)).toBe(true);
      const days = grid.flat().filter((d): d is string => d !== null);
      const { start, end } = monthRange(month);
      expect(days[0]).toBe(start);
      expect(days.at(-1)).toBe(end);
      expect(new Set(days).size).toBe(days.length);
      expect([...days].sort()).toEqual(days);
    }
  });

  it('febrero no bisiesto que empieza en lunes ocupa 4 filas', () => {
    // 1 de febrero de 2027: lunes.
    const grid = monthGrid('2027-02');
    expect(grid).toHaveLength(4);
    expect(grid[0]![0]).toBe('2027-02-01');
    expect(grid[3]![6]).toBe('2027-02-28');
  });

  it('febrero bisiesto', () => {
    const days = monthGrid('2028-02').flat().filter(Boolean);
    expect(days).toHaveLength(29);
  });

  it('octubre de 2026 empieza en jueves: 5 filas', () => {
    const grid = monthGrid('2026-10');
    expect(grid).toHaveLength(5);
    expect(grid[0]).toEqual([
      null,
      null,
      null,
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
  });
});

const rule = (id: string, extra: Partial<CalendarRule> = {}): CalendarRule => ({
  id,
  kind: 'expense',
  amountCents: 1000,
  active: true,
  frequency: 'monthly',
  interval: 1,
  dayOfMonth: 1,
  startDate: '2026-09-01',
  endDate: null,
  ...extra,
});

describe('calendarMonth', () => {
  const today = '2026-11-15';

  it('estados según hoy: atrasado, pendiente (hoy incluido), pagado y omitido', () => {
    const rules = [
      rule('alquiler', { dayOfMonth: 1, amountCents: 75000 }),
      rule('luz', { dayOfMonth: 10, amountCents: 6000 }),
      rule('agua', { dayOfMonth: 12, amountCents: 2000 }),
      rule('internet', { dayOfMonth: 15, amountCents: 3000 }),
      rule('nomina', { dayOfMonth: 28, kind: 'income', amountCents: 180000 }),
    ];
    const resolved = [
      { ruleId: 'luz', dueDate: '2026-11-10', status: 'paid' as const, amountCents: 6712 },
      { ruleId: 'agua', dueDate: '2026-11-12', status: 'skipped' as const, amountCents: null },
    ];

    expect(calendarMonth(rules, resolved, '2026-11', today)).toEqual([
      {
        ruleId: 'alquiler',
        dueDate: '2026-11-01',
        status: 'overdue',
        kind: 'expense',
        amountCents: 75000,
      },
      { ruleId: 'luz', dueDate: '2026-11-10', status: 'paid', kind: 'expense', amountCents: 6712 },
      {
        ruleId: 'agua',
        dueDate: '2026-11-12',
        status: 'skipped',
        kind: 'expense',
        amountCents: 2000,
      },
      {
        ruleId: 'internet',
        dueDate: '2026-11-15',
        status: 'pending',
        kind: 'expense',
        amountCents: 3000,
      },
      {
        ruleId: 'nomina',
        dueDate: '2026-11-28',
        status: 'pending',
        kind: 'income',
        amountCents: 180000,
      },
    ]);
  });

  it('un pagado sin movimiento (borrado) muestra el importe previsto', () => {
    const items = calendarMonth(
      [rule('luz', { dayOfMonth: 10, amountCents: 6000 })],
      [{ ruleId: 'luz', dueDate: '2026-11-10', status: 'paid', amountCents: null }],
      '2026-11',
      today,
    );
    expect(items[0]).toMatchObject({ status: 'paid', amountCents: 6000 });
  });

  it('pago el día 31 cae el último día de los meses cortos', () => {
    const rules = [rule('alquiler', { dayOfMonth: 31, startDate: '2026-01-31' })];
    expect(calendarMonth(rules, [], '2026-11', today).map((i) => i.dueDate)).toEqual([
      '2026-11-30',
    ]);
    expect(calendarMonth(rules, [], '2027-02', today).map((i) => i.dueDate)).toEqual([
      '2027-02-28',
    ]);
    expect(calendarMonth(rules, [], '2028-02', today).map((i) => i.dueDate)).toEqual([
      '2028-02-29',
    ]);
  });

  it('semanales, cada N meses y anuales', () => {
    const rules = [
      rule('gimnasio', {
        frequency: 'weekly',
        dayOfMonth: null,
        weekday: 1,
        startDate: '2026-09-07',
      }),
      rule('seguro', { interval: 3, dayOfMonth: 5, startDate: '2026-08-05' }),
      rule('ibi', {
        frequency: 'yearly',
        dayOfMonth: 20,
        monthOfYear: 11,
        startDate: '2025-11-20',
      }),
    ];
    const byRule = (id: string) =>
      calendarMonth(rules, [], '2026-11', today)
        .filter((i) => i.ruleId === id)
        .map((i) => i.dueDate);
    expect(byRule('gimnasio')).toEqual([
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
      '2026-11-23',
      '2026-11-30',
    ]);
    expect(byRule('seguro')).toEqual(['2026-11-05']);
    expect(byRule('ibi')).toEqual(['2026-11-20']);
    expect(calendarMonth(rules, [], '2026-12', today).some((i) => i.ruleId === 'seguro')).toBe(
      false,
    );
  });

  it('respeta la fecha de inicio y la de fin', () => {
    const rules = [
      rule('nuevo', { dayOfMonth: 5, startDate: '2026-12-01' }),
      rule('acabado', { dayOfMonth: 5, endDate: '2026-10-31' }),
    ];
    expect(calendarMonth(rules, [], '2026-11', today)).toEqual([]);
    expect(calendarMonth(rules, [], '2026-12', today).map((i) => i.ruleId)).toEqual(['nuevo']);
  });

  it('de una regla desactivada solo se ven los vencimientos resueltos', () => {
    const rules = [rule('baja', { dayOfMonth: 5, active: false })];
    const resolved = [
      { ruleId: 'baja', dueDate: '2026-10-05', status: 'paid' as const, amountCents: 999 },
    ];
    expect(calendarMonth(rules, resolved, '2026-11', today)).toEqual([]);
    expect(calendarMonth(rules, resolved, '2026-10', today)).toEqual([
      { ruleId: 'baja', dueDate: '2026-10-05', status: 'paid', kind: 'expense', amountCents: 999 },
    ]);
  });

  it('un resuelto cuya fecha ya no encaja con la regla (editada) se sigue viendo', () => {
    const rules = [rule('luz', { dayOfMonth: 20 })];
    const resolved = [
      { ruleId: 'luz', dueDate: '2026-11-10', status: 'paid' as const, amountCents: 5000 },
    ];
    expect(
      calendarMonth(rules, resolved, '2026-11', today).map((i) => [i.dueDate, i.status]),
    ).toEqual([
      ['2026-11-10', 'paid'],
      ['2026-11-20', 'pending'],
    ]);
  });

  it('ignora resueltos de otros meses o de reglas que no están', () => {
    const resolved = [
      { ruleId: 'luz', dueDate: '2026-10-01', status: 'paid' as const, amountCents: 1 },
      { ruleId: 'otra', dueDate: '2026-11-03', status: 'paid' as const, amountCents: 1 },
    ];
    expect(calendarMonth([rule('luz')], resolved, '2026-11', today).map((i) => i.dueDate)).toEqual([
      '2026-11-01',
    ]);
  });

  it('los pendientes coinciden con los de «Próximos pagos» (CE-102)', () => {
    const rules = [
      rule('a', { dayOfMonth: 31, startDate: '2026-01-31' }),
      rule('b', {
        frequency: 'weekly',
        dayOfMonth: null,
        weekday: 4,
        startDate: '2026-09-03',
        interval: 2,
      }),
      rule('c', { interval: 2, dayOfMonth: 29 }),
    ];
    const resolved = [
      { ruleId: 'b', dueDate: '2026-11-26', status: 'skipped' as const, amountCents: null },
    ];
    const fromCalendar = calendarMonth(rules, resolved, '2026-11', today)
      .filter((i) => i.status === 'pending' || i.status === 'overdue')
      .map((i) => `${i.ruleId}|${i.dueDate}`);
    const fromUpcoming = upcoming(rules, resolved, today, 60, '2026-09-01')
      .filter((i) => i.dueDate.startsWith('2026-11'))
      .map((i) => `${i.ruleId}|${i.dueDate}`);
    expect(fromCalendar.sort()).toEqual(fromUpcoming.sort());
  });
});

describe('calendarTotals', () => {
  it('previsto de pagos y cobros (sin omitidos, con el real de los pagados) y lo pendiente', () => {
    const totals = calendarTotals([
      {
        ruleId: 'a',
        dueDate: '2026-11-01',
        status: 'overdue',
        kind: 'expense',
        amountCents: 75000,
      },
      { ruleId: 'b', dueDate: '2026-11-10', status: 'paid', kind: 'expense', amountCents: 6712 },
      { ruleId: 'c', dueDate: '2026-11-12', status: 'skipped', kind: 'expense', amountCents: 2000 },
      { ruleId: 'd', dueDate: '2026-11-15', status: 'pending', kind: 'expense', amountCents: 3000 },
      {
        ruleId: 'e',
        dueDate: '2026-11-28',
        status: 'pending',
        kind: 'income',
        amountCents: 180000,
      },
    ]);
    expect(totals).toEqual({
      expenseCents: 84712,
      incomeCents: 180000,
      pendingExpenseCents: 78000,
    });
  });

  it('sin vencimientos, ceros', () => {
    expect(calendarTotals([])).toEqual({ expenseCents: 0, incomeCents: 0, pendingExpenseCents: 0 });
  });
});

describe('calendarBounds', () => {
  it('desde el mes de inicio del pago más antiguo hasta 12 meses después del actual', () => {
    const rules = [rule('a', { startDate: '2026-03-15' }), rule('b', { startDate: '2025-12-01' })];
    expect(calendarBounds(rules, '2026-10-29')).toEqual({ min: '2025-12', max: '2027-10' });
  });

  it('sin pagos o con pagos que empiezan en el futuro, desde el mes actual', () => {
    expect(calendarBounds([], '2026-10-29')).toEqual({ min: '2026-10', max: '2027-10' });
    expect(calendarBounds([rule('a', { startDate: '2027-01-01' })], '2026-10-29')).toEqual({
      min: '2026-10',
      max: '2027-10',
    });
  });
});
