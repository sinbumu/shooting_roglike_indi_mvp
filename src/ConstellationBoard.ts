import type { ConstellationId } from './types';
import {
  CANVAS, CONSTELLATION, CONSTELLATION_FX, constellationUnlockCost,
} from './GameConfig';
import type { MetaSave } from './Meta';
import {
  constellationLv, isConstellationAdjacent, tryUnlockConstellation, tryRefundConstellation,
} from './Meta';

interface NodePos {
  id: ConstellationId;
  x: number;
  y: number;
}

interface Spark {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const CORE_R = 22;
const STEP = 78;
const NODE_R = 16;

/** 세션 중 마지막으로 투자/회수한 노드 — 재오픈 시 카메라 포커스 */
let sessionLastInvested: ConstellationId | null = null;

/** 중심에서 시계 반대, 위쪽부터 갈래 */
const BRANCHES: { ids: ConstellationId[][] }[] = [
  { ids: [['voidPredator'], ['disasterEye'], ['traitorLegion']] },
  { ids: [['shieldBreaker'], ['deathArena'], ['twinDread', 'hunterToy']] },
  { ids: [['spacetime'], ['overloadGear'], ['purist', 'sniper', 'berserker', 'pacifist']] },
  { ids: [['greed'], ['glassCannon'], ['bloodFeast'], ['giantMarch'], ['darkFog']] },
  { ids: [['endlessAbyss'], ['fateWheel'], ['altarFrenzy'], ['infiniteOrbit']] },
  { ids: [['fateMelee', 'fateSummon', 'fateProjectile'], ['fateSurvival', 'fateUtility', 'fateOffense']] },
];
const DEG = (Math.PI * 2) / BRANCHES.length;

function hexAlpha(color: string, a: number): string {
  const n = parseInt(color.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}

function layoutNodes(): NodePos[] {
  const out: NodePos[] = [];
  for (let b = 0; b < BRANCHES.length; b++) {
    const base = -Math.PI / 2 + b * DEG;
    BRANCHES[b].ids.forEach((group, depth) => {
      const dist = STEP * (depth + 1);
      const n = group.length;
      group.forEach((id, i) => {
        const spread = n <= 1 ? 0 : (n === 2 ? 0.22 : 0.18);
        const off = n <= 1 ? 0 : (i - (n - 1) / 2) * spread;
        out.push({
          id,
          x: Math.cos(base + off) * dist,
          y: Math.sin(base + off) * dist,
        });
      });
    });
  }
  return out;
}

const NODES = layoutNodes();

function parentId(id: ConstellationId): ConstellationId | null {
  return CONSTELLATION[id].prereq;
}

export class ConstellationBoard {
  private overlay: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tooltip: HTMLElement;
  private pointsEl: HTMLElement;
  private getMeta: () => MetaSave;
  private onChange: () => void;
  private playUnlock: () => void;
  private onWarn: (msg: string) => void;

  private panX = 0;
  private panY = 0;
  private scale: number = CONSTELLATION_FX.zoomDefault;
  private refundMode = false;
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private panStartX = 0;
  private panStartY = 0;
  private moved = false;

  private holdId: ConstellationId | null = null;
  private holdT = 0;
  private hoverId: ConstellationId | null = null;

  private shake = 0;
  private sparks: Spark[] = [];
  private running = false;
  private raf = 0;
  private lastTs = 0;
  private flow = 0;

  private refundBtn: HTMLButtonElement;
  private zoomInBtn: HTMLButtonElement;
  private zoomOutBtn: HTMLButtonElement;

  constructor(
    overlay: HTMLElement,
    canvas: HTMLCanvasElement,
    tooltip: HTMLElement,
    pointsEl: HTMLElement,
    getMeta: () => MetaSave,
    onChange: () => void,
    playUnlock: () => void,
    onWarn: (msg: string) => void,
  ) {
    this.overlay = overlay;
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    this.tooltip = tooltip;
    this.pointsEl = pointsEl;
    this.getMeta = getMeta;
    this.onChange = onChange;
    this.playUnlock = playUnlock;
    this.onWarn = onWarn;

    this.refundBtn = document.getElementById('cst-refund-btn') as HTMLButtonElement;
    this.zoomInBtn = document.getElementById('cst-zoom-in') as HTMLButtonElement;
    this.zoomOutBtn = document.getElementById('cst-zoom-out') as HTMLButtonElement;

    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointerleave', () => {
      if (!this.dragging) this.hideTip();
    });
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.zoomInBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.zoomAtCenter(CONSTELLATION_FX.zoomStep);
    });
    this.zoomOutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.zoomAtCenter(1 / CONSTELLATION_FX.zoomStep);
    });
    this.refundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setRefundMode(!this.refundMode);
    });
    window.addEventListener('resize', () => {
      if (this.running) this.resize();
    });
  }

  open(): void {
    this.overlay.classList.remove('hidden');
    this.refundMode = false;
    this.syncRefundBtn();
    this.holdId = null;
    this.hoverId = null;
    this.hideTip();
    this.resize();
    this.scale = this.clampScale(CONSTELLATION_FX.zoomDefault);
    this.focusOn(this.pickFocus());
    this.refreshPoints();
    this.running = true;
    this.lastTs = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  close(): void {
    this.overlay.classList.add('hidden');
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.holdId = null;
    this.refundMode = false;
    this.syncRefundBtn();
    this.hideTip();
  }

  isOpen(): boolean {
    return !this.overlay.classList.contains('hidden');
  }

  private setRefundMode(on: boolean): void {
    this.refundMode = on;
    this.holdId = null;
    this.holdT = 0;
    this.syncRefundBtn();
  }

  private syncRefundBtn(): void {
    this.refundBtn.textContent = this.refundMode ? '노드 회수: ON' : '노드 회수: OFF';
    this.refundBtn.classList.toggle('cst-refund-on', this.refundMode);
  }

  private viewSize(): { w: number; h: number } {
    return {
      w: this.canvas.clientWidth || CANVAS.width,
      h: this.canvas.clientHeight || CANVAS.height,
    };
  }

  private clampScale(s: number): number {
    const { w, h } = this.viewSize();
    let maxR = CORE_R + 24;
    for (const n of NODES) maxR = Math.max(maxR, Math.hypot(n.x, n.y) + NODE_R + 24);
    const fit = Math.min(w, h) / (2 * maxR);
    const min = Math.max(0.35, Math.min(1, fit));
    return Math.min(CONSTELLATION_FX.zoomMax, Math.max(min, s));
  }

  private pickFocus(): NodePos {
    const meta = this.getMeta();
    if (sessionLastInvested && constellationLv(meta, sessionLastInvested) > 0) {
      const n = NODES.find((x) => x.id === sessionLastInvested);
      if (n) return n;
    }
    return { id: 'voidPredator', x: 0, y: 0 };
  }

  private focusOn(pos: { x: number; y: number }): void {
    this.panX = -pos.x * this.scale;
    this.panY = -pos.y * this.scale;
  }

  private zoomAt(px: number, py: number, nextScale: number): void {
    const { w, h } = this.viewSize();
    const wx = (px - (w / 2 + this.panX)) / this.scale;
    const wy = (py - (h / 2 + this.panY)) / this.scale;
    this.scale = this.clampScale(nextScale);
    this.panX = px - w / 2 - wx * this.scale;
    this.panY = py - h / 2 - wy * this.scale;
  }

  private zoomAtCenter(factor: number): void {
    const { w, h } = this.viewSize();
    this.zoomAt(w / 2, h / 2, this.scale * factor);
  }

  private onWheel(e: WheelEvent): void {
    if (!this.running) return;
    e.preventDefault();
    const p = this.localFromClient(e.clientX, e.clientY);
    const factor = e.deltaY > 0 ? 1 / CONSTELLATION_FX.zoomStep : CONSTELLATION_FX.zoomStep;
    this.zoomAt(p.x, p.y, this.scale * factor);
  }

  private refreshPoints(): void {
    this.pointsEl.textContent = String(this.getMeta().pantheonPoints);
  }

  private resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || CANVAS.width;
    const h = this.canvas.clientHeight || CANVAS.height;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private origin(): { x: number; y: number } {
    const { w, h } = this.viewSize();
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 6 : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 6 : 0;
    return { x: w / 2 + this.panX + sx, y: h / 2 + this.panY + sy };
  }

  private toWorld(cx: number, cy: number): { x: number; y: number } {
    const o = this.origin();
    return { x: (cx - o.x) / this.scale, y: (cy - o.y) / this.scale };
  }

  private hitNode(wx: number, wy: number): ConstellationId | null {
    let best: ConstellationId | null = null;
    let bestD = NODE_R + 8;
    for (const n of NODES) {
      const d = Math.hypot(n.x - wx, n.y - wy);
      if (d < bestD) {
        bestD = d;
        best = n.id;
      }
    }
    return best;
  }

  private localFromClient(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  private localPoint(e: PointerEvent): { x: number; y: number } {
    return this.localFromClient(e.clientX, e.clientY);
  }

  private onDown(e: PointerEvent): void {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.localPoint(e);
    const w = this.toWorld(p.x, p.y);
    this.dragging = true;
    this.moved = false;
    this.dragStartX = p.x;
    this.dragStartY = p.y;
    this.panStartX = this.panX;
    this.panStartY = this.panY;
    const id = this.hitNode(w.x, w.y);
    this.hoverId = id;
    if (id) {
      this.showTip(id, p.x, p.y);
      if (!this.refundMode && isConstellationAdjacent(this.getMeta(), id)) {
        this.holdId = id;
        this.holdT = 0;
      }
    } else {
      this.hideTip();
    }
  }

  private onMove(e: PointerEvent): void {
    const p = this.localPoint(e);
    if (this.dragging) {
      const dx = p.x - this.dragStartX;
      const dy = p.y - this.dragStartY;
      if (Math.hypot(dx, dy) > 8) {
        this.moved = true;
        this.holdId = null;
        this.holdT = 0;
      }
      if (this.moved) {
        this.panX = this.panStartX + dx;
        this.panY = this.panStartY + dy;
        this.hoverId = null;
        this.hideTip();
        return;
      }
    }
    const w = this.toWorld(p.x, p.y);
    const id = this.hitNode(w.x, w.y);
    this.hoverId = id;
    if (id) this.showTip(id, p.x, p.y);
    else this.hideTip();
    if (this.holdId && id !== this.holdId) {
      this.holdId = null;
      this.holdT = 0;
    }
  }

  private onUp(e: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    this.holdId = null;
    this.holdT = 0;
    const p = this.localPoint(e);
    const w = this.toWorld(p.x, p.y);
    const id = this.hitNode(w.x, w.y);
    this.hoverId = id;
    if (id && !this.moved) {
      if (this.refundMode) this.tryRefund(id);
      this.showTip(id, p.x, p.y);
    } else this.hideTip();
  }

  private tryUnlock(id: ConstellationId): void {
    const meta = this.getMeta();
    const ok = tryUnlockConstellation(meta, id);
    if (!ok) {
      this.shake = 0.35;
      return;
    }
    sessionLastInvested = id;
    this.playUnlock();
    this.shake = 0.7;
    const n = NODES.find((x) => x.id === id);
    if (n) this.burst(n.x, n.y, CONSTELLATION[id].color);
    this.refreshPoints();
    this.onChange();
    this.showTip(id, this.dragStartX, this.dragStartY);
  }

  private tryRefund(id: ConstellationId): void {
    const meta = this.getMeta();
    const result = tryRefundConstellation(meta, id);
    if (result === 'blocked') {
      this.shake = 0.35;
      this.onWarn('하위 노드를 먼저 회수해야 합니다');
      return;
    }
    if (result === 'none') {
      this.shake = 0.2;
      return;
    }
    sessionLastInvested = constellationLv(meta, id) > 0 ? id : sessionLastInvested;
    this.refreshPoints();
    this.onChange();
  }

  private burst(x: number, y: number, color: string): void {
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 180;
      this.sparks.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.7,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  private showTip(id: ConstellationId, cx: number, cy: number): void {
    const def = CONSTELLATION[id];
    const meta = this.getMeta();
    const lv = constellationLv(meta, id);
    const adj = isConstellationAdjacent(meta, id);
    const cost = constellationUnlockCost(id, lv);
    const locked = !adj && lv === 0;
    let costLine = def.repeatable
      ? `투자 ${cost}pt · 중첩 ${lv}`
      : lv > 0 ? '해금됨' : `해금 ${cost}pt`;
    if (this.refundMode && lv > 0) costLine = '클릭하여 1pt 회수';
    else if (this.refundMode && lv === 0) costLine = '회수할 투자가 없습니다';
    const holdHint = !this.refundMode && adj && (lv === 0 || def.repeatable) ? ' · 0.5초 홀드' : '';
    this.tooltip.innerHTML = `
      <div class="cst-tip-title" style="color:${def.color}">${def.icon} ${def.name}</div>
      <div class="cst-tip-penalty">${def.penalty}</div>
      <div class="cst-tip-reward">${def.reward}</div>
      <div class="cst-tip-cost">${locked ? '선행 노드 필요' : costLine}${holdHint}</div>
    `;
    this.tooltip.classList.remove('hidden');
    const w = this.canvas.clientWidth || CANVAS.width;
    const left = Math.max(8, Math.min(w - 220, cx + 18));
    const top = Math.max(8, cy - 24);
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  private hideTip(): void {
    this.tooltip.classList.add('hidden');
  }

  private tick(ts: number): void {
    if (!this.running) return;
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
    this.lastTs = ts;
    this.flow += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.4);
    if (this.holdId) {
      this.holdT += dt;
      if (this.holdT >= CONSTELLATION_FX.holdSec) {
        this.tryUnlock(this.holdId);
        this.holdId = null;
        this.holdT = 0;
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.96;
      s.vy *= 0.96;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }
    this.draw();
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  private drawInvestableGlow(n: NodePos, color: string, r: number): void {
    const ctx = this.ctx;
    const pulse = 0.3 + 0.2 * (0.5 + 0.5 * Math.sin(this.flow * 2.1));
    const rad = r + 20;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grd = ctx.createRadialGradient(n.x, n.y, r * 0.15, n.x, n.y, rad);
    grd.addColorStop(0, hexAlpha(color, pulse));
    grd.addColorStop(0.5, hexAlpha(color, pulse * 0.4));
    grd.addColorStop(1, hexAlpha(color, 0));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(n.x, n.y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private draw(): void {
    const ctx = this.ctx;
    const { w, h } = this.viewSize();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#050816';
    ctx.fillRect(0, 0, w, h);

    const o = this.origin();
    const meta = this.getMeta();

    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(this.scale, this.scale);

    for (const n of NODES) {
      const parent = parentId(n.id);
      const from = parent ? NODES.find((x) => x.id === parent) : { x: 0, y: 0 };
      if (!from) continue;
      const lv = constellationLv(meta, n.id);
      const col = CONSTELLATION[n.id].color;
      ctx.strokeStyle = lv > 0 ? hexAlpha(col, 0.85) : 'rgba(148,163,184,0.22)';
      ctx.lineWidth = lv > 0 ? 2.4 : 1.2;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();
      if (lv > 0) {
        const t = (this.flow * 0.55 + n.x * 0.01) % 1;
        const px = from.x + (n.x - from.x) * t;
        const py = from.y + (n.y - from.y) * t;
        ctx.fillStyle = hexAlpha(col, 0.95);
        ctx.beginPath();
        ctx.arc(px, py, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const pulse = 0.55 + Math.sin(this.flow * 4) * 0.45;
    ctx.shadowColor = '#e0f2fe';
    ctx.shadowBlur = 18 + pulse * 10;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, CORE_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(125,211,252,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (const n of NODES) {
      const def = CONSTELLATION[n.id];
      const lv = constellationLv(meta, n.id);
      const adj = isConstellationAdjacent(meta, n.id);
      const holding = this.holdId === n.id;
      let r = NODE_R;
      if (lv > 0) r = NODE_R + 2;
      else if (!adj) r = NODE_R * 0.55;

      if (lv > 0) {
        ctx.fillStyle = hexAlpha(def.color, 0.92);
      } else if (adj) {
        this.drawInvestableGlow(n, def.color, r);
        ctx.fillStyle = hexAlpha(def.color, 0.88);
      } else {
        ctx.fillStyle = '#334155';
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.hoverId === n.id ? '#f8fafc' : hexAlpha('#f8fafc', 0.35);
      ctx.lineWidth = this.hoverId === n.id ? 2 : 1;
      ctx.stroke();

      ctx.fillStyle = lv > 0 || adj ? '#0f172a' : '#64748b';
      ctx.font = `${lv > 0 ? 13 : 10}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, n.x, n.y + 1);

      if (def.repeatable && lv > 0) {
        ctx.fillStyle = '#fde68a';
        ctx.font = '9px sans-serif';
        ctx.fillText(`×${lv}`, n.x, n.y + r + 10);
      }

      if (holding) {
        const t = Math.min(1, this.holdT / CONSTELLATION_FX.holdSec);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
        ctx.stroke();
      }
    }

    for (const s of this.sparks) {
      ctx.globalAlpha = Math.max(0, s.life / s.maxLife);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
