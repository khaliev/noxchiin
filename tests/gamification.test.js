// Тесты чистых функций игровой механики.
import { describe, it, expect } from 'vitest';
import {
  calculateStars,
  calculateXp,
  levelFromXp,
  applyLessonResult,
  loseHeart,
  restoreHearts,
  computeHeartRestore,
  HEART_RESTORE_MS,
} from '../src/scripts/gamification.js';
import { createDefaultState, MAX_HEARTS } from '../src/scripts/storage.js';

describe('calculateStars', () => {
  it('даёт 3 звезды за >=90% правильных', () => {
    expect(calculateStars(10, 10)).toBe(3);
    expect(calculateStars(9, 10)).toBe(3);
  });
  it('даёт 2 звезды за >=60% правильных', () => {
    expect(calculateStars(8, 10)).toBe(2);
    expect(calculateStars(6, 10)).toBe(2);
  });
  it('даёт 1 звезду за меньше 60%', () => {
    expect(calculateStars(5, 10)).toBe(1);
    expect(calculateStars(1, 10)).toBe(1);
  });
  it('даёт 0 звёзд при нуле правильных или нуле вопросов', () => {
    expect(calculateStars(0, 10)).toBe(0);
    expect(calculateStars(0, 0)).toBe(0);
  });
});

describe('calculateXp', () => {
  it('считает XP = правильные*5 + звёзды*5', () => {
    expect(calculateXp(5, 3)).toBe(40);
    expect(calculateXp(0, 0)).toBe(0);
  });
});

describe('levelFromXp', () => {
  it('начинает с уровня 1 при 0 XP', () => {
    const lvl = levelFromXp(0);
    expect(lvl.level).toBe(1);
    expect(lvl.progress).toBe(0);
  });
  it('растёт уровень каждые 100 XP', () => {
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(250).level).toBe(3);
  });
  it('считает прогресс внутри уровня', () => {
    const lvl = levelFromXp(150);
    expect(lvl.currentLevelXp).toBe(50);
    expect(lvl.progress).toBeCloseTo(0.5);
  });
});

describe('applyLessonResult', () => {
  it('начисляет XP и звёзды, обновляет статистику', () => {
    const state = createDefaultState();
    const { state: next, stars, xp } = applyLessonResult(state, {
      topicId: 'alphabet',
      correct: 10,
      total: 10,
    });
    expect(stars).toBe(3);
    expect(xp).toBe(65);
    expect(next.player.xp).toBe(65);
    expect(next.topics.alphabet.completed).toBe(true);
    expect(next.topics.alphabet.stars).toBe(3);
    expect(next.stats.lessonsCompleted).toBe(1);
    expect(next.stats.totalCorrect).toBe(10);
  });

  it('не занижает лучший результат при повторном прохождении', () => {
    let state = createDefaultState();
    state = applyLessonResult(state, { topicId: 'alphabet', correct: 10, total: 10 }).state;
    const { state: again } = applyLessonResult(state, { topicId: 'alphabet', correct: 4, total: 10 });
    expect(again.topics.alphabet.stars).toBe(3); // лучший результат сохраняется
    expect(again.stats.lessonsCompleted).toBe(1); // тема не считается новой
  });

  it('не меняет исходное состояние (чистая функция)', () => {
    const state = createDefaultState();
    const before = state.player.xp;
    applyLessonResult(state, { topicId: 'alphabet', correct: 5, total: 5 });
    expect(state.player.xp).toBe(before);
  });
});

describe('сердечки', () => {
  it('loseHeart уменьшает счётчик, но не ниже нуля', () => {
    let state = createDefaultState();
    state = loseHeart(state);
    expect(state.hearts.count).toBe(MAX_HEARTS - 1);
    for (let i = 0; i < 10; i++) state = loseHeart(state);
    expect(state.hearts.count).toBe(0);
  });

  it('restoreHearts восстанавливает все сердечки', () => {
    let state = createDefaultState();
    state = loseHeart(loseHeart(state));
    expect(state.hearts.count).toBe(MAX_HEARTS - 2);
    state = restoreHearts(state);
    expect(state.hearts.count).toBe(MAX_HEARTS);
  });

  it('computeHeartRestore восстанавливает по таймеру', () => {
    const base = 1_000_000;
    const hearts = { count: 3, max: MAX_HEARTS, lostAt: base };
    const { count, nextAt } = computeHeartRestore(hearts, base + HEART_RESTORE_MS * 2);
    expect(count).toBe(MAX_HEARTS);
    expect(nextAt).toBeNull();
  });

  it('computeHeartRestore ничего не делает, если сердечки полные', () => {
    const hearts = { count: MAX_HEARTS, max: MAX_HEARTS, lostAt: null };
    const { count, nextAt } = computeHeartRestore(hearts, Date.now());
    expect(count).toBe(MAX_HEARTS);
    expect(nextAt).toBeNull();
  });
});
