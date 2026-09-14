// ============================================================================
// scripts/build-sw.mjs — генерация Service Worker через Workbox.
// ============================================================================
// Запускается ПОСЛЕ `astro build` (см. скрипт "build" в package.json).
// Создаёт dist/sw.js, который:
//   - предзагружает (precache) app shell: HTML/CSS/JS/шрифты/иконки/манифест;
//   - кэширует аудио и изображения (cache-first) для офлайн-игры;
//   - обновляет шрифты Google Fonts (stale-while-revalidate);
//   - при недоступной сети показывает offline.html.
// ============================================================================

import { generateSW } from 'workbox-build';

const swDest = 'dist/sw.js';

// Стратегия кэширования: сначала отдаём из кэша, в фон обновляем из сети.
// Подходит для аудио/картинок, которые почти не меняются.
const cacheFirst = (cacheName, maxAgeSeconds) => ({
  handler: 'CacheFirst',
  options: {
    cacheName,
    expiration: {
      maxEntries: 600,
      maxAgeSeconds,
    },
  },
});

const { count, size } = await generateSW({
  swDest,
  globDirectory: 'dist',

  // Что precache'ить (app shell). Всё статичное из сборки.
  globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,mp3,ogg,wav}'],

  // Офлайн-заглушка для навигации по незакэшированным маршрутам.
  navigateFallback: '/offline.html',
  navigateFallbackDenylist: [/^\/api\//, /^\/_/],

  // Обновление SW: активируем сразу и берём под контроль уже открытые страницы.
  skipWaiting: true,
  clientsClaim: true,

  // Удаляем устаревшие кэши от предыдущих версий при активации нового SW.
  cleanupOutdatedCaches: true,

  runtimeCaching: [
    {
      // Аудио букв/слов — cache-first, 90 дней.
      urlPattern: ({ url }) => url.pathname.startsWith('/audio/'),
      ...cacheFirst('audio-cache', 60 * 60 * 24 * 90),
    },
    {
      // Иконки и изображения — cache-first, 30 дней.
      urlPattern: /\.(?:png|jpg|jpeg|webp|avif|svg)$/,
      ...cacheFirst('image-cache', 60 * 60 * 24 * 30),
    },
    {
      // Google Fonts (шрифт Nunito) — stale-while-revalidate, год.
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
  ],
});

console.log(`\n✓ Service Worker собран: ${swDest}`);
console.log(`  Precache: ${count} файлов, ${(size / 1024).toFixed(1)} KB`);
