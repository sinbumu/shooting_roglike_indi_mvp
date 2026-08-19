/**
 * Magenta chroma-key for 2x2 FX sheets. Does NOT trim — cell alignment must stay.
 * Energy sheets (slash/beam/halo) are converted to greyscale so weapon tint works.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const rawDir = path.join(root, 'assets', 'raw');
const outDir = path.join(root, 'public', 'assets', 'sprites');

const SHEETS = [
  { name: 'fx_slash', tintable: true },
  { name: 'fx_beam', tintable: true },
  { name: 'fx_halo', tintable: true },
  { name: 'fx_rotor', tintable: false },
  { name: 'fx_mine', tintable: false },
  { name: 'fx_seeker', tintable: false },
  { name: 'fx_singularity', tintable: false },
  { name: 'fx_predator', tintable: false },
  { name: 'fx_swarm', tintable: false },
];

function magentaAlpha(r, g, b) {
  const magenta = (r + b) / 2 - g;
  if (r >= 220 && b >= 220 && g <= 70) return 0;
  if (r >= 190 && b >= 190 && g <= 110 && magenta > 110) {
    return Math.max(0, Math.min(255, Math.round((g - 40) * 3.2)));
  }
  if (magenta > 160 && r > 170 && b > 170 && g < 140) {
    return Math.max(0, Math.min(255, Math.round(255 - (magenta - 160) * 2)));
  }
  return 255;
}

function processOne(name, tintable) {
  const input = path.join(rawDir, `${name}_raw.png`);
  const png = PNG.sync.read(readFileSync(input));
  const { width, height, data } = png;

  for (let i = 0; i < data.length; i += 4) {
    const a = magentaAlpha(data[i], data[i + 1], data[i + 2]);
    data[i + 3] = Math.min(data[i + 3], a);
    if (data[i + 3] < 8) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      continue;
    }
    if (tintable) {
      const lum = Math.min(255, 0.22 * data[i] + 0.7 * data[i + 1] + 0.08 * data[i + 2] + 36);
      data[i] = data[i + 1] = data[i + 2] = lum;
    }
  }

  mkdirSync(outDir, { recursive: true });
  const dest = path.join(outDir, `${name}.png`);
  writeFileSync(dest, PNG.sync.write(png));
  console.log('OK', name, `${width}x${height}`, tintable ? 'tintable' : 'color');
}

const srcOverride = process.argv[2];
mkdirSync(rawDir, { recursive: true });
if (srcOverride) {
  for (const { name } of SHEETS) {
    const from = path.join(srcOverride, `${name}_raw.png`);
    copyFileSync(from, path.join(rawDir, `${name}_raw.png`));
  }
}

for (const sheet of SHEETS) {
  processOne(sheet.name, sheet.tintable);
}
console.log('done', outDir);
