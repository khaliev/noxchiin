// ============================================================================
// lessons.js — реестр тем и карточек уроков.
// ============================================================================
// Единственное место, откуда остальной код берёт учебный контент.
// Контент хранится в JSON-файлах в /data/lessons/ (по одному на тему).
// Здесь мы их читаем и раскладываем по удобным функциям-геттерам.
//
// import.meta.glob автоматически подхватывает ВСЕ *.json файлы из папки —
// поэтому, когда новичок добавит новый файл (например food.json на Этапе 3),
// НИЧЕГО в этом модуле менять не придётся.
// ============================================================================

/** @typedef {import('../../data/schema/lesson.schema.json').topic} TopicType */

// Загружаем все JSON-файлы уроков сразу (Vite встраивает их в бандл).
// eager: true — читаем содержимое сразу, а не лениво.
const lessonModules = import.meta.glob('../../data/lessons/*.json', {
  eager: true,
});

/**
 * Список всех тем, отсортированный по порядку на карте уроков (поле order).
 * @type {TopicType[]}
 */
const topics = Object.values(lessonModules)
  .map((mod) => mod.default?.topic)
  .filter(Boolean)
  .sort((a, b) => a.order - b.order);

/**
 * Возвращает все темы в порядке прохождения.
 * @returns {TopicType[]} Массив тем.
 */
export function getAllTopics() {
  return topics;
}

/**
 * Находит тему по её id.
 * @param {string} topicId — id темы (например 'alphabet').
 * @returns {TopicType | null} Тема или null, если не найдена.
 */
export function getTopic(topicId) {
  return topics.find((t) => t.id === topicId) ?? null;
}

/**
 * Возвращает карточки (буквы/слова/цифры/цвета) конкретной темы.
 * @param {string} topicId — id темы.
 * @returns {Array} Массив карточек (пустой, если тема не найдена или не готова).
 */
export function getTopicItems(topicId) {
  const topic = getTopic(topicId);
  return topic?.items ?? [];
}

/**
 * Возвращает тему, которая должна открыться следующей после данной.
 * Используется для логики разблокировки на карте уроков.
 * @param {string} topicId — id текущей темы.
 * @returns {TopicType | null} Следующая тема или null (если текущая — последняя).
 */
export function getNextTopic(topicId) {
  const index = topics.findIndex((t) => t.id === topicId);
  if (index === -1 || index === topics.length - 1) return null;
  return topics[index + 1];
}

/**
 * Возвращает тему, стоящую непосредственно перед данной.
 * @param {string} topicId — id текущей темы.
 * @returns {TopicType | null} Предыдущая тема или null (если текущая — первая).
 */
export function getPreviousTopic(topicId) {
  const index = topics.findIndex((t) => t.id === topicId);
  if (index <= 0) return null;
  return topics[index - 1];
}
