import { describe, expect, it } from 'vitest';
import { csvExportSchema, exportQuerySchema } from './exportCsv';

describe('exportQuerySchema (especificación 010)', () => {
  it('acepta los filtros de la búsqueda', () => {
    expect(exportQuerySchema.parse({ kind: 'expense', minCents: '100' })).toEqual({
      kind: 'expense',
      minCents: 100,
      categoryIds: [],
    });
  });

  it('rechaza el cursor y los filtros no válidos', () => {
    expect(exportQuerySchema.safeParse({ cursor: 'abc' }).success).toBe(false);
    expect(exportQuerySchema.safeParse({ minCents: '2', maxCents: '1' }).success).toBe(false);
  });
});

describe('csvExportSchema', () => {
  it('el nombre lleva la fecha', () => {
    expect(
      csvExportSchema.safeParse({ fileName: 'smartnomic-movimientos-2026-11-05.csv', csv: 'x' })
        .success,
    ).toBe(true);
    expect(csvExportSchema.safeParse({ fileName: '../../etc/passwd', csv: 'x' }).success).toBe(
      false,
    );
  });
});
