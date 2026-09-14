// ============================================================================
// gamification.js — чистые функции игровой механики (без DOM, без хранилища).
// ============================================================================
// Всё здесь — «чистые функции»: на вход данные, на выход результат.
// Их легко покрыть unit-тестами (см. tests/).
// ============================================================================

import { MAX_HEARTS } from './storage.js';

/** Сколько XP нужно для перехода на следующий уровень. */
const XP_PER_LEVEL = 100;

/** Время (в миллисекундах) восстановления одного сердечка. */
export const HEART_RESTORE_MS = 15 * 60 * 1000; // 15 минут

/**
 * Считает, сколько карточек (слов/букв/цифр) игрок уже «выучил» —
 * суммарно по всем завершённым темам.
 * @param {object} state — состояние игрока.
 * @param {Array} topics — список тем (из lessons.js).
 * @returns {number} Количество выученных карточек.
 */
export function countLearnedItems(state, topics) {
  let count = 0;
  for (const topic of topics) {
    if (state.topics[topic.id]?.completed) {
      count += topic.items?.length ?? 0;
    }
  }
  return count;
}

/**
 * Считает звёзды (1–3) за урок по доле правильных ответов.
 * @param {number} correct — количество правильных ответов.
 * @param {number} total — общее количество вопросов.
 * @returns {number} 0..3 звезды.
 */
export function calculateStars(correct, total) {
  if (total <= 0 || correct <= 0) return 0;
  const ratio = correct / total;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.6) return 2;
  return 1;
}

/**
 * Считает очки опыта (XP) за урок.
 * @param {number} correct — правильные ответы.
 * @param {number} stars — заработанные звёзды (0..3).
 * @returns {number} Очки опыта.
 */
export function calculateXp(correct, stars) {
  return correct * 5 + stars * 5;
}

/**
 * Считает уровень персонажа по общему количеству XP.
 * @param {number} xp — суммарные очки опыта.
 * @returns {{level:number, currentLevelXp:number, xpForNextLevel:number, progress:number}}
 */
export function levelFromXp(xp) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const currentLevelXp = xp % XP_PER_LEVEL;
  return {
    level,
    currentLevelXp,
    xpForNextLevel: XP_PER_LEVEL,
    // Доля (0..1) прогресса до следующего уровня — для прогресс-бара.
    progress: currentLevelXp / XP_PER_LEVEL,
  };
}

/**
 * Применяет результат пройденного урока к состоянию и возвращает НОВОЕ состояние
 * (исходное не меняется — чистая функция).
 * @param {object} state — текущее состояние игрока.
 * @param {{topicId:string, correct:number, total:number}} result — итоги урока.
 * @returns {{state:object, stars:number, xp:number}} Новое состояние + награда.
 */
export function applyLessonResult(state, { topicId, correct, total }) {
  const stars = calculateStars(correct, total);
  const xp = calculateXp(correct, stars);
  const prev = state.topics[topicId] ?? {};

  const firstCompletion = !prev.completed;

  return {
    stars,
    xp,
    state: {
      ...state,
      player: {
        ...state.player,
        xp: state.player.xp + xp,
      },
      topics: {
        ...state.topics,
        [topicId]: {
          stars: Math.max(prev.stars ?? 0, stars),
          completed: true,
          attempts: (prev.attempts ?? 0) + 1,
          bestCorrect: Math.max(prev.bestCorrect ?? 0, correct),
          total,
        },
      },
      stats: {
        ...state.stats,
        lessonsCompleted: state.stats.lessonsCompleted + (firstCompletion ? 1 : 0),
        totalCorrect: state.stats.totalCorrect + correct,
        totalAnswered: state.stats.totalAnswered + total,
      },
    },
  };
}

/**
 * Отнимает одно сердечко. Возвращает новое состояние (чистая функция).
 * @param {object} state — текущее состояние.
 * @returns {object} Новое состояние с уменьшенным счётчиком сердечек.
 */
export function loseHeart(state) {
  const count = Math.max(0, state.hearts.count - 1);
  return {
    ...state,
    hearts: {
      ...state.hearts,
      count,
      // Запоминаем момент потери — от него считаем восстановление по таймеру.
      lostAt: count < state.hearts.count ? Date.now() : state.hearts.lostAt,
    },
  };
}

/**
 * Полностью восстанавливает сердечки (например, после успешного урока).
 * @param {object} state — текущее состояние.
 * @returns {object} Новое состояние с полными сердечками.
 */
export function restoreHearts(state) {
  return {
    ...state,
    hearts: {
      ...state.hearts,
      count: MAX_HEARTS,
      lostAt: null,
    },
  };
}

/**
 * Применяет восстановление сердечек по таймеру к состоянию.
 * @param {object} state — текущее состояние.
 * @param {number} [now] — текущее время (timestamp).
 * @returns {object} Новое состояние с восстановленными сердечками.
 */
export function applyHeartRestore(state, now = Date.now()) {
  const { count } = computeHeartRestore(state.hearts, now);
  if (count === state.hearts.count) return state;
  return { ...state, hearts: { ...state.hearts, count } };
}

/**
 * Считает, сколько сердечек должно восстановиться по прошествии времени.
 * @param {{count:number, max:number, lostAt:number|null}} hearts — блок сердечек.
 * @param {number} now — текущее время (timestamp).
 * @returns {{count:number, nextAt:number|null}} Актуальное число сердечек и
 *          время восстановления следующего (или null, если всё восстановлено).
 */
export function computeHeartRestore(hearts, now) {
  if (hearts.count >= hearts.max) return { count: hearts.count, nextAt: null };
  if (hearts.lostAt == null) return { count: hearts.count, nextAt: null };

  const elapsed = now - hearts.lostAt;
  const restored = Math.floor(elapsed / HEART_RESTORE_MS);
  const newCount = Math.min(hearts.max, hearts.count + restored);

  if (newCount >= hearts.max) return { count: newCount, nextAt: null };

  const usedMs = restored * HEART_RESTORE_MS;
  const nextAt = hearts.lostAt + usedMs + HEART_RESTORE_MS;
  return { count: newCount, nextAt };
}
