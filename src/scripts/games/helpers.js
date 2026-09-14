// ============================================================================
// games/helpers.js — общие утилиты для всех мини-игр.
// ============================================================================
// Маленькие DOM-хелперы и константы, чтобы не дублировать код в каждой игре.
// ============================================================================

/** Задержка показа обратной связи перед переходом дальше (мс). */
export const FEEDBACK_DELAY = 900;

/**
 * Создаёт DOM-элемент с классами и текстом (безопасно — через textContent).
 * @param {string} tag — тег элемента.
 * @param {string} [className] — строка классов.
 * @param {string} [text] — текстовое содержимое.
 * @returns {HTMLElement}
 */
export function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * Возвращает HTML-строку с заполненными/пустыми сердечками.
 * Строка строится из констант (без пользовательских данных) — это безопасно.
 * @param {{count:number, max:number}} hearts — блок сердечек состояния.
 * @returns {string}
 */
export function heartsHtml(hearts) {
  const filled = '♥'.repeat(hearts.count);
  const empty = '♡'.repeat(Math.max(0, hearts.max - hearts.count));
  return filled + empty;
}

/**
 * Рисует верхнюю строку игры (счётчик + сердечки).
 * @param {HTMLElement} root — куда вставить.
 * @param {string} label — текст счётчика (например «Вопрос 2 из 6»).
 * @param {{count:number, max:number}} hearts — состояние сердечек.
 * @returns {HTMLElement} Созданная строка.
 */
export function renderTopBar(root, label, hearts) {
  const top = el('div', 'game__top');
  const counter = el('span', 'game__progress', label);
  const heartsEl = el('span', 'game__hearts', heartsHtml(hearts));
  heartsEl.setAttribute('aria-label', `${hearts.count} сердечек`);
  top.append(counter, heartsEl);
  root.appendChild(top);
  return top;
}

/**
 * Создаёт карточку-вариант ответа (для игр «выбери правильный»).
 * @param {object} item — карточка (буква/слово/цифра/цвет).
 * @param {{ showHint?: boolean }} [opts] — показывать ли транскрипцию/перевод.
 * @returns {HTMLButtonElement}
 */
export function choiceCard(item, { showHint = true } = {}) {
  const btn = el('button', 'card card--choice');
  btn.type = 'button';
  btn.dataset.itemId = item.id;

  // Главная строка: для цифр показываем крупно цифру, для цветов — кружок.
  if (item.type === 'number' && item.numeral) {
    const numeral = el('span', 'choice__char', item.numeral);
    const word = el('span', 'choice__chechen', item.chechen);
    btn.append(numeral, word);
  } else if (item.type === 'color' && item.color) {
    const swatch = el('span', 'choice__swatch');
    swatch.style.backgroundColor = item.color;
    btn.append(swatch, el('span', 'choice__chechen', item.chechen));
  } else {
    const char = el('span', 'choice__char', item.chechen);
    btn.append(char);
    if (item.emoji) btn.append(el('span', 'choice__emoji', item.emoji));
  }

  if (showHint && item.transcription) {
    btn.append(el('span', 'choice__transcription', item.transcription));
  }
  return btn;
}

/**
 * Возвращает «визуал» карточки для игр на сопоставление:
 * эмодзи, цветной кружок или букву/слово.
 * @param {object} item — карточка.
 * @returns {HTMLElement} Элемент-визуал.
 */
export function itemVisual(item) {
  if (item.type === 'color' && item.color) {
    const swatch = el('span', 'choice__swatch choice__swatch--lg');
    swatch.style.backgroundColor = item.color;
    return swatch;
  }
  if (item.emoji) return el('span', 'card__emoji', item.emoji);
  return el('span', 'choice__char', item.chechen);
}
