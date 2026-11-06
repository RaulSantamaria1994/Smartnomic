import { describe, expect, it, vi } from 'vitest';
import { queryKeys } from '../api/queryKeys';
import { createBatcher, keysToRefresh } from './scopes';

const h = 'h1';
const has = (keys: readonly (readonly unknown[])[], key: readonly unknown[]) =>
  keys.some((k) => JSON.stringify(k) === JSON.stringify(key));

describe('keysToRefresh (especificación 012)', () => {
  it('movimientos: los meses (con gráficas y búsqueda) y el calendario', () => {
    const keys = keysToRefresh(h, ['transactions']);
    expect(has(keys, queryKeys.periods(h))).toBe(true);
    expect(has(keys, queryKeys.calendars(h))).toBe(true);
    expect(has(keys, queryKeys.recurring(h))).toBe(false);
  });

  it('cada ámbito recarga lo suyo', () => {
    expect(has(keysToRefresh(h, ['recurring']), queryKeys.upcoming(h))).toBe(true);
    expect(has(keysToRefresh(h, ['savings']), queryKeys.savings(h))).toBe(true);
    expect(has(keysToRefresh(h, ['budgets']), queryKeys.periods(h))).toBe(true);
    expect(has(keysToRefresh(h, ['categories']), queryKeys.categories(h))).toBe(true);
    expect(has(keysToRefresh(h, ['household']), queryKeys.me)).toBe(true);
    const members = keysToRefresh(h, ['members']);
    expect(has(members, queryKeys.me)).toBe(true);
    expect(has(members, queryKeys.members(h))).toBe(true);
    expect(has(members, queryKeys.invitations(h))).toBe(true);
  });

  it('varios ámbitos a la vez: cada consulta una sola vez', () => {
    const keys = keysToRefresh(h, ['transactions', 'budgets', 'recurring', 'transactions']);
    const texts = keys.map((k) => JSON.stringify(k));
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('todo (al reconectar): todas las consultas del hogar', () => {
    const keys = keysToRefresh(h, 'all');
    for (const key of [
      queryKeys.me,
      queryKeys.periods(h),
      queryKeys.calendars(h),
      queryKeys.recurring(h),
      queryKeys.upcoming(h),
      queryKeys.savings(h),
      queryKeys.categories(h),
      queryKeys.members(h),
      queryKeys.invitations(h),
    ]) {
      expect(has(keys, key), JSON.stringify(key)).toBe(true);
    }
  });
});

describe('createBatcher (CE-1204)', () => {
  it('agrupa lo que llega casi a la vez y lo entrega una vez', () => {
    vi.useFakeTimers();
    const flush = vi.fn();
    const batch = createBatcher<string>(300, flush);
    batch.push('transactions');
    vi.advanceTimersByTime(100);
    batch.push('budgets');
    batch.push('transactions');
    vi.advanceTimersByTime(299);
    expect(flush).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith(['transactions', 'budgets']);
    batch.push('savings');
    vi.advanceTimersByTime(300);
    expect(flush).toHaveBeenLastCalledWith(['savings']);
    batch.push('members');
    batch.cancel();
    vi.advanceTimersByTime(300);
    expect(flush).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
