import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Lo que la especificación 006 quita y no debe volver (CE-603): la fuente de moda, las
 * tarjetas, las pastillas de estado, los cuadraditos de color detrás de los iconos y los
 * «Volver»/«Cancelar» al pie que ahora son la flecha de la barra superior.
 */
const RULES: [string, RegExp][] = [
  ['Plus Jakarta Sans', /plus-?jakarta/i],
  ['tarjetas (Card)', /\bCard\b|design\/Card'/],
  ['pastillas de estado', /StatusPill|PillKind/],
  ['resumen en tarjeta', /SummaryCard|SavingsCard/],
  ['fondo de color detrás del icono', /categoryBackground/],
  [
    '«Volver» o «Cancelar» de navegación al pie',
    /variant="link"\s+label=\{es\.(settings\.back|transaction\.cancel)\}\s+onPress=\{\(\) => (goBack|router\.back)\(\)\}/,
  ],
];

const ROOT = join(__dirname, '..');
const FOLDERS = ['app', 'src'];

function files(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

describe('estilo Android sin rasgos de diseño generado (especificación 006, CE-603)', () => {
  const sources = [
    ...FOLDERS.flatMap((folder) => files(join(ROOT, folder))),
    join(ROOT, 'package.json'),
  ].map((path) => ({ path: path.slice(ROOT.length + 1), text: readFileSync(path, 'utf8') }));

  for (const [name, pattern] of RULES) {
    it(`sin ${name}`, () => {
      expect(sources.filter(({ text }) => pattern.test(text)).map(({ path }) => path)).toEqual([]);
    });
  }

  it('los patrones detectan lo que buscan', () => {
    expect(RULES[0]![1].test('"@expo-google-fonts/plus-jakarta-sans"')).toBe(true);
    expect(
      RULES[5]![1].test(
        '<Button variant="link" label={es.settings.back} onPress={() => goBack()} />',
      ),
    ).toBe(true);
    expect(RULES[1]![1].test('<Section title="Huchas">')).toBe(false);
  });
});
