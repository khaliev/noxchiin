// ============================================================================
// quiz.js — генерация вопросов для мини-игр (чистые функции, без DOM).
// ============================================================================
// Отвечает за «собрать вопрос»: выбрать правильный вариант и подмешать
// несколько неверных. Ничего не знает про интерфейс — только данные.
// ============================================================================

/**
 * Перемешивает массив (возвращает новый, исходный не трогает).
 * @template T
 * @param {T[]} array — исходный массив.
 * @param {() => number} [rng] — генератор случайных чисел (для тестов — детерминированный).
 * @returns {T[]} Новый перемешанный массив.
 */
export function shuffle(array, rng = Math.random) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Создаёт один вопрос типа «выбери правильный вариант по звуку».
 * @param {Array} items — карточки темы (буквы/слова).
 * @param {{numOptions?: number, rng?: () => number}} [opts] — настройки.
 * @returns {{target: object, options: object[]} | null} Вопрос или null, если нет карточек.
 */
export function createQuestion(items, { numOptions = 4, rng = Math.random } = {}) {
  if (!items || items.length === 0) return null;

  // Правильный ответ
  const target = items[Math.floor(rng() * items.length)];

  // Неправильные варианты (дистракторы) — любые другие карточки, кроме target
  const distractors = shuffle(
    items.filter((item) => item.id !== target.id),
    rng,
  ).slice(0, Math.max(0, numOptions - 1));

  // Перемешиваем ответы, чтобы правильный не был всегда первым
  const options = shuffle([target, ...distractors], rng);

  return { target, options };
}

/**
 * Проверяет, правильный ли выбран ответ.
 * @param {{target: object}} question — вопрос.
 * @param {string} chosenId — id выбранной карточки.
 * @returns {boolean} true, если ответ верный.
 */
export function isCorrect(question, chosenId) {
  return question.target.id === chosenId;
}

/**
 * Собирает набор вопросов для одного урока.
 * @param {Array} items — карточки темы.
 * @param {{questionCount?: number, numOptions?: number, rng?: () => number}} [opts] — настройки.
 * @returns {object[]} Массив вопросов (может быть короче запрошенного, если карточек мало).
 */
export function buildSession(items, { questionCount, numOptions = 4, rng = Math.random } = {}) {
  const count = Math.min(questionCount ?? Math.min(items.length, 6), items.length);
  const questions = [];
  for (let i = 0; i < count; i++) {
    const q = createQuestion(items, { numOptions, rng });
    if (q) questions.push(q);
  }
  return questions;
}
