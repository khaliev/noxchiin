// ============================================================================
// sfx.js — короткие НЕГОЛОСОВЫЕ звуковые эффекты обратной связи.
// ============================================================================
// Воспроизводит «верно»/«неверно» (короткие WAV). Файлы лежат в
// public/audio/sfx/ и кэшируются Service Worker — работают офлайн.
// Можно отключить (например, из родительского уголка).
// ============================================================================

/** Ключ настройки «звуки вкл/выкл» (отдельно от игрового прогресса). */
const SFX_KEY = 'noxchiin-mott:sfx';

/** Пути к файлам эффектов. */
const SFX = {
  correct: '/audio/sfx/correct.wav',
  wrong: '/audio/sfx/wrong.wav',
};

/**
 * Включены ли звуковые эффекты.
 * @returns {boolean}
 */
export function isSfxEnabled() {
  try {
    return window.localStorage.getItem(SFX_KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * Включает/выключает звуковые эффекты.
 * @param {boolean} enabled
 */
export function setSfxEnabled(enabled) {
  try {
    window.localStorage.setItem(SFX_KEY, enabled ? 'on' : 'off');
  } catch {
    // Нет доступа к localStorage — просто игнорируем.
  }
}

/**
 * Проигрывает звуковой эффект (если включены).
 * @param {'correct' | 'wrong'} name — имя эффекта.
 */
export function playSfx(name) {
  if (!isSfxEnabled()) return;
  const src = SFX[name];
  if (!src) return;
  try {
    const audio = new Audio(src);
    // Не блокируем игровой процесс; если файл не загрузился — молча игнорируем.
    audio.play().catch(() => {});
  } catch {
    // Браузер может запретить autoplay — это некритично.
  }
}
