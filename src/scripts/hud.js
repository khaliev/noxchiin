// ============================================================================
// hud.js — обновляет панель игрока в шапке (сердечки и XP).
// ============================================================================
// Шапка рендерится на сервере пустой, а заполняется на клиенте, потому что
// прогресс лежит в localStorage (его не видно при сборке сайта).
// ============================================================================

import { levelFromXp } from './gamification.js';

/**
 * Обновляет HUD (сердечки и очки опыта) в шапке страницы.
 * @param {object} state — состояние игрока (из loadState).
 */
export function updateHud(state) {
  const heartsEl = document.getElementById('hud-hearts');
  const xpEl = document.getElementById('hud-xp');

  if (heartsEl) {
    const { count, max } = state.hearts;
    const filled = '♥'.repeat(count);
    const empty = '♡'.repeat(Math.max(0, max - count));
    // Отрисовка через текст — безопасно (без innerHTML с пользовательскими данными).
    heartsEl.innerHTML = `<span class="heart">${filled}</span><span class="heart heart--empty">${empty}</span>`;
    heartsEl.setAttribute('aria-label', `${count} из ${max} сердечек`);
  }

  if (xpEl) {
    const { level } = levelFromXp(state.player.xp);
    xpEl.textContent = `⭐ ${state.player.xp} XP · Ур. ${level}`;
    xpEl.setAttribute('aria-label', `Уровень ${level}, ${state.player.xp} очков опыта`);
  }
}
