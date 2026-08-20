/**
 * public/assets/sprites PNG → lossless WebP, then delete PNG.
 * Also exports WEBP_LOSSLESS for chroma-fx / chroma-sprites / gen-v19.
 *
 * Usage: npm run sprites:webp
 * Docs: docs/SPRITE_PIPELINE.md
 */
import { readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const WEBP_LOSSLESS = { lossless: true };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spriteDir = path.resolve(__dirname, '../public/assets/sprites');

export async function pngBufferToWebp(raw, { width, height }, dest) {
  await sharp(raw, { raw: { width, height, channels: 4 } })
    .webp(WEBP_LOSSLESS)
    .toFile(dest);
}

async function convertDir() {
  const names = readdirSync(spriteDir).filter((f) => f.toLowerCase().endsWith('.png'));
  if (names.length === 0) {
    console.log('no PNG in', spriteDir);
    return;
  }
  for (const name of names) {
    const src = path.join(spriteDir, name);
    const dest = path.join(spriteDir, name.replace(/\.png$/i, '.webp'));
    await sharp(src).webp(WEBP_LOSSLESS).toFile(dest);
    unlinkSync(src);
    console.log('webp', name, '->', path.basename(dest));
  }
  console.log('done', names.length, 'files', spriteDir);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await convertDir();
}
