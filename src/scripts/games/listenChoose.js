// ============================================================================
// games/listenChoose.js — мини-игра «выбери правильный вариант по звуку».
// ============================================================================
// Слышим звук (буква/слово/цифра) и выбираем правильную карточку из вариантов.
// ============================================================================

import { AudioPlayer } from '../audioPlayer.js';
import { buildSession, isCorrect } from '../quiz.js';
import { el, choiceCard, renderTopBar, FEEDBACK_DELAY } from './helpers.js';

/**
 * Запускает игру. Возвращает функцию остановки (для досрочного завершения).
 * @param {HTMLElement} root — контейнер игры.
 * @param {Array} items — карточки темы.
 * @param {object} handlers — { onAnswer(bool), onDone(), hearts, rounds, rng }.
 * @returns {() => void} Функция остановки.
 */
export function start(root, items, handlers) {
  const { onAnswer, onDone, hearts, rounds = 6, rng = Math.random } = handlers;
  const player = new AudioPlayer();
  const session = buildSession(items, { questionCount: rounds, numOptions: 4, rng });
  let index = 0;
  let stopped = false;

  function show() {
    if (stopped) return;
    if (index >= session.length) {
      onDone();
      return;
    }
    const question = session[index];
    const target = question.target;

    root.replaceChildren();
    renderTopBar(root, `Вопрос ${index + 1} из ${session.length}`, hearts);

    const prompt = el('div', 'game__prompt');
    const label = el('p', 'game__prompt-label', 'Слушай и выбери правильный ответ');
    const speaker = el('button', 'btn btn--icon btn--primary game__speaker', '🔊');
    speaker.setAttribute('aria-label', 'Послушать ещё раз');
    const hint = el('p', 'game__hint', '');
    hint.hidden = true;
    prompt.append(label, speaker, hint);

    const options = el('div', 'game__options');
    options.setAttribute('role', 'group');
    options.setAttribute('aria-label', 'Варианты ответа');

    root.append(prompt, options);

    playPrompt(target, speaker, hint);
    speaker.addEventListener('click', () => playPrompt(target, speaker, hint));

    for (const item of question.options) {
      const btn = choiceCard(item);
      btn.addEventListener('click', () => answer(question, btn, item.id));
      options.appendChild(btn);
    }
  }

  function playPrompt(target, speakerEl, hintEl) {
    player
      .play(target.audio)
      .then(() => { hintEl.hidden = true; })
      .catch(() => {
        hintEl.hidden = false;
        hintEl.textContent = `🔇 Звук скоро появится. Подсказка: «${target.transcription}»`;
        speakerEl.textContent = '🔇';
      });
  }

  function answer(question, clickedBtn, chosenId) {
    if (stopped) return;
    const buttons = [...root.querySelectorAll('.card--choice')];
    buttons.forEach((b) => (b.disabled = true));

    const right = isCorrect(question, chosenId);
    const correctBtn = buttons.find((b) => b.dataset.itemId === question.target.id);

    if (right) clickedBtn.classList.add('card--correct');
    else {
      clickedBtn.classList.add('card--wrong');
      correctBtn?.classList.add('card--correct');
    }

    onAnswer(right);
    index++;
    setTimeout(show, FEEDBACK_DELAY);
  }

  show();
  return () => {
    stopped = true;
    player.stop();
  };
}
