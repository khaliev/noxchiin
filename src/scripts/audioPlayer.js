// ============================================================================
// audioPlayer.js — универсальный проигрыватель звука с обработкой ошибок.
// ============================================================================
// Единственный модуль, который управляет воспроизведением аудио (буквы/слова).
// Используем простой <audio> — для голоса этого достаточно, Web Audio API
// не нужен.
//
// Ключевое требование (раздел 3): если аудиофайла нет (плейсхолдер на Этапе 1-2)
// или он не загрузился — показываем ПОНЯТНУЮ подсказку, а не «тишину».
// ============================================================================

/**
 * Ошибка воспроизведения аудио. Содержит исходный путь для диагностики.
 */
export class AudioPlayError extends Error {
  constructor(message, src) {
    super(message);
    this.name = 'AudioPlayError';
    this.src = src;
  }
}

/**
 * Универсальный проигрыватель. Один экземпляр на всё приложение
 * (несколько параллельных звуков не нужны и только путают ребёнка).
 */
export class AudioPlayer {
  constructor() {
    /** @type {HTMLAudioElement | null} */
    this.audio = null;
  }

  /**
   * Проигрывает один или несколько источников (по порядку, с fallback).
   * @param {string | string[]} sources — путь(и) к аудиофайлу.
   * @returns {Promise<void>} Разрешается, когда звук доиграл; отклоняется при ошибке.
   */
  async play(sources) {
    this.stop();

    const list = Array.isArray(sources) ? sources : [sources];
    let lastError = null;

    for (const src of list) {
      try {
        await this.#playSingle(src);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new AudioPlayError('Нечего воспроизводить', String(sources));
  }

  /**
   * Внутренний метод: проигрывает ОДИН источник через <audio>.
   * @param {string} src — путь к файлу.
   * @returns {Promise<void>}
   */
  #playSingle(src) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(src);
      this.audio = audio;

      let settled = false;
      const cleanup = () => {
        audio.onended = null;
        audio.onerror = null;
        if (this.audio === audio) this.audio = null;
      };

      audio.onended = () => {
        settled = true;
        cleanup();
        resolve();
      };

      audio.onerror = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new AudioPlayError('Не удалось загрузить аудиофайл', src));
      };

      // Возвращаем Promise, который можно «поймать». Сам старт — best effort.
      audio.play().catch((error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new AudioPlayError(`Воспроизведение прервано: ${error?.message ?? error}`, src));
      });
    });
  }

  /**
   * Останавливает текущее воспроизведение (если идёт).
   */
  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
  }
}
