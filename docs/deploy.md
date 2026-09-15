# Деплой и публикация — Нохчийн Мотт

Как выложить приложение в интернет. Приложение статическое (Astro SSG),
поэтому подходит любой статический хостинг.

## 1. Перед деплоем — задай домен

Открой `astro.config.mjs` и замени `site` на реальный адрес:

```js
site: 'https://tvoj-domen.com',
```

Тот же адрес используется в `public/robots.txt` (строка `Sitemap:`), в
canonical/Open Graph и в sitemap. Проверь, что он совпадает везде.

## 2. Вариант A — Vercel (рекомендуется)

Vercel отдаёт статику + security-заголовки из `vercel.json`.

1. Залей проект на GitHub (он уже там).
2. В Vercel: **Add New → Project → Import** репозиторий `noxchiin`.
3. Настройки (обычно подхватываются автоматически по Astro):
   - Framework Preset: **Astro**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy. HTTPS и кастомный домен включаются в настройках проекта Vercel
   (Settings → Domains).

## 3. Вариант B — Hostinger (или любой статический хостинг)

1. Локально собери проект: `npm run build` → появится папка `dist/`.
2. Загрузи **содержимое** `dist/` в корень сайта (через FTP или панель).
3. В панели Hostinger включи HTTPS (Let's Encrypt).
4. Для security-заголовков на Hostinger добавь их в настройках (например,
   через `.htaccess`, если хостинг Apache) — либо используй meta-CSP, который
   уже встроен в страницы (работает без заголовков хоста).

## 4. Аналитика (cookieless, без cookies)

Используется Plausible — приватная аналитика без персональных данных.

1. Создай сайт в Plausible (или self-hosted инстанс).
2. Включи домен через переменную окружения (Vercel: Settings → Environment
   Variables, или файл `.env` локально):

```
PUBLIC_PLAUSIBLE_DOMAIN=stats.tvoj-domen.com
```

Если переменная не задана — аналитика не загружается вовсе (по умолчанию).

## 5. Проверка после публикации

- Открой сайт по HTTPS, проверь: манифест, Service Worker (офлайн), иконки.
- Lighthouse: Performance ≥ 95, PWA = 100, SEO = 100, Best Practices ≥ 95.
- Проверь `sitemap-index.xml` и `robots.txt`.
- Проверь security-заголовки (DevTools → Network → ответ):
  `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`.
- Отправь сайт на повторный обход в Google Search Console.
