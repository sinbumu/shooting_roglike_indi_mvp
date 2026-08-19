/**
 * Magenta chroma-key raw AI sprites → transparent PNGs in public/assets/sprites
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'assets/raw');
const outDir = path.join(root, 'public/assets/sprites');

/** 신규만 처리. 기존 19장은 public/assets/sprites 원본을 유지한다. */
const NAMES = [
  'enemy_trapper', 'enemy_vortex',
  'enemy_warden', 'enemy_herald', 'enemy_architect',
  'pickup_goldCube',
];

function isMagenta(r, g, b) {
  if (r > 180 && b > 180 && g < 140) return true;
  if (r > 200 && b > 150 && g < 160 && (r + b) - 2 * g > 120) return true;
  if (r > 220 && b > 200 && g > 160 && g < 210 && r - g > 30 && b - g > 20) return true;
  return false;
}

async function processOne(name) {
  const input = path.join(srcDir, `${name}.png`);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = Buffer.from(data);
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    if (isMagenta(r, g, b)) px[i + 3] = 0;
  }

  const size = 128;
  await sharp(px, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 10 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outDir, `${name}.png`));

  console.log('OK', name, `${info.width}x${info.height} -> ${size}x${size}`);
}

await mkdir(outDir, { recursive: true });
for (const name of NAMES) {
  await processOne(name);
}
console.log('done', outDir);
