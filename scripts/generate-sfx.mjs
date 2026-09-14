// ============================================================================
// scripts/generate-sfx.mjs — генерация коротких звуковых эффектов (WAV).
// ============================================================================
// Запуск: node scripts/generate-sfx.mjs
//
// Создаёт НЕГОЛОСОВЫЕ звуковые эффекты для обратной связи в игре:
//   - public/audio/sfx/correct.wav  (восходящий сигнал «верно»)
//   - public/audio/sfx/wrong.wav    (нисходящий сигнал «неверно»)
//
// Без внешних зависимостей: синтезируем синусоиды и кодируем в WAV (PCM).
// Короткие файлы (~15–20 КБ) — легко кэшируются Service Worker для офлайна.
// ============================================================================

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'audio', 'sfx');
const SAMPLE_RATE = 22050;

/** Генерирует синусоиду заданной частоты и длительности (с плавным затуханием). */
function tone(freq, durationMs, volume = 0.4) {
  const n = Math.floor((SAMPLE_RATE * durationMs) / 1000);
  const arr = new Float32Array(n);
  const fadeIn = Math.floor(SAMPLE_RATE * 0.008);
  const fadeOut = Math.floor(SAMPLE_RATE * 0.015);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let envelope = 1;
    if (i < fadeIn) envelope = i / fadeIn;
    else if (i > n - fadeOut) envelope = (n - i) / fadeOut;
    arr[i] = Math.sin(2 * Math.PI * freq * t) * volume * envelope;
  }
  return arr;
}

/** Склеивает несколько синусоид в один буфер. */
function concat(parts) {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Кодирует Float32-сэмплы в WAV (PCM, mono, 16-bit). */
function encodeWav(samples) {
  const n = samples.length;
  const buffer = Buffer.alloc(44 + n * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + n * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buffer;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // «Верно» — две восходящие ноты (до -> соль).
  const correct = concat([tone(660, 100, 0.5), tone(880, 180, 0.5)]);
  // «Неверно» — две нисходящие низкие ноты.
  const wrong = concat([tone(220, 160, 0.5), tone(165, 220, 0.5)]);

  const files = [
    ['correct.wav', correct],
    ['wrong.wav', wrong],
  ];

  for (const [name, samples] of files) {
    const path = join(OUT_DIR, name);
    writeFileSync(path, encodeWav(samples));
    console.log(`✓ ${name} (${samples.length} сэмплов)`);
  }
  console.log(`\nГотово! Файлы в public/audio/sfx/.`);
}

main();
