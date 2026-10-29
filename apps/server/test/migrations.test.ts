import { readFileSync } from 'node:fs';
import { CATEGORY_ICONS, EMOJI_TO_CATEGORY_ICON } from '@smartnomic/domain';
import { eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { categories } from '../src/db/schema';
import { me, signUp, useTestServer } from './helpers';

const ctx = useTestServer();

const CATEGORY_ICONS_SQL = readFileSync(
  new URL('../src/db/migrations/0005_category_icons.sql', import.meta.url),
  'utf8',
);

const runCategoryIcons = () => ctx.db.execute(sql.raw(CATEGORY_ICONS_SQL));

describe('0005_category_icons (especificación 004, RF-403)', () => {
  it('convierte los emoji en identificadores y lo desconocido en el genérico', async () => {
    const owner = await signUp(ctx.app);
    const { household } = await me(ctx.app, owner);
    const rows: [string, string][] = [
      ['Casa', '\u{1F3E0}'],
      ['Seguro', '\u{1F6E1}\u{FE0F}'],
      ['Seguro sin selector', '\u{1F6E1}'],
      ['Etiqueta', '\u{1F3F7}\u{FE0F}'],
      ['Perro', '\u{1F436}'],
      ['Avión', '\u{2708}\u{FE0F}'],
      ['Con espacios', ' \u{1F6D2} '],
      ['Unicornio', '\u{1F984}'],
      ['Texto', 'abc'],
      ['Ya migrada', 'pet'],
    ];
    await ctx.db.insert(categories).values(
      rows.map(([name, icon]) => ({
        householdId: household.id,
        kind: 'expense' as const,
        name,
        icon,
        color: '#123456',
      })),
    );

    await runCategoryIcons();
    const icons = async () =>
      Object.fromEntries(
        (
          await ctx.db
            .select({ name: categories.name, icon: categories.icon })
            .from(categories)
            .where(eq(categories.householdId, household.id))
        ).map((r) => [r.name, r.icon]),
      );
    const after = await icons();

    expect(after).toMatchObject({
      Casa: 'home',
      Seguro: 'insurance',
      'Seguro sin selector': 'insurance',
      Etiqueta: 'tag',
      Perro: 'pet',
      Avión: 'travel',
      'Con espacios': 'groceries',
      Unicornio: 'tag',
      Texto: 'tag',
      'Ya migrada': 'pet',
      // Las predefinidas del hogar ya nacen con identificadores y no cambian.
      Vivienda: 'home',
      Seguros: 'insurance',
    });
    for (const icon of Object.values(after)) expect(CATEGORY_ICONS).toContain(icon);

    // Repetirla no cambia nada.
    await runCategoryIcons();
    expect(await icons()).toEqual(after);
  });

  it('la SQL repite la tabla de emoji del dominio y el catálogo entero', () => {
    const pairs = Object.fromEntries(
      [...CATEGORY_ICONS_SQL.matchAll(/WHEN '([^']+)' THEN '([a-z]+)'/g)].map((m) => [m[1], m[2]]),
    );
    expect(pairs).toEqual(EMOJI_TO_CATEGORY_ICON);

    const list = /NOT IN \(([^)]+)\)/.exec(CATEGORY_ICONS_SQL)?.[1] ?? '';
    const known = [...list.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect([...known].sort()).toEqual([...CATEGORY_ICONS].sort());
  });
});
