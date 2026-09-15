// ============================================================================
// lessonGame.js — диспетчер урока: выбор мини-игры и общий результат.
// ============================================================================
// Отвечает за «обвязку» вокруг каждой мини-игры:
//   - экран старта с выбором типа игры
//   - сердечки (жизни) и подсчёт правильных ответов
//   - маскот-волчонок с реакцией на ответы
//   - итоговый результат (звёзды + XP) и сохранение прогресса
// Сами мини-игры лежат в папке games/ и не знают про сердечки/звёзды.
// ============================================================================

import { getTopic, getTopicItems, filterItemsByAge } from './lessons.js';
import { loadState, saveState } from './storage.js';
import { applyLessonResult, loseHeart, applyHeartRestore } from './gamification.js';
import { updateHud } from './hud.js';
import { applyAgeMode } from './ageMode.js';
import { updateStreak } from './streak.js';
import { playSfx } from './sfx.js';
import { el } from './games/helpers.js';
import * as listenChoose from './games/listenChoose.js';
import * as matchPairs from './games/matchPairs.js';
import * as spellWord from './games/spellWord.js';
import * as speedQuiz from './games/speedQuiz.js';

/** Реестр доступных мини-игр. */
const GAMES = {
  listen: { title: 'Слушай и выбирай', emoji: '🎧', module: listenChoose, rounds: 6 },
  match: { title: 'Найди пары', emoji: '🔗', module: matchPairs, rounds: 4 },
  spell: { title: 'Собери слово', emoji: '🧩', module: spellWord, rounds: 4 },
  speed: { title: 'На скорость', emoji: '⏱️', module: speedQuiz, rounds: 6 },
};

// Фразы маскота для обратной связи
const HAPPY = ['Молодец! 🎉', 'Отлично! ⭐', 'Точно! 💪', 'Супер! 🐾'];
const SAD = ['Попробуй ещё! 💚', 'Не сдавайся!', 'Почти! 🌟'];

/**
 * Запускает урок в указанном контейнере.
 * @param {HTMLElement} container — DOM-элемент, куда монтируется игра.
 * @param {string} topicId — id темы (например 'alphabet').
 */
export function startLessonGame(container, topicId) {
  const topic = getTopic(topicId);
  if (!topic) {
    renderComingSoon(container);
    return;
  }

  const storage = window.localStorage;
  let state = applyHeartRestore(loadState(storage));
  const ageGroup = applyAgeMode(state);

  const items = filterItemsByAge(getTopicItems(topicId), ageGroup);
  if (items.length === 0) {
    renderComingSoon(container);
    return;
  }

  const availableGames = topic.games?.length ? topic.games : ['listen'];

  renderStart(container, topic, availableGames, (gameId) => begin(gameId));

  /** Начинает выбранную мини-игру. */
  function begin(gameId) {
    const game = GAMES[gameId];
    if (!game) return;

    if (state.hearts.count <= 0) {
      renderNoHearts(container);
      return;
    }

    const root = el('div', 'game');
    const mascot = renderMascot();
    const gameArea = el('div', 'game__area');
    root.append(mascot.wrap, gameArea);
    container.replaceChildren(root);

    let correct = 0;
    let total = 0;
    let finished = false;

    const stop = game.module.start(gameArea, items, {
      rounds: game.rounds,
      hearts: state.hearts,
      distractorCount: ageGroup === '9+' ? 2 : 0,
      timeLimit: ageGroup === '9+' ? 6000 : 10000,
      onAnswer: (isRight) => {
        if (finished) return;
        total++;
        if (isRight) {
          correct++;
          mascotSay(mascot, pick(HAPPY), 'happy');
          playSfx('correct');
        } else {
          state = loseHeart(state);
          updateHud(state);
          mascotSay(mascot, pick(SAD), 'sad');
          playSfx('wrong');
          if (state.hearts.count <= 0) {
            finished = true;
            stop();
            finishLesson(correct, total);
          }
        }
      },
      onDone: () => {
        if (finished) return;
        finished = true;
        finishLesson(correct, total);
      },
    });

    function finishLesson(c, t) {
      const result = applyLessonResult(state, { topicId, correct: c, total: t });
      state = result.state;
      // Занятие сегодня — обновляем ежедневную серию.
      state = updateStreak(state);
      saveState(state, storage);
      updateHud(state);
      renderResult(container, { correct: c, total: t, stars: result.stars, xp: result.xp, streak: state.streak.current }, topicId);
    }
  }
}

