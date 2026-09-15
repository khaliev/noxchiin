import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
// Настройки проекта «Нохчийн Мотт».
//
// ВАЖНО: замени site на реальный домен перед публикацией.
// Service Worker генерируется отдельным шагом (scripts/build-sw.mjs) через
// Workbox ПОСЛЕ сборки.
export default defineConfig({
  site: 'https://noxchiin-mott.example.com',
  compressHTML: true,

  // Автогенерация sitemap-index.xml (из маршрутов + site).
  integrations: [sitemap()],

  build: {
    inlineStylesheets: 'auto',
  },

  vite: {
    build: {
      // Не инлайним JS-скрипты в HTML. Это нужно для строгой CSP
      // (script-src 'self' без 'unsafe-inline') — иначе Astro вставляет
      // маленькие скрипты (например, регистрацию Service Worker) инлайн.
      assetsInlineLimit: 0,
    },
  },
});
