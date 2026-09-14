// ============================================================================
// Тест целостности данных уроков.
// Проверяет, что каждый JSON-файл в /data/lessons валиден и соответствует
// схеме. Это «страховка»: если новичок ошибётся в JSON (лишняя запятая,
// забытое поле), тест сразу покажет проблему.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LESSONS_DIR = join(fileURLToPath(import.meta.url), '..', '..', 'data', 'lessons');

/** Загружает все JSON-файлы уроков. */
function loadAllLessons() {
  const files = readdirSync(LESSONS_DIR).filter((f) => f.endsWith('.json'));
  return files.map((file) => {
    const raw = readFileSync(join(LESSONS_DIR, file), 'utf8');
    return { file, data: JSON.parse(raw) };
  });
}

const lessons = loadAllLessons();

describe('Целостность данных уроков', () => {
  it('есть хотя бы одна тема', () => {
    expect(lessons.length).toBeGreaterThan(0);
  });

  for (const { file, data } of lessons) {
    describe(file, () => {
      it('содержит актуальную версию схемы', () => {
        expect(data.schemaVersion).toBe(1);
      });

      it('имеет обязательные поля темы', () => {
        expect(data.topic.id).toBeTruthy();
        expect(data.topic.title.ru).toBeTruthy();
        expect(data.topic.title.ce).toBeTruthy();
        expect(Number.isInteger(data.topic.order)).toBe(true);
      });

      it('имеет список карточек (пустой — только для тем в разработке)', () => {
        expect(Array.isArray(data.topic.items)).toBe(true);
        if (!data.topic.comingSoon) {
          expect(data.topic.items.length).toBeGreaterThan(0);
        }
      });

      it('все карточки имеют обязательные поля', () => {
        for (const item of data.topic.items) {
          expect(item.id).toBeTruthy();
          expect(['letter', 'word', 'number', 'color']).toContain(item.type);
          expect(item.chechen).toBeTruthy();
          expect(item.russian).toBeTruthy();
          expect(item.transcription).toBeTruthy();
          expect(item.audio).toMatch(/^\/audio\//);
        }
      });

      it('id карточек уникальны', () => {
        const ids = data.topic.items.map((i) => i.id);
        expect(new Set(ids).size).toBe(ids.length);
      });
    });
  }
});
