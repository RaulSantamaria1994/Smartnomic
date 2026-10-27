import { describe, expect, it } from 'vitest';
import { summarize } from './summary';

describe('summarize', () => {
  it('suma ingresos y gastos al céntimo', () => {
    expect(
      summarize([
        { kind: 'income', amountCents: 180000 },
        { kind: 'expense', amountCents: 4530 },
        { kind: 'expense', amountCents: 118926 },
      ]),
    ).toEqual({ incomeCents: 180000, expenseCents: 123456, balanceCents: 56544 });
  });

  it('sin movimientos, todo es cero', () => {
    expect(summarize([])).toEqual({ incomeCents: 0, expenseCents: 0, balanceCents: 0 });
  });

  it('solo ingresos', () => {
    expect(summarize([{ kind: 'income', amountCents: 250 }])).toEqual({
      incomeCents: 250,
      expenseCents: 0,
      balanceCents: 250,
    });
  });

  it('balance negativo si se gasta más de lo que entra', () => {
    expect(
      summarize([
        { kind: 'income', amountCents: 100 },
        { kind: 'expense', amountCents: 350 },
      ]).balanceCents,
    ).toBe(-250);
  });

  it('no acumula errores de coma flotante', () => {
    const many = Array.from({ length: 1000 }, () => ({
      kind: 'expense' as const,
      amountCents: 10,
    }));
    expect(summarize(many).expenseCents).toBe(10000);
  });
});
