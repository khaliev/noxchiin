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
    // Строим сердечки DOM-узлами (не innerHTML) — так безопаснее от XSS.
    heartsEl.replaceChildren();
    const filled = document.createElement('span');
    filled.className = 'heart';
    filled.textContent = '♥'.repeat(count);
    const empty = document.createElement('span');
    empty.className = 'heart heart--empty';
    empty.textContent = '♡'.repeat(Math.max(0, max - count));
    heartsEl.append(filled, empty);
    heartsEl.setAttribute('aria-label', `${count} из ${max} сердечек`);
  }

  if (xpEl) {
    const { level } = levelFromXp(state.player.xp);
    xpEl.textContent = `⭐ ${state.player.xp} XP · Ур. ${level}`;
    xpEl.setAttribute('aria-label', `Уровень ${level}, ${state.player.xp} очков опыта`);
  }
}
