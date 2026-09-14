// ============================================================================
// lessonGame.js — контроллер урока (мини-игра «выбери правильный ответ по звуку»).
// ============================================================================
// Оркестрирует клиентскую часть урока: экран старта, вопросы, ответы,
// сердечки, итоговый результат. Работает с чистыми модулями (quiz, gamification,
// storage) и модулем AudioPlayer — сам не считает очки, а только управляет DOM.
// ============================================================================

import { getTopicItems } from './lessons.js';
import { buildSession, isCorrect } from './quiz.js';
import { AudioPlayer } from './audioPlayer.js';
import { loadState, saveState } from './storage.js';
import { applyLessonResult, loseHeart, applyHeartRestore } from './gamification.js';
import { updateHud } from './hud.js';

/** Сколько вопросов в одном уроке. */
const QUESTIONS_PER_LESSON = 6;
/** Сколько вариантов ответа показывать. */
const NUM_OPTIONS = 4;
/** Задержка перед переходом к следующему вопросу (мс). */
const FEEDBACK_DELAY = 900;

/**
 * Запускает урок в указанном контейнере.
 * @param {HTMLElement} container — DOM-элемент, куда монтируется игра.
 * @param {string} topicId — id темы (например 'alphabet').
 */
export function startLessonGame(container, topicId) {
  const player = new AudioPlayer();
  const items = getTopicItems(topicId);

  // Тема ещё не готова (нет карточек)
  if (items.length === 0) {
    renderComingSoon(container);
    return;
  }

  const storage = window.localStorage;
  // Восстанавливаем сердечки по таймеру сразу при входе.
  let state = applyHeartRestore(loadState(storage));

  renderStart(container, topicId, () => {
    // Ребёнок нажал «Начать» — это пользовательский жест, аудио разрешено.
    if (state.hearts.count <= 0) {
      renderNoHearts(container);
      return;
    }
    const session = buildSession(items, {
      questionCount: QUESTIONS_PER_LESSON,
      numOptions: NUM_OPTIONS,
    });
    runRound(container, session);
  });

  // --------------------------------------------------------------------------
  // Локальные функции
  // --------------------------------------------------------------------------

  /** Запускает раунд из набора вопросов. */
  function runRound(root, session) {
    let index = 0;
    let correct = 0;

    showQuestion();

    /** Показывает текущий вопрос. */
    function showQuestion() {
      updateHud(state);

      if (index >= session.length) {
        finish();
        return;
      }

      const question = session[index];
      const target = question.target;

      // --- Шапка раунда ---
      const top = el('div', 'game__top');
      const counter = el('span', 'game__progress', `Вопрос ${index + 1} из ${session.length}`);
      const hearts = el('span', 'game__hearts');
      hearts.textContent = '♥'.repeat(state.hearts.count) + '♡'.repeat(Math.max(0, state.hearts.max - state.hearts.count));
      hearts.setAttribute('aria-label', `${state.hearts.count} сердечек`);
      top.append(counter, hearts);

      // --- Блок озвучки ---
      const prompt = el('div', 'game__prompt');
      const label = el('p', 'game__prompt-label', 'Слушай и выбери букву');
      const speaker = el('button', 'btn btn--icon btn--primary game__speaker', '🔊');
      speaker.setAttribute('aria-label', 'Послушать ещё раз');
      const hint = el('p', 'game__hint', '');
      hint.hidden = true;
      prompt.append(label, speaker, hint);

      // --- Варианты ответа ---
      const options = el('div', 'game__options');
      options.setAttribute('role', 'group');
      options.setAttribute('aria-label', 'Варианты ответа');

      root.replaceChildren(top, prompt, options);

      // Проигрываем звук; если файла нет — показываем подсказку с транскрипцией.
      playPrompt(target, speaker, hint);

      speaker.addEventListener('click', () => playPrompt(target, speaker, hint));

      // Строим кнопки-варианты
      for (const item of question.options) {
        const btn = el('button', 'card card--choice');
        btn.type = 'button';
        btn.dataset.itemId = item.id;

        const char = el('span', 'choice__char', item.chechen);
        const tr = el('span', 'choice__transcription', item.transcription);
        btn.append(char, tr);

        btn.addEventListener('click', () => onAnswer(question, btn, item.id));
        options.appendChild(btn);
      }
    }

    /** Обрабатывает выбор ответа. */
    function onAnswer(question, clickedBtn, chosenId) {
      const buttons = [...container.querySelectorAll('.card--choice')];
      buttons.forEach((b) => (b.disabled = true));

      const right = isCorrect(question, chosenId);
      const correctBtn = buttons.find((b) => b.dataset.itemId === question.target.id);

      if (right) {
        clickedBtn.classList.add('card--correct');
        correct++;
      } else {
        clickedBtn.classList.add('card--wrong');
        correctBtn?.classList.add('card--correct');
        state = loseHeart(state);
        updateHud(state);
      }

      index++;

      // Сердечки кончились — урок заканчивается досрочно.
      if (state.hearts.count <= 0) {
        setTimeout(finish, FEEDBACK_DELAY);
      } else {
        setTimeout(showQuestion, FEEDBACK_DELAY);
      }
    }

    /** Завершает урок и показывает результат. */
    function finish() {
      const total = session.length;
      const result = applyLessonResult(state, { topicId, correct, total });
      state = result.state;
      saveState(state, storage);
      updateHud(state);
      renderResult(container, { correct, total, stars: result.stars, xp: result.xp }, topicId);
    }
  }

  /** Проигрывает звук вопроса; при ошибке показывает подсказку-транскрипцию. */
  function playPrompt(target, speakerEl, hintEl) {
    player
      .play(target.audio)
      .then(() => {
        hintEl.hidden = true;
      })
      .catch(() => {
        // Аудио ещё нет (плейсхолдер) — показываем понятную подсказку, а не тишину.
        hintEl.hidden = false;
        hintEl.textContent = `🔇 Звук скоро появится. Подсказка: «${target.transcription}»`;
        speakerEl.textContent = '🔇';
      });
  }
}

