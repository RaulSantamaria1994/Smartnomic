import { describe, expect, it } from 'vitest';
import { trackList, withoutKey, type Tracked } from './animatedList';

const key = (s: string) => s;
const view = (list: Tracked<string>[]) => list.map((t) => `${t.key}:${t.state}`);

describe('filas que entran y salen (especificación 006, animación 7)', () => {
  it('en la primera carga no se anima nada', () => {
    expect(view(trackList(null, ['a', 'b'], key))).toEqual(['a:stay', 'b:stay']);
  });

  it('una fila nueva entra en su sitio', () => {
    const before = trackList(null, ['a', 'c'], key);
    expect(view(trackList(before, ['a', 'b', 'c'], key))).toEqual(['a:stay', 'b:enter', 'c:stay']);
  });

  it('una fila que se va se queda en su sitio mientras se funde', () => {
    const before = trackList(null, ['a', 'b', 'c'], key);
    expect(view(trackList(before, ['a', 'c'], key))).toEqual(['a:stay', 'b:leave', 'c:stay']);
    expect(view(trackList(before, ['b', 'c'], key))).toEqual(['a:leave', 'b:stay', 'c:stay']);
  });

  it('al terminar de fundirse, desaparece', () => {
    const leaving = trackList(trackList(null, ['a', 'b'], key), ['a'], key);
    expect(view(withoutKey(leaving, 'b'))).toEqual(['a:stay']);
  });

  it('una fila que vuelve mientras se iba entra de nuevo', () => {
    const leaving = trackList(trackList(null, ['a', 'b'], key), ['a'], key);
    expect(view(trackList(leaving, ['a', 'b'], key))).toEqual(['a:stay', 'b:enter']);
  });

  it('una fila que está entrando no vuelve a empezar ni cambia de estado', () => {
    const entered = trackList(trackList(null, ['a'], key), ['a', 'b'], key);
    expect(view(trackList(entered, ['a', 'b'], key))).toEqual(['a:stay', 'b:enter']);
  });

  it('el mismo contenido actualizado se queda con el dato nuevo', () => {
    const before = trackList(null, [{ id: '1', n: 1 }], (o) => o.id);
    const after = trackList(before, [{ id: '1', n: 2 }], (o) => o.id);
    expect(after[0]).toMatchObject({ key: '1', state: 'stay', item: { n: 2 } });
  });
});
