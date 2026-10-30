import { describe, expect, it } from 'vitest';
import {
  contributionDates,
  pendingContributions,
  savedCents,
  savingsPlan,
  savingsStatus,
  type SavingsEntry,
  type SavingsGoal,
} from './savings';

// 1.200 € para el 31 de julio de 2027, apartando el día 1; creada el 30 de octubre de 2026.
const vacations: SavingsGoal = {
  targetCents: 120000,
  deadline: '2027-07-31',
  contributionDay: 1,
  startDate: '2026-10-30',
  closedAt: null,
};

const deposit = (
  amountCents: number,
  date: string,
  dueDate: string | null = null,
): SavingsEntry => ({
  kind: 'deposit',
  amountCents,
  date,
  dueDate,
});
const withdrawal = (amountCents: number, date: string): SavingsEntry => ({
  kind: 'withdrawal',
  amountCents,
  date,
  dueDate: null,
});
const skip = (dueDate: string): SavingsEntry => ({
  kind: 'skip',
  amountCents: 0,
  date: dueDate,
  dueDate,
});

describe('contributionDates', () => {
  it('cada mes en el día elegido, desde la creación hasta el plazo', () => {
    expect(contributionDates(vacations, '2026-01-01', '2030-01-01')).toEqual([
      '2026-11-01',
      '2026-12-01',
      '2027-01-01',
      '2027-02-01',
      '2027-03-01',
      '2027-04-01',
      '2027-05-01',
      '2027-06-01',
      '2027-07-01',
    ]);
  });

  it('el día 31 cae el último día en los meses cortos, también en febrero', () => {
    const goal = {
      ...vacations,
      contributionDay: 31,
      startDate: '2027-01-15',
      deadline: '2027-04-30',
    };
    expect(contributionDates(goal, '2027-01-01', '2027-12-31')).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
      '2027-04-30',
    ]);
    const leap = { ...goal, startDate: '2028-02-01', deadline: '2028-02-29' };
    expect(contributionDates(leap, '2028-01-01', '2028-12-31')).toEqual(['2028-02-29']);
  });

  it('el mismo día de la creación cuenta; la ventana pedida recorta', () => {
    const goal = { ...vacations, startDate: '2026-11-01' };
    expect(contributionDates(goal, '2026-11-01', '2026-12-15')).toEqual([
      '2026-11-01',
      '2026-12-01',
    ]);
    expect(contributionDates(goal, '2027-08-01', '2027-09-01')).toEqual([]);
  });
});

describe('savedCents', () => {
  it('aportaciones menos retiradas; los meses saltados no cuentan', () => {
    expect(
      savedCents([
        deposit(13334, '2026-11-01', '2026-11-01'),
        deposit(30000, '2026-11-20'),
        withdrawal(10000, '2026-11-25'),
        skip('2026-12-01'),
      ]),
    ).toBe(33334);
    expect(savedCents([])).toBe(0);
  });
});

describe('savingsStatus', () => {
  it('en curso, conseguida, plazo vencido y cerrada', () => {
    expect(savingsStatus(vacations, 0, '2026-11-15')).toBe('active');
    expect(savingsStatus(vacations, 120000, '2026-11-15')).toBe('achieved');
    expect(savingsStatus(vacations, 150000, '2027-09-01')).toBe('achieved');
    expect(savingsStatus(vacations, 1000, '2027-08-01')).toBe('expired');
    expect(
      savingsStatus({ ...vacations, closedAt: '2027-01-02T10:00:00Z' }, 120000, '2027-01-03'),
    ).toBe('closed');
  });
});

describe('pendingContributions', () => {
  it('las fechas sin resolver hasta el límite pedido, con las atrasadas marcadas', () => {
    const entries = [deposit(13334, '2026-11-01', '2026-11-01'), skip('2026-12-01')];
    expect(pendingContributions(vacations, entries, '2027-02-10', '2027-03-15')).toEqual([
      { dueDate: '2027-01-01', overdue: true },
      { dueDate: '2027-02-01', overdue: true },
      { dueDate: '2027-03-01', overdue: false },
    ]);
  });

  it('hoy no es atrasada', () => {
    expect(pendingContributions(vacations, [], '2026-11-01', '2026-11-01')).toEqual([
      { dueDate: '2026-11-01', overdue: false },
    ]);
  });

  it('una aportación sin mes asociado no resuelve ningún mes', () => {
    const entries = [deposit(13334, '2026-11-01')];
    expect(pendingContributions(vacations, entries, '2026-11-02', '2026-11-30')).toEqual([
      { dueDate: '2026-11-01', overdue: true },
    ]);
  });

  it('ninguna si está conseguida, con el plazo vencido o cerrada', () => {
    expect(
      pendingContributions(vacations, [deposit(120000, '2026-11-01')], '2026-12-15', '2027-01-15'),
    ).toEqual([]);
    expect(pendingContributions(vacations, [], '2027-08-02', '2027-09-30')).toEqual([]);
    expect(
      pendingContributions(
        { ...vacations, closedAt: '2026-11-05T00:00:00Z' },
        [],
        '2026-12-15',
        '2027-01-15',
      ),
    ).toEqual([]);
  });
});

