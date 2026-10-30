import { readFileSync } from 'node:fs';
import { CATEGORY_ICONS, EMOJI_TO_CATEGORY_ICON } from '@smartnomic/domain';
import { eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { categories, savingsEntries, savingsGoals } from '../src/db/schema';
import { me, newId, signUp, useTestServer } from './helpers';

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

  // Una migración aplicada no se toca, pero el catálogo puede crecer: la SQL debe estar
  // contenida en el dominio, no ser igual.
  it('la SQL coincide con la tabla de emoji y el catálogo del dominio', () => {
    const pairs = [...CATEGORY_ICONS_SQL.matchAll(/WHEN '([^']+)' THEN '([a-z]+)'/g)];
    expect(pairs.length).toBeGreaterThanOrEqual(14);
    for (const [, emoji, icon] of pairs) expect(EMOJI_TO_CATEGORY_ICON[emoji!], emoji).toBe(icon);

    const list = /NOT IN \(([^)]+)\)/.exec(CATEGORY_ICONS_SQL)?.[1] ?? '';
    const known = [...list.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect(known).toHaveLength(44);
    for (const icon of known) expect(CATEGORY_ICONS).toContain(icon);
  });
});

describe('0006_savings (especificación 005)', () => {
  async function twoHouseholds() {
    const a = (await me(ctx.app, await signUp(ctx.app))).household.id;
    const b = (await me(ctx.app, await signUp(ctx.app))).household.id;
    const goalId = newId();
    await ctx.db.insert(savingsGoals).values({
      id: goalId,
      householdId: a,
      name: 'Vacaciones',
      icon: 'travel',
      targetCents: 120000,
      deadline: '2027-07-31',
      contributionDay: 1,
      startDate: '2026-10-27',
    });
    return { a, b, goalId };
  }

  const entry = (householdId: string, goalId: string, extra: Record<string, unknown> = {}) => ({
    id: newId(),
    householdId,
    goalId,
    kind: 'deposit' as const,
    amountCents: 13334,
    date: '2026-11-01',
    ...extra,
  });

  it('un movimiento no puede apuntar a la hucha de otro hogar', async () => {
    const { b, goalId } = await twoHouseholds();
    await expect(ctx.db.insert(savingsEntries).values(entry(b, goalId))).rejects.toThrow();
  });

  it('un mes se resuelve una sola vez, salvo que el anterior se haya deshecho', async () => {
    const { a, goalId } = await twoHouseholds();
    const first = entry(a, goalId, { dueDate: '2026-11-01' });
    await ctx.db.insert(savingsEntries).values(first);
    await expect(
      ctx.db.insert(savingsEntries).values(entry(a, goalId, { dueDate: '2026-11-01' })),
    ).rejects.toThrow();
    await ctx.db
      .update(savingsEntries)
      .set({ deletedAt: new Date() })
      .where(eq(savingsEntries.id, first.id));
    await ctx.db.insert(savingsEntries).values(entry(a, goalId, { dueDate: '2026-11-01' }));
  });

  it('saltar no lleva importe ni sacar va asociado a un mes', async () => {
    const { a, goalId } = await twoHouseholds();
    await expect(
      ctx.db
        .insert(savingsEntries)
        .values(entry(a, goalId, { kind: 'skip', dueDate: '2026-11-01' })),
    ).rejects.toThrow();
    await ctx.db
      .insert(savingsEntries)
      .values(entry(a, goalId, { kind: 'skip', amountCents: 0, dueDate: '2026-11-01' }));
    await expect(
      ctx.db
        .insert(savingsEntries)
        .values(entry(a, goalId, { kind: 'withdrawal', dueDate: '2026-12-01' })),
    ).rejects.toThrow();
  });
});
