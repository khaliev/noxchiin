// ============================================================================
// topicMap.js — оживляет карту тем на главном экране.
// ============================================================================
// На сервере карточки тем отрисованы статически (для SEO и работы без JS).
// Здесь мы читаем прогресс из localStorage и добавляем состояние:
//   - разблокирована тема или закрыта замком
//   - сколько звёзд заработано
//   - клик по закрытой теме показывает подсказку
// ============================================================================

import { getAllTopics, getPreviousTopic } from './lessons.js';
import { loadState } from './storage.js';
import { updateHud } from './hud.js';
import { applyAgeMode, setAgeMode } from './ageMode.js';

/** Показывает временную подсказку внизу экрана. */
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('toast--visible');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('toast--visible'), 2200);
}

/**
 * Проверяет, разблокирована ли тема по сохранённому прогрессу.
 * @param {object} topic — тема.
 * @param {object} state — состояние игрока.
 * @returns {boolean} true, если тему можно открыть.
 */
function isUnlocked(topic, state) {
  if (topic.comingSoon) return false;
  const prev = getPreviousTopic(topic.id);
  // Первая тема открыта сразу; остальные — после завершения предыдущей.
  if (!prev) return true;
  return Boolean(state.topics[prev.id]?.completed);
}

/** Заполняет звёзды карточки темы по прогрессу. */
function renderStars(card, topic, state) {
  const starsEl = card.querySelector('[data-stars]');
  if (!starsEl) return;
  const earned = state.topics[topic.id]?.stars ?? 0;
  // Строим звёзды DOM-узлами (без innerHTML) — безопасно.
  starsEl.replaceChildren();
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.className = `star ${i < earned ? 'star--earned' : ''}`;
    star.textContent = '★';
    starsEl.appendChild(star);
  }
  starsEl.setAttribute('aria-label', `${earned} из 3 звёзд`);
}

/** Инициализирует карту тем на странице. */
export function mountTopicMap() {
  const state = loadState(window.localStorage);
  updateHud(state);
  applyAgeMode(state);
  mountAgeToggle(state);

  const topics = getAllTopics();
  const cards = document.querySelectorAll('[data-topic-id]');

  cards.forEach((card) => {
    const topic = topics.find((t) => t.id === card.dataset.topicId);
    if (!topic) return;

    const unlocked = isUnlocked(topic, state);
    renderStars(card, topic, state);

    if (unlocked) {
      card.classList.add('topic-card--unlocked');
    } else {
      card.classList.add('topic-card--locked');
    }

    // Клик по карточке
    card.addEventListener('click', (event) => {
      if (unlocked) return; // переход по ссылке <a> внутри сработает сам
      event.preventDefault();
      if (topic.comingSoon) {
        showToast('Эта тема скоро появится! 🚀');
      } else {
        const prev = getPreviousTopic(topic.id);
        const prevTitle = prev ? prev.title.ru : '';
        showToast(`Сначала пройди тему «${prevTitle}» 🔒`);
      }
    });
  });
}

/** Подключает переключатель возраста (5–8 / 9+). */
function mountAgeToggle(state) {
  const buttons = document.querySelectorAll('[data-age]');
  if (buttons.length === 0) return;

  const storage = window.localStorage;
  const reflect = () => {
    buttons.forEach((btn) => {
      const active = btn.dataset.age === state.player.ageGroup;
      btn.classList.toggle('age-toggle__btn--active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  };

  reflect();
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setAgeMode(state, storage, btn.dataset.age);
      reflect();
    });
  });
}
