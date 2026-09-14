// ============================================================================
// streak.js — ежедневная серия (streak) и календарь посещений.
// ============================================================================
// Чистые функции без DOM и без хранилища. Легко покрываются тестами.
//
// Логика серии:
//   - играл сегодня           → ничего не меняем;
//   - играл вчера             → серия +1;
//   - пропустил день(и)       → серия сбрасывается в 1.
// ============================================================================

/** Сколько дней истории хранить в календаре посещений. */
export const MAX_PLAYED_DATES = 365;

/**
 * Возвращает ключ даты в формате YYYY-MM-DD (по локальному времени).
 * @param {Date} [date] — дата (по умолчанию сейчас).
 * @returns {string}
 */
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Обновляет серию после того, как игрок позанимался. Возвращает НОВОЕ состояние.
 * @param {object} state — текущее состояние игрока.
 * @param {Date} [now] — текущая дата (для тестов).
 * @returns {object} Новое состояние с обновлённой серией.
 */
export function updateStreak(state, now = new Date()) {
  const today = todayKey(now);
  const last = state.streak.lastPlayed;

  // Уже играл сегодня — ничего не меняем (но гарантируем, что дата в истории есть).
  if (last === today) {
    return addPlayedDate(state, today);
  }

  const yesterday = todayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const current = last === yesterday ? state.streak.current + 1 : 1;

  const next = {
    ...state,
    streak: {
      ...state.streak,
      current,
      best: Math.max(state.streak.best, current),
      lastPlayed: today,
    },
  };
  return addPlayedDate(next, today);
}

/**
 * Добавляет дату в историю посещений (без дубликатов, с ограничением длины).
 * @param {object} state — состояние.
 * @param {string} key — ключ даты YYYY-MM-DD.
 * @returns {object}
 */
function addPlayedDate(state, key) {
  const playedDates = state.streak.playedDates ?? [];
  if (playedDates.includes(key)) return state;
  const next = [...playedDates, key];
  if (next.length > MAX_PLAYED_DATES) next.shift();
  return { ...state, streak: { ...state.streak, playedDates: next } };
}

/**
 * Строит список последних дней для календаря.
 * @param {object} state — состояние игрока.
 * @param {Date} [now] — текущая дата.
 * @param {number} [days] — сколько дней показать (по умолчанию 14).
 * @returns {Array<{key:string, played:boolean, isToday:boolean}>}
 */
export function getCalendarDays(state, now = new Date(), days = 14) {
  const played = new Set(state.streak.playedDates ?? []);
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = todayKey(date);
    result.push({ key, played: played.has(key), isToday: i === 0 });
  }
  return result;
}
