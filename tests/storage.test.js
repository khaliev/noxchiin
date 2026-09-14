// Тесты хранения прогресса (localStorage) с версионированием и валидацией.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  STORAGE_KEY,
  SCHEMA_VERSION,
  MAX_HEARTS,
  createDefaultState,
  loadState,
  saveState,
} from '../src/scripts/storage.js';

/** Простой мок localStorage в памяти (для запуска тестов в Node). */
function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

describe('storage', () => {
  let storage;
  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it('возвращает дефолт, если ничего не сохранено', () => {
    const state = loadState(storage);
    expect(state.version).toBe(SCHEMA_VERSION);
    expect(state.player.xp).toBe(0);
    expect(state.hearts.count).toBe(MAX_HEARTS);
  });

  it('сохраняет и загружает состояние', () => {
    const state = createDefaultState();
    state.player.name = 'Амина';
    state.player.xp = 250;
    expect(saveState(state, storage)).toBe(true);

    const loaded = loadState(storage);
    expect(loaded.player.name).toBe('Амина');
    expect(loaded.player.xp).toBe(250);
  });

  it('возвращает дефолт при повреждённом JSON', () => {
    storage.setItem(STORAGE_KEY, '{ это не JSON !!!');
    const state = loadState(storage);
    expect(state.player.xp).toBe(0);
    expect(state.hearts.count).toBe(MAX_HEARTS);
  });

  it('нормализует битые типы данных', () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, player: { xp: 'abc' } }));
    const state = loadState(storage);
    expect(state.player.xp).toBe(0); // 'abc' -> 0
    expect(state.player.name).toBe('');
  });

  it('не даёт сердечкам превысить максимум', () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, hearts: { count: 999 } }));
    const state = loadState(storage);
    expect(state.hearts.count).toBe(MAX_HEARTS);
  });

  it('переживает значение null', () => {
    storage.setItem(STORAGE_KEY, 'null');
    const state = loadState(storage);
    expect(state.player.xp).toBe(0);
  });
});
