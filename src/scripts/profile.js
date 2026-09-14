// ============================================================================
// profile.js — контроллер страницы профиля.
// ============================================================================
// Читает прогресс из localStorage и рисует: аватар, имя, уровень/XP,
// статистику и календарь ежедневной серии.
// ============================================================================

import { getAllTopics } from './lessons.js';
import { loadState, saveState } from './storage.js';
import { levelFromXp, countLearnedItems } from './gamification.js';
import { getCalendarDays } from './streak.js';
import { sanitizeName, isValidName, MAX_NAME_LENGTH } from './sanitize.js';
import { updateHud } from './hud.js';
import { applyAgeMode } from './ageMode.js';
import { el } from './games/helpers.js';

/** Доступные аватары (эмодзи). */
const AVATARS = ['🐺', '🦊', '🐻', '🐱', '🦁', '🐼', '🐦', '🐢'];

/**
 * Превращает сохранённый аватар в эмодзи (обратная совместимость с 'wolf').
 * @param {string} avatar
 * @returns {string}
 */
function avatarEmoji(avatar) {
  return AVATARS.includes(avatar) ? avatar : '🐺';
}

/**
 * Монтирует профиль в контейнер.
 * @param {HTMLElement} container
 */
export function mountProfile(container) {
  const storage = window.localStorage;
  let state = loadState(storage);
  applyAgeMode(state);
  updateHud(state);

  const topics = getAllTopics();
  const level = levelFromXp(state.player.xp);
  const learned = countLearnedItems(state, topics);

  // --- Карточка игрока ---
  const card = el('div', 'profile-card');
  const avatar = el('span', 'profile-card__avatar', avatarEmoji(state.player.avatar));
  avatar.setAttribute('aria-hidden', 'true');
  const name = el('div', 'profile-card__name', state.player.name || 'Игрок');
  const levelLine = el('div', 'profile-card__level', `Уровень ${level.level} · ${state.player.xp} XP`);
  card.append(avatar, name, levelLine);

  // --- Выбор аватара ---
  const pickerLabel = el('p', 'profile-card__level', 'Выбери аватар');
  const picker = el('div', 'avatar-picker');
  for (const a of AVATARS) {
    const btn = el('button', 'avatar-picker__btn', a);
    btn.type = 'button';
    btn.setAttribute('aria-label', `Аватар ${a}`);
    btn.setAttribute('aria-pressed', String(avatarEmoji(state.player.avatar) === a));
    if (avatarEmoji(state.player.avatar) === a) btn.classList.add('avatar-picker__btn--active');
    btn.addEventListener('click', () => {
      state.player.avatar = a;
      saveState(state, storage);
      avatar.textContent = a;
      picker.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('avatar-picker__btn--active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
    });
    picker.appendChild(btn);
  }

  // --- Ввод имени ---
  const nameForm = el('form', 'name-form');
  const input = el('input', 'name-form__input');
  input.type = 'text';
  input.maxLength = MAX_NAME_LENGTH;
  input.placeholder = 'Твоё имя';
  input.value = state.player.name;
  input.setAttribute('aria-label', 'Имя игрока');
  const saveBtn = el('button', 'btn btn--primary', 'Сохранить');
  saveBtn.type = 'submit';
  nameForm.append(input, saveBtn);
  nameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    // Санитизация ввода перед сохранением (защита от XSS).
    const cleaned = sanitizeName(input.value);
    if (!isValidName(cleaned)) return;
    state.player.name = cleaned;
    saveState(state, storage);
    name.textContent = cleaned;
    input.value = cleaned;
  });

  card.append(pickerLabel, picker, nameForm);
  container.appendChild(card);

  // --- Статистика ---
  const stats = el('div', 'stats-grid');
  stats.appendChild(stat(`${learned}`, 'слов выучено'));
  stats.appendChild(stat(`${state.stats.lessonsCompleted}`, 'уроков пройдено'));
  stats.appendChild(stat(`${state.streak.current}`, 'дней подряд'));
  stats.appendChild(stat(`${state.streak.best}`, 'лучшая серия'));
  container.appendChild(stats);

  // --- Календарь серии ---
  container.appendChild(renderCalendar(state));
}

/** Создаёт блок со статистикой. */
function stat(value, label) {
  const box = el('div', 'stat');
  box.append(el('div', 'stat__value', value), el('div', 'stat__label', label));
  return box;
}

/** Создаёт календарь ежедневной серии. */
function renderCalendar(state) {
  const wrap = el('div', 'calendar');
  wrap.appendChild(el('div', 'calendar__title', '🔥 Твоя серия'));
  const row = el('div', 'calendar__row');
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', `Серия ${state.streak.current} дней`);

  for (const day of getCalendarDays(state, new Date(), 14)) {
    const cell = el('div', `calendar__day ${day.played ? 'calendar__day--played' : ''} ${day.isToday ? 'calendar__day--today' : ''}`, day.key.slice(8));
    cell.title = day.key;
    cell.setAttribute('aria-hidden', 'true');
    row.appendChild(cell);
  }
  wrap.appendChild(row);
  return wrap;
}
