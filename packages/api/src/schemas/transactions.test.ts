import { describe, expect, it } from 'vitest';
import { transactionInputSchema } from './transactions';

const valid = {
  kind: 'expense',
  amountCents: 4530,
  date: '2026-10-27',
  categoryId: '3b241101-e2bb-4255-8caf-4136c566a962',
};

describe('transactionInputSchema', () => {
  it('acepta un gasto válido, con o sin nota', () => {
    expect(transactionInputSchema.parse(valid)).toEqual(valid);
    expect(transactionInputSchema.parse({ ...valid, note: '  Cena  ' }).note).toBe('Cena');
    expect(transactionInputSchema.parse({ ...valid, note: null }).note).toBeNull();
  });

  it('rechaza importes no válidos', () => {
    for (const amountCents of [0, -100, 45.3, '4530']) {
      expect(transactionInputSchema.safeParse({ ...valid, amountCents }).success).toBe(false);
    }
  });

  it('rechaza fechas, tipos y categorías no válidos', () => {
    expect(transactionInputSchema.safeParse({ ...valid, date: '2026-02-30' }).success).toBe(false);
    expect(transactionInputSchema.safeParse({ ...valid, kind: 'transfer' }).success).toBe(false);
    expect(transactionInputSchema.safeParse({ ...valid, categoryId: 'x' }).success).toBe(false);
  });

  it('limita la nota a 500 caracteres', () => {
    expect(transactionInputSchema.safeParse({ ...valid, note: 'a'.repeat(501) }).success).toBe(
      false,
    );
  });
});
