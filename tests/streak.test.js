// Тесты ежедневной серии (streak) и календаря.
import { describe, it, expect } from 'vitest';
import { todayKey, updateStreak, getCalendarDays } from '../src/scripts/streak.js';
import { createDefaultState } from '../src/scripts/storage.js';

/** Дата-помощник: создаёт Date на N дней назад от заданной базы. */
function daysAgo(base, n) {
  return new Date(base.getTime() - n * 24 * 60 * 60 * 1000);
}

const BASE = new Date(2026, 8, 15, 12, 0, 0); // 15 сентября 2026, полдень

describe('todayKey', () => {
  it('форматирует дату как YYYY-MM-DD', () => {
    expect(todayKey(BASE)).toBe('2026-09-15');
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('updateStreak', () => {
  it('первое занятие даёт серию 1', () => {
    const state = updateStreak(createDefaultState(), BASE);
    expect(state.streak.current).toBe(1);
    expect(state.streak.best).toBe(1);
    expect(state.streak.lastPlayed).toBe('2026-09-15');
  });

  it('занятие на следующий день увеличивает серию', () => {
    let state = updateStreak(createDefaultState(), daysAgo(BASE, 1));
    state = updateStreak(state, BASE);
    expect(state.streak.current).toBe(2);
    expect(state.streak.best).toBe(2);
  });

  it('повторное занятие в тот же день не дублирует серию', () => {
    let state = updateStreak(createDefaultState(), BASE);
    state = updateStreak(state, BASE);
    expect(state.streak.current).toBe(1);
    expect(state.streak.playedDates.filter((d) => d === '2026-09-15')).toHaveLength(1);
  });

  it('пропущенный день сбрасывает серию в 1, но сохраняет best', () => {
    let state = updateStreak(createDefaultState(), daysAgo(BASE, 3)); // 12 сентября -> серия 1
    state = updateStreak(state, daysAgo(BASE, 2)); // 13 сентября -> серия 2
    // Пропустили 14-е, играем 15-го
    state = updateStreak(state, BASE);
    expect(state.streak.current).toBe(1);
    expect(state.streak.best).toBe(2);
  });

  it('не меняет исходное состояние (чистая функция)', () => {
    const state = createDefaultState();
    updateStreak(state, BASE);
    expect(state.streak.current).toBe(0);
  });
});

describe('getCalendarDays', () => {
  it('возвращает нужное число дней и отмечает сегодня', () => {
    const state = createDefaultState();
    const days = getCalendarDays(state, BASE, 14);
    expect(days).toHaveLength(14);
    expect(days[days.length - 1].isToday).toBe(true);
    expect(days[days.length - 1].key).toBe('2026-09-15');
  });

  it('отмечает сыгранные дни', () => {
    let state = updateStreak(createDefaultState(), BASE);
    const days = getCalendarDays(state, BASE, 7);
    const today = days.find((d) => d.key === '2026-09-15');
    expect(today.played).toBe(true);
  });
});
