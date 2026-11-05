import { describe, expect, it } from 'vitest';
import {
  barShare,
  CHART_MONTHS,
  chartWindow,
  defaultCategory,
  MIN_BAR_SHARE,
  shares,
  sortByAmount,
} from './charts';

describe('chartWindow (especificación 008, RF-803)', () => {
  it('son 6 periodos que terminan en el elegido, del más antiguo al más reciente', () => {
    expect(CHART_MONTHS).toBe(6);
    expect(chartWindow('2026-11-01', 1)).toEqual([
      { start: '2026-06-01', end: '2026-06-30' },
      { start: '2026-07-01', end: '2026-07-31' },
      { start: '2026-08-01', end: '2026-08-31' },
      { start: '2026-09-01', end: '2026-09-30' },
      { start: '2026-10-01', end: '2026-10-31' },
      { start: '2026-11-01', end: '2026-11-30' },
    ]);
  });

  it('con día de inicio 25 cada mes va del 25 al 24 y cruza el año', () => {
    const window = chartWindow('2027-02-25', 25);
    expect(window[0]).toEqual({ start: '2026-09-25', end: '2026-10-24' });
    expect(window[4]).toEqual({ start: '2027-01-25', end: '2027-02-24' });
    expect(window[5]).toEqual({ start: '2027-02-25', end: '2027-03-24' });
  });
});

describe('shares', () => {
  it('da el porcentaje entero de cada importe sobre el total', () => {
    expect(shares([41230, 35000, 32270])).toEqual([38, 32, 30]);
  });

  it('redondea cada uno sin forzar que sumen 100', () => {
    expect(shares([1, 1, 1])).toEqual([33, 33, 33]);
  });

  it('con total 0 todos son 0', () => {
    expect(shares([0, 0])).toEqual([0, 0]);
    expect(shares([])).toEqual([]);
  });
});

describe('barShare (caso límite de importes pequeños)', () => {
  it('es la parte del máximo', () => {
    expect(barShare(5000, 10000)).toBe(0.5);
    expect(barShare(10000, 10000)).toBe(1);
  });

  it('un importe que no es 0 tiene un mínimo visible', () => {
    expect(MIN_BAR_SHARE).toBe(0.02);
    expect(barShare(1, 1_000_000)).toBe(MIN_BAR_SHARE);
  });

  it('0, o un máximo 0, no pinta barra', () => {
    expect(barShare(0, 10000)).toBe(0);
    expect(barShare(0, 0)).toBe(0);
  });
});

describe('sortByAmount', () => {
  it('de mayor a menor y, a igualdad, por nombre; no cambia la lista', () => {
    const list = [
      { name: 'Ocio', amountCents: 100 },
      { name: 'Vivienda', amountCents: 500 },
      { name: 'Coche', amountCents: 100 },
    ];
    expect(sortByAmount(list).map((x) => x.name)).toEqual(['Vivienda', 'Coche', 'Ocio']);
    expect(list[0]!.name).toBe('Ocio');
  });
});

describe('defaultCategory (historia 3, escenario 2)', () => {
  const categories = [
    { id: 'a', name: 'Supermercado', kind: 'expense' as const, archived: false },
    { id: 'b', name: 'Ocio', kind: 'expense' as const, archived: false },
    { id: 'c', name: 'Antiguo', kind: 'expense' as const, archived: true },
    { id: 'd', name: 'Abono', kind: 'income' as const, archived: false },
  ];

  it('es la de más gasto del mes', () => {
    expect(
      defaultCategory(categories, [
        { categoryId: 'b', amountCents: 300 },
        { categoryId: 'a', amountCents: 200 },
      ]),
    ).toBe('b');
  });

  it('no elige archivadas aunque sean las de más gasto', () => {
    expect(
      defaultCategory(categories, [
        { categoryId: 'c', amountCents: 900 },
        { categoryId: 'a', amountCents: 200 },
      ]),
    ).toBe('a');
  });

  it('sin gastos, la primera de gasto no archivada por nombre', () => {
    expect(defaultCategory(categories, [])).toBe('b');
  });

  it('sin categorías de gasto, ninguna', () => {
    expect(defaultCategory([categories[3]!], [])).toBeUndefined();
  });
});
