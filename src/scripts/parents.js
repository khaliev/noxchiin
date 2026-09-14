// ============================================================================
// parents.js — контроллер «Родительского уголка».
// ============================================================================
// Показывает сводку прогресса ребёнка и простые настройки:
//   - статистика (XP, уровень, темы, серия)
//   - включение уведомлений (только по явной кнопке)
//   - вкл/выкл звуковых эффектов
//   - сброс прогресса (двухшаговый, без пароля)
// ============================================================================

import { getAllTopics } from './lessons.js';
import { loadState, saveState, createDefaultState } from './storage.js';
import { levelFromXp, countLearnedItems } from './gamification.js';
import { isSfxEnabled, setSfxEnabled } from './sfx.js';
import { isSupported, permission, requestPermission, sendTestNotification } from './notifications.js';
import { updateHud } from './hud.js';
import { applyAgeMode } from './ageMode.js';
import { el } from './games/helpers.js';

/**
 * Монтирует родительский уголок.
 * @param {HTMLElement} container
 */
export function mountParents(container) {
  const storage = window.localStorage;
  let state = loadState(storage);
  applyAgeMode(state);
  updateHud(state);

  const topics = getAllTopics();
  const level = levelFromXp(state.player.xp);
  const learned = countLearnedItems(state, topics);

  // --- Сводка ---
  container.appendChild(panel('Общий прогресс', () => {
    const grid = el('div', 'stats-grid');
    grid.append(
      stat(`${state.player.xp}`, 'очков опыта'),
      stat(`${level.level}`, 'уровень'),
      stat(`${learned}`, 'слов выучено'),
      stat(`${state.stats.lessonsCompleted}`, 'уроков'),
      stat(`${state.streak.current}`, 'дней подряд'),
      stat(`${state.streak.best}`, 'лучшая серия'),
    );
    return grid;
  }));

  // --- Звёзды по темам ---
  container.appendChild(panel('Прогресс по темам', () => {
    const wrap = el('div');
    for (const topic of topics) {
      const progress = state.topics[topic.id];
      const stars = progress?.stars ?? 0;
      const row = el('div', 'topic-row');
      row.append(el('span', 'topic-row__name', `${topic.icon} ${topic.title.ru}`));
      const s = el('span', 'topic-row__stars', '★'.repeat(stars) + '☆'.repeat(3 - stars));
      s.setAttribute('aria-label', `${stars} из 3 звёзд`);
      row.appendChild(s);
      wrap.appendChild(row);
    }
    return wrap;
  }));

  // --- Настройки: уведомления ---
  container.appendChild(panel('Напоминания', () => {
    const wrap = el('div');
    const row = el('div', 'setting-row');
    row.append(el('span', 'setting-row__label', '🔔 Уведомления'));
    const btn = el('button', 'btn btn--secondary');
    wrap.append(row, el('p', 'setting-row__hint', 'Спрашиваем разрешение только когда ты сам(а) нажмёшь кнопку.'));

    const renderState = () => {
      if (!isSupported()) {
        btn.textContent = 'Не поддерживается';
        btn.disabled = true;
      } else if (permission() === 'granted') {
        btn.textContent = 'Отправить тест';
      } else if (permission() === 'denied') {
        btn.textContent = 'Запрещено в браузере';
        btn.disabled = true;
      } else {
        btn.textContent = 'Включить напоминания';
      }
    };
    renderState();

    btn.addEventListener('click', async () => {
      if (!isSupported()) return;
      if (permission() === 'granted') {
        await sendTestNotification();
        return;
      }
      const result = await requestPermission();
      if (result === 'granted') await sendTestNotification();
      renderState();
    });
    row.appendChild(btn);
    return wrap;
  }));

  // --- Настройки: звук ---
  container.appendChild(panel('Звук', () => {
    const wrap = el('div');
    const row = el('div', 'setting-row');
    row.append(el('span', 'setting-row__label', '🔊 Звуковые эффекты'));
    const btn = el('button', 'btn btn--secondary');
    const render = () => {
      btn.textContent = isSfxEnabled() ? 'Выключить' : 'Включить';
    };
    render();
    btn.addEventListener('click', () => {
      setSfxEnabled(!isSfxEnabled());
      render();
    });
    row.appendChild(btn);
    wrap.appendChild(row);
    return wrap;
  }));

  // --- Сброс прогресса ---
  container.appendChild(panel('Сбросить прогресс', () => {
    const wrap = el('div');
    const hint = el('p', 'setting-row__hint', 'Удалит весь прогресс на этом устройстве. Это действие необратимо.');
    const btn = el('button', 'btn btn--danger', 'Сбросить прогресс');
    let armed = false;
    let timer = null;

    btn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        btn.textContent = 'Точно сбросить? Нажми ещё раз';
        timer = setTimeout(() => {
          armed = false;
          btn.textContent = 'Сбросить прогресс';
        }, 3000);
        return;
      }
      clearTimeout(timer);
      state = createDefaultState();
      saveState(state, storage);
      updateHud(state);
      location.reload();
    });

    wrap.append(hint, btn);
    return wrap;
  }));
}

/** Создаёт панель с заголовком и содержимым. */
function panel(title, renderContent) {
  const box = el('div', 'panel');
  box.appendChild(el('h2', 'panel__title', title));
  box.appendChild(renderContent());
  return box;
}

/** Создаёт ячейку статистики. */
function stat(value, label) {
  const box = el('div', 'stat');
  box.append(el('div', 'stat__value', value), el('div', 'stat__label', label));
  return box;
}
