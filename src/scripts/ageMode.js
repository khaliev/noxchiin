// ============================================================================
// ageMode.js — переключение возрастного режима (5–8 лет / 9+).
// ============================================================================
// Меняет класс на <body>, от которого зависит размер шрифтов и кнопок
// (для малышей всё крупнее), и сохраняет выбор в профиле игрока.
// ============================================================================

import { saveState } from './storage.js';

/**
 * Применяет возрастной режим: ставит класс на <html> (от него зависит размер
 * шрифтов и кнопок через rem) и возвращает группу.
 * @param {object} state — состояние игрока.
 * @returns {'5-8' | '9+'} Текущая возрастная группа.
 */
export function applyAgeMode(state) {
  const age = state.player.ageGroup === '9+' ? '9+' : '5-8';
  const root = document.documentElement;
  root.classList.remove('mode--kids', 'mode--older');
  root.classList.add(age === '9+' ? 'mode--older' : 'mode--kids');
  return age;
}

/**
 * Устанавливает возрастной режим, сохраняет и применяет.
 * @param {object} state — состояние игрока (будет изменено).
 * @param {Storage} storage — localStorage.
 * @param {'5-8' | '9+'} age — новая группа.
 */
export function setAgeMode(state, storage, age) {
  state.player.ageGroup = age === '9+' ? '9+' : '5-8';
  saveState(state, storage);
  applyAgeMode(state);
}
