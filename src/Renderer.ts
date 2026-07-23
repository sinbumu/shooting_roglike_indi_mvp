import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { GameState } from './GameState';
import { CANVAS, PLAYER } from './GameConfig';

// ============================================================
// PixiJS(WebGL) 렌더러 — GameState를 읽기만 하고 변경하지 않는다.
// (이펙트 이벤트 큐(state.events)만 소비 후 비운다)
// ============================================================

const hex = (css: string): number => parseInt(css.slice(1), 16);

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

/** 수명 기반 파티클 (additive blend 글로우/링) */
interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  sizeFrom: number;
  sizeTo: number;
  alphaFrom: number;
  drag: number;
  gravity: number;
}

interface ParticleOpts {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  life: number;
  sizeFrom: number;
  sizeTo: number;
  alphaFrom?: number;
  tint: number;
  drag?: number;
  gravity?: number;
  ring?: boolean;
}

/** 매 프레임 재할당하는 글로우 스프라이트 풀 (투사체/보석/엔진 광원용) */
class FramePool {
  private sprites: Sprite[] = [];
  private used = 0;

  constructor(private layer: Container, private tex: Texture) {}

  begin(): void {
    this.used = 0;
  }

  get(): Sprite {
    let s = this.sprites[this.used];
    if (!s) {
      s = new Sprite(this.tex);
      s.anchor.set(0.5);
      s.blendMode = 'add';
      this.layer.addChild(s);
      this.sprites.push(s);
    }
    s.visible = true;
    this.used++;
    return s;
  }

  end(): void {
    for (let i = this.used; i < this.sprites.length; i++) {
      this.sprites[i].visible = false;
    }
  }
}

// ------------------------------------------------------------
// 프로시저럴 텍스처 생성 (외부 애셋 없이 글로우/링을 만든다)
// ------------------------------------------------------------

function makeGlowTexture(): Texture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.65, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(c);
}

function makeRingTexture(): Texture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 9;
  ctx.shadowColor = 'white';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(64, 64, 48, 0, Math.PI * 2);
  ctx.stroke();
  return Texture.from(c);
}

function makeBgTexture(): Texture {
  const c = document.createElement('canvas');
  c.width = CANVAS.width;
  c.height = CANVAS.height;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS.height);
  g.addColorStop(0, '#0b0e22');
  g.addColorStop(1, '#070812');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  return Texture.from(c);
}

// ============================================================

export class Renderer {
  private app!: Application;

  /** 화면 흔들림 대상 루트 (플래시는 흔들리지 않도록 stage 직속) */
  private world = new Container();

  private starG = new Graphics();
  private projG = new Graphics();
  private enemyG = new Graphics();
  private gemG = new Graphics();
  private playerG = new Graphics();
  private coreG = new Graphics();
  private warnG = new Graphics();
  private flashG = new Graphics();
  private glowLayer = new Container();
  private fxLayer = new Container();

  private glowTex!: Texture;
  private ringTex!: Texture;
  private glowPool!: FramePool;

  private particles: Particle[] = [];
  private freeSprites: Sprite[] = [];

  private stars: Star[] = [];
  private elapsed = 0;

  // 화면 흔들림 / 피격 플래시
  private shakeTime = 0;
  private shakeDur = 1;
  private shakeMag = 0;
  private flashAlpha = 0;

