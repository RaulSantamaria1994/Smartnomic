import { describe, expect, it } from 'vitest';
import { limitRows, MONTH_BUDGET_ROWS, MONTH_UPCOMING_ROWS } from './lists';

const numbers = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('límites de «Mes» (especificación 015)', () => {
  it('son 3 presupuestos y 5 próximos pagos', () => {
    expect(MONTH_BUDGET_ROWS).toBe(3);
    expect(MONTH_UPCOMING_ROWS).toBe(5);
  });
});

describe('limitRows (especificación 015, RF-1502 a RF-1504)', () => {
  it('sin filas obligatorias, recorta a `max` y cuenta las que quedan fuera', () => {
    expect(limitRows(numbers(8), 5)).toEqual({ shown: [1, 2, 3, 4, 5], hidden: 3 });
  });

  it('con justo `max` filas se ven todas y no queda nada fuera', () => {
    expect(limitRows(numbers(5), 5)).toEqual({ shown: [1, 2, 3, 4, 5], hidden: 0 });
  });

  it('con menos de `max` filas se ven todas', () => {
    expect(limitRows(numbers(2), 5)).toEqual({ shown: [1, 2], hidden: 0 });
  });

  it('una lista vacía no enseña ni esconde nada', () => {
    expect(limitRows([], 5)).toEqual({ shown: [], hidden: 0 });
  });

  it('con menos obligatorias que `max`, las obligatorias y las demás hasta completar `max`', () => {
    // Dos atrasados (1 y 2) y ocho pagos más: 2 + 3 = 5 filas.
    const result = limitRows(numbers(10), 5, (n) => n <= 2);
    expect(result).toEqual({ shown: [1, 2, 3, 4, 5], hidden: 5 });
  });

  it('con más obligatorias que `max`, se ven todas las obligatorias y ninguna otra', () => {
    // Siete atrasados: se ven los siete, sin pagos al día (escenario 4).
    const result = limitRows(numbers(12), 5, (n) => n <= 7);
    expect(result).toEqual({ shown: [1, 2, 3, 4, 5, 6, 7], hidden: 5 });
  });

  it('con `max` en cero solo se ven las obligatorias', () => {
    expect(limitRows(numbers(4), 0, (n) => n === 2)).toEqual({ shown: [2], hidden: 3 });
    expect(limitRows(numbers(4), 0)).toEqual({ shown: [], hidden: 4 });
  });

  it('conserva el orden aunque una obligatoria esté en medio', () => {
    const result = limitRows(numbers(8), 3, (n) => n === 6);
    // Huecos libres: 3 − 1 = 2, para el 1 y el 2; el 6 entra en su sitio.
    expect(result).toEqual({ shown: [1, 2, 6], hidden: 5 });
  });

  it('las obligatorias que están al final no se pierden', () => {
    const result = limitRows(numbers(10), 5, (n) => n >= 9);
    expect(result).toEqual({ shown: [1, 2, 3, 9, 10], hidden: 5 });
  });

  it('todas obligatorias: se ven todas aunque pasen de `max`', () => {
    expect(limitRows(numbers(6), 3, () => true)).toEqual({ shown: numbers(6), hidden: 0 });
  });

  it('`hidden` nunca es negativo ni `shown` repite elementos', () => {
    for (const max of [0, 1, 3, 5, 20]) {
      for (const must of [0, 1, 3, 7]) {
        const { shown, hidden } = limitRows(numbers(9), max, (n) => n <= must);
        expect(hidden).toBeGreaterThanOrEqual(0);
        expect(new Set(shown).size).toBe(shown.length);
        expect(shown.length + hidden).toBe(9);
      }
    }
  });

  it('no modifica la lista que recibe', () => {
    const items = numbers(6);
    limitRows(items, 2);
    expect(items).toEqual(numbers(6));
  });
});
