// Тесты санитизации пользовательского ввода (защита от XSS).
import { describe, it, expect } from 'vitest';
import { sanitizeName, isValidName, escapeHtml, MAX_NAME_LENGTH } from '../src/scripts/sanitize.js';

describe('sanitizeName', () => {
  it('удаляет HTML-теги', () => {
    // Теги вырезаются; оставшийся текст безопасен (рендерится как текст).
    expect(sanitizeName('<script>alert(1)</script>Амина')).toBe('alert(1)Амина');
    expect(sanitizeName('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('удаляет управляющие символы и схлопывает пробелы', () => {
    expect(sanitizeName('Амина\n\t  Магомедова')).toBe('Амина Магомедова');
  });

  it('ограничивает длину', () => {
    expect(sanitizeName('а'.repeat(100)).length).toBe(MAX_NAME_LENGTH);
  });

  it('возвращает пустую строку для не-строки', () => {
    expect(sanitizeName(12345)).toBe('');
    expect(sanitizeName(null)).toBe('');
    expect(sanitizeName(undefined)).toBe('');
  });

  it('обрезает пробелы по краям', () => {
    expect(sanitizeName('  Амина  ')).toBe('Амина');
  });
});

describe('isValidName', () => {
  it('принимает обычное имя', () => {
    expect(isValidName('Амина')).toBe(true);
  });
  it('отклоняет пустое и только-пробелы', () => {
    expect(isValidName('')).toBe(false);
    expect(isValidName('   ')).toBe(false);
  });
  it('отклоняет имя из одних тегов', () => {
    expect(isValidName('<b></b>')).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('экранирует спецсимволы', () => {
    expect(escapeHtml('<a href="x">&\'</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  });
});