describe('savingsPlan', () => {
  it('cuota: lo que falta entre las aportaciones que quedan, redondeada hacia arriba', () => {
    const plan = savingsPlan(vacations, [], '2026-10-30');
    expect(plan.contributionsLeft).toBe(9);
    expect(plan.quotaCents).toBe(13334); // 1.200 € / 9 = 133,333… → 133,34 €
    expect(plan.remainingCents).toBe(120000);
    expect(plan.percent).toBe(0);
    expect(plan.nextDueDate).toBe('2026-11-01');
    expect(plan.status).toBe('active');
    expect(plan.onTrack).toBe(true);
  });

  it('las atrasadas siguen contando y la cuota se recalcula tras aportar o saltar', () => {
    const entries = [deposit(30000, '2026-11-01', '2026-11-01'), skip('2026-12-01')];
    const plan = savingsPlan(vacations, entries, '2026-12-15');
    expect(plan.savedCents).toBe(30000);
    expect(plan.contributionsLeft).toBe(7); // enero a julio
    expect(plan.quotaCents).toBe(12858); // 900 € / 7 = 128,571… → 128,58 €
    expect(plan.percent).toBe(25);
  });

  it('retrasada si hay una aportación atrasada o lo ahorrado va por detrás de lo previsto', () => {
    expect(savingsPlan(vacations, [], '2026-11-02').onTrack).toBe(false);
    // Saltar diciembre deja el saldo por detrás de lo previsto (2 de 9 fechas ya pasadas).
    const behind = [deposit(13334, '2026-11-01', '2026-11-01'), skip('2026-12-01')];
    expect(savingsPlan(vacations, behind, '2026-12-15').onTrack).toBe(false);
    const ahead = [
      deposit(13334, '2026-11-01', '2026-11-01'),
      deposit(20000, '2026-11-20'),
      skip('2026-12-01'),
    ];
    expect(savingsPlan(vacations, ahead, '2026-12-15').onTrack).toBe(true);
  });

  it('si el plazo llega antes del próximo día de apartar, la cuota es todo lo que falta', () => {
    const soon = { ...vacations, startDate: '2026-11-05', deadline: '2026-11-20' };
    const plan = savingsPlan(soon, [deposit(20000, '2026-11-05')], '2026-11-05');
    expect(plan.contributionsLeft).toBe(0);
    expect(plan.quotaCents).toBe(100000);
    expect(plan.nextDueDate).toBeNull();
    expect(plan.onTrack).toBe(true);
  });

  it('conseguida: sin cuota ni pendientes, al 100 % aunque se pase del objetivo', () => {
    const plan = savingsPlan(vacations, [deposit(130000, '2026-11-01')], '2026-11-02');
    expect(plan.status).toBe('achieved');
    expect(plan.quotaCents).toBe(0);
    expect(plan.remainingCents).toBe(0);
    expect(plan.contributionsLeft).toBe(0);
    expect(plan.percent).toBe(100);
    expect(plan.onTrack).toBe(true);
  });

  it('plazo vencido sin llegar: sin pendientes y retrasada', () => {
    const plan = savingsPlan(vacations, [deposit(50000, '2026-11-01')], '2027-08-01');
    expect(plan.status).toBe('expired');
    expect(plan.contributionsLeft).toBe(0);
    expect(plan.quotaCents).toBe(0);
    expect(plan.remainingCents).toBe(70000);
    expect(plan.onTrack).toBe(false);
  });

  it('cerrada: sin pendientes ni cuota', () => {
    const plan = savingsPlan({ ...vacations, closedAt: '2026-11-10T00:00:00Z' }, [], '2026-12-15');
    expect(plan.status).toBe('closed');
    expect(plan.contributionsLeft).toBe(0);
    expect(plan.quotaCents).toBe(0);
    expect(plan.nextDueDate).toBeNull();
  });
});
