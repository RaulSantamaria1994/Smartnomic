import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from './categories';

describe('DEFAULT_CATEGORIES', () => {
  it('incluye las de la especificación', () => {
    const names = (kind: string) =>
      DEFAULT_CATEGORIES.filter((c) => c.kind === kind).map((c) => c.name);
    expect(names('income')).toEqual(['Nómina', 'Otros ingresos']);
    expect(names('expense')).toEqual([
      'Vivienda',
      'Suministros',
      'Supermercado',
      'Transporte',
      'Salud',
      'Educación',
      'Ocio',
      'Ropa',
      'Suscripciones',
      'Seguros',
      'Otros gastos',
    ]);
  });

  it('no repite nombres dentro de cada tipo y los colores son hexadecimales', () => {
    const keys = DEFAULT_CATEGORIES.map((c) => `${c.kind}:${c.name.toLowerCase()}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of DEFAULT_CATEGORIES) expect(c.color).toMatch(/^#[0-9A-F]{6}$/);
  });
});
