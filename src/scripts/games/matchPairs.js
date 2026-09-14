// ============================================================================
// games/matchPairs.js — мини-игра «сопоставь картинку и слово».
// ============================================================================
// На экране перепутанные карточки: картинки (эмодзи/цвет) и слова.
// Ребёнок находит пару «картинка ↔ слово».
// ============================================================================

import { shuffle } from '../quiz.js';
import { el, itemVisual, renderTopBar, FEEDBACK_DELAY } from './helpers.js';

/**
 * Запускает игру. Возвращает функцию остановки.
 * @param {HTMLElement} root — контейнер игры.
 * @param {Array} items — карточки темы.
 * @param {object} handlers — { onAnswer(bool), onDone(), hearts, pairs, rng }.
 * @returns {() => void}
 */
export function start(root, items, handlers) {
  const { onAnswer, onDone, hearts, pairs = 4, rng = Math.random } = handlers;

  const chosen = shuffle(items, rng).slice(0, Math.min(pairs, items.length));

  // Две карточки на каждое слово: «картинка» и «слово».
  const cards = [];
  for (const item of chosen) {
    cards.push({ id: item.id, item, kind: 'visual', matched: false });
    cards.push({ id: item.id, item, kind: 'word', matched: false });
  }
  shuffle(cards, rng);

  let selected = null;
  let remainingPairs = chosen.length;
  let locked = false;

  function render() {
    root.replaceChildren();
    renderTopBar(root, `Найди пары · осталось ${remainingPairs}`, hearts);

    const grid = el('div', 'game__options game__options--match');
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Карточки для сопоставления');

    for (const card of cards) {
      const btn = el('button', 'card card--choice card--match');
      btn.type = 'button';
      btn.dataset.cardId = card.id;
      btn.dataset.kind = card.kind;

      if (card.kind === 'visual') btn.appendChild(itemVisual(card.item));
      else btn.appendChild(el('span', 'choice__char', card.item.chechen));

      if (card.matched) btn.classList.add('card--correct');
      btn.addEventListener('click', () => onClick(btn, card));
      grid.appendChild(btn);
    }
    root.appendChild(grid);
  }

  function onClick(btn, card) {
    if (locked || card.matched) return;

    // Первая выбранная карточка
    if (!selected) {
      selected = { btn, card };
      btn.classList.add('card--selected');
      return;
    }

    // Повторный клик по той же карточке — снимаем выбор
    if (selected.card === card) {
      selected.btn.classList.remove('card--selected');
      selected = null;
      return;
    }

    const first = selected;
    selected = null;
    locked = true;

    const isMatch = first.card.id === card.id && first.card.kind !== card.kind;

    if (isMatch) {
      first.card.matched = card.matched = true;
      first.btn.classList.remove('card--selected');
      first.btn.classList.add('card--correct');
      btn.classList.add('card--correct');
      onAnswer(true);
      remainingPairs--;

      setTimeout(() => {
        locked = false;
        if (remainingPairs <= 0) onDone();
        else render();
      }, FEEDBACK_DELAY);
    } else {
      first.btn.classList.remove('card--selected');
      first.btn.classList.add('card--wrong');
      btn.classList.add('card--wrong');
      onAnswer(false);

      setTimeout(() => {
        first.btn.classList.remove('card--wrong');
        btn.classList.remove('card--wrong');
        locked = false;
        render();
      }, FEEDBACK_DELAY);
    }
  }

  render();
  return () => {
    locked = true;
  };
}
