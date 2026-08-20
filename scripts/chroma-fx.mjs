/**
 * Magenta chroma-key for 2x2 FX sheets. Does NOT trim — cell alignment must stay.
 * Energy sheets are converted to greyscale so weapon tint works.
 * Public output is lossless WebP (docs/SPRITE_PIPELINE.md). Raw stays PNG.
 */
import { readFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { pngBufferToWebp } from './png-to-webp.mjs';

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
  { name: 'fx_vulcan', tintable: false },
  { name: 'fx_spread', tintable: true },
  { name: 'fx_homing', tintable: false },
  { name: 'fx_laser', tintable: true },
  { name: 'fx_railgun', tintable: false },
  { name: 'fx_gatling', tintable: false },
  { name: 'fx_nova', tintable: true },
  { name: 'fx_mothership', tintable: false },
  { name: 'fx_omega', tintable: true },
  { name: 'fx_starfall', tintable: true },
  { name: 'fx_genesis', tintable: true },
  { name: 'fx_tempest', tintable: true },
  { name: 'fx_rupture', tintable: false },
  { name: 'fx_solance', tintable: true },
  { name: 'fx_helix', tintable: false },
  { name: 'fx_nebula', tintable: false },
  { name: 'fx_shieldwall', tintable: false },
  { name: 'fx_quantum', tintable: false },
  { name: 'fx_altar', tintable: false },
  { name: 'fx_shade', tintable: false },
  { name: 'fx_lockbeam', tintable: false },
  { name: 'fx_meteor', tintable: false },
  { name: 'fx_emp', tintable: false },
  { name: 'fx_gem', tintable: true },
  { name: 'fx_ebullet', tintable: false },
  { name: 'fx_warn', tintable: false },
  { name: 'fx_drone', tintable: true },
  { name: 'fx_pylon', tintable: false },
  { name: 'fx_frontshield', tintable: true },
  { name: 'fx_whip', tintable: true },
  { name: 'fx_spider', tintable: false },
  { name: 'fx_blood', tintable: true },
  { name: 'fx_seekingSlash', tintable: true },
  { name: 'fx_phantomBlade', tintable: true },
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

async function processOne(name, tintable) {
  const input = path.join(rawDir, `${name}_raw.png`);
  if (!existsSync(input)) {
    console.log('skip missing', name);
    return;
  }
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
  const dest = path.join(outDir, `${name}.webp`);
  await pngBufferToWebp(Buffer.from(data), { width, height }, dest);
  console.log('OK', name, `${width}x${height}`, tintable ? 'tintable' : 'color');
}

const srcOverride = process.argv[2];
mkdirSync(rawDir, { recursive: true });
if (srcOverride) {
  for (const { name } of SHEETS) {
    const from = path.join(srcOverride, `${name}_raw.png`);
    if (existsSync(from)) copyFileSync(from, path.join(rawDir, `${name}_raw.png`));
  }
}

for (const sheet of SHEETS) {
  await processOne(sheet.name, sheet.tintable);
}
console.log('done', outDir);
