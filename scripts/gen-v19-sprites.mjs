/**
 * v1.9 procedural raw sprites (magenta chroma) for 3 ships + T1 FX sheets.
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawDir = path.resolve(__dirname, '../assets/raw');

const MAG = [255, 0, 255, 255];

function makePng(w, h) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = MAG[0];
    png.data[i + 1] = MAG[1];
    png.data[i + 2] = MAG[2];
    png.data[i + 3] = MAG[3];
  }
  return png;
}

function setPx(png, x, y, r, g, b, a = 255) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= png.width || yi >= png.height) return;
  const i = (yi * png.width + xi) * 4;
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = a;
}

function disk(png, cx, cy, rad, r, g, b, a = 255) {
  const rr = rad * rad;
  const x0 = Math.floor(cx - rad);
  const y0 = Math.floor(cy - rad);
  const x1 = Math.ceil(cx + rad);
  const y1 = Math.ceil(cy + rad);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= rr) setPx(png, x, y, r, g, b, a);
    }
  }
}

function ellipse(png, cx, cy, rx, ry, r, g, b, a = 255) {
  const x0 = Math.floor(cx - rx);
  const y0 = Math.floor(cy - ry);
  const x1 = Math.ceil(cx + rx);
  const y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const u = (x - cx) / rx;
      const v = (y - cy) / ry;
      if (u * u + v * v <= 1) setPx(png, x, y, r, g, b, a);
    }
  }
}

function line(png, x0, y0, x1, y1, w, r, g, b, a = 255) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const n = Math.ceil(len * 1.4);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    disk(png, x0 + dx * t, y0 + dy * t, w, r, g, b, a);
  }
}

function poly(png, pts, r, g, b, a = 255) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
      if (inside(pts, x + 0.5, y + 0.5)) setPx(png, x, y, r, g, b, a);
    }
  }
}

function inside(pts, x, y) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const inter = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (inter) hit = !hit;
  }
  return hit;
}

function write(name, png) {
  mkdirSync(rawDir, { recursive: true });
  const dest = path.join(rawDir, name);
  writeFileSync(dest, PNG.sync.write(png));
  console.log('raw', name, `${png.width}x${png.height}`);
}

function shipYaksha() {
  const png = makePng(256, 256);
  const c = 128;
  poly(png, [[c, 28], [c + 22, 118], [c, 108], [c - 22, 118]], 248, 113, 113);
  poly(png, [[c - 18, 90], [c - 92, 148], [c - 28, 132], [c - 8, 118]], 239, 68, 68);
  poly(png, [[c + 18, 90], [c + 92, 148], [c + 28, 132], [c + 8, 118]], 239, 68, 68);
  poly(png, [[c - 10, 108], [c, 232], [c + 10, 108]], 127, 29, 29);
  ellipse(png, c, 96, 16, 22, 254, 226, 226);
  disk(png, c, 88, 7, 254, 240, 138);
  line(png, c - 70, 140, c - 18, 96, 3, 252, 211, 77);
  line(png, c + 70, 140, c + 18, 96, 3, 252, 211, 77);
  write('ship_yaksha.png', png);
}

function shipOverlord() {
  const png = makePng(256, 256);
  const c = 128;
  ellipse(png, c, 118, 88, 28, 56, 189, 248);
  ellipse(png, c, 112, 70, 22, 14, 116, 144);
  ellipse(png, c, 108, 36, 16, 186, 230, 253);
  disk(png, c, 104, 10, 224, 242, 254);
  poly(png, [[c - 20, 128], [c, 210], [c + 20, 128]], 8, 47, 73);
  disk(png, c - 54, 168, 12, 125, 211, 252);
  disk(png, c + 54, 168, 12, 125, 211, 252);
  disk(png, c, 188, 10, 56, 189, 248);
  disk(png, c - 54, 168, 4, 254, 249, 195);
  disk(png, c + 54, 168, 4, 254, 249, 195);
  disk(png, c, 188, 3, 254, 249, 195);
  write('ship_overlord.png', png);
}

function shipCrimson() {
  const png = makePng(256, 256);
  const c = 128;
  poly(png, [[c, 24], [c + 36, 150], [c, 128], [c - 36, 150]], 190, 18, 60);
  poly(png, [[c, 40], [c + 16, 140], [c, 122], [c - 16, 140]], 251, 113, 133);
  poly(png, [[c - 8, 130], [c, 230], [c + 8, 130]], 136, 19, 55);
  ellipse(png, c, 92, 12, 18, 254, 205, 211);
  disk(png, c, 86, 6, 254, 226, 226);
  line(png, c - 28, 70, c - 8, 110, 2.4, 254, 113, 133);
  line(png, c + 28, 70, c + 8, 110, 2.4, 254, 113, 133);
  write('ship_crimson.png', png);
}

function cellBlit(dest, src, ox, oy) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (y * src.width + x) * 4;
      const dx = ox + x;
      const dy = oy + y;
      const di = (dy * dest.width + dx) * 4;
      dest.data[di] = src.data[si];
      dest.data[di + 1] = src.data[si + 1];
      dest.data[di + 2] = src.data[si + 2];
      dest.data[di + 3] = src.data[si + 3];
    }
  }
}

function fxSheet(drawCell) {
  const cell = 256;
  const sheet = makePng(cell * 2, cell * 2);
  for (let i = 0; i < 4; i++) {
    const frame = makePng(cell, cell);
    drawCell(frame, i);
    const ox = (i % 2) * cell;
    const oy = Math.floor(i / 2) * cell;
    cellBlit(sheet, frame, ox, oy);
  }
  return sheet;
}

function fxWhip() {
  write('fx_whip_raw.png', fxSheet((png, frame) => {
    const c = 128;
    const sweep = -0.9 + frame * 0.55;
    const len = 96 + frame * 6;
    for (let i = 0; i < 28; i++) {
      const t = i / 27;
      const a = sweep + t * 1.7;
      const rad = 18 + t * len;
      const x = c + Math.cos(a) * rad;
      const y = c + Math.sin(a) * rad;
      const w = 7 - t * 4.5;
      disk(png, x, y, w, 250, 232, 255, 255);
      disk(png, x, y, w * 0.45, 255, 255, 255, 255);
    }
    disk(png, c, c, 8, 253, 224, 71);
  }));
}

function fxSpider() {
  write('fx_spider_raw.png', fxSheet((png, frame) => {
    const c = 128;
    const bob = Math.sin(frame * 1.2) * 6;
    ellipse(png, c, c + bob, 38, 26, 148, 163, 184);
    ellipse(png, c, c - 6 + bob, 22, 16, 100, 116, 139);
    disk(png, c - 10, c - 10 + bob, 5, 248, 250, 252);
    disk(png, c + 10, c - 10 + bob, 5, 248, 250, 252);
    disk(png, c - 10, c - 10 + bob, 2, 15, 23, 42);
    disk(png, c + 10, c - 10 + bob, 2, 15, 23, 42);
    for (let k = 0; k < 4; k++) {
      const ang = -2.4 + k * 0.55 + frame * 0.12;
      const reach = 70;
      line(png, c - 16, c + 4 + bob, c - 16 + Math.cos(ang) * reach, c + 4 + bob + Math.sin(ang) * reach, 3.2, 203, 213, 225);
      line(png, c + 16, c + 4 + bob, c + 16 - Math.cos(ang) * reach, c + 4 + bob + Math.sin(ang) * reach, 3.2, 203, 213, 225);
    }
    disk(png, c, c + 8 + bob, 6, 251, 191, 36);
  }));
}

function fxBlood() {
  write('fx_blood_raw.png', fxSheet((png, frame) => {
    const c = 128;
    const stretch = 70 + frame * 10;
    poly(png, [[c, c - stretch], [c + 18, c + 8], [c, c + 36], [c - 18, c + 8]], 251, 113, 133);
    poly(png, [[c, c - stretch + 18], [c + 8, c], [c, c + 16], [c - 8, c]], 254, 226, 226);
    disk(png, c, c - 8, 7, 255, 255, 255);
    for (let k = 0; k < 3; k++) {
      disk(png, c + (k - 1) * 16, c + 48 + frame * 4, 5 - k, 225, 29, 72);
    }
  }));
}

shipYaksha();
shipOverlord();
shipCrimson();
fxWhip();
fxSpider();
fxBlood();

function chromaKeyAndResize(inputName, outName, size = 128) {
  const png = PNG.sync.read(readFileSync(path.join(rawDir, inputName)));
  const { width, height, data } = png;
  const isMag = (r, g, b) => r > 180 && b > 180 && g < 140;
  for (let i = 0; i < data.length; i += 4) {
    if (isMag(data[i], data[i + 1], data[i + 2])) data[i + 3] = 0;
  }
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const pad = Math.round(Math.max(tw, th) * 0.08);
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
  const outDir = path.resolve(__dirname, '../public/assets/sprites');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, outName), PNG.sync.write(out));
  console.log('sprite', outName, `${size}x${size}`);
}

chromaKeyAndResize('ship_yaksha.png', 'ship_yaksha.png');
chromaKeyAndResize('ship_overlord.png', 'ship_overlord.png');
chromaKeyAndResize('ship_crimson.png', 'ship_crimson.png');
console.log('done', rawDir);