// ============================================================================
// Маскот-волчонок
// ============================================================================

/** Создаёт элемент маскота (волчонок + облачко с репликой). */
function renderMascot() {
  const wrap = el('div', 'mascot');
  const bubble = el('div', 'mascot__bubble', '');
  bubble.hidden = true;
  const wolf = el('div', 'mascot__wolf', '🐺');
  wolf.setAttribute('aria-hidden', 'true');
  wrap.append(bubble, wolf);
  return { wrap, bubble, wolf };
}

/** Показывает реплику маскота с анимацией. */
function mascotSay(mascot, text, kind) {
  mascot.bubble.textContent = text;
  mascot.bubble.hidden = false;
  const wolf = mascot.wolf;
  wolf.classList.remove('mascot--bounce', 'mascot--shake', 'mascot--happy', 'mascot--sad');
  void wolf.offsetWidth; // перезапуск CSS-анимации
  wolf.classList.add(kind === 'happy' ? 'mascot--happy mascot--bounce' : 'mascot--sad mascot--shake');
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// ============================================================================
// Экраны (старт / результат / заглушки)
// ============================================================================

/** Экран старта с выбором типа игры. */
function renderStart(container, topic, availableGames, onPick) {
  const wrap = el('div', 'game-screen game-screen--center');
  wrap.appendChild(el('h2', 'game-screen__title', topic.title.ru));
  wrap.appendChild(el('p', 'game-screen__sub', 'Выбери игру. За ошибку теряется сердечко!'));

  const list = el('div', 'game-picker');
  for (const gameId of availableGames) {
    const game = GAMES[gameId];
    if (!game) continue;
    const btn = el('button', 'btn btn--secondary btn--large game-picker__btn');
    // Безопасная сборка кнопки DOM-узлами (без innerHTML).
    const icon = el('span', '', game.emoji);
    icon.setAttribute('aria-hidden', 'true');
    btn.append(icon, document.createTextNode(` ${game.title}`));
    btn.addEventListener('click', () => onPick(gameId));
    list.appendChild(btn);
  }
  wrap.appendChild(list);
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

/** Экран результата урока (звёзды + XP + серия). */
function renderResult(container, { correct, total, stars, xp, streak = 0 }, topicId) {
  const wrap = el('div', 'modal-backdrop');
  const modal = el('div', 'modal');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.tabIndex = -1;

  modal.appendChild(el('h2', 'modal__title', stars > 0 ? 'Отлично!' : 'Хорошая попытка!'));

  const body = el('div', 'modal__body');
  const starsRow = el('div', 'stars stars--result');
  for (let i = 0; i < 3; i++) {
    const s = el('span', `star ${i < stars ? 'star--earned star--pop' : ''}`, '★');
    s.style.animationDelay = `${i * 150}ms`;
    starsRow.appendChild(s);
  }
  starsRow.setAttribute('aria-label', `${stars} из 3 звёзд`);
  body.append(
    starsRow,
    el('p', 'modal__score', `Правильных ответов: ${correct} из ${total}`),
    el('p', 'modal__xp', `+${xp} XP`),
  );

  if (streak > 0) {
    body.appendChild(el('p', 'modal__streak', `🔥 Серия: ${streak} дн.`));
  }

  const actions = el('div', 'modal__actions');
  const again = el('a', 'btn btn--secondary', '🔁 Ещё раз');
  again.href = `/lesson/${topicId}/`;
  const home = el('a', 'btn btn--primary', '🏠 На главную');
  home.href = '/';
  actions.append(again, home);

  modal.append(body, actions);
  wrap.appendChild(modal);
  container.replaceChildren(wrap);
  // Переводим фокус на модалку — важно для доступности (скринридеры).
  modal.focus();
}
