import { defineConfig } from 'astro/config';

// https://astro.build/config
// Настройки проекта «Нохчийн Мотт».
// ВАЖНО: build.output = 'static' (по умолчанию) даёт нам SSG —
// статическую генерацию всех страниц, что нужно для SEO (Этап 6)
// и быстрой загрузки без сервера.
export default defineConfig({
  // Базовая папка для статических файлов (манифест, иконки, аудио).
  // Файлы из public/ копируются в корень сборки как есть.
  site: 'https://noxchiin-mott.example.com',

  // Сжимаем итоговую сборку (Astro делает это автоматически в build).
  compressHTML: true,

  build: {
    // Никаких server-режимов: только статические HTML/JS/CSS.
    inlineStylesheets: 'auto',
  },

  vite: {
    // Никаких тяжёлых плагинов не требуется.
    // Оставляем настройки Vite по умолчанию.
  },
});
