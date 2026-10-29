import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Emoji y símbolos pictográficos, más el selector de variante que los acompaña. */
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}]/u;

const ROOT = join(__dirname, '../../..');
const FOLDERS = ['apps/mobile/app', 'apps/mobile/src', 'packages/domain/src', 'packages/api/src'];

function files(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe('sin emoji en la app (especificación 004, CE-401)', () => {
  it('ningún archivo de la app ni de los paquetes compartidos lleva emoji', () => {
    const found = FOLDERS.flatMap((folder) => files(join(ROOT, folder))).flatMap((path) =>
      readFileSync(path, 'utf8')
        .split('\n')
        .flatMap((line, i) =>
          EMOJI.test(line) ? [`${path.slice(ROOT.length + 1)}:${i + 1}`] : [],
        ),
    );
    expect(found).toEqual([]);
  });

  it('el patrón detecta emoji', () => {
    expect(EMOJI.test('\u{1F3E0}')).toBe(true);
    expect(EMOJI.test('\u{1F6E1}\u{FE0F}')).toBe(true);
    expect(EMOJI.test('Vivienda 1.234,56 € · «Calma» ✓')).toBe(false);
  });
});
