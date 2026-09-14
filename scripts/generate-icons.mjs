// ============================================================================
// scripts/generate-icons.mjs — генерация PNG-иконок PWA без внешних библиотек
// ============================================================================
// Запуск: npm run icons
//
// Создаёт иконки приложения (волчонок — маскот «Нохчийн Мотт»):
//   - public/icons/icon-192.png       (обычная, 192x192)
//   - public/icons/icon-512.png       (обычная, 512x512)
//   - public/icons/maskable-512.png   (с безопасной зоной, 512x512)
//   - public/icons/apple-touch-icon.png (для iOS, 180x180)
//
// Мы не тянем тяжёлые зависимости (sharp/canvas) — PNG рисуется вручную:
// пиксели -> zlib (встроенный в Node) -> валидный PNG-файл.
// ============================================================================

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');

// --- Цвета бренда ----------------------------------------------------------
const GREEN_TOP = [27, 122, 70]; // #1b7a46 (светлее)
const GREEN_BOTTOM = [20, 83, 45]; // #14532d (темнее)
const WHITE = [255, 255, 255];
const DARK = [31, 41, 55]; // #1f2937
const GOLD = [242, 183, 5]; // #f2b705

// --- Утилиты работы с пиксельным буфером -----------------------------------

/** Создаёт пустой RGBA-буфер заданного размера. */
function createCanvas(size) {
  return {
    size,
    data: new Uint8ClampedArray(size * size * 4), // RGBA, изначально прозрачный
  };
}

/** Ставит один пиксель. alpha 0..1. */
function setPixel(canvas, x, y, [r, g, b], alpha = 1) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) return;
  const i = (y * canvas.size + x) * 4;
  canvas.data[i] = r;
  canvas.data[i + 1] = g;
  canvas.data[i + 2] = b;
  canvas.data[i + 3] = Math.round(alpha * 255);
}

/** Закрашивает вертикальный градиент (фон иконки). */
function fillVerticalGradient(canvas, topColor, bottomColor) {
  for (let y = 0; y < canvas.size; y++) {
    const t = y / (canvas.size - 1);
    const color = topColor.map((c, i) => Math.round(c + (bottomColor[i] - c) * t));
    for (let x = 0; x < canvas.size; x++) {
      setPixel(canvas, x, y, color);
    }
  }
}

/** Закрашивает круг (для мордочки, глаз, носа). */
function fillCircle(canvas, cx, cy, radius, color, alpha = 1) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPixel(canvas, x, y, color, alpha);
    }
  }
}

/** Закрашивает треугольник (ушки волчонка). */
function fillTriangle(canvas, p1, p2, p3, color) {
  const minX = Math.floor(Math.min(p1[0], p2[0], p3[0]));
  const maxX = Math.ceil(Math.max(p1[0], p2[0], p3[0]));
  const minY = Math.floor(Math.min(p1[1], p2[1], p3[1]));
  const maxY = Math.ceil(Math.max(p1[1], p2[1], p3[1]));

  const sign = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const p = [x, y];
      const d1 = sign(p1, p2, p);
      const d2 = sign(p2, p3, p);
      const d3 = sign(p3, p1, p);
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(hasNeg && hasPos)) setPixel(canvas, x, y, color);
    }
  }
}

/** Рисует маскота-волчонка. scale — доля от размера иконки. */
function drawWolf(canvas, scale) {
  const s = canvas.size;
  // Лицо занимает центральную «безопасную зону»
  const faceR = s * 0.26 * scale;
  const faceCx = s / 2;
  const faceCy = s * 0.55;
  const earH = s * 0.24 * scale;

  // Ушки (рисуем до мордочки, чтобы они были «за» ней)
  fillTriangle(canvas, [faceCx - faceR * 0.9, faceCy - faceR * 0.3], [faceCx - faceR * 0.15, faceCy - faceR * 0.85], [faceCx - faceR * 0.7, faceCy - faceR * 1.5], WHITE);
  fillTriangle(canvas, [faceCx + faceR * 0.9, faceCy - faceR * 0.3], [faceCx + faceR * 0.15, faceCy - faceR * 0.85], [faceCx + faceR * 0.7, faceCy - faceR * 1.5], WHITE);

  // Мордочка
  fillCircle(canvas, faceCx, faceCy, faceR, WHITE);

  // Глаза
  const eyeR = s * 0.045 * scale;
  fillCircle(canvas, faceCx - faceR * 0.42, faceCy - faceR * 0.05, eyeR, DARK);
  fillCircle(canvas, faceCx + faceR * 0.42, faceCy - faceR * 0.05, eyeR, DARK);

  // Нос
  fillCircle(canvas, faceCx, faceCy + faceR * 0.22, s * 0.045 * scale, DARK);

  // Улыбка (полукруг)
  const smileR = s * 0.09 * scale;
  for (let y = Math.floor(faceCy + faceR * 0.22); y <= faceCy + faceR * 0.6; y++) {
    for (let x = Math.floor(faceCx - smileR); x <= faceCx + smileR; x++) {
      const dx = x - faceCx;
      const dy = y - (faceCy + faceR * 0.22);
      // Дуга улыбки: точки на кольце радиусом smileR ниже носа
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(dist - smileR) < s * 0.012) setPixel(canvas, x, y, DARK);
    }
  }

  // Маленькая золотая звёздочка-бейдж (фирменный акцент)
  const starCx = faceCx + faceR * 1.15;
  const starCy = faceCy - faceR * 0.7;
  const starR = s * 0.07 * scale;
  drawStar(canvas, starCx, starCy, starR, GOLD);
}

/** Рисует пятиконечную звезду. */
function drawStar(canvas, cx, cy, radius, color) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  for (let y = Math.floor(cy - radius); y <= cy + radius; y++) {
    for (let x = Math.floor(cx - radius); x <= cx + radius; x++) {
      if (pointInPolygon([x, y], points)) setPixel(canvas, x, y, color);
    }
  }
}

function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// --- Кодирование PNG --------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

/** Превращает RGBA-буфер в PNG-буфер. */
function encodePng(canvas) {
  const { size, data } = canvas;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Каждая строка начинается с байта-фильтра 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(data.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Генерация файлов -------------------------------------------------------

function buildIcon(size, { maskable = false } = {}) {
  const canvas = createCanvas(size);
  fillVerticalGradient(canvas, GREEN_TOP, GREEN_BOTTOM);
  // Для maskable маскот меньше и строго в центре (безопасная зона 80%),
  // чтобы платформа не обрезала ушки при обрезке под форму.
  drawWolf(canvas, maskable ? 0.72 : 0.85);
  return encodePng(canvas);
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const icons = [
    ['icon-192.png', buildIcon(192)],
    ['icon-512.png', buildIcon(512)],
    ['maskable-512.png', buildIcon(512, { maskable: true })],
    ['apple-touch-icon.png', buildIcon(180)],
  ];

  for (const [name, buffer] of icons) {
    const path = join(OUT_DIR, name);
    writeFileSync(path, buffer);
    console.log(`✓ ${name} (${buffer.length} байт)`);
  }

  console.log('\nГотово! Иконки записаны в public/icons/.');
}

main();
