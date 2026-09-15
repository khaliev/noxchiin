// ============================================================================
// scripts/check-audio.mjs — проверка наличия аудиофайлов уроков.
// ============================================================================
// Запуск: node scripts/check-audio.mjs
//
// Читает все JSON-темы из data/lessons, собирает пути к аудио и проверяет,
// существует ли файл в public/. Выводит список отсутствующих файлов и
// создаёт docs/audio-checklist.md — чек-лист для записи аудио с носителем.
// ============================================================================

import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = join(__dirname, '..', 'data', 'lessons');
const PUBLIC_DIR = join(__dirname, '..', 'public');
const DOCS_DIR = join(__dirname, '..', 'docs');

// Читаем все темы
const files = readdirSync(LESSONS_DIR).filter((f) => f.endsWith('.json'));
const topics = files.map((f) => JSON.parse(readFileSync(join(LESSONS_DIR, f), 'utf8')).topic);

let total = 0;
let present = 0;
const missing = [];

for (const topic of topics) {
  for (const item of topic.items ?? []) {
    if (!item.audio) continue;
    total++;
    // audio начинается с "/", убираем слэш для проверки в public/
    const relPath = item.audio.replace(/^\//, '');
    if (existsSync(join(PUBLIC_DIR, relPath))) {
      present++;
    } else {
      missing.push({ topic: topic.id, id: item.id, chechen: item.chechen, path: item.audio });
    }
  }
}

console.log(`Аудиофайлы: ${present}/${total} на месте.`);
console.log(`Отсутствует: ${missing.length}.`);

// Формируем чек-лист
const byTopic = new Map();
for (const m of missing) {
  if (!byTopic.has(m.topic)) byTopic.set(m.topic, []);
  byTopic.get(m.topic).push(m);
}

let md = `# Чек-лист недостающих аудиофайлов

> Сгенерировано автоматически: \`node scripts/check-audio.mjs\`
> Дата: ${new Date().toISOString().slice(0, 10)}
>
> Всего карточек с аудио: **${total}**, на месте: **${present}**, отсутствует: **${missing.length}**.

Аудио записывается **носителем языка** (см. \`audio/README.md\`). Пока файла нет,
игра показывает подсказку с транскрипцией вместо тишины.

## Как записать

1. Для каждого id ниже запиши слово/букву на чеченском (носитель языка).
2. Назови файл по пути из таблицы и положи в \`public/\`.
3. Формат MP3, 96–128 kbps, моно, без лишних пауз (можно Audacity).
4. Перезапусти \`node scripts/check-audio.mjs\` — счётчик обновится.

## Список по темам

`;

for (const [topicId, items] of byTopic) {
  md += `### ${topicId}\n\n| id | слово/буква | путь |\n|---|---|---|\n`;
  for (const it of items) {
    md += `| ${it.id} | ${it.chechen} | \`${it.path}\` |\n`;
  }
  md += '\n';
}

if (missing.length === 0) {
  md += '## ✅ Все аудиофайлы на месте!\n';
}

mkdirSync(DOCS_DIR, { recursive: true });
writeFileSync(join(DOCS_DIR, 'audio-checklist.md'), md);
console.log(`Чек-лист записан: docs/audio-checklist.md`);
