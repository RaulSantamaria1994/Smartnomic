import { describe, expect, it } from 'vitest';
import { queryKeys } from './queryKeys';

describe('queryKeys.charts (especificación 008)', () => {
  it('cuelga de `periods`: invalidar los meses refresca también las gráficas', () => {
    const periods = queryKeys.periods('h1');
    const charts = queryKeys.charts('h1', '2026-10-01');
    expect(charts.slice(0, periods.length)).toEqual([...periods]);
  });

  it('no se confunde con un periodo ni con las gráficas de otro mes u hogar', () => {
    expect(queryKeys.charts('h1', '2026-10-01')).not.toEqual(queryKeys.period('h1', '2026-10-01'));
    expect(queryKeys.charts('h1', '2026-10-01')).not.toEqual(queryKeys.charts('h1', '2026-09-01'));
    expect(queryKeys.charts('h1', '2026-10-01')).not.toEqual(queryKeys.charts('h2', '2026-10-01'));
  });
});
