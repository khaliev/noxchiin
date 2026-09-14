# Аудит безопасности — Нохчийн Мотт

Дата: Этап 5. Цель — проверить проект по OWASP Top 10:2025 перед публикацией.

Проект — **статическое клиентское приложение** (Astro SSG + vanilla JS), без
бэкенда, без аккаунтов и без передачи персональных данных. Это заметно сужает
поверхность атаки, но риски всё равно проработаны (см. таблицу ниже).

## 1. OWASP Top 10:2025 — статус по каждому пункту

| # | Риск (OWASP) | Как обработан в проекте | Статус |
|---|---|---|---|
| A01 | Broken Access Control | Бэкенда/аккаунтов нет — нечего разграничивать. При появлении аккаунтов: проверка прав на каждый запрос (заложено в архитектуру, раздел 6 требований). | ✅ не применимо сейчас |
| A02 | Security Misconfiguration | CSP + security-заголовки (vercel.json, `public/_headers`, meta-CSP в Layout). Нет debug-режимов, только HTTPS (SW требует HTTPS). | ✅ готово |
| A03 | Supply Chain Failures | Минимум зависимостей (astro, workbox-build, vitest, typescript). Версии зафиксированы `package-lock.json`. `npm audit` = **0 уязвимостей**. | ✅ готово |
| A04 | Cryptographic Failures | Никакие персональные данные детей не хранятся и не передаются. Паролей/авторизации нет. | ✅ не применимо |
| A05 | Injection (XSS) | Весь рендер через `textContent`/DOM-узлы, **без `innerHTML` с данными** (проверено grep-ом, остальные `innerHTML` удалены). Есть модуль `sanitize.js` для очистки ввода (имя профиля). CSP `script-src 'self'` без `unsafe-inline`. | ✅ готово |
| A06 | Insecure Design | Читерство через правку localStorage не критично и не ломает игру: `storage.js` валидирует схему при загрузке и откатывается к дефолту. | ✅ готово |
| A07 | Authentication Failures | Родительский вход не реализован (по плану локально, без паролей). Если появится код/пароль — надёжное хранение + лимит попыток (заложено). | ✅ не применимо |
| A08 | Software/Data Integrity Failures | SW кэширует только с доверенного origin; precache использует контентные хэши в именах файлов → обновление меняет manifest и чистит старый кэш. `cleanupOutdatedCaches: true`. | ✅ готово |
| A09 | Security Logging | Бэкенда нет. Для будущего: логировать ошибки без персональных данных. | ✅ не применимо |
| A10 | Mishandling of Exceptions | Все ошибки обработаны: повреждённый localStorage → дефолт; нет сети → offline.html; аудио не загрузилось → подсказка; нет сердца → понятный экран. | ✅ готово |

## 2. Security-заголовки

Настроены в трёх местах (для разных хостов):

- **`vercel.json`** — для Vercel.
- **`public/_headers`** — для Netlify / Cloudflare Pages.
- **Meta-CSP в `Layout.astro`** — сработает даже без заголовков хоста (defense-in-depth).

Используемый Content-Security-Policy:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data:;
media-src 'self';
connect-src 'self';
worker-src 'self';
manifest-src 'self';
base-uri 'self';
form-action 'self';
frame-ancestors 'none'   ← только в заголовках (meta это не поддерживает)
```

Дополнительно (в заголовках): `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`,
`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`.

> Для строгой CSP (`script-src 'self'`) в `astro.config.mjs` выставлен
> `vite.build.assetsInlineLimit = 0`, чтобы Astro не инлайнил JS-скрипты.
> `style-src 'unsafe-inline'` оставлен, т.к. Astro инлайнит CSS и мелкие
> `style`-атрибуты (риск от CSS-инъекции низкий, в отличие от JS).

## 3. Зависимости (npm audit)

```
npm audit → found 0 vulnerabilities
```

`npm outdated` показывает только `typescript` (dev-инструмент для проверки
типов; зафиксирован на 6.x для совместимости с `@astrojs/check`).

## 4. Валидация пользовательского ввода

- Точка ввода сейчас одна и появится в Этапе 4 — **имя профиля**. Готов модуль
  `src/scripts/sanitize.js`: `sanitizeName()` (вырезает HTML-теги, управляющие
  символы, схлопывает пробелы, ограничивает длину), `isValidName()`,
  `escapeHtml()`. Покрыт тестами (`tests/sanitize.test.js`).
- **Правило на будущее:** любое пользовательское значение проходит через
  `sanitizeName`/`escapeHtml` и выводится только через `textContent`.

## 5. Целостность данных в localStorage

`src/scripts/storage.js`:
- Версионирование (`SCHEMA_VERSION`, каркас миграций `migrate()`).
- Валидация при загрузке `normalizeState()`: битые типы приводятся к дефолту,
  сердечки ограничиваются максимумом.
- `loadState()` обёрнут в `try/catch` → повреждённый JSON не роняет приложение.
- Чувствительных данных в localStorage нет (только игровая статистика).

## 6. Service Worker — инвалидация кэша

- Файлы сборки имеют **контентный хэш в имени** (`index.…CeQEzDHv.js`) →
  при изменении файла меняется имя → меняется precache-manifest в новом `sw.js`.
- `skipWaiting` + `clientsClaim` → новый SW активируется сразу.
- `cleanupOutdatedCaches: true` + встроенная чистка precache → старые записи
  удаляются при активации.
- Runtime-кэши (аудио/картинки) живут по `maxAgeSeconds` (90/30 дней) — не
  блокируют обновления приложения (JS/CSS/HTML идут через precache).

## Итог

Все пункты OWASP Top 10:2025 либо **обработаны**, либо **не применимы** для
статического клиентского приложения. Критических находок нет.
