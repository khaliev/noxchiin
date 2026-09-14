// Тесты разбивки слова на буквы (графемы) и фильтрации по возрасту.
import { describe, it, expect } from 'vitest';
import { splitWord, shuffleLetters } from '../src/scripts/spelling.js';
import { getGraphemes, filterItemsByAge } from '../src/scripts/lessons.js';

// Палка (гортанная смычка) в проекте используется как U+04C0 (Ӏ) — единообразно.
const P = '\u04C0';

describe('getGraphemes', () => {
  it('возвращает графемы, отсортированные по длине', () => {
    const graphemes = getGraphemes();
    expect(graphemes.length).toBeGreaterThan(40);
    // Диграфы (длина 2) должны идти раньше одиночных букв
    expect(graphemes[0].length).toBeGreaterThanOrEqual(2);
  });
  it('содержит диграфы чеченского алфавита', () => {
    const set = new Set(getGraphemes());
    expect(set.has('аь')).toBe(true);
    expect(set.has(`к${P}`)).toBe(true);
    expect(set.has(`г${P}`)).toBe(true);
  });
});

describe('splitWord', () => {
  it('разбивает простое слово по буквам', () => {
    expect(splitWord('нана')).toEqual(['н', 'а', 'н', 'а']);
  });
  it('сохраняет диграфы как одну букву', () => {
    expect(splitWord(`ц${P}ен`)).toEqual([`ц${P}`, 'е', 'н']);
  });
  it('обрабатывает диграф в начале слова', () => {
    expect(splitWord('аьрзу')).toEqual(['аь', 'р', 'з', 'у']);
  });
  it('не падает на пустой строке', () => {
    expect(splitWord('')).toEqual([]);
  });
});

describe('shuffleLetters', () => {
  it('перемешивает буквы, не теряя их', () => {
    const letters = ['а', 'б', 'в', 'г'];
    const result = shuffleLetters(letters, () => 0.5);
    expect(result.sort()).toEqual(letters.sort());
  });
});

describe('filterItemsByAge', () => {
  const items = [
    { id: 'a', ageGroup: 'all' },
    { id: 'b', ageGroup: '9+' },
    { id: 'c', ageGroup: '5-8' },
    { id: 'd' },
  ];

  it('в режиме 5-8 убирает сложные (9+)', () => {
    const result = filterItemsByAge(items, '5-8');
    expect(result.map((i) => i.id)).toEqual(['a', 'c', 'd']);
  });
  it('в режиме 9+ оставляет всё', () => {
    expect(filterItemsByAge(items, '9+')).toHaveLength(4);
  });
  it('без возраста возвращает всё как есть', () => {
    expect(filterItemsByAge(items)).toHaveLength(4);
  });
});
