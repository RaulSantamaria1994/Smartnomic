import { describe, expect, it } from 'vitest';
import { csvAmount, csvField, csvFile, type CsvLabels } from './csv';

const labels: CsvLabels = {
  headers: ['Fecha', 'Tipo', 'Categoría', 'Importe (€)', 'Nota', 'Apuntado por'],
  expense: 'Gasto',
  income: 'Ingreso',
};

describe('csvAmount: con signo y coma decimal, sin miles ni símbolo (especificación 010)', () => {
  it('gastos en negativo e ingresos en positivo', () => {
    expect(csvAmount(4530, 'expense')).toBe('-45,30');
    expect(csvAmount(180000, 'income')).toBe('1800,00');
  });

  it('céntimos sueltos y números grandes, sin coma flotante', () => {
    expect(csvAmount(1, 'expense')).toBe('-0,01');
    expect(csvAmount(10, 'income')).toBe('0,10');
    expect(csvAmount(123456789012, 'income')).toBe('1234567890,12');
  });
});

describe('csvField: comillas y protección contra fórmulas', () => {
  it('lo normal va tal cual', () => {
    expect(csvField('Supermercado')).toBe('Supermercado');
    expect(csvField('')).toBe('');
  });

  it('con ; " o saltos de línea va entre comillas, con las comillas duplicadas', () => {
    expect(csvField('pan; leche')).toBe('"pan; leche"');
    expect(csvField('el "bueno"')).toBe('"el ""bueno"""');
    expect(csvField('dos\nlíneas')).toBe('"dos\nlíneas"');
    expect(csvField('a\r\nb')).toBe('"a\r\nb"');
  });

  it('lo que empieza como una fórmula lleva un apóstrofo delante', () => {
    for (const start of ['=', '+', '-', '@', '\t', '\r']) {
      expect(
        csvField(`${start}1+1`).replace(/^"/, '').startsWith(`'${start}`),
        JSON.stringify(start),
      ).toBe(true);
    }
    expect(csvField('=SUMA(A1:A9)')).toBe("'=SUMA(A1:A9)");
    expect(csvField('=HIPERVINCULO("x";"y")')).toBe('"\'=HIPERVINCULO(""x"";""y"")"');
  });
});

describe('csvFile', () => {
  it('BOM, títulos, filas con \\r\\n y cada columna en su sitio', () => {
    const text = csvFile(
      [
        {
          date: '2026-10-27',
          kind: 'expense',
          category: 'Supermercado',
          amountCents: 4530,
          note: 'Mercadona; pan',
          author: 'Lucía',
        },
        {
          date: '2026-10-01',
          kind: 'income',
          category: 'Nómina',
          amountCents: 180000,
          note: null,
          author: 'Antiguo miembro',
        },
      ],
      labels,
    );
    expect(text).toBe(
      '﻿Fecha;Tipo;Categoría;Importe (€);Nota;Apuntado por\r\n' +
        '27/10/2026;Gasto;Supermercado;-45,30;"Mercadona; pan";Lucía\r\n' +
        '01/10/2026;Ingreso;Nómina;1800,00;;Antiguo miembro\r\n',
    );
  });

  it('sin movimientos, solo los títulos', () => {
    expect(csvFile([], labels)).toBe('﻿Fecha;Tipo;Categoría;Importe (€);Nota;Apuntado por\r\n');
  });

  it('el importe negativo no lleva apóstrofo (es un número de la app, no texto)', () => {
    const text = csvFile(
      [
        {
          date: '2026-10-27',
          kind: 'expense',
          category: 'Ocio',
          amountCents: 100,
          note: null,
          author: 'A',
        },
      ],
      labels,
    );
    expect(text).toContain(';-1,00;');
  });
});
