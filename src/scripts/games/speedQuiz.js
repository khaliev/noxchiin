// ============================================================================
// games/speedQuiz.js — викторина на скорость (с таймером).
// ============================================================================
// Как «выбери по звуку», но у каждого вопроса есть ограниченное время.
// Не успел ответить — засчитывается как ошибка.
// ============================================================================

import { AudioPlayer } from '../audioPlayer.js';
import { buildSession, isCorrect } from '../quiz.js';
import { el, choiceCard, renderTopBar, FEEDBACK_DELAY } from './helpers.js';

/**
 * Запускает игру. Возвращает функцию остановки.
 * @param {HTMLElement} root — контейнер игры.
 * @param {Array} items — карточки темы.
 * @param {object} handlers — { onAnswer(bool), onDone(), hearts, rounds, rng, timeLimit }.
 * @returns {() => void}
 */
export function start(root, items, handlers) {
  const { onAnswer, onDone, hearts, rounds = 6, rng = Math.random, timeLimit = 8000 } = handlers;
  const player = new AudioPlayer();
  const session = buildSession(items, { questionCount: rounds, numOptions: 4, rng });
  let index = 0;
  let stopped = false;
  let timerId = null;

  function clearTimer() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function show() {
    if (stopped) return;
    clearTimer();

    if (index >= session.length) {
      onDone();
      return;
    }

    const question = session[index];
    const target = question.target;

    root.replaceChildren();
    renderTopBar(root, `Вопрос ${index + 1} из ${session.length}`, hearts);

    // Полоска времени
    const timer = el('div', 'timer');
    const timerFill = el('div', 'timer__fill');
    timer.appendChild(timerFill);
    root.appendChild(timer);

    const prompt = el('div', 'game__prompt');
    const label = el('p', 'game__prompt-label', 'Слушай и отвечай быстрее!');
    const speaker = el('button', 'btn btn--icon btn--primary game__speaker', '🔊');
    speaker.setAttribute('aria-label', 'Послушать ещё раз');
    prompt.append(label, speaker);

    const options = el('div', 'game__options');
    options.setAttribute('role', 'group');
    options.setAttribute('aria-label', 'Варианты ответа');

    root.append(prompt, options);

    playPrompt(target, speaker);
    speaker.addEventListener('click', () => playPrompt(target, speaker));

    for (const item of question.options) {
      const btn = choiceCard(item);
      btn.addEventListener('click', () => answer(question, btn, item.id));
      options.appendChild(btn);
    }

    // Запускаем таймер
    requestAnimationFrame(() => {
      timerFill.style.transitionDuration = `${timeLimit}ms`;
      timerFill.style.width = '0%';
    });
    timerId = setTimeout(() => timeout(question), timeLimit);
  }

  function playPrompt(target, speakerEl) {
    player.play(target.audio).catch(() => {
      speakerEl.textContent = '🔇';
    });
  }

  function answer(question, clickedBtn, chosenId) {
    if (stopped) return;
    clearTimer();

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

  function timeout(question) {
    if (stopped) return;
    // Не успели — показываем правильный ответ и засчитываем ошибку.
    const buttons = [...root.querySelectorAll('.card--choice')];
    buttons.forEach((b) => (b.disabled = true));
    const correctBtn = buttons.find((b) => b.dataset.itemId === question.target.id);
    correctBtn?.classList.add('card--correct');

    onAnswer(false);
    index++;
    setTimeout(show, FEEDBACK_DELAY);
  }

  show();
  return () => {
    stopped = true;
    clearTimer();
    player.stop();
  };
}
