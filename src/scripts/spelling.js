// ============================================================================
// spelling.js — разбивка чеченского слова на буквы (графемы).
// ============================================================================
// Нужно для игры «собери слово из букв». Чеченские слова пишутся диграфами
// («аь», «оь», «гӏ», «кӏ», «цӏ» …), поэтому обычное разбиение по символам
// не подходит — диграф должен оставаться одной «буквой».
// ============================================================================

import { getGraphemes } from './lessons.js';

/**
 * Разбивает слово на графемы (буквы), учитывая диграфы.
 * @param {string} word — слово на чеченском (в нижнем регистре).
 * @returns {string[]} Массив букв-графем.
 */
export function splitWord(word) {
  const graphemes = getGraphemes();
  const result = [];
  let i = 0;
  while (i < word.length) {
    let matched = false;
    // Жадное совпадение: сначала пробуем длинные диграфы.
    for (const g of graphemes) {
      if (word.startsWith(g, i)) {
        result.push(g);
        i += g.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Неизвестный символ — добавляем как есть (страховка).
      result.push(word[i]);
      i += 1;
    }
  }
  return result;
}

/**
 * Перемешивает буквы слова (для «перепутанных» плиток) с помощью rng.
 * @param {string[]} letters — буквы.
 * @param {() => number} [rng] — генератор случайных чисел.
 * @returns {string[]} Перемешанные буквы.
 */
export function shuffleLetters(letters, rng = Math.random) {
  const a = letters.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
