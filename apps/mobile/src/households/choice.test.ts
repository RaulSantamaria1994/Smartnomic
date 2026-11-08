import { describe, expect, it } from 'vitest';
import { createHouseholdChoice, type ChoiceStorage } from './choice';

function memoryStorage(initial: string | null = null): ChoiceStorage & { value: string | null } {
  const store = {
    value: initial,
    load: async () => store.value,
    save: async (value: string) => {
      store.value = value;
    },
  };
  return store;
}

describe('hogar elegido en el dispositivo (especificación 013)', () => {
  it('se guarda por cuenta y se recupera al volver a abrir', async () => {
    const storage = memoryStorage();
    const choice = createHouseholdChoice(storage);
    await choice.load();
    await choice.set('lucia', 'h2');
    await choice.set('juan', 'h7');

    const reopened = createHouseholdChoice(storage);
    await reopened.load();
    expect(reopened.get('lucia')).toBe('h2');
    expect(reopened.get('juan')).toBe('h7');
    expect(reopened.get('marta')).toBeNull();
  });

  it('avisa a quien escucha cuando cambia', async () => {
    const choice = createHouseholdChoice(memoryStorage());
    await choice.load();
    const seen: string[] = [];
    const stop = choice.subscribe(() => seen.push(choice.get('lucia') ?? ''));
    await choice.set('lucia', 'h1');
    stop();
    await choice.set('lucia', 'h2');
    expect(seen).toEqual(['h1']);
  });

  it('lo guardado roto o de otra forma no rompe la app: se empieza de cero', async () => {
    for (const broken of ['{no es json', '"texto"', '[1,2]', '{"lucia":3}']) {
      const choice = createHouseholdChoice(memoryStorage(broken));
      await choice.load();
      expect(choice.get('lucia')).toBeNull();
    }
  });

  it('sin almacenamiento (o si falla), funciona en memoria', async () => {
    const choice = createHouseholdChoice({
      load: async () => {
        throw new Error('sin espacio');
      },
      save: async () => {
        throw new Error('sin espacio');
      },
    });
    await choice.load();
    await choice.set('lucia', 'h2');
    expect(choice.get('lucia')).toBe('h2');
  });
});
