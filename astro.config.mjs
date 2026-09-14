import { defineConfig } from 'astro/config';

// https://astro.build/config
// Настройки проекта «Нохчийн Мотт».
//
// Service Worker генерируется отдельным шагом (scripts/build-sw.mjs) через
// Workbox ПОСЛЕ сборки. Так мы полностью контролируем кэширование и не
// зависим от интеграций, которые могут отставать от новых версий Astro.
export default defineConfig({
  site: 'https://noxchiin-mott.example.com',
  compressHTML: true,

  build: {
    inlineStylesheets: 'auto',
  },
});
