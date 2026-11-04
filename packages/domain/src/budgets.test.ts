import { describe, expect, it } from 'vitest';
import { BUDGET_NEAR_SHARE, budgetProgress, sortBudgets } from './budgets';

describe('budgetProgress (especificación 007, RF-705)', () => {
  it('sin gastos queda todo y está en normal', () => {
    expect(budgetProgress(40000, 0)).toEqual({
      remainingCents: 40000,
      overCents: 0,
      share: 0,
      level: 'ok',
    });
  });

  it('por debajo del 80 % está en normal y dice lo que queda', () => {
    expect(budgetProgress(40000, 31999)).toMatchObject({ remainingCents: 8001, level: 'ok' });
  });

  it('desde el 80 % está cerca', () => {
    expect(BUDGET_NEAR_SHARE).toBe(0.8);
    expect(budgetProgress(40000, 32000).level).toBe('near');
    expect(budgetProgress(40000, 39999).level).toBe('near');
  });

  it('justo en el límite sigue cerca y no queda nada', () => {
    expect(budgetProgress(40000, 40000)).toEqual({
      remainingCents: 0,
      overCents: 0,
      share: 1,
      level: 'near',
    });
  });

  it('por encima del límite está pasado y dice cuánto', () => {
    expect(budgetProgress(40000, 41200)).toEqual({
      remainingCents: 0,
      overCents: 1200,
      share: 1.03,
      level: 'over',
    });
  });
});

describe('sortBudgets', () => {
  it('de más a menos porcentaje gastado y, a igualdad, por nombre', () => {
    const list = [
      { name: 'Ropa', amountCents: 10000, spentCents: 1000 },
      { name: 'Ocio', amountCents: 10000, spentCents: 8500 },
      { name: 'Comida', amountCents: 20000, spentCents: 2000 },
      { name: 'Bares', amountCents: 5000, spentCents: 6000 },
    ];
    expect(sortBudgets(list).map((b) => b.name)).toEqual(['Bares', 'Ocio', 'Comida', 'Ropa']);
  });

  it('no cambia la lista original', () => {
    const list = [
      { name: 'B', amountCents: 100, spentCents: 0 },
      { name: 'A', amountCents: 100, spentCents: 50 },
    ];
    sortBudgets(list);
    expect(list.map((b) => b.name)).toEqual(['B', 'A']);
  });
});
