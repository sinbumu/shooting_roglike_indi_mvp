/**
 * v1.10 procedural 2×2 FX sheets (magenta chroma) for the four new matrix pairs.
 * Raw stays PNG in assets/raw/. Public conversion: node scripts/chroma-fx.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
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

function ring(png, cx, cy, R, w, r, g, b, a = 255) {
  const n = Math.max(48, Math.ceil(R * 4));
  for (let i = 0; i < n; i++) {
    const a0 = (Math.PI * 2 * i) / n;
    disk(png, cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, w, r, g, b, a);
  }
}

function cellBlit(dest, src, ox, oy) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (y * src.width + x) * 4;
      const di = ((oy + y) * dest.width + (ox + x)) * 4;
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
    cellBlit(sheet, frame, (i % 2) * cell, Math.floor(i / 2) * cell);
  }
  return sheet;
}

function write(name, png) {
  mkdirSync(rawDir, { recursive: true });
  writeFileSync(path.join(rawDir, name), PNG.sync.write(png));
  console.log('raw', name, `${png.width}x${png.height}`);
}

function fxBoomerangBlade() {
  write('fx_boomerangBlade_raw.png', fxSheet((png, frame) => {
    const c = 128;
    const spin = -0.35 + frame * 0.22;
    const R = 78;
    const n = 42;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = spin + t * 2.35 - 1.05;
      const rad = 28 + Math.sin(t * Math.PI) * R;
      const x = c - 8 + Math.cos(a) * rad;
      const y = c + Math.sin(a) * rad;
      const mid = Math.sin(t * Math.PI);
      const w = 3.2 + 7.5 * mid;
      disk(png, x, y, w + 2.2, 186, 230, 253);
      disk(png, x, y, w, 248, 250, 252);
      disk(png, x, y, w * 0.35, 255, 255, 255);
    }
    const tipA = spin + 1.3;
    disk(png, c - 8 + Math.cos(tipA) * 92, c + Math.sin(tipA) * 92, 7 + frame, 255, 255, 255);
    disk(png, c - 6, c, 6, 125, 211, 252);
    for (let k = 0; k < 4; k++) {
      disk(png, c - 22 - k * 10, c + Math.sin(frame + k) * 6, 2.4, 224, 242, 254);
    }
  }));
}

function fxInfinityChakram() {
  write('fx_infinityChakram_raw.png', fxSheet((png, frame) => {
    const c = 128;
    const rot = frame * Math.PI / 6;
    ring(png, c, c, 62, 9.5, 186, 230, 253);
    ring(png, c, c, 62, 5.2, 248, 250, 252);
    ring(png, c, c, 62, 2.2, 255, 255, 255);
    ring(png, c, c, 38, 3.2, 224, 231, 255);
    for (let k = 0; k < 6; k++) {
      const a = rot + (Math.PI * 2 * k) / 6;
      const x0 = c + Math.cos(a) * 48;
      const y0 = c + Math.sin(a) * 48;
      const x1 = c + Math.cos(a) * 96;
      const y1 = c + Math.sin(a) * 96;
      const px = -Math.sin(a);
      const py = Math.cos(a);
      poly(png, [
        [x0 + px * 7, y0 + py * 7],
        [x1, y1],
        [x0 - px * 7, y0 - py * 7],
      ], 241, 245, 249);
      disk(png, x1, y1, 5.5, 255, 255, 255);
    }
    disk(png, c, c, 10 + frame, 224, 242, 254);
    disk(png, c, c, 4, 255, 255, 255);
  }));
}

function fxShrapnelMine() {
  write('fx_shrapnelMine_raw.png', fxSheet((png, frame) => {
    const c = 128;
    const pulse = 1 + frame * 0.03;
    ellipse(png, c, c, 46 * pulse, 40 * pulse, 251, 191, 36);
    ellipse(png, c, c - 4, 30, 26, 253, 224, 71);
    disk(png, c, c - 2, 10, 254, 249, 195);
    const led = frame % 2 === 0 ? [239, 68, 68] : [254, 226, 226];
    disk(png, c, c - 6, 6, ...led);
    for (let k = 0; k < 10; k++) {
      const a = (Math.PI * 2 * k) / 10 + frame * 0.08;
      const x0 = c + Math.cos(a) * 34;
      const y0 = c + Math.sin(a) * 34;
      const x1 = c + Math.cos(a) * (70 + frame * 3);
      const y1 = c + Math.sin(a) * (70 + frame * 3);
      line(png, x0, y0, x1, y1, 4.2, 226, 232, 240);
      disk(png, x1, y1, 5.5, 248, 250, 252);
    }
  }));
}

function fxShrapnelShard() {
  write('fx_shrapnelShard_raw.png', fxSheet((png, frame) => {
    const c = 128;
    const stretch = 18 + frame * 4;
    poly(png, [
      [c + 88, c],
      [c + 18, c - 16],
      [c - 70 - stretch * 0.2, c - 5],
      [c - 78, c],
      [c - 70, c + 5],
      [c + 18, c + 16],
    ], 226, 232, 240);
    poly(png, [
      [c + 78, c],
      [c + 10, c - 7],
      [c - 40, c],
      [c + 10, c + 7],
    ], 253, 224, 71);
    disk(png, c + 80, c, 6, 255, 255, 255);
    disk(png, c - 20, c + 10 + frame, 3.2, 251, 146, 60);
    disk(png, c - 36, c - 8, 2.6, 254, 215, 170);
  }));
}

function fxClusterDeathBomb() {
  write('fx_clusterDeathBomb_raw.png', fxSheet((png, frame) => {
    const c = 128;
    ellipse(png, c, c + 6, 52, 46, 127, 29, 29);
    ellipse(png, c, c, 44, 38, 220, 38, 38);
    ellipse(png, c, c - 8, 28, 22, 248, 113, 113);
    line(png, c - 40, c - 2, c + 40, c - 2, 4, 250, 204, 21);
    line(png, c - 40, c + 10, c + 40, c + 10, 3.2, 250, 204, 21);
    const subs = [
      [-28, -22], [30, -18], [-8, 32], [26, 24], [-32, 16],
    ];
    for (let i = 0; i < subs.length; i++) {
      const [dx, dy] = subs[i];
      const bob = Math.sin(frame * 1.1 + i) * 3;
      disk(png, c + dx, c + dy + bob, 12, 185, 28, 28);
      disk(png, c + dx - 2, c + dy + bob - 3, 4, 254, 202, 202);
    }
    const fuse = frame % 2 === 0;
    disk(png, c, c - 48, fuse ? 8 : 5, 253, 224, 71);
    disk(png, c, c - 62, fuse ? 5 : 3, 255, 255, 255);
  }));
}

function fxClusterShard() {
  write('fx_clusterShard_raw.png', fxSheet((png, frame) => {
    const c = 128;
    ellipse(png, c + 8, c, 36 + frame * 2, 28, 185, 28, 28);
    ellipse(png, c + 4, c - 4, 22, 16, 248, 113, 113);
    disk(png, c + 28, c, 8, 254, 202, 202);
    poly(png, [
      [c + 44, c],
      [c + 18, c - 10],
      [c - 8, c],
      [c + 18, c + 10],
    ], 250, 204, 21);
    disk(png, c - 18, c - 16 - frame * 2, 5, 253, 224, 71);
    disk(png, c - 28, c - 28 - frame * 3, 3, 255, 255, 255);
  }));
}

function fxToxicWeb() {
  write('fx_toxicWeb_raw.png', fxSheet((png, frame) => {
    const c = 128;
    const pulse = 52 + frame * 6;
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI * 2 * k) / 6;
      line(png, c, c, c + Math.cos(a) * pulse, c + Math.sin(a) * pulse, 2.4, 163, 230, 53);
    }
    ring(png, c, c, 28 + frame * 3, 2.2, 190, 242, 100);
    ring(png, c, c, 48 + frame * 2, 2.0, 132, 204, 22);
    const bob = Math.sin(frame * 1.1) * 5;
    ellipse(png, c, c + bob, 26, 18, 132, 204, 22);
    ellipse(png, c, c - 4 + bob, 16, 12, 190, 242, 100);
    disk(png, c - 7, c - 8 + bob, 4, 254, 249, 195);
    disk(png, c + 7, c - 8 + bob, 4, 254, 249, 195);
    disk(png, c - 7, c - 8 + bob, 1.6, 15, 23, 42);
    disk(png, c + 7, c - 8 + bob, 1.6, 15, 23, 42);
    for (let k = 0; k < 4; k++) {
      const ang = -2.3 + k * 0.5 + frame * 0.1;
      line(png, c - 12, c + 4 + bob, c - 12 + Math.cos(ang) * 54, c + 4 + bob + Math.sin(ang) * 54, 2.4, 163, 230, 53);
      line(png, c + 12, c + 4 + bob, c + 12 - Math.cos(ang) * 54, c + 4 + bob + Math.sin(ang) * 54, 2.4, 163, 230, 53);
    }
  }));
}

function fxAbsoluteLockdown() {
  write('fx_absoluteLockdown_raw.png', fxSheet((png, frame) => {
    const c = 128;
    const pulse = 1 + frame * 0.04;
    for (let k = 0; k < 8; k++) {
      const a = (Math.PI * 2 * k) / 8 + frame * 0.05;
      line(png, c, c, c + Math.cos(a) * 92 * pulse, c + Math.sin(a) * 92 * pulse, 3.0, 192, 132, 252);
    }
    ring(png, c, c, 34 * pulse, 3.4, 216, 180, 254);
    ring(png, c, c, 58 * pulse, 3.8, 168, 85, 247);
    ring(png, c, c, 82 * pulse, 2.6, 126, 34, 206);
    // lock body
    ellipse(png, c, c + 10, 18, 16, 250, 245, 255);
    ellipse(png, c, c + 10, 10, 9, 88, 28, 135);
    ring(png, c, c - 10, 14, 4.2, 250, 245, 255);
    disk(png, c, c + 12, 4, 250, 204, 21);
  }));
}

function fxCrimsonGatling() {
  write('fx_crimsonGatling_raw.png', fxSheet((png, frame) => {
    const c = 128;
    const len = 86 + frame * 8;
    poly(png, [
      [c + len, c],
      [c + 12, c - 11],
      [c - 70, c - 4],
      [c - 78, c],
      [c - 70, c + 4],
      [c + 12, c + 11],
    ], 225, 29, 72);
    poly(png, [
      [c + len - 10, c],
      [c + 8, c - 5],
      [c - 40, c],
      [c + 8, c + 5],
    ], 254, 205, 211);
    disk(png, c + len - 4, c, 7, 255, 255, 255);
    for (let k = 0; k < 4; k++) {
      disk(png, c - 20 - k * 14, c + (k % 2 === 0 ? 10 : -10) + frame, 4 - k * 0.4, 190, 18, 60);
    }
    line(png, c - 8, c - 14, c + 40, c - 8, 2, 254, 113, 133);
  }));
}

function fxBloodCrossfire() {
  write('fx_bloodCrossfire_raw.png', fxSheet((png, frame) => {
    const c = 128;
    const arm = 78 + frame * 6;
    const thick = 11 + frame * 0.8;
    // horizontal + vertical cross, facing +X with longer east arm
    poly(png, [
      [c + arm, c],
      [c + 16, c - thick],
      [c - 54, c - thick * 0.55],
      [c - 62, c],
      [c - 54, c + thick * 0.55],
      [c + 16, c + thick],
    ], 190, 18, 60);
    poly(png, [
      [c + 8, c - arm * 0.72],
      [c + thick, c - 8],
      [c + thick * 0.4, c + 8],
      [c + 8, c + arm * 0.72],
      [c - thick * 0.4, c + 8],
      [c - thick, c - 8],
    ], 225, 29, 72);
    poly(png, [
      [c + arm - 12, c],
      [c + 10, c - 5],
      [c - 20, c],
      [c + 10, c + 5],
    ], 254, 205, 211);
    disk(png, c + 6, c, 10, 254, 226, 226);
    disk(png, c + arm - 8, c, 7, 255, 255, 255);
    disk(png, c, c - arm * 0.62, 5, 251, 113, 133);
    disk(png, c, c + arm * 0.62, 5, 251, 113, 133);
  }));
}

fxBoomerangBlade();
fxInfinityChakram();
fxShrapnelMine();
fxShrapnelShard();
fxClusterDeathBomb();
fxClusterShard();
fxToxicWeb();
fxAbsoluteLockdown();
fxCrimsonGatling();
fxBloodCrossfire();
console.log('done', rawDir);
