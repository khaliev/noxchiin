// ============================================================================
// storage.js — сохранение прогресса игрока в localStorage.
// ============================================================================
// Храним весь прогресс в ОДНОМ ключе как JSON-строку. Это синхронно,
// просто и достаточно для одного устройства/ребёнка (сервер не нужен).
//
// ВАЖНО (раздел 5 требований):
//   - Данные версионируются (поле version) — при будущих изменениях структуры
//     пишем миграцию, чтобы не сломать уже накопленный прогресс детей.
//   - При загрузке данные ВАЛИДИРУЮТСЯ: если JSON повреждён (ребёнок поиграл
//     с DevTools, или что-то сломалось) — спокойно возвращаем дефолт,
//     а не падаем с белым экраном.
//   - Никаких личных/чувствительных данных тут не храним (только игровые).
// ============================================================================

/** Ключ, под которым лежит весь прогресс. */
export const STORAGE_KEY = 'noxchiin-mott:progress';

/** Текущая версия схемы данных. Меняй ТОЛЬКО при изменении структуры. */
export const SCHEMA_VERSION = 1;

/** Максимальное количество сердечек (жизней). */
export const MAX_HEARTS = 5;

/**
 * Создаёт «нулевое» состояние игрока (новый профиль).
 * @returns {object} Свежий объект состояния.
 */
export function createDefaultState() {
  return {
    version: SCHEMA_VERSION,
    player: {
      name: '',
      avatar: 'wolf',
      xp: 0,
      ageGroup: '5-8', // возрастной режим: '5-8' или '9+'
    },
    // Прогресс по каждой теме: topicId -> статистика
    topics: {},
    hearts: {
      count: MAX_HEARTS,
      max: MAX_HEARTS,
      lostAt: null, // timestamp, когда потеряли последнее сердечко (для таймера восстановления)
    },
    stats: {
      lessonsCompleted: 0,
      totalCorrect: 0,
      totalAnswered: 0,
    },
    streak: {
      current: 0,
      best: 0,
      lastPlayed: null, // строка YYYY-MM-DD последней игры
      playedDates: [], // история посещений (массив строк YYYY-MM-DD)
    },
    updatedAt: null,
  };
}

/**
 * Приводит загруженный объект к валидному состоянию.
 * Заполняет отсутствующие поля значениями по умолчанию и проверяет типы,
 * чтобы «битые» данные не сломали игру.
 * @param {unknown} raw — что удалось прочитать из localStorage.
 * @returns {object} Нормализованное состояние.
 */
function normalizeState(raw) {
  const base = createDefaultState();
  if (!raw || typeof raw !== 'object') return base;

  const state = { ...base, ...raw };

  // player
  state.player = { ...base.player, ...(raw.player ?? {}) };
  state.player.xp = Number(state.player.xp) || 0;
  state.player.name = typeof state.player.name === 'string' ? state.player.name : '';
  state.player.avatar = typeof state.player.avatar === 'string' ? state.player.avatar : 'wolf';
  state.player.ageGroup = state.player.ageGroup === '9+' ? '9+' : '5-8';

  // topics — словарь, а не массив
  state.topics = (state.topics && typeof state.topics === 'object' && !Array.isArray(state.topics))
    ? state.topics
    : {};

  // hearts
  state.hearts = { ...base.hearts, ...(raw.hearts ?? {}) };
  state.hearts.count = Math.min(
    Math.max(0, Number(state.hearts.count) || 0),
    state.hearts.max,
  );
  state.hearts.max = MAX_HEARTS;

  // stats
  state.stats = { ...base.stats, ...(raw.stats ?? {}) };
  for (const key of Object.keys(state.stats)) {
    state.stats[key] = Number(state.stats[key]) || 0;
  }

  // streak
  state.streak = { ...base.streak, ...(raw.streak ?? {}) };
  state.streak.current = Number(state.streak.current) || 0;
  state.streak.best = Number(state.streak.best) || 0;
  // playedDates должен быть массивом строк (защита от битых данных).
  state.streak.playedDates = Array.isArray(state.streak.playedDates)
    ? state.streak.playedDates.filter((d) => typeof d === 'string')
    : [];

  state.version = SCHEMA_VERSION;
  return state;
}

/**
 * Прогоняет состояние через цепочку миграций (для будущих версий схемы).
 * Сейчас версия одна — цепочка пустая, но каркас готов.
 * @param {object} state — состояние после normalizeState.
 * @returns {object} Состояние актуальной версии.
 */
function migrate(state) {
  const migrations = [
    // Пример будущей миграции (v1 -> v2):
    // { from: 1, run: (s) => { s.newField = ...; return s; } }
  ];

  for (const m of migrations) {
    if (state.version < m.from) {
      state = m.run(state);
      state.version = m.from;
    }
  }
  state.version = SCHEMA_VERSION;
  return state;
}

/**
 * Загружает состояние прогресса из переданного хранилища.
 * Никогда не бросает исключение — при любой ошибке возвращает дефолт.
 * @param {Storage} storage — объект localStorage (или его мок для тестов).
 * @returns {object} Валидное состояние.
 */
export function loadState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    return migrate(normalizeState(parsed));
  } catch {
    // Повреждённые данные не должны ломать игру — начинаем заново.
    return createDefaultState();
  }
}

/**
 * Сохраняет состояние в переданное хранилище.
 * @param {object} state — состояние (обычно результат createDefaultState/loadState).
 * @param {Storage} storage — объект localStorage (или мок).
 * @returns {boolean} true, если сохранение удалось.
 */
export function saveState(state, storage) {
  try {
    const snapshot = { ...state, updatedAt: Date.now() };
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    // Например, переполнена квота localStorage — просто сообщаем об ошибке.
    return false;
  }
}