// ============================================================================
// Вспомогательные функции рендеринга
// ============================================================================

/** Создаёт DOM-элемент с классами и текстом (безопасно, через textContent). */
function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** Экран старта урока. */
function renderStart(container, topicId, onStart) {
  const wrap = el('div', 'game-screen game-screen--center');
  const title = el('h2', 'game-screen__title', 'Готов(а) учиться?');
  const sub = el('p', 'game-screen__sub', 'Слушай звук и выбирай правильную букву. За ошибку теряется сердечко!');
  const startBtn = el('button', 'btn btn--primary btn--large', '▶ Начать');
  startBtn.addEventListener('click', onStart);
  wrap.append(title, sub, startBtn);
  container.replaceChildren(wrap);
}

/** Экран «тема в разработке». */
function renderComingSoon(container) {
  const wrap = el('div', 'game-screen game-screen--center');
  wrap.append(
    el('h2', 'game-screen__title', '🚀 Эта тема скоро появится!'),
    el('p', 'game-screen__sub', 'Мы готовим новые уроки. Загляни позже!'),
    el('a', 'btn btn--primary', '← На главную'),
  );
  wrap.querySelector('a').href = '/';
  container.replaceChildren(wrap);
}

/** Экран «сердечки кончились». */
function renderNoHearts(container) {
  const wrap = el('div', 'game-screen game-screen--center');
  wrap.append(
    el('h2', 'game-screen__title', '💔 Сердечки кончились!'),
    el('p', 'game-screen__sub', 'Не беда — отдохни немного, и сердечки восстановятся. Возвращайся позже!'),
    el('a', 'btn btn--primary', '← На главную'),
  );
  wrap.querySelector('a').href = '/';
  container.replaceChildren(wrap);
}

/** Экран результата урока (звёзды + XP). */
function renderResult(container, { correct, total, stars, xp }, topicId) {
  const wrap = el('div', 'modal-backdrop');
  const modal = el('div', 'modal');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const title = el('h2', 'modal__title', stars > 0 ? 'Отлично!' : 'Хорошая попытка!');
  const body = el('div', 'modal__body');

  const starsRow = el('div', 'stars stars--result');
  for (let i = 0; i < 3; i++) {
    const s = el('span', `star ${i < stars ? 'star--earned star--pop' : ''}`, '★');
    s.style.animationDelay = `${i * 150}ms`;
    starsRow.appendChild(s);
  }
  starsRow.setAttribute('aria-label', `${stars} из 3 звёзд`);

  const score = el('p', 'modal__score', `Правильных ответов: ${correct} из ${total}`);
  const xpText = el('p', 'modal__xp', `+${xp} XP`);

  body.append(starsRow, score, xpText);

  const actions = el('div', 'modal__actions');
  const again = el('a', 'btn btn--secondary', '🔁 Ещё раз');
  again.href = `/lesson/${topicId}/`;
  const home = el('a', 'btn btn--primary', '🏠 На главную');
  home.href = '/';
  actions.append(again, home);

  modal.append(title, body, actions);
  wrap.appendChild(modal);
  container.replaceChildren(wrap);
}
