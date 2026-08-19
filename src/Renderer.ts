import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { GameState } from './GameState';
import { CANVAS, PLAYER, PICKUPS, SHIPS, DANGER, MIRAGE, GUARDIAN, SHIELDER, TRAPPER, VORTEX, WEAPONS } from './GameConfig';
import { loadSpriteAtlas, type SpriteAtlas } from './assets';
import type { EnemyId, ShipId } from './types';

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

/** 위로 떠오르며 사라지는 데미지 숫자 */
interface DamageText {
  obj: Text;
  life: number;
  maxLife: number;
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

/** 매 프레임 텍스처를 바꿀 수 있는 일반 스프라이트 풀 */
class EntityPool {
  private sprites: Sprite[] = [];
  private used = 0;

  constructor(private layer: Container) {}

  begin(): void {
    this.used = 0;
  }

  get(tex: Texture): Sprite {
    let s = this.sprites[this.used];
    if (!s) {
      s = new Sprite(tex);
      s.anchor.set(0.5);
      this.layer.addChild(s);
      this.sprites.push(s);
    }
    s.texture = tex;
    s.visible = true;
    s.tint = 0xffffff;
    s.alpha = 1;
    s.rotation = 0;
    s.scale.set(1);
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

// ============================================================

export class Renderer {
  private app!: Application;

  /** 화면 흔들림 대상 루트 (플래시는 흔들리지 않도록 stage 직속) */
  private world = new Container();

  private starG = new Graphics();
  private bgG = new Graphics();
  private projG = new Graphics();
  private enemyG = new Graphics();
  private gemG = new Graphics();
  private pickupG = new Graphics();
  private playerG = new Graphics();
  private coreG = new Graphics();
  private warnG = new Graphics();
  private flashG = new Graphics();
  private glowLayer = new Container();
  private spriteLayer = new Container();
  private fxLayer = new Container();
  private textLayer = new Container();

  private glowTex!: Texture;
  private ringTex!: Texture;
  private glowPool!: FramePool;
  private entityPool!: EntityPool;
  private playerSprite: Sprite | null = null;
  private atlas: SpriteAtlas = { ships: {}, enemies: {}, pickups: {}, ready: false };

  private particles: Particle[] = [];
  private freeSprites: Sprite[] = [];
  private dmgTexts: DamageText[] = [];
  private freeTexts: Text[] = [];

  private stars: Star[] = [];
  private elapsed = 0;

  // 화면 흔들림 / 피격 플래시
  private shakeTime = 0;
  private shakeDur = 1;
  private shakeMag = 0;
  private flashAlpha = 0;
  private flashColor = 0xef4444;

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
    this.entityPool = new EntityPool(this.spriteLayer);
    this.atlas = await loadSpriteAtlas();

    this.world.addChild(
      this.bgG, this.starG, this.projG, this.spriteLayer, this.enemyG, this.gemG, this.pickupG,
      this.playerG, this.glowLayer, this.coreG, this.fxLayer, this.textLayer, this.warnG,
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
    this.updateDamageTexts(dt);
    this.updateShake(dt);
    this.updateFlash(dt);

    this.glowPool.begin();
    this.entityPool.begin();
    this.coreG.clear();

    this.drawBackground(state);
    this.drawStars(dt, state.status !== 'gameover');
    this.drawGems(state);
    this.drawPickups(state);
    this.drawEnemies(state);
    this.drawProjectiles(state);
    this.drawSpecials(state);
    this.drawBeams(state);
    this.drawEnemyProjectiles(state);
    this.drawPlayer(state, dt);
    this.drawWarnings(state);

    this.entityPool.end();
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
          this.spawnDamageText(ev.x, ev.y, ev.damage);
          break;
        case 'fired': {
          const spec = ev.weaponId ? WEAPONS[ev.weaponId].projectile : undefined;
          if (spec?.melee) {
            this.slashFlash(ev.x, ev.y, hex(ev.color), spec.melee.arcDeg, spec.melee.range);
          } else if (spec?.orbit) {
            this.spawnParticle({
              x: ev.x, y: ev.y, life: 0.35, sizeFrom: 28, sizeTo: spec.orbit.radius * 2.2,
              tint: hex(ev.color), alphaFrom: 0.7, ring: true,
            });
          } else if (spec?.drop) {
            this.spawnParticle({
              x: ev.x, y: ev.y, life: 0.22, sizeFrom: 10, sizeTo: 36,
              tint: hex(ev.color), alphaFrom: 0.8, ring: true,
            });
          } else {
            this.muzzleFlash(ev.x, ev.y, hex(ev.color));
          }
          break;
        }
        case 'blast':
          this.explode(ev.x, ev.y, hex(ev.color), ev.radius);
          break;
        case 'gemPickup':
          this.gemBurst(ev.x, ev.y);
          break;
        case 'playerHit':
          this.flashAlpha = 0.45;
          this.flashColor = 0xef4444;
          this.shake(7, 0.35);
          break;
        case 'levelUp':
          this.levelUpBurst(ev.x, ev.y);
          break;
        case 'bossSpawned':
          this.shake(6, 0.4);
          break;
        case 'bossDied':
          this.explode(ev.x, ev.y, 0xdc2626, 42);
          this.explode(ev.x, ev.y, 0xfbbf24, 30);
          this.flashAlpha = 0.35;
          this.flashColor = 0xffffff;
          this.shake(10, 0.5);
          break;
        case 'bossPhase':
          this.flashAlpha = 0.4;
          this.flashColor = 0xfbbf24;
          this.shake(9, 0.45);
          this.explode(ev.x, ev.y, 0xfbbf24, 36);
          break;
        case 'jackpot':
          this.flashAlpha = 0.55;
          this.flashColor = 0xfbbf24;
          this.shake(14, 0.55);
          break;
        case 'riftWarn':
          this.flashAlpha = 0.5;
          this.flashColor = 0xef4444;
          this.shake(8, 0.4);
          break;
        case 'riftReward':
          this.flashAlpha = 0.35;
          this.flashColor = 0xc084fc;
          this.shake(7, 0.35);
          break;
        case 'pickup': {
          const tint = ev.kind === 'heal' ? 0x4ade80
            : ev.kind === 'magnet' ? 0x38bdf8
            : ev.kind === 'cube' ? 0x67e8f9
            : 0xfb923c;
          this.spawnParticle({ x: ev.x, y: ev.y, life: 0.35, sizeFrom: 14, sizeTo: 90, tint, alphaFrom: 0.8, ring: true });
          break;
        }
        case 'skill': {
          const tint = ev.id === 'phaseDash' ? 0x7dd3fc
            : ev.id === 'aegis' ? 0x86efac
            : 0xc084fc;
          this.spawnParticle({ x: ev.x, y: ev.y, life: 0.4, sizeFrom: 20, sizeTo: 140, tint, alphaFrom: 0.9, ring: true });
          if (ev.id === 'aegis') {
            this.flashAlpha = 0.28;
            this.flashColor = 0x86efac;
          } else if (ev.id === 'timeDilation') {
            this.flashAlpha = 0.22;
            this.flashColor = 0xc084fc;
          }
          break;
        }
        case 'teleport':
          this.spawnParticle({ x: ev.x, y: ev.y, life: 0.32, sizeFrom: 12, sizeTo: 80, tint: 0xc084fc, alphaFrom: 0.85, ring: true });
          break;
        case 'shieldBlock':
          this.hitSpark(ev.x, ev.y, 0x67e8f9);
          break;
        case 'vacuum':
          this.spawnParticle({
            x: state.playerX, y: state.playerY,
            life: 0.45, sizeFrom: 30, sizeTo: 200,
            tint: 0x38bdf8, alphaFrom: 0.7, ring: true,
          });
          break;
        case 'bomb':
          this.flashAlpha = 0.5;
          this.flashColor = 0xffffff;
          this.shake(8, 0.4);
          break;
        default:
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

  // ---------- 데미지 숫자 ----------

  private spawnDamageText(x: number, y: number, dmg: number): void {
    if (this.dmgTexts.length > 50) return; // 폭주 방지
    let t = this.freeTexts.pop();
    if (!t) {
      t = new Text({
        text: '',
        style: {
          fontFamily: 'sans-serif',
          fontSize: 13,
          fontWeight: '800',
          fill: 0xffffff,
          stroke: { color: 0x000000, width: 3 },
        },
      });
      t.anchor.set(0.5);
      this.textLayer.addChild(t);
    }
    t.text = String(Math.round(dmg));
    t.visible = true;
    t.alpha = 1;
    t.scale.set(1);
    t.position.set(x + (Math.random() - 0.5) * 16, y - 10);
    this.dmgTexts.push({ obj: t, life: 0.5, maxLife: 0.5 });
  }

  private updateDamageTexts(dt: number): void {
    for (let i = this.dmgTexts.length - 1; i >= 0; i--) {
      const d = this.dmgTexts[i];
      d.life -= dt;
      if (d.life <= 0) {
        d.obj.visible = false;
        this.freeTexts.push(d.obj);
        this.dmgTexts.splice(i, 1);
        continue;
      }
      d.obj.y -= 75 * dt;
      d.obj.alpha = d.life / d.maxLife;
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

  private slashFlash(x: number, y: number, tint: number, arcDeg: number, range: number): void {
    const base = -Math.PI / 2;
    const half = (arcDeg * Math.PI) / 360;
    const n = arcDeg > 40 ? 10 : 7;
    for (let i = 0; i < n; i++) {
      const a = base - half + (half * 2 * i) / (n - 1);
      const spd = 160 + Math.min(range, 400) * 0.35;
      this.spawnParticle({
        x: x + Math.cos(a) * 8,
        y: y + Math.sin(a) * 8,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 0.12 + Math.random() * 0.08,
        sizeFrom: 7 + Math.min(12, range * 0.015),
        sizeTo: 2,
        tint,
        alphaFrom: 0.95,
        drag: 1.1,
      });
    }
    this.spawnParticle({
      x, y, life: 0.16, sizeFrom: 16, sizeTo: Math.min(80, range * 0.12),
      tint, alphaFrom: 0.75, ring: true,
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
      this.flashG.rect(0, 0, CANVAS.width, CANVAS.height).fill({ color: this.flashColor, alpha: this.flashAlpha });
    }
  }

  // ---------- 월드 드로잉 ----------

  private drawBackground(state: GameState): void {
    const g = this.bgG;
    g.clear();
    // Pixi Graphics fill gradient: two stacked rects with alpha blend approximation
    g.rect(0, 0, CANVAS.width, CANVAS.height).fill(state.bgBottom);
    g.rect(0, 0, CANVAS.width, CANVAS.height * 0.55).fill({ color: state.bgTop, alpha: 0.95 });
  }

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

    if (this.playerSprite) this.playerSprite.visible = false;

    if (state.status === 'ready' || state.status === 'gameover') return;

    if (state.status === 'playing' && dt > 0) {
      const focus = state.isFocusing;
      this.spawnParticle({
        x: x + (Math.random() - 0.5) * (focus ? 3 : 6),
        y: y + 13,
        vy: (focus ? 70 : 130) + Math.random() * (focus ? 30 : 60),
        life: 0.22 + Math.random() * 0.1,
        sizeFrom: (focus ? 4 : 9) + Math.random() * (focus ? 2 : 5),
        sizeTo: 2,
        tint: 0xfb923c,
        alphaFrom: focus ? 0.4 : 0.75,
      });
    }

    if (state.invincibleLeft > 0 && state.shieldLeft <= 0 && Math.floor(this.elapsed * 14) % 2 === 0) return;

    const engine = this.glowPool.get();
    engine.tint = 0xfb923c;
    engine.position.set(x, y + 14);
    const engineSize = state.isFocusing
      ? 14 + Math.sin(this.elapsed * 20) * 3
      : 26 + Math.sin(this.elapsed * 28) * 7;
    engine.width = engine.height = engineSize;
    engine.alpha = state.isFocusing ? 0.55 : 0.9;

    const shipTex = this.atlas.ships[state.shipId as ShipId];
    if (state.shieldLeft > 0) {
      const shield = this.glowPool.get();
      shield.tint = 0x86efac;
      shield.position.set(x, y);
      shield.width = shield.height = PLAYER.radius * 4.2 + Math.sin(this.elapsed * 10) * 4;
      shield.alpha = 0.55;
    }
    const skill = SHIPS[state.shipId].activeSkill;
    if (state.skillActiveLeft > 0 && skill.id === 'aegis') {
      const ar = skill.radius ?? 72;
      const aegis = this.glowPool.get();
      aegis.tint = 0x4ade80;
      aegis.position.set(x, y);
      aegis.width = aegis.height = ar * 2.5 + Math.sin(this.elapsed * 12) * 10;
      aegis.alpha = 0.55;
      this.coreG.circle(x, y, ar).stroke({ width: 3, color: 0x86efac, alpha: 0.8 });
    }
    if (state.skillActiveLeft > 0 && skill.id === 'timeDilation') {
      const glow = this.glowPool.get();
      glow.tint = 0xfdba74;
      glow.position.set(x, y);
      glow.width = glow.height = PLAYER.radius * 5 + Math.sin(this.elapsed * 8) * 6;
      glow.alpha = 0.4;
    }
    if (state.levelAegisLeft > 0) {
      const glow = this.glowPool.get();
      glow.tint = 0x86efac;
      glow.position.set(x, y);
      glow.width = glow.height = PLAYER.radius * 4.6 + Math.sin(this.elapsed * 10) * 6;
      glow.alpha = 0.45;
      this.coreG.circle(x, y, PLAYER.radius + 10)
        .stroke({ width: 2, color: 0x86efac, alpha: 0.7 });
    }
    if (shipTex) {
      if (!this.playerSprite) {
        this.playerSprite = new Sprite(shipTex);
        this.playerSprite.anchor.set(0.5);
        this.spriteLayer.addChild(this.playerSprite);
      }
      this.playerSprite.texture = shipTex;
      this.playerSprite.visible = true;
      this.playerSprite.position.set(x, y);
      const size = PLAYER.radius * 3.2;
      this.playerSprite.width = size;
      this.playerSprite.height = size;
      this.playerSprite.tint = state.shipSkinTint ? hex(state.shipSkinTint) : 0xffffff;
      if (state.isFocusing) {
        g.circle(x, y, 3.2).fill({ color: 0xfef08a, alpha: 0.95 });
        g.circle(x, y, 5.5).stroke({ width: 1.6, color: 0xfacc15, alpha: 0.9 });
      }
      return;
    }

    // Graphics 폴백
    g.poly([x, y - PLAYER.radius - 4, x - 13, y + 10, x - 4, y + 6, x, y + 9, x + 4, y + 6, x + 13, y + 10], true)
      .fill(0x7dd3fc)
      .stroke({ width: 1.5, color: 0xe0f2fe });
    g.circle(x, y - 2, 3.5).fill(0xf0f9ff);
    if (state.isFocusing) {
      g.circle(x, y, 3.2).fill({ color: 0xfef08a, alpha: 0.95 });
      g.circle(x, y, 5.5).stroke({ width: 1.6, color: 0xfacc15, alpha: 0.9 });
    }
  }

  private drawEnemies(state: GameState): void {
    const g = this.enemyG;
    g.clear();
    for (const e of state.enemies) {
      const r = e.def.radius * (e.elite ? 1.2 : 1);
      const isTrueBoss = e.def.movePattern === 'boss' || e.def.movePattern === 'bossSeraph';
      const isCommander = e.def.movePattern === 'legion';
      const isBoss = isTrueBoss || isCommander;
      const tex = this.atlas.enemies[e.def.id as EnemyId];

      if (tex) {
        const spr = this.entityPool.get(tex);
        spr.position.set(e.x, e.y);
        const size = r * 2.4;
        spr.width = size;
        spr.height = size;
        if (e.def.id === 'dasher') {
          spr.rotation = e.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          spr.rotation = 0;
        }
        if (e.hitFlash > 0) spr.tint = 0xffffff;
        else if (e.elite) spr.tint = 0xfbbf24;
        else if (e.def.id === 'warden') spr.tint = 0xf87171;
        else if (e.def.id === 'herald') spr.tint = 0xc084fc;
        else if (e.def.id === 'architect') spr.tint = 0x67e8f9;
        else if (e.def.id === 'trapper') spr.tint = 0xef4444;
        else if (e.def.id === 'vortex') spr.tint = 0x312e81;
        else if (e.mutation === 'explode') spr.tint = 0xfb923c;
        else if (e.mutation === 'split') spr.tint = 0xa3e635;
        else if (e.mutation === 'burst') spr.tint = 0xe879f9;
        else spr.tint = 0xffffff;

        const cloaked = e.def.id === 'mirage'
          && Math.hypot(state.playerX - e.x, state.playerY - e.y) > MIRAGE.revealRadius;
        spr.alpha = cloaked ? 0.2 : 1;

        if (e.elite) {
          const glow = this.glowPool.get();
          glow.tint = 0xfbbf24;
          glow.position.set(e.x, e.y);
          glow.width = glow.height = r * 3.2;
          glow.alpha = 0.55;
        } else {
          const glow = this.glowPool.get();
          glow.tint = hex(e.def.color);
          glow.position.set(e.x, e.y);
          const pulse = isBoss ? Math.sin(this.elapsed * 4.5) * 12 : 0;
          glow.width = glow.height = r * (isBoss ? 4.1 : 2.85) + pulse;
          glow.alpha = isBoss ? 0.5 : e.def.contactDamage >= 15 ? 0.42 : 0.22;
        }
        if (e.def.id === 'teleporter') {
          const glow = this.glowPool.get();
          glow.tint = hex(DANGER.fatal);
          glow.position.set(e.x, e.y);
          glow.width = glow.height = r * 3.6 + Math.sin(this.elapsed * 8) * 8;
          glow.alpha = 0.35;
        }
        if (e.def.id === 'guardian') {
          const aura = this.glowPool.get();
          aura.tint = 0xa3e635;
          aura.position.set(e.x, e.y);
          aura.width = aura.height = GUARDIAN.auraRadius * 2 + Math.sin(this.elapsed * 3) * 10;
          aura.alpha = 0.28;
        }
        if (e.def.id === 'vortex') {
          const swirl = this.glowPool.get();
          swirl.tint = 0x1e1b4b;
          swirl.position.set(e.x, e.y);
          swirl.width = swirl.height = VORTEX.pullRadius * 2 + Math.sin(this.elapsed * 2.4) * 18;
          swirl.alpha = 0.32;
          for (let k = 0; k < 3; k++) {
            const a = this.elapsed * 1.8 + (k * Math.PI * 2) / 3;
            const rr = VORTEX.pullRadius * 0.42;
            const orb = this.glowPool.get();
            orb.tint = 0x6366f1;
            orb.position.set(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr);
            orb.width = orb.height = 26;
            orb.alpha = 0.42;
          }
        }
        if (isCommander) {
          const aura = this.glowPool.get();
          aura.tint = e.def.id === 'warden' ? 0xf87171
            : e.def.id === 'herald' ? 0xc084fc
            : 0x67e8f9;
          aura.position.set(e.x, e.y);
          aura.width = aura.height = r * 5.2 + Math.sin(this.elapsed * 3.5) * 14;
          aura.alpha = 0.42;
        }
      } else {
        // Graphics 폴백
        const color = e.hitFlash > 0 ? 0xffffff : (e.elite ? 0xfbbf24 : hex(e.def.color));
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
          case 'shielder':
            pts = [-r * 0.85, -r * 0.7, r * 0.85, -r * 0.7, r, r * 0.85, 0, r, -r, r * 0.85];
            break;
          case 'teleporter':
            pts = [0, -r, r * 0.7, 0, 0, r, -r * 0.7, 0];
            break;
          case 'splinter':
            pts = [0, r * 0.9, -r * 0.7, -r * 0.6, r * 0.7, -r * 0.6];
            break;
          case 'mirage':
            pts = [0, -r, r * 0.55, 0, 0, r, -r * 0.55, 0];
            break;
          case 'guardian':
          case 'trapper':
            pts = [-r, -r * 0.6, r, -r * 0.6, r * 0.85, r, -r * 0.85, r];
            break;
          case 'vortex': {
            for (let k = 0; k < 8; k++) {
              const a = (k / 8) * Math.PI * 2 + e.age * 1.4;
              pts.push(Math.cos(a) * r, Math.sin(a) * r * 0.7);
            }
            break;
          }
          case 'warden':
          case 'herald':
          case 'architect':
          case 'boss':
          case 'bossSeraph': {
            const sides = e.def.id === 'bossSeraph' ? 8 : 6;
            for (let k = 0; k < sides; k++) {
              const a = (k / sides) * Math.PI * 2 + e.age * 0.5;
              pts.push(Math.cos(a) * r, Math.sin(a) * r);
            }
            break;
          }
        }
        const abs: number[] = [];
        for (let i = 0; i < pts.length; i += 2) abs.push(e.x + pts[i], e.y + pts[i + 1]);
        g.poly(abs, true).fill(color).stroke({
          width: e.elite ? 2.5 : 1.5,
          color: e.elite ? 0xfde68a : 0xffffff,
          alpha: e.elite ? 0.9 : 0.35,
        });
      }

      if (e.def.id === 'shielder' && (e.shieldHits ?? 0) > 0) {
        const ratio = (e.shieldHits ?? 0) / SHIELDER.hits;
        const col = ratio > 0.66 ? 0x67e8f9 : ratio > 0.33 ? 0xfb923c : 0xef4444;
        const arcR = r + 14;
        const a0 = Math.PI * 0.06;
        const a1 = Math.PI * 0.94;
        g.moveTo(e.x + Math.cos(a0) * arcR, e.y + Math.sin(a0) * arcR);
        g.arc(e.x, e.y, arcR, a0, a1);
        g.stroke({ width: 5, color: col, alpha: 0.7 + Math.sin(this.elapsed * 7) * 0.15 });
        if (ratio < 0.66) {
          g.moveTo(e.x - 12, e.y + 8);
          g.lineTo(e.x - 3, e.y + arcR * 0.72);
          g.stroke({ width: 1.6, color: 0xfef3c7, alpha: 0.9 });
          g.moveTo(e.x + 8, e.y + 6);
          g.lineTo(e.x + 14, e.y + arcR * 0.55);
          g.stroke({ width: 1.4, color: 0xfde68a, alpha: 0.8 });
        }
        if (ratio < 0.33) {
          g.moveTo(e.x, e.y + 4);
          g.lineTo(e.x + 6, e.y + arcR * 0.85);
          g.stroke({ width: 2, color: 0xfca5a5, alpha: 0.95 });
          g.moveTo(e.x - 16, e.y + 12);
          g.lineTo(e.x - 8, e.y + arcR * 0.5);
          g.stroke({ width: 1.8, color: 0xf87171, alpha: 0.9 });
        }
      }
      if (e.def.id === 'guardian') {
        g.circle(e.x, e.y, GUARDIAN.auraRadius)
          .stroke({ width: 2, color: 0xa3e635, alpha: 0.32 + Math.sin(this.elapsed * 3) * 0.1 });
      }
      if (e.def.id === 'trapper') {
        g.moveTo(e.x - r * 0.75, e.y).lineTo(e.x + r * 0.75, e.y)
          .stroke({ width: 3, color: 0xfca5a5, alpha: 0.95 });
        g.moveTo(e.x, e.y - r * 0.75).lineTo(e.x, e.y + r * 0.75)
          .stroke({ width: 3, color: 0xfca5a5, alpha: 0.95 });
        g.circle(e.x, e.y, 4).fill(0xfef2f2);
      }
      if (e.def.id === 'vortex') {
        g.circle(e.x, e.y, VORTEX.pullRadius)
          .stroke({ width: 2, color: 0x312e81, alpha: 0.35 + Math.sin(this.elapsed * 3) * 0.1 });
        const spin = this.elapsed * 2.2;
        for (let k = 0; k < 3; k++) {
          const a0 = spin + (k * Math.PI * 2) / 3;
          g.moveTo(e.x + Math.cos(a0) * r * 1.35, e.y + Math.sin(a0) * r * 1.35);
          g.arc(e.x, e.y, r * 1.35, a0, a0 + 1.4);
          g.stroke({ width: 3, color: 0x6366f1, alpha: 0.45 });
        }
        g.circle(e.x, e.y, r * 0.55).fill({ color: 0x020617, alpha: 0.92 });
        g.circle(e.x, e.y, r * 0.22).fill(0x0f172a);
      }
      if (e.def.id === 'mirage') {
        const cloaked = Math.hypot(state.playerX - e.x, state.playerY - e.y) > MIRAGE.revealRadius;
        if (cloaked) {
          g.circle(e.x, e.y, r + 6)
            .stroke({ width: 1.2, color: 0x67e8f9, alpha: 0.25 + Math.sin(this.elapsed * 5) * 0.1 });
        }
      }
      if (e.mutation) {
        const mutColor = e.mutation === 'explode' ? 0xfb923c
          : e.mutation === 'split' ? 0xa3e635
          : 0xe879f9;
        g.circle(e.x, e.y, r + 4)
          .stroke({ width: 2, color: mutColor, alpha: 0.7 + Math.sin(this.elapsed * 7) * 0.15 });
      }

      if (e.def.id === 'architect' && (e.shieldHits ?? 0) > 0) {
        const pulse = 0.55 + Math.sin(this.elapsed * 6) * 0.15;
        g.circle(e.x, e.y, r + 18)
          .stroke({ width: 4, color: 0x67e8f9, alpha: pulse });
      }
      if (e.hp < e.maxHp && !isTrueBoss) {
        g.rect(e.x - r, e.y - r - 8, r * 2, 4).fill({ color: 0x000000, alpha: 0.5 });
        g.rect(e.x - r, e.y - r - 8, r * 2 * Math.max(0, e.hp / e.maxHp), 4)
          .fill(e.elite ? 0xfbbf24 : 0x4ade80);
      }
    }

    const fenceCol = hex(DANGER.high);
    for (const p of state.pylons) {
      g.circle(p.x, p.y, 6).fill(fenceCol);
      g.circle(p.x, p.y, 9).stroke({ width: 2, color: 0xfca5a5, alpha: 0.8 });
    }
    for (const s of state.fenceLines()) {
      g.moveTo(s.ax, s.ay).lineTo(s.bx, s.by)
        .stroke({ width: TRAPPER.fenceWidth, color: fenceCol, alpha: 0.55 + Math.sin(this.elapsed * 18) * 0.2 });
      g.moveTo(s.ax, s.ay).lineTo(s.bx, s.by)
        .stroke({ width: 2, color: 0xfef2f2, alpha: 0.7 });
      if (Math.random() < 0.15) {
        const t = Math.random();
        this.spawnParticle({
          x: s.ax + (s.bx - s.ax) * t,
          y: s.ay + (s.by - s.ay) * t,
          vx: (Math.random() - 0.5) * 80,
          vy: (Math.random() - 0.5) * 80,
          life: 0.18,
          sizeFrom: 6,
          sizeTo: 1,
          tint: fenceCol,
          alphaFrom: 0.9,
        });
      }
    }
  }

  /** 보스·적 탄환 — 흰 코어 + 보라 테두리 (치명 탄 시인성) */
  private drawEnemyProjectiles(state: GameState): void {
    const outline = hex(DANGER.fatal);
    for (const p of state.enemyProjectiles) {
      const glow = this.glowPool.get();
      glow.tint = outline;
      glow.position.set(p.x, p.y);
      glow.width = glow.height = p.radius * 5.5;
      glow.alpha = 0.9;
      this.coreG.circle(p.x, p.y, p.radius).stroke({ width: 2, color: outline });
      this.coreG.circle(p.x, p.y, p.radius * 0.55).fill(0xffffff);
    }
  }

  /** 드롭 아이템 */
  private drawPickups(state: GameState): void {
    const g = this.pickupG;
    g.clear();
    for (const p of state.pickups) {
      if (p.life < 3 && Math.floor(this.elapsed * 8) % 2 === 0) continue;

      const bob = Math.sin(this.elapsed * 4 + p.x) * 3;
      const y = p.y + bob;
      const tint = p.kind === 'heal' ? 0x4ade80
        : p.kind === 'magnet' ? 0x38bdf8
        : p.kind === 'cube' ? 0x67e8f9
        : 0xfb923c;
      const tex = this.atlas.pickups[p.kind];

      const glow = this.glowPool.get();
      glow.tint = tint;
      glow.position.set(p.x, y);
      glow.width = glow.height = 40 + Math.sin(this.elapsed * 6) * 6;
      glow.alpha = 0.7;

      if (tex) {
        const spr = this.entityPool.get(tex);
        spr.position.set(p.x, y);
        const size = (PICKUPS.radius + 3) * 2.6;
        spr.width = size;
        spr.height = size;
      } else {
        g.circle(p.x, y, PICKUPS.radius + 3).fill({ color: 0x0f172a, alpha: 0.85 }).stroke({ width: 2, color: tint });
        if (p.kind === 'heal') {
          g.rect(p.x - 6, y - 2, 12, 4).fill(tint);
          g.rect(p.x - 2, y - 6, 4, 12).fill(tint);
        } else if (p.kind === 'magnet') {
          g.rect(p.x - 6, y - 6, 4, 9).fill(tint);
          g.rect(p.x + 2, y - 6, 4, 9).fill(tint);
          g.rect(p.x - 6, y + 3, 12, 4).fill(tint);
        } else if (p.kind === 'cube') {
          const r = PICKUPS.radius + 2;
          g.poly([p.x, y - r, p.x + r * 0.75, y, p.x, y + r, p.x - r * 0.75, y], true).fill(tint);
        } else {
          g.circle(p.x, y + 1, 6).fill(tint);
          g.rect(p.x - 1, y - 8, 2, 5).fill(0xfde68a);
        }
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

  private drawSpecials(state: GameState): void {
    const g = this.projG;
    for (const s of state.slashes) {
      const color = hex(s.color);
      const alpha = Math.max(0.15, s.life / s.maxLife);
      const half = (s.arcDeg * Math.PI) / 360;
      g.moveTo(s.x, s.y);
      g.arc(s.x, s.y, s.range, s.angle - half, s.angle + half);
      g.lineTo(s.x, s.y);
      g.fill({ color, alpha: 0.22 * alpha });
      g.moveTo(s.x, s.y);
      g.arc(s.x, s.y, s.range, s.angle - half, s.angle + half);
      g.stroke({ width: 3, color, alpha: 0.8 * alpha });
    }
    for (const o of state.orbiters) {
      const color = hex(o.color);
      if (o.ring) {
        g.circle(state.playerX, state.playerY, o.radius)
          .stroke({ width: 8, color, alpha: 0.45 + Math.sin(this.elapsed * 8) * 0.1 });
        g.circle(state.playerX, state.playerY, o.radius)
          .stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
      } else {
        const x = state.playerX + Math.cos(o.angle) * o.radius;
        const y = state.playerY + Math.sin(o.angle) * o.radius;
        const tooth = o.hitRadius * 1.35;
        const c = Math.cos(o.angle + this.elapsed * 10);
        const s = Math.sin(o.angle + this.elapsed * 10);
        g.poly([
          x + c * tooth, y + s * tooth,
          x - s * tooth * 0.7, y + c * tooth * 0.7,
          x - c * tooth, y - s * tooth,
          x + s * tooth * 0.7, y - c * tooth * 0.7,
        ], true).fill(color);
        const glow = this.glowPool.get();
        glow.tint = color;
        glow.position.set(x, y);
        glow.width = glow.height = o.hitRadius * 5;
        glow.alpha = 0.7;
      }
    }
    for (const m of state.mines) {
      const color = hex(m.color);
      const blink = m.fuse < 0.6 && Math.floor(this.elapsed * 12) % 2 === 0;
      g.circle(m.x, m.y, m.radius).fill(blink ? 0xffffff : color);
      g.circle(m.x, m.y, m.radius + 3).stroke({ width: 1.5, color, alpha: 0.7 });
      if (m.pullRadius > 0) {
        g.circle(m.x, m.y, m.pullRadius)
          .stroke({ width: 1.5, color, alpha: 0.22 + Math.sin(this.elapsed * 6) * 0.08 });
      }
      if (m.seekSpeed > 0) {
        g.moveTo(m.x, m.y - m.radius - 4)
          .lineTo(m.x + 4, m.y - 1)
          .lineTo(m.x - 4, m.y - 1)
          .fill(blink ? 0xffffff : color);
      }
    }
    for (const z of state.zones) {
      const color = hex(z.color);
      if (z.kind === 'segment') {
        g.moveTo(z.x, z.y).lineTo(z.x2, z.y2)
          .stroke({ width: z.radius * 1.6, color, alpha: 0.35 });
        g.moveTo(z.x, z.y).lineTo(z.x2, z.y2)
          .stroke({ width: 3, color: 0xffffff, alpha: 0.5 });
      } else {
        g.circle(z.x, z.y, z.radius).fill({ color: 0x020617, alpha: 0.35 });
        g.circle(z.x, z.y, z.radius)
          .stroke({ width: 3, color, alpha: 0.55 + Math.sin(this.elapsed * 5) * 0.15 });
      }
    }
    for (const b of state.interceptBeams) {
      g.moveTo(b.x1, b.y1).lineTo(b.x2, b.y2)
        .stroke({ width: 3, color: 0x86efac, alpha: Math.max(0, b.life * 8) });
    }
    if (state.ampAura) {
      const a = 0.2 + Math.sin(this.elapsed * 6) * 0.08;
      g.circle(state.ampAura.x, state.ampAura.y, state.ampAura.r)
        .fill({ color: 0x818cf8, alpha: a });
      g.circle(state.ampAura.x, state.ampAura.y, state.ampAura.r)
        .stroke({ width: 2, color: 0xa5b4fc, alpha: 0.7 });
    }
    if (state.droneId) {
      const dx = state.playerX + 22;
      const dy = state.playerY - 16 + Math.sin(this.elapsed * 3) * 4;
      const col = state.droneId === 'retriever' ? 0x38bdf8
        : state.droneId === 'defender' ? 0x86efac
        : 0x818cf8;
      g.circle(dx, dy, 6).fill(col);
      g.moveTo(dx - 10, dy).lineTo(dx - 4, dy - 5).lineTo(dx - 4, dy + 5).fill(col);
      g.moveTo(dx + 10, dy).lineTo(dx + 4, dy - 5).lineTo(dx + 4, dy + 5).fill(col);
      const glow = this.glowPool.get();
      glow.tint = col;
      glow.position.set(dx, dy);
      glow.width = glow.height = 22;
      glow.alpha = 0.7;
    }
  }

  private drawBeams(state: GameState): void {
    const g = this.projG;
    for (const b of state.beams) {
      const x2 = b.x + Math.cos(b.angle) * b.length;
      const y2 = b.y + Math.sin(b.angle) * b.length;
      const color = hex(b.color);
      const pulse = 0.55 + Math.sin(this.elapsed * 28) * 0.15;
      g.moveTo(b.x, b.y);
      g.lineTo(x2, y2);
      g.stroke({ width: b.width * 1.8, color, alpha: 0.22 * pulse });
      g.moveTo(b.x, b.y);
      g.lineTo(x2, y2);
      g.stroke({ width: b.width, color, alpha: 0.55 });
      g.moveTo(b.x, b.y);
      g.lineTo(x2, y2);
      g.stroke({ width: Math.max(3, b.width * 0.28), color: 0xffffff, alpha: 0.9 });
      const glow = this.glowPool.get();
      glow.tint = color;
      glow.position.set(b.x, b.y);
      glow.width = glow.height = b.width * 4;
      glow.alpha = 0.8;
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