  async init(canvas: HTMLCanvasElement): Promise<void> {
    this.app = new Application();
    await this.app.init({
      canvas,
      width: CANVAS.width,
      height: CANVAS.height,
      backgroundColor: 0x070812,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: false,
    });
    this.app.ticker.stop(); // 게임 루프에서 수동 렌더링

    this.glowTex = makeGlowTexture();
    this.ringTex = makeRingTexture();
    this.glowPool = new FramePool(this.glowLayer, this.glowTex);

    const bg = new Sprite(makeBgTexture());
    this.world.addChild(
      bg, this.starG, this.projG, this.enemyG, this.gemG,
      this.playerG, this.glowLayer, this.coreG, this.fxLayer, this.warnG,
    );
    this.app.stage.addChild(this.world, this.flashG);

    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.random() * CANVAS.width,
        y: Math.random() * CANVAS.height,
        size: Math.random() * 1.8 + 0.4,
        speed: Math.random() * 60 + 25,
      });
    }
  }

  // ==========================================================

  render(state: GameState, dt: number): void {
    this.elapsed += dt;

    this.consumeEvents(state);
    this.updateParticles(dt);
    this.updateShake(dt);
    this.updateFlash(dt);

    this.glowPool.begin();
    this.coreG.clear();

    this.drawStars(dt, state.status !== 'gameover');
    this.drawGems(state);
    this.drawEnemies(state);
    this.drawProjectiles(state);
    this.drawPlayer(state, dt);
    this.drawWarnings(state);

    this.glowPool.end();
    this.app.render();
  }

  // ---------- 이펙트 이벤트 소비 ----------

  private consumeEvents(state: GameState): void {
    for (const ev of state.events) {
      switch (ev.type) {
        case 'enemyDied':
          this.explode(ev.x, ev.y, hex(ev.color), ev.radius);
          break;
        case 'enemyHit':
          this.hitSpark(ev.x, ev.y, hex(ev.color));
          break;
        case 'fired':
          this.muzzleFlash(ev.x, ev.y, hex(ev.color));
          break;
        case 'gemPickup':
          this.gemBurst(ev.x, ev.y);
          break;
        case 'playerHit':
          this.flashAlpha = 0.45;
          this.shake(7, 0.35);
          break;
        case 'levelUp':
          this.levelUpBurst(ev.x, ev.y);
          break;
      }
    }
    state.events.length = 0;
  }

  // ---------- 파티클 시스템 ----------

  private spawnParticle(o: ParticleOpts): void {
    let sprite = this.freeSprites.pop();
    if (!sprite) {
      sprite = new Sprite();
      sprite.anchor.set(0.5);
      sprite.blendMode = 'add';
      this.fxLayer.addChild(sprite);
    }
    sprite.texture = o.ring ? this.ringTex : this.glowTex;
    sprite.visible = true;
    sprite.tint = o.tint;
    sprite.position.set(o.x, o.y);
    sprite.width = sprite.height = o.sizeFrom;
    sprite.alpha = o.alphaFrom ?? 1;

    this.particles.push({
      sprite,
      vx: o.vx ?? 0,
      vy: o.vy ?? 0,
      life: o.life,
      maxLife: o.life,
      sizeFrom: o.sizeFrom,
      sizeTo: o.sizeTo,
      alphaFrom: o.alphaFrom ?? 1,
      drag: o.drag ?? 0,
      gravity: o.gravity ?? 0,
    });
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        this.freeSprites.push(p.sprite);
        this.particles.splice(i, 1);
        continue;
      }
      const damp = Math.max(0, 1 - p.drag * dt);
      p.vx *= damp;
      p.vy = p.vy * damp + p.gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;

      const t = 1 - p.life / p.maxLife;
      const size = p.sizeFrom + (p.sizeTo - p.sizeFrom) * t;
      p.sprite.width = p.sprite.height = size;
      p.sprite.alpha = p.alphaFrom * (p.life / p.maxLife);
    }
  }

  // ---------- 개별 이펙트 ----------

  /** 적 사망: 색상 파편 + 흰 스파크 + 충격파 링 (+큰 적이면 화면 흔들림) */
  private explode(x: number, y: number, tint: number, radius: number): void {
    const power = radius / 14;
    const n = 10 + Math.floor(radius * 0.7);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = (60 + Math.random() * 260) * power;
      this.spawnParticle({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.35 + Math.random() * 0.4,
        sizeFrom: 6 + Math.random() * 10 * power,
        sizeTo: 1,
        tint,
        drag: 1.6,
        gravity: 60,
      });
    }
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 180 + Math.random() * 320;
      this.spawnParticle({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.15 + Math.random() * 0.18,
        sizeFrom: 3 + Math.random() * 4,
        sizeTo: 1,
        tint: 0xffffff,
        drag: 0.5,
      });
    }
    // 중심 섬광 + 충격파 링
    this.spawnParticle({ x, y, life: 0.18, sizeFrom: radius * 3.4, sizeTo: radius, tint: 0xffffff, alphaFrom: 0.9 });
    this.spawnParticle({ x, y, life: 0.45, sizeFrom: radius * 1.6, sizeTo: radius * 7.5, tint, alphaFrom: 0.85, ring: true });

    if (radius >= 20) this.shake(5, 0.3);
    else if (radius >= 16) this.shake(2.5, 0.15);
  }

  private hitSpark(x: number, y: number, tint: number): void {
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      this.spawnParticle({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.14 + Math.random() * 0.12,
        sizeFrom: 5 + Math.random() * 5,
        sizeTo: 1,
        tint: Math.random() < 0.5 ? 0xffffff : tint,
        drag: 1,
      });
    }
  }

  private muzzleFlash(x: number, y: number, tint: number): void {
    this.spawnParticle({
      x, y,
      vy: -50,
      life: 0.1,
      sizeFrom: 26,
      sizeTo: 6,
      tint,
      alphaFrom: 0.9,
    });
  }

  private gemBurst(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const speed = 80 + Math.random() * 160;
      this.spawnParticle({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.25 + Math.random() * 0.2,
        sizeFrom: 5 + Math.random() * 5,
        sizeTo: 1,
        tint: 0x34d399,
        drag: 1.5,
      });
    }
    this.spawnParticle({ x, y, life: 0.3, sizeFrom: 10, sizeTo: 64, tint: 0x34d399, alphaFrom: 0.7, ring: true });
  }

  private levelUpBurst(x: number, y: number): void {
    this.spawnParticle({ x, y, life: 0.6, sizeFrom: 24, sizeTo: 280, tint: 0xfbbf24, alphaFrom: 0.9, ring: true });
    this.spawnParticle({ x, y, life: 0.8, sizeFrom: 12, sizeTo: 380, tint: 0x38bdf8, alphaFrom: 0.5, ring: true });
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 320;
      this.spawnParticle({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.5 + Math.random() * 0.4,
        sizeFrom: 6 + Math.random() * 8,
        sizeTo: 1,
        tint: Math.random() < 0.5 ? 0xfbbf24 : 0xfde68a,
        drag: 1.4,
      });
    }
  }

  private shake(mag: number, dur: number): void {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTime = Math.max(this.shakeTime, dur);
    this.shakeDur = Math.max(this.shakeDur === 1 && this.shakeTime === dur ? dur : this.shakeDur, dur);
  }

  private updateShake(dt: number): void {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const k = Math.max(0, this.shakeTime / this.shakeDur);
      this.world.position.set(
        (Math.random() - 0.5) * 2 * this.shakeMag * k,
        (Math.random() - 0.5) * 2 * this.shakeMag * k,
      );
      if (this.shakeTime <= 0) {
        this.shakeMag = 0;
        this.shakeDur = 1;
      }
    } else {
      this.world.position.set(0, 0);
    }
  }

  private updateFlash(dt: number): void {
    this.flashG.clear();
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.8);
      this.flashG.rect(0, 0, CANVAS.width, CANVAS.height).fill({ color: 0xef4444, alpha: this.flashAlpha });
    }
  }

  // ---------- 월드 드로잉 ----------

  private drawStars(dt: number, scrolling: boolean): void {
    const g = this.starG;
    g.clear();
    for (const s of this.stars) {
      if (scrolling) {
        s.y += s.speed * dt;
        if (s.y > CANVAS.height) {
          s.y = -2;
          s.x = Math.random() * CANVAS.width;
        }
      }
      g.rect(s.x, s.y, s.size, s.size * 2.2).fill({ color: 0xffffff, alpha: 0.25 + s.size * 0.3 });
    }
  }

  private drawPlayer(state: GameState, dt: number): void {
    const g = this.playerG;
    g.clear();
    const { playerX: x, playerY: y } = state;

    if (state.status === 'ready' || state.status === 'gameover') return;

    // 엔진 트레일 파티클 (플레이 중에만)
    if (state.status === 'playing' && dt > 0) {
      this.spawnParticle({
        x: x + (Math.random() - 0.5) * 6,
        y: y + 13,
        vy: 130 + Math.random() * 60,
        life: 0.22 + Math.random() * 0.1,
        sizeFrom: 9 + Math.random() * 5,
        sizeTo: 2,
        tint: 0xfb923c,
        alphaFrom: 0.75,
      });
    }

    // 무적 시간 동안 깜빡임
    if (state.invincibleLeft > 0 && Math.floor(this.elapsed * 14) % 2 === 0) return;

    // 엔진 글로우
    const engine = this.glowPool.get();
    engine.tint = 0xfb923c;
    engine.position.set(x, y + 14);
    engine.width = engine.height = 26 + Math.sin(this.elapsed * 28) * 7;
    engine.alpha = 0.9;

    // 기체
    g.poly([x, y - PLAYER.radius - 4, x - 13, y + 10, x - 4, y + 6, x, y + 9, x + 4, y + 6, x + 13, y + 10], true)
      .fill(0x7dd3fc)
      .stroke({ width: 1.5, color: 0xe0f2fe });
    g.circle(x, y - 2, 3.5).fill(0xf0f9ff);
  }

  private drawEnemies(state: GameState): void {
    const g = this.enemyG;
    g.clear();
    for (const e of state.enemies) {
      const r = e.def.radius;
      const color = e.hitFlash > 0 ? 0xffffff : hex(e.def.color);

      let pts: number[] = [];
      switch (e.def.id) {
        case 'drone':
          pts = [0, r, -r, -r * 0.7, r, -r * 0.7];
          break;
        case 'zigzag':
          pts = [0, r, -r, 0, 0, -r, r, 0];
          break;
        case 'dasher':
          pts = [e.dir * r, 0, -e.dir * r, -r * 0.8, -e.dir * r * 0.3, 0, -e.dir * r, r * 0.8];
          break;
        case 'rusher':
          pts = [0, -r, -r * 0.9, r * 0.8, 0, r * 0.3, r * 0.9, r * 0.8];
          break;
        case 'tank':
          pts = [-r * 0.9, -r * 0.9, r * 0.9, -r * 0.9, r * 0.9, r * 0.9, -r * 0.9, r * 0.9];
          break;
      }
      const abs: number[] = [];
      for (let i = 0; i < pts.length; i += 2) abs.push(e.x + pts[i], e.y + pts[i + 1]);
      g.poly(abs, true).fill(color).stroke({ width: 1.5, color: 0xffffff, alpha: 0.35 });

      if (e.hp < e.maxHp) {
        g.rect(e.x - r, e.y - r - 8, r * 2, 4).fill({ color: 0x000000, alpha: 0.5 });
        g.rect(e.x - r, e.y - r - 8, r * 2 * Math.max(0, e.hp / e.maxHp), 4).fill(0x4ade80);
      }
    }
  }

  private drawProjectiles(state: GameState): void {
    const g = this.projG;
    g.clear();
    for (const p of state.projectiles) {
      const color = hex(p.color);
      const angle = Math.atan2(p.vy, p.vx);
      const tail = p.radius * 4;

      // 잔상 꼬리
      g.moveTo(p.x - Math.cos(angle) * tail, p.y - Math.sin(angle) * tail)
        .lineTo(p.x, p.y)
        .stroke({ width: p.radius * 1.2, color, alpha: 0.4 });

      // 탄두 글로우 (additive)
      const glow = this.glowPool.get();
      glow.tint = color;
      glow.position.set(p.x, p.y);
      glow.width = glow.height = p.radius * 6;
      glow.alpha = 1;

      // 흰색 코어
      this.coreG.circle(p.x, p.y, p.radius * 0.55).fill(0xffffff);
    }
  }

  private drawGems(state: GameState): void {
    const g = this.gemG;
    g.clear();
    for (const gem of state.gems) {
      const pulse = 1 + Math.sin(this.elapsed * 6 + gem.x) * 0.15;
      const r = 7 * pulse;
      const rot = this.elapsed * 2;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      // 다이아몬드 4점 회전
      const local = [0, -r, r * 0.7, 0, 0, r, -r * 0.7, 0];
      const abs: number[] = [];
      for (let i = 0; i < 8; i += 2) {
        abs.push(gem.x + local[i] * cos - local[i + 1] * sin, gem.y + local[i] * sin + local[i + 1] * cos);
      }
      g.poly(abs, true).fill(0x34d399);

      const glow = this.glowPool.get();
      glow.tint = 0x34d399;
      glow.position.set(gem.x, gem.y);
      glow.width = glow.height = 26 * pulse;
      glow.alpha = 0.75;
    }
  }

  private drawWarnings(state: GameState): void {
    const g = this.warnG;
    g.clear();
    for (const w of state.warnings) {
      // 붉은 글로우는 항상 은은하게
      const glow = this.glowPool.get();
      glow.tint = 0xef4444;
      glow.position.set(w.indicatorX, w.indicatorY);
      glow.width = glow.height = 52 + Math.sin(this.elapsed * 10) * 10;
      glow.alpha = 0.5;

      // 느낌표는 깜빡임 (남은 시간이 적을수록 빠르게)
      const freq = w.timer < 0.7 ? 16 : 7;
      if (Math.floor(this.elapsed * freq) % 2 === 0) continue;

      const x = w.indicatorX;
      const y = w.indicatorY;
      g.circle(x, y, 14).fill({ color: 0xef4444, alpha: 0.25 }).stroke({ width: 2, color: 0xef4444 });
      g.rect(x - 2, y - 8, 4, 10).fill(0xef4444);
      g.rect(x - 2, y + 5, 4, 4).fill(0xef4444);
    }
  }
}
