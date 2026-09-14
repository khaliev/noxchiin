// ============================================================================
// games/spellWord.js — мини-игра «собери слово из букв».
// ============================================================================
// Показываем перевод (и эмодзи/цвет) слова, а ребёнок собирает чеченское
// слово из перемешанных букв-плиток.
// ============================================================================

import { shuffle } from '../quiz.js';
import { splitWord, shuffleLetters } from '../spelling.js';
import { getGraphemes } from '../lessons.js';
import { el, itemVisual, renderTopBar, FEEDBACK_DELAY } from './helpers.js';

/**
 * Подбирает случайные буквы-дистракторы (не входящие в слово).
 * @param {string} word — собираемое слово.
 * @param {number} count — сколько дистракторов нужно.
 * @param {() => number} rng — генератор случайных чисел.
 * @returns {string[]}
 */
function pickDistractors(word, count, rng) {
  if (count <= 0) return [];
  const used = new Set(splitWord(word));
  const pool = getGraphemes().filter((g) => !used.has(g));
  return shuffle(pool, rng).slice(0, count);
}

/**
 * Запускает игру. Возвращает функцию остановки.
 * @param {HTMLElement} root — контейнер игры.
 * @param {Array} items — карточки темы.
 * @param {object} handlers — { onAnswer(bool), onDone(), hearts, words, rng, distractorCount }.
 * @returns {() => void}
 */
export function start(root, items, handlers) {
  const { onAnswer, onDone, hearts, words = 4, rng = Math.random, distractorCount = 0 } = handlers;

  const chosen = shuffle(items, rng).slice(0, Math.min(words, items.length));
  let wordIndex = 0;
  let stopped = false;

  function showWord() {
    if (stopped) return;
    if (wordIndex >= chosen.length) {
      onDone();
      return;
    }

    const item = chosen[wordIndex];
    const letters = splitWord(item.chechen);
    const tiles = shuffleLetters(
      [...letters, ...pickDistractors(item.chechen, distractorCount, rng)],
      rng,
    );

    root.replaceChildren();
    renderTopBar(root, `Собери слово ${wordIndex + 1} из ${chosen.length}`, hearts);

    // Подсказка, что за слово собираем
    const prompt = el('div', 'game__prompt');
    const label = el('p', 'game__prompt-label', 'Собери слово из букв');
    const target = el('div', 'spell__target');
    target.appendChild(itemVisual(item));
    target.appendChild(el('span', 'spell__russian', item.russian));
    prompt.append(label, target);

    // Строка собранных букв
    const answerRow = el('div', 'spell__answer');
    answerRow.setAttribute('aria-live', 'polite');

    // Плитки с буквами
    const tilesRow = el('div', 'spell__tiles');

    root.append(prompt, answerRow, tilesRow);

    let next = 0;
    let hadMistake = false;

    function placeTile(btn, letter) {
      btn.disabled = true;
      btn.classList.add('spell__tile--used');
      const placed = el('span', 'spell__placed', letter);
      answerRow.appendChild(placed);
    }

    function handleTile(btn, letter) {
      if (btn.disabled) return;

      if (letter === letters[next]) {
        // Правильная буква
        placeTile(btn, letter);
        next++;
        if (next === letters.length) {
          // Слово собрано
          if (!hadMistake) onAnswer(true);
          wordIndex++;
          setTimeout(showWord, FEEDBACK_DELAY);
        }
      } else {
        // Неправильная буква
        hadMistake = true;
        onAnswer(false);
        btn.classList.add('card--wrong');
        setTimeout(() => btn.classList.remove('card--wrong'), 500);
      }
    }

    for (const letter of tiles) {
      const btn = el('button', 'spell__tile', letter);
      btn.type = 'button';
      btn.setAttribute('aria-label', `Буква ${letter}`);
      btn.addEventListener('click', () => handleTile(btn, letter));
      tilesRow.appendChild(btn);
    }
  }

  showWord();
  return () => {
    stopped = true;
  };
}
