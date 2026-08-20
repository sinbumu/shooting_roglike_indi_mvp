import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { pngBufferToWebp } from './png-to-webp.mjs';

const src = process.argv[2];
const dst = process.argv[3];
if (!src || !dst) {
  console.error('usage: node chroma-bomber.mjs <in.png> <out.webp>');
  process.exit(1);
}

function isMagenta(r, g, b) {
  if (r > 180 && b > 180 && g < 140) return true;
  if (r > 200 && b > 150 && g < 160 && (r + b) - 2 * g > 120) return true;
  if (r > 220 && b > 200 && g > 160 && g < 210 && r - g > 30 && b - g > 20) return true;
  if (r > 230 && b > 230 && g < 80) return true;
  return false;
}

const png = PNG.sync.read(readFileSync(src));
const { width, height, data } = png;
for (let i = 0; i < data.length; i += 4) {
  if (isMagenta(data[i], data[i + 1], data[i + 2])) data[i + 3] = 0;
}

let minX = width, minY = height, maxX = 0, maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const a = data[(y * width + x) * 4 + 3];
    if (a > 10) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}

const tw = maxX - minX + 1;
const th = maxY - minY + 1;
const pad = Math.round(Math.max(tw, th) * 0.06);
const box = Math.max(tw, th) + pad * 2;
const cropped = new PNG({ width: box, height: box });
const ox = Math.floor((box - tw) / 2);
const oy = Math.floor((box - th) / 2);
for (let y = 0; y < th; y++) {
  for (let x = 0; x < tw; x++) {
    const si = ((minY + y) * width + (minX + x)) * 4;
    const di = ((oy + y) * box + (ox + x)) * 4;
    cropped.data[di] = data[si];
    cropped.data[di + 1] = data[si + 1];
    cropped.data[di + 2] = data[si + 2];
    cropped.data[di + 3] = data[si + 3];
  }
}

const size = 128;
const out = new PNG({ width: size, height: size });
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const sx = Math.min(box - 1, Math.floor((x + 0.5) * box / size));
    const sy = Math.min(box - 1, Math.floor((y + 0.5) * box / size));
    const si = (sy * box + sx) * 4;
    const di = (y * size + x) * 4;
    out.data[di] = cropped.data[si];
    out.data[di + 1] = cropped.data[si + 1];
    out.data[di + 2] = cropped.data[si + 2];
    out.data[di + 3] = cropped.data[si + 3];
  }
}

mkdirSync(path.dirname(dst), { recursive: true });
await pngBufferToWebp(Buffer.from(out.data), { width: size, height: size }, dst);
console.log('wrote', dst, `${width}x${height} -> ${size}x${size}`);
