import { describe, expect, it } from 'vitest';
import {
  describeSchedule,
  formatAmountInput,
  formatDay,
  formatDueDate,
  formatMoney,
  formatMonthTitle,
  formatMonthShort,
  formatPeriod,
  formatRelativeDue,
  formatShortDate,
  formatSignedMoney,
  parseShortDate,
} from './format';

// El importe y el símbolo van separados por un espacio duro.
const nbsp = (text: string) => text.replace(/\u00a0/g, ' ');

describe('formatMonthTitle', () => {
  it('nombre del mes con mayúscula y el año', () => {
    expect(formatMonthTitle('2026-11')).toBe('Noviembre de 2026');
    expect(formatMonthTitle('2027-01')).toBe('Enero de 2027');
  });
});

describe('formatRelativeDue y formatMonthShort', () => {
  const today = '2026-10-29';
  it('cuándo vence, en relación con hoy', () => {
    expect(formatRelativeDue('2026-10-29', today)).toBe('Hoy');
    expect(formatRelativeDue('2026-10-30', today)).toBe('Mañana');
    expect(formatRelativeDue('2026-10-28', today)).toBe('Ayer');
    expect(formatRelativeDue('2026-10-31', today)).toBe('En 2 días');
    expect(formatRelativeDue('2026-11-05', today)).toBe('En 7 días');
    expect(formatRelativeDue('2026-11-06', today)).toBe('6 de noviembre');
    expect(formatRelativeDue('2026-10-20', today)).toBe('Hace 9 días');
  });

  it('mes abreviado en mayúsculas para la fecha de las tarjetas', () => {
    expect(formatMonthShort('2026-10-29')).toBe('OCT');
    expect(formatMonthShort('2026-09-01')).toBe('SEP');
    expect(formatMonthShort('2027-01-15')).toBe('ENE');
  });
});

describe('formatMoney', () => {
  it('formatea céntimos en euros con el formato español', () => {
    expect(nbsp(formatMoney(123456))).toBe('1.234,56 €');
    expect(nbsp(formatMoney(4530))).toBe('45,30 €');
    expect(nbsp(formatMoney(999_999_999_99))).toBe('999.999.999,99 €');
    expect(nbsp(formatMoney(25_000_000))).toBe('250.000,00 €');
    expect(nbsp(formatMoney(0))).toBe('0,00 €');
    expect(nbsp(formatMoney(-56544))).toBe('-565,44 €');
  });

  it('añade el signo según el tipo', () => {
    expect(nbsp(formatSignedMoney(180000, 'income'))).toBe('+1.800,00 €');
    expect(nbsp(formatSignedMoney(4530, 'expense'))).toBe('−45,30 €');
  });
});

describe('formatAmountInput', () => {
  it('da el importe con coma decimal y dos decimales', () => {
    expect(formatAmountInput(4530)).toBe('45,30');
    expect(formatAmountInput(5)).toBe('0,05');
    expect(formatAmountInput(180000)).toBe('1800,00');
  });
});

describe('fechas', () => {
  it('formatea el día', () => {
    expect(formatDay('2026-10-27')).toBe('martes, 27 de octubre');
    expect(formatShortDate('2026-03-09')).toBe('09/03/2026');
  });

  it('lee fechas escritas por el usuario', () => {
    expect(parseShortDate('27/10/2026')).toBe('2026-10-27');
    expect(parseShortDate('9/3/26')).toBe('2026-03-09');
    expect(parseShortDate('29-02-2024')).toBe('2024-02-29');
    expect(parseShortDate('29/02/2026')).toBeNull();
    expect(parseShortDate('mañana')).toBeNull();
  });
});

describe('formatPeriod', () => {
  it('con inicio el día 1, el nombre del mes', () => {
    expect(formatPeriod({ start: '2026-10-01', end: '2026-10-31' }, 1)).toBe('Octubre de 2026');
  });

  it('con otro día de inicio, las dos fechas', () => {
    expect(formatPeriod({ start: '2026-10-25', end: '2026-11-24' }, 25)).toBe('25 oct – 24 nov');
  });
});

describe('describeSchedule', () => {
  const base = { interval: 1, dayOfMonth: null, monthOfYear: null, weekday: null };

  it('describe cada frecuencia', () => {
    expect(describeSchedule({ ...base, frequency: 'monthly', dayOfMonth: 1 })).toBe(
      'Cada mes, el día 1',
    );
    expect(describeSchedule({ ...base, frequency: 'monthly', interval: 3, dayOfMonth: 15 })).toBe(
      'Cada 3 meses, el día 15',
    );
    expect(describeSchedule({ ...base, frequency: 'yearly', dayOfMonth: 15, monthOfYear: 3 })).toBe(
      'Cada año, el 15 de marzo',
    );
    expect(describeSchedule({ ...base, frequency: 'weekly', weekday: 5 })).toBe(
      'Cada semana, los viernes',
    );
    expect(describeSchedule({ ...base, frequency: 'weekly', interval: 2, weekday: 6 })).toBe(
      'Cada 2 semanas, los sábados',
    );
  });
});

describe('formatDueDate', () => {
  it('usa hoy, mañana y ayer, y si no la fecha', () => {
    expect(formatDueDate('2026-10-27', '2026-10-27')).toBe('Hoy');
    expect(formatDueDate('2026-10-28', '2026-10-27')).toBe('Mañana');
    expect(formatDueDate('2026-10-26', '2026-10-27')).toBe('Ayer');
    expect(formatDueDate('2026-11-01', '2026-10-27')).toBe('1 de noviembre');
  });
});
