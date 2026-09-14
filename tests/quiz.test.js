// Тесты генерации вопросов.
import { describe, it, expect } from 'vitest';
import { shuffle, createQuestion, isCorrect, buildSession } from '../src/scripts/quiz.js';

// Детерминированный генератор для предсказуемых тестов.
function seededRng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const letters = [
  { id: 'a', chechen: 'А', audio: '/a.mp3' },
  { id: 'b', chechen: 'Б', audio: '/b.mp3' },
  { id: 'v', chechen: 'В', audio: '/v.mp3' },
  { id: 'g', chechen: 'Г', audio: '/g.mp3' },
  { id: 'd', chechen: 'Д', audio: '/d.mp3' },
  { id: 'e', chechen: 'Е', audio: '/e.mp3' },
];

describe('shuffle', () => {
  it('возвращает новый массив той же длины', () => {
    const result = shuffle(letters, seededRng());
    expect(result).toHaveLength(letters.length);
    expect(result).not.toBe(letters);
  });
  it('не теряет и не дублирует элементы', () => {
    const result = shuffle(letters, seededRng()).map((x) => x.id).sort();
    expect(result).toEqual(letters.map((x) => x.id).sort());
  });
});

describe('createQuestion', () => {
  it('возвращает вопрос с правильным ответом среди вариантов', () => {
    const q = createQuestion(letters, { numOptions: 4, rng: seededRng() });
    expect(q).not.toBeNull();
    expect(q.options).toHaveLength(4);
    expect(q.options.some((o) => o.id === q.target.id)).toBe(true);
  });
  it('все варианты уникальны', () => {
    const q = createQuestion(letters, { numOptions: 4, rng: seededRng() });
    const ids = q.options.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('возвращает null, если карточек нет', () => {
    expect(createQuestion([], {})).toBeNull();
  });
});

describe('isCorrect', () => {
  it('определяет правильный ответ', () => {
    const q = createQuestion(letters, { numOptions: 4, rng: seededRng() });
    expect(isCorrect(q, q.target.id)).toBe(true);
    const wrong = q.options.find((o) => o.id !== q.target.id);
    expect(isCorrect(q, wrong.id)).toBe(false);
  });
});

describe('buildSession', () => {
  it('собирает запрошенное число вопросов', () => {
    const session = buildSession(letters, { questionCount: 4, rng: seededRng() });
    expect(session).toHaveLength(4);
  });
  it('не превышает число доступных карточек', () => {
    const session = buildSession(letters.slice(0, 2), { questionCount: 6, rng: seededRng() });
    expect(session).toHaveLength(2);
  });
});
