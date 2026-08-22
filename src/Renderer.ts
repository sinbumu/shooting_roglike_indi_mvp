import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { GameState, Beam, Enemy } from './GameState';
import { CANVAS, PLAYER, PICKUPS, SHIPS, DANGER, MIRAGE, GUARDIAN, SHIELDER, TRAPPER, VORTEX, WEAPONS, VOID_ALTAR, HAZARDS, TERRAIN, IAIDO_FX, PERF, CONSTELLATION_FX, isWhipWeapon, isSummonFamily, slashSweepAngle } from './GameConfig';
import { fxFrame, fxFrameOnce, loadSpriteAtlas, PROJ_FX, type FxId, type SpriteAtlas } from './assets';
import type { EnemyId, ShipId, WeaponId } from './types';

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

interface Drift {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  phase: number;
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

interface WreckShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  life: number;
  maxLife: number;
  w: number;
  h: number;
  tint: number;
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
    if (s.texture !== tex) s.texture = tex;
    s.visible = true;
    s.tint = 0xffffff;
    s.alpha = 1;
    s.rotation = 0;
    s.anchor.set(0.5);
    s.blendMode = 'normal';
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

/** 탄 꼬리·빔용 가로 스트릭 (앵커 왼쪽 = 흐릿, 오른쪽 = 밝음) */
function makeStreakTexture(): Texture {
  const w = 64;
  const h = 16;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const along = ctx.createLinearGradient(0, 0, w, 0);
  along.addColorStop(0, 'rgba(255,255,255,0)');
  along.addColorStop(0.28, 'rgba(255,255,255,0.45)');
  along.addColorStop(1, 'rgba(255,255,255,1)');
  const across = ctx.createLinearGradient(0, 0, 0, h);
  across.addColorStop(0, 'rgba(255,255,255,0)');
  across.addColorStop(0.5, 'rgba(255,255,255,1)');
  across.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = along;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, w, h);
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
  private streakTex!: Texture;
  private glowPool!: FramePool;
  private streakPool!: FramePool;
  private entityPool!: EntityPool;
  private fxSpritePool!: EntityPool;
  private playerSprite: Sprite | null = null;
  private atlas: SpriteAtlas = { ships: {}, enemies: {}, pickups: {}, terrain: {}, fx: {}, ready: false };

  private particles: Particle[] = [];
  private freeSprites: Sprite[] = [];
  private dmgTexts: DamageText[] = [];
  private freeTexts: Text[] = [];
  private wreckShards: WreckShard[] = [];
  private nebulaGhosts: { x: number; y: number }[] = [];

  private stars: Star[] = [];
  private drifts: Drift[] = [];
  private elapsed = 0;

  // 화면 흔들림 / 피격 플래시
  private shakeTime = 0;
  private shakeDur = 1;
  private shakeMag = 0;
  private flashAlpha = 0;
  private flashColor = 0xef4444;
  private dimLeft = 0;
  private iaidoFx: { x: number; y: number; w: number; h: number; life: number; maxLife: number; hits: { x: number; y: number }[] } | null = null;
  private iaidoSlashSpr: Sprite | null = null;
  private iaidoSlashSpr2: Sprite | null = null;
  private empSprites: Sprite[] = [];
  private hitFxLeft = 0;
  private muzzleFxLeft = 0;
  private deathFxLeft = 0;
  private deathFxBigUsed = false;
  private lastBgTop = -1;
  private lastBgBottom = -1;
  private starGfxCleared = false;
  private gemGfxCleared = false;
  private enginePuffAcc = 0;

  async init(canvas: HTMLCanvasElement): Promise<void> {
    this.app = new Application();
    await this.app.init({
      canvas,
      width: CANVAS.width,
      height: CANVAS.height,
      backgroundColor: 0x070812,
      antialias: false,
      preference: 'webgl',
      powerPreference: 'high-performance',
      resolution: Math.min(window.devicePixelRatio || 1, PERF.maxDpr),
      autoDensity: false,
      eventFeatures: { move: false, globalMove: false, click: false, wheel: false },
    });
    this.app.ticker.stop(); // 게임 루프에서 수동 렌더링
    this.app.stage.eventMode = 'none';
    this.app.stage.interactiveChildren = false;
    this.world.eventMode = 'none';
    this.world.interactiveChildren = false;

    this.glowTex = makeGlowTexture();
    this.ringTex = makeRingTexture();
    this.streakTex = makeStreakTexture();
    this.glowPool = new FramePool(this.glowLayer, this.glowTex);
    this.streakPool = new FramePool(this.glowLayer, this.streakTex);
    this.entityPool = new EntityPool(this.spriteLayer);
    this.fxSpritePool = new EntityPool(this.fxLayer);
    this.atlas = await loadSpriteAtlas();

    this.world.addChild(
      this.bgG, this.starG, this.projG, this.spriteLayer, this.enemyG, this.gemG, this.pickupG,
      this.playerG, this.glowLayer, this.coreG, this.fxLayer, this.textLayer, this.warnG,
    );
    this.app.stage.addChild(this.world, this.flashG);
    this.iaidoSlashSpr = new Sprite();
    this.iaidoSlashSpr.anchor.set(0.5);
    this.iaidoSlashSpr.blendMode = 'add';
    this.iaidoSlashSpr.visible = false;
    this.iaidoSlashSpr2 = new Sprite();
    this.iaidoSlashSpr2.anchor.set(0.5);
    this.iaidoSlashSpr2.blendMode = 'add';
    this.iaidoSlashSpr2.visible = false;
    this.app.stage.addChild(this.iaidoSlashSpr, this.iaidoSlashSpr2);

    for (let i = 0; i < 12; i++) {
      const s = new Sprite(this.glowTex);
      s.anchor.set(0.5);
      s.blendMode = 'add';
      s.visible = false;
      this.app.stage.addChild(s);
      this.empSprites.push(s);
    }

    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.random() * CANVAS.width,
        y: Math.random() * CANVAS.height,
        size: Math.random() * 1.8 + 0.4,
        speed: Math.random() * 60 + 25,
      });
    }
    for (let i = 0; i < 22; i++) {
      this.drifts.push({
        x: Math.random() * CANVAS.width,
        y: Math.random() * CANVAS.height,
        w: 2 + Math.random() * 10,
        h: 1 + Math.random() * 4,
        speed: 18 + Math.random() * 40,
        phase: Math.random() * Math.PI * 2,
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
    this.updateFlash(dt, state);
    this.updateWreckShards(dt);

    this.glowPool.begin();
    this.streakPool.begin();
    this.entityPool.begin();
    this.fxSpritePool.begin();
    this.coreG.clear();

    this.drawBackground(state);
    this.drawStars(dt, state);
    this.drawTerrain(state);
    this.drawAltarAndHazards(state);
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
    this.fxSpritePool.end();
    this.streakPool.end();
    this.glowPool.end();
    this.app.render();
  }

  // ---------- 이펙트 이벤트 소비 ----------

  private consumeEvents(state: GameState): void {
    this.hitFxLeft = PERF.hitFxPerFrame;
    this.muzzleFxLeft = PERF.muzzleFxPerFrame;
    this.deathFxLeft = PERF.deathFxPerFrame;
    this.deathFxBigUsed = false;
    for (const ev of state.events) {
      switch (ev.type) {
        case 'enemyDied': {
          const big = ev.radius >= 20;
          if (big) {
            if (this.deathFxLeft <= 0 && this.deathFxBigUsed) break;
            if (this.deathFxLeft <= 0) this.deathFxBigUsed = true;
            else this.deathFxLeft--;
            this.explode(ev.x, ev.y, hex(ev.color), ev.radius);
          } else if (this.deathFxLeft > 0) {
            this.deathFxLeft--;
            this.explode(ev.x, ev.y, hex(ev.color), ev.radius);
          }
          break;
        }
        case 'enemyHit':
          if (this.hitFxLeft <= 0) break;
          this.hitFxLeft--;
          this.hitSpark(ev.x, ev.y, hex(ev.color));
          this.spawnDamageText(ev.x, ev.y, ev.damage);
          break;
        case 'fired': {
          const spec = ev.weaponId ? WEAPONS[ev.weaponId].projectile : undefined;
          if (spec?.melee) {
            this.slashFlash(
              ev.x, ev.y, hex(ev.color),
              ev.arcDeg ?? spec.melee.arcDeg,
              ev.range ?? spec.melee.range,
              ev.angle ?? Math.atan2(state.lastAimY, state.lastAimX),
            );
          } else if (spec?.orbit) {
            const r = ev.orbitRadius ?? spec.orbit.radius;
            this.spawnParticle({
              x: ev.x, y: ev.y, life: 0.35, sizeFrom: 28, sizeTo: r * 2.2,
              tint: hex(ev.color), alphaFrom: 0.7, ring: true,
            });
          } else if (spec?.drop) {
            this.spawnParticle({
              x: ev.x, y: ev.y, life: 0.22, sizeFrom: 10, sizeTo: 36,
              tint: hex(ev.color), alphaFrom: 0.8, ring: true,
            });
          } else if (this.muzzleFxLeft > 0) {
            this.muzzleFxLeft--;
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
            : ev.kind === 'goldCube' || ev.kind === 'voidCrate' || ev.kind === 'credit' ? 0xfbbf24
            : ev.kind === 'cursedCrate' ? 0x7f1d1d
            : 0xfb923c;
          this.spawnParticle({ x: ev.x, y: ev.y, life: 0.35, sizeFrom: 14, sizeTo: 90, tint, alphaFrom: 0.8, ring: true });
          break;
        }
        case 'skill': {
          const tint = ev.id === 'phaseDash' ? 0x7dd3fc
            : ev.id === 'aegis' ? 0x86efac
            : ev.id === 'carpetBombing' ? 0xf97316
            : ev.id === 'iaido' ? 0xef4444
            : ev.id === 'swarmFrenzy' ? 0xef4444
            : ev.id === 'bloodStream' ? 0xfb7185
            : 0xc084fc;
          this.spawnParticle({ x: ev.x, y: ev.y, life: 0.4, sizeFrom: 20, sizeTo: 140, tint, alphaFrom: 0.9, ring: true });
          if (ev.id === 'aegis') {
            this.flashAlpha = 0.28;
            this.flashColor = 0x86efac;
          } else if (ev.id === 'timeDilation') {
            this.flashAlpha = 0.22;
            this.flashColor = 0xc084fc;
          } else if (ev.id === 'carpetBombing') {
            this.flashAlpha = 0.42;
            this.flashColor = 0xf97316;
            this.shake(18, 1.55);
          } else if (ev.id === 'iaido') {
            this.flashAlpha = 0.2;
            this.flashColor = 0xef4444;
          } else if (ev.id === 'swarmFrenzy') {
            this.flashAlpha = 0.32;
            this.flashColor = 0xef4444;
            this.shake(8, 0.35);
          } else if (ev.id === 'bloodStream') {
            this.flashAlpha = 0.28;
            this.flashColor = 0x9f1239;
            this.shake(7, 0.32);
            for (let i = 0; i < 10; i++) {
              const a = Math.atan2(state.lastAimY, state.lastAimX) + (Math.random() - 0.5) * 0.5;
              const spd = 280 + Math.random() * 420;
              this.spawnParticle({
                x: ev.x, y: ev.y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                life: 0.22 + Math.random() * 0.14,
                sizeFrom: 8 + Math.random() * 10,
                sizeTo: 2,
                tint: i % 3 === 0 ? 0xf43f5e : 0x9f1239,
                alphaFrom: 0.95,
                drag: 0.8,
              });
            }
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
        case 'altarActivate':
          this.spawnParticle({ x: ev.x, y: ev.y, life: 0.55, sizeFrom: 40, sizeTo: 220, tint: 0xef4444, alphaFrom: 0.95, ring: true });
          this.flashAlpha = 0.45;
          this.flashColor = 0xef4444;
          this.shake(10, 0.45);
          break;
        case 'hazardWarn':
          this.flashAlpha = 0.28;
          this.flashColor = ev.kind === 'emp' ? 0x67e8f9 : 0xef4444;
          this.shake(6, 0.3);
          break;
        case 'solarFlare':
          this.flashAlpha = 0.85;
          this.flashColor = 0xffffff;
          this.shake(12, 0.4);
          break;
        case 'asteroid':
          this.flashAlpha = 0.4;
          this.flashColor = 0xfb923c;
          this.shake(14, 0.5);
          break;
        case 'empStart':
          this.flashAlpha = 0.35;
          this.flashColor = 0x38bdf8;
          this.shake(8, 0.4);
          break;
        case 'empNova':
          this.flashAlpha = 0.72;
          this.flashColor = 0x67e8f9;
          this.shake(16, 0.55);
          for (let i = 0; i < 7; i++) {
            this.spawnParticle({
              x: ev.x, y: ev.y,
              life: 0.32 + i * 0.07,
              sizeFrom: 36 + i * 28,
              sizeTo: 260 + i * 150,
              tint: i % 2 ? 0xe0f2fe : 0x38bdf8,
              alphaFrom: 0.92,
              ring: true,
            });
          }
          break;
        case 'execProc':
          this.spawnParticle({ x: ev.x, y: ev.y, life: 0.28, sizeFrom: 16, sizeTo: 70, tint: 0xf8fafc, alphaFrom: 0.95, ring: true });
          this.hitSpark(ev.x, ev.y, 0xf87171);
          break;
        case 'terrainShieldBlock':
          this.spawnParticle({ x: ev.x, y: ev.y, life: 0.28, sizeFrom: 10, sizeTo: 52, tint: 0xef4444, alphaFrom: 0.95, ring: true });
          this.hitSpark(ev.x, ev.y, 0xf87171);
          break;
        case 'terrainBoost':
          for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 * i) / 8;
            this.spawnParticle({
              x: ev.x, y: ev.y,
              vx: Math.cos(a) * 90, vy: Math.sin(a) * 90,
              life: 0.28, sizeFrom: 7, sizeTo: 1, tint: 0xf8fafc, alphaFrom: 0.95,
            });
          }
          this.spawnParticle({ x: ev.x, y: ev.y, life: 0.2, sizeFrom: 8, sizeTo: 36, tint: 0x67e8f9, alphaFrom: 0.8, ring: true });
          break;
        case 'coreBurst':
          this.flashAlpha = 0.55;
          this.flashColor = 0xfb923c;
          this.shake(18, 0.55);
          this.spawnParticle({ x: ev.x, y: ev.y, life: 0.35, sizeFrom: 24, sizeTo: ev.radius * 0.7, tint: 0xf97316, alphaFrom: 0.95, ring: true });
          this.spawnParticle({ x: ev.x, y: ev.y, life: 0.5, sizeFrom: 40, sizeTo: ev.radius * 1.15, tint: 0xfbbf24, alphaFrom: 0.85, ring: true });
          this.spawnParticle({ x: ev.x, y: ev.y, life: 0.7, sizeFrom: 56, sizeTo: ev.radius * 1.7, tint: 0xf8fafc, alphaFrom: 0.7, ring: true });
          this.explode(ev.x, ev.y, 0xa855f7, 28);
          break;
        case 'derelictBreak':
          this.flashAlpha = 0.4;
          this.flashColor = 0xef4444;
          this.shake(14, 0.5);
          this.spawnWreckShards(ev.x, ev.y, ev.w, ev.h);
          this.explode(ev.x, ev.y, 0xf97316, 36);
          break;
        case 'creditPickup':
          this.spawnParticle({ x: ev.x, y: ev.y, life: 0.28, sizeFrom: 8, sizeTo: 28, tint: 0xfbbf24, alphaFrom: 0.9, ring: true });
          break;
        case 'bloodBurst':
          this.explode(ev.x, ev.y, 0xf43f5e, ev.radius * 0.55);
          this.spawnParticle({ x: ev.x, y: ev.y, life: 0.4, sizeFrom: 20, sizeTo: ev.radius, tint: 0xbe123c, alphaFrom: 0.9, ring: true });
          this.shake(8, 0.28);
          break;
        case 'iaidoSlash':
          this.flashAlpha = 0;
          this.dimLeft = IAIDO_FX.duration;
          this.iaidoFx = {
            x: ev.x, y: ev.y, w: ev.w, h: ev.h,
            life: IAIDO_FX.duration, maxLife: IAIDO_FX.duration, hits: ev.hits,
          };
          this.shake(12, 0.48);
          const hud = document.getElementById('hud');
          hud?.classList.add('iaido-dim');
          window.setTimeout(() => hud?.classList.remove('iaido-dim'), IAIDO_FX.duration * 1000);
          for (const h of ev.hits) {
            this.spawnParticle({ x: h.x, y: h.y, life: 0.48, sizeFrom: 28, sizeTo: 8, tint: 0xf8fafc, alphaFrom: 0.95 });
            this.spawnParticle({ x: h.x, y: h.y, life: 0.52, sizeFrom: 18, sizeTo: 36, tint: 0xef4444, alphaFrom: 0.9, ring: true });
            for (let k = 0; k < 4; k++) {
              const a = Math.PI * 0.25 + k * Math.PI * 0.5;
              this.spawnParticle({
                x: h.x, y: h.y,
                vx: Math.cos(a) * 90,
                vy: Math.sin(a) * 90,
                life: 0.42, sizeFrom: 10, sizeTo: 2,
                tint: k % 2 === 0 ? 0xf8fafc : 0xf43f5e,
                alphaFrom: 0.95, drag: 2.2,
              });
            }
          }
          break;
        case 'altarSpawn':
          this.altarSpawnFx(ev.x, ev.y);
          break;
        default:
          break;
      }
    }
    state.events.length = 0;
  }

  // ---------- 파티클 시스템 ----------

  private spawnParticle(o: ParticleOpts): void {
    if (this.particles.length >= PERF.particleCap) return;
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
        const last = this.particles[this.particles.length - 1];
        this.particles[i] = last;
        this.particles.pop();
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
        const last = this.dmgTexts[this.dmgTexts.length - 1];
        this.dmgTexts[i] = last;
        this.dmgTexts.pop();
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
    const starved = this.particles.length > PERF.particleCap * 0.7;
    const n = Math.max(2, Math.floor((10 + Math.floor(radius * 0.7)) * (starved ? 1 / 3 : 1)));
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
    const sparks = starved ? 2 : 6;
    for (let i = 0; i < sparks; i++) {
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
    const n = this.particles.length > PERF.particleCap * 0.7 ? 1 : 2;
    for (let i = 0; i < n; i++) {
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

  private altarSpawnFx(x: number, y: number): void {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 90;
      this.spawnParticle({
        x,
        y: y + 18,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 40,
        life: 0.55 + Math.random() * 0.45,
        sizeFrom: 10 + Math.random() * 16,
        sizeTo: 28 + Math.random() * 24,
        tint: Math.random() < 0.5 ? 0x7c3aed : 0xc084fc,
        alphaFrom: 0.7,
        drag: 0.8,
      });
    }
    this.spawnParticle({
      x, y,
      life: 0.7,
      sizeFrom: 20,
      sizeTo: 110,
      tint: 0x6d28d9,
      alphaFrom: 0.85,
      ring: true,
    });
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

  private slashFlash(x: number, y: number, tint: number, arcDeg: number, range: number, angle = -Math.PI / 2): void {
    const base = angle;
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
    this.spawnParticle({
      x: x + Math.cos(base) * range * 0.28,
      y: y + Math.sin(base) * range * 0.28,
      life: 0.34,
      sizeFrom: Math.min(90, range * 0.22),
      sizeTo: Math.min(140, range * 0.42),
      tint,
      alphaFrom: 0.42,
      ring: true,
    });
  }

  private mineFxId(id: WeaponId): FxId {
    if (id === 'seekerMine') return 'seeker';
    if (id === 'singularity' || id === 'eventHorizon') return 'singularity';
    if (id === 'predator') return 'predator';
    if (id === 'spiderMine') return 'spider';
    if (id === 'shrapnelMine') return 'shrapnelMine';
    if (id === 'clusterDeathBomb') return 'clusterDeathBomb';
    if (id === 'toxicWeb') return 'toxicWeb';
    if (id === 'absoluteLockdown') return 'absoluteLockdown';
    return 'mine';
  }

  private frenzyTint(state: GameState, weaponId: WeaponId | undefined, base: number): number {
    if (!state.isSwarmFrenzy() || !weaponId || !isSummonFamily(weaponId)) return base;
    return Math.sin(this.elapsed * 24) > 0 ? 0xef4444 : 0xfca5a5;
  }

  private drawCrackleSegment(
    g: Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radius: number,
    color: number,
    alpha: number,
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const segs = Math.max(5, Math.min(18, Math.floor(len / 16)));
    const flicker = Math.floor(this.elapsed * 26);
    const pulse = 0.72 + Math.sin(this.elapsed * 22) * 0.28;

    const bolt = (amp: number, width: number, col: number, a: number, seed: number): void => {
      g.moveTo(x1, y1);
      for (let i = 1; i <= segs; i++) {
        const t = i / segs;
        const jag = Math.sin(t * 19 + seed + flicker * 1.9) * amp
          + Math.sin(t * 37 + seed * 1.4 + flicker * 0.7) * amp * 0.4;
        g.lineTo(x1 + dx * t + px * jag, y1 + dy * t + py * jag);
      }
      g.stroke({ width, color: col, alpha: a * pulse * alpha });
    };

    bolt(radius * 0.35, Math.max(8, radius * 0.7), color, 0.2, 0.4);
    bolt(radius * 0.85, 2.4, 0xffffff, 0.78, 2.2);
    bolt(radius * 0.65, 1.5, color, 0.9, 5.1);

    const sparks = 3;
    for (let i = 0; i < sparks; i++) {
      const t = ((flicker * 0.13 + i * 0.31) % 1 + 1) % 1;
      const jag = Math.sin(t * 23 + flicker + i) * radius * 0.55;
      const sx = x1 + dx * t + px * jag;
      const sy = y1 + dy * t + py * jag;
      g.circle(sx, sy, 1.4 + (i % 2)).fill({ color: 0xffffff, alpha: 0.55 * pulse * alpha });
    }

    if (this.particles.length < PERF.particleCap * 0.55 && Math.random() < 0.35) {
      const t = Math.random();
      const jag = (Math.random() - 0.5) * radius;
      this.spawnParticle({
        x: x1 + dx * t + px * jag,
        y: y1 + dy * t + py * jag,
        vx: px * (40 + Math.random() * 50) * (Math.random() < 0.5 ? -1 : 1),
        vy: py * (40 + Math.random() * 50) * (Math.random() < 0.5 ? -1 : 1),
        life: 0.12 + Math.random() * 0.1,
        sizeFrom: 5 + Math.random() * 5,
        sizeTo: 1,
        tint: Math.random() < 0.45 ? 0xffffff : color,
        alphaFrom: 0.9,
        drag: 2.8,
      });
    }
  }

  private blitFx(
    tex: Texture,
    x: number,
    y: number,
    opts: {
      rotation?: number;
      width: number;
      height: number;
      tint?: number;
      alpha?: number;
      anchorX?: number;
      anchorY?: number;
      add?: boolean;
      world?: boolean;
    },
  ): void {
    const spr = (opts.world ? this.entityPool : this.fxSpritePool).get(tex);
    spr.anchor.set(opts.anchorX ?? 0.5, opts.anchorY ?? 0.5);
    spr.position.set(x, y);
    spr.rotation = opts.rotation ?? 0;
    spr.width = opts.width;
    spr.height = opts.height;
    spr.tint = opts.tint ?? 0xffffff;
    spr.alpha = opts.alpha ?? 1;
    if (opts.add) spr.blendMode = 'add';
  }

  /** 꼬리 시작점(x,y)에서 angle 방향으로 length만큼 스트릭 */
  private blitStreak(
    x: number,
    y: number,
    angle: number,
    length: number,
    width: number,
    tint: number,
    alpha: number,
  ): void {
    if (length < 1 || width < 0.5 || alpha <= 0) return;
    const s = this.streakPool.get();
    s.anchor.set(0, 0.5);
    s.position.set(x, y);
    s.rotation = angle;
    s.width = length;
    s.height = Math.max(1, width);
    s.tint = tint;
    s.alpha = alpha;
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

  private drawIaidoSlashFx(fx: NonNullable<Renderer['iaidoFx']>): void {
    const maxLife = fx.maxLife || IAIDO_FX.duration;
    const t = 1 - Math.max(0, fx.life) / maxLife;
    const fadeStart = 1 - IAIDO_FX.fade / maxLife;
    const a = t < fadeStart ? 1 : Math.max(0, 1 - (t - fadeStart) / Math.max(0.001, 1 - fadeStart));
    const cy = fx.y + fx.h * 0.5;
    const sweep = Math.min(1, t / IAIDO_FX.sweep);
    const ease = 1 - (1 - sweep) ** 3;
    const xEnd = fx.x + fx.w * Math.max(0.06, ease);
    const bladeX = xEnd - 8;
    const coreW = 7 + (1 - t) * 10;

    this.flashG.moveTo(fx.x - 16, cy).lineTo(xEnd + 18, cy)
      .stroke({ width: coreW * 3.2, color: 0xffffff, alpha: 0.18 * a });
    this.flashG.moveTo(fx.x, cy).lineTo(xEnd, cy)
      .stroke({ width: coreW, color: 0xf8fafc, alpha: 0.95 * a });
    this.flashG.moveTo(fx.x, cy + 5).lineTo(xEnd, cy + 8)
      .stroke({ width: 3.2, color: 0xef4444, alpha: 0.62 * a });

    const tex = fxFrameOnce(this.atlas.fx.slash, Math.min(0.95, t));
    if (tex && this.iaidoSlashSpr && this.iaidoSlashSpr2) {
      this.iaidoSlashSpr.texture = tex;
      this.iaidoSlashSpr.visible = true;
      this.iaidoSlashSpr.position.set(bladeX, cy);
      this.iaidoSlashSpr.rotation = -0.14;
      this.iaidoSlashSpr.width = IAIDO_FX.bladeW;
      this.iaidoSlashSpr.height = IAIDO_FX.bladeH;
      this.iaidoSlashSpr.tint = 0xffffff;
      this.iaidoSlashSpr.alpha = 0.95 * a;
      this.iaidoSlashSpr2.texture = tex;
      this.iaidoSlashSpr2.visible = true;
      this.iaidoSlashSpr2.position.set(bladeX - 18, cy + 10);
      this.iaidoSlashSpr2.rotation = 0.08;
      this.iaidoSlashSpr2.width = IAIDO_FX.bladeW * 0.82;
      this.iaidoSlashSpr2.height = IAIDO_FX.bladeH * 0.48;
      this.iaidoSlashSpr2.tint = 0xef4444;
      this.iaidoSlashSpr2.alpha = 0.7 * a;
    }

    if (sweep >= 1) {
      this.flashG.moveTo(fx.x, cy).lineTo(fx.x + fx.w, cy)
        .stroke({ width: 1.6, color: 0xffffff, alpha: 0.28 * a });
    }

    for (const h of fx.hits) {
      const s = 12 + t * 8;
      this.flashG.moveTo(h.x - s, h.y - s).lineTo(h.x + s, h.y + s)
        .stroke({ width: 2.6, color: 0xffffff, alpha: 0.92 * a });
      this.flashG.moveTo(h.x + s, h.y - s).lineTo(h.x - s, h.y + s)
        .stroke({ width: 2.1, color: 0xf43f5e, alpha: 0.88 * a });
    }
  }

  private updateFlash(dt: number, state: GameState): void {
    this.flashG.clear();
    if (this.dimLeft > 0) {
      this.dimLeft = Math.max(0, this.dimLeft - dt);
      const hold = this.dimLeft > IAIDO_FX.fade ? 1 : this.dimLeft / IAIDO_FX.fade;
      this.flashG.rect(0, 0, CANVAS.width, CANVAS.height).fill({ color: 0x020617, alpha: 0.7 * hold });
    }
    if (this.iaidoFx) {
      this.iaidoFx.life -= dt;
      this.drawIaidoSlashFx(this.iaidoFx);
      if (this.iaidoFx.life <= 0) {
        this.iaidoFx = null;
        if (this.iaidoSlashSpr) this.iaidoSlashSpr.visible = false;
        if (this.iaidoSlashSpr2) this.iaidoSlashSpr2.visible = false;
      }
    }
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.8);
      this.flashG.rect(0, 0, CANVAS.width, CANVAS.height).fill({ color: this.flashColor, alpha: this.flashAlpha });
    }
    const hz = state.envHazard;
    if (hz?.kind === 'solar') {
      const pulse = 0.35 + Math.sin(this.elapsed * 10) * 0.2;
      const t = 10;
      this.flashG.rect(0, 0, CANVAS.width, t).fill({ color: 0xef4444, alpha: pulse });
      this.flashG.rect(0, CANVAS.height - t, CANVAS.width, t).fill({ color: 0xef4444, alpha: pulse });
      this.flashG.rect(0, 0, t, CANVAS.height).fill({ color: 0xef4444, alpha: pulse });
      this.flashG.rect(CANVAS.width - t, 0, t, CANVAS.height).fill({ color: 0xef4444, alpha: pulse });
      const flare = hz.phase === 'active' ? 0.22 : 0.1;
      for (let i = 0; i < 10; i++) {
        const a = flare * (1 - i / 10) * (0.7 + pulse * 0.6);
        this.flashG.rect(0, i * 22, CANVAS.width, 22).fill({ color: 0xfff7ed, alpha: a });
      }
    }
    if (state.empLeft > 0) {
      for (const s of this.empSprites) {
        s.visible = true;
        s.position.set(Math.random() * CANVAS.width, Math.random() * CANVAS.height);
        s.width = 48 + Math.random() * 160;
        s.height = 2 + Math.random() * 5;
        s.alpha = 0.08 + Math.random() * 0.16;
        s.tint = 0xe2e8f0;
      }
    } else {
      for (const s of this.empSprites) s.visible = false;
    }
    if (state.fogRadius > 0) {
      const px = state.playerX;
      const py = state.playerY;
      const r = state.fogRadius;
      this.flashG.rect(0, 0, CANVAS.width, CANVAS.height).fill({ color: 0x020617, alpha: 0.42 });
      for (let i = 0; i < 14; i++) {
        this.flashG.circle(px, py, r + i * 26).stroke({
          width: 28,
          color: 0x020617,
          alpha: Math.min(0.92, 0.18 + i * 0.07),
        });
      }
    }
  }

  // ---------- 월드 드로잉 ----------

  private drawBackground(state: GameState): void {
    const g = this.bgG;
    if (this.lastBgTop === state.bgTop && this.lastBgBottom === state.bgBottom) return;
    this.lastBgTop = state.bgTop;
    this.lastBgBottom = state.bgBottom;
    g.clear();
    // Pixi Graphics fill gradient: two stacked rects with alpha blend approximation
    g.rect(0, 0, CANVAS.width, CANVAS.height).fill(state.bgBottom);
    g.rect(0, 0, CANVAS.width, CANVAS.height * 0.55).fill({ color: state.bgTop, alpha: 0.95 });
  }

  private drawStars(dt: number, state: GameState): void {
    if (!this.starGfxCleared) {
      this.starG.clear();
      this.starGfxCleared = true;
    }
    const scrolling = state.status !== 'gameover';
    for (const s of this.stars) {
      if (scrolling) {
        s.y += s.speed * dt;
        if (s.y > CANVAS.height) {
          s.y = -2;
          s.x = Math.random() * CANVAS.width;
        }
      }
      const spr = this.glowPool.get();
      spr.tint = 0xffffff;
      spr.position.set(s.x, s.y);
      spr.width = s.size * 2.2;
      spr.height = s.size * 4.4;
      spr.alpha = 0.25 + s.size * 0.3;
    }

    for (const d of this.drifts) {
      if (scrolling) {
        d.y += d.speed * dt;
        if (d.y > CANVAS.height + 24) {
          d.y = -24;
          d.x = Math.random() * CANVAS.width;
        }
      }
      const flicker = 0.08 + 0.05 * Math.sin(this.elapsed * 2.2 + d.phase);
      const spr = this.glowPool.get();
      spr.position.set(d.x + d.w * 0.5, d.y);
      if (state.stageId === 'orbit') {
        spr.tint = 0x7dd3fc;
        spr.width = Math.max(8, d.w * 2);
        spr.height = Math.max(6, d.h * 3);
        spr.alpha = 0.12 + flicker;
      } else if (state.stageId === 'rift') {
        spr.tint = 0xfb7185;
        spr.width = d.w * 3;
        spr.height = d.h * 8;
        spr.alpha = 0.12 + flicker;
      } else {
        spr.tint = 0xf8fafc;
        spr.width = d.w * 2;
        spr.height = d.h * 3;
        spr.alpha = 0.1 + flicker;
      }
    }
    if (state.stageId === 'legion') {
      const g = this.starG;
      g.clear();
      this.starGfxCleared = false;
      const off = (this.elapsed * 22) % 48;
      for (let x = -off; x < CANVAS.width + 48; x += 48) {
        g.moveTo(x, 0).lineTo(x, CANVAS.height).stroke({ width: 1, color: 0xfbbf24, alpha: 0.045 });
      }
      for (let y = -off; y < CANVAS.height + 48; y += 48) {
        g.moveTo(0, y).lineTo(CANVAS.width, y).stroke({ width: 1, color: 0xa78bfa, alpha: 0.035 });
      }
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
      const backX = -state.lastAimX;
      const backY = -state.lastAimY;
      const spd = Math.hypot(state.velX, state.velY);
      if (spd > 40 && this.particles.length < PERF.particleCap * 0.65) {
        this.enginePuffAcc += dt;
        if (this.enginePuffAcc >= PERF.enginePuffInterval) {
          this.enginePuffAcc = 0;
          const trail = Math.min(1, spd / Math.max(80, state.moveSpeed));
          const puff = focus ? 0.45 : 0.55 + trail * 0.7;
          this.spawnParticle({
            x: x + backX * 12 + (Math.random() - 0.5) * (focus ? 3 : 6),
            y: y + backY * 12 + (Math.random() - 0.5) * (focus ? 3 : 6),
            vx: backX * (30 + trail * 90) + (Math.random() - 0.5) * 20,
            vy: backY * (30 + trail * 90) + (Math.random() - 0.5) * 20,
            life: 0.2 + Math.random() * 0.12 + trail * 0.08,
            sizeFrom: (focus ? 4 : 8) + Math.random() * (focus ? 2 : 5) + trail * 4,
            sizeTo: 2,
            tint: 0xfb923c,
            alphaFrom: puff,
          });
        }
      }
    }

    const iframe = state.invincibleLeft > 0 && state.shieldLeft <= 0;
    const pulse = iframe ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.elapsed * 22)) : 1;
    const frosted = state.inNebula(x, y);

    if (frosted) {
      this.nebulaGhosts.push({ x, y });
      if (this.nebulaGhosts.length > 4) this.nebulaGhosts.shift();
      for (let i = 0; i < this.nebulaGhosts.length - 1; i++) {
        const gh = this.nebulaGhosts[i];
        const ga = 0.12 + i * 0.06;
        g.circle(gh.x, gh.y, PLAYER.radius * 1.15).fill({ color: 0x7dd3fc, alpha: ga });
      }
    } else {
      this.nebulaGhosts.length = 0;
    }

    const engine = this.glowPool.get();
    engine.tint = 0xfb923c;
    engine.position.set(x - state.lastAimX * 12, y - state.lastAimY * 12);
    const engineSize = state.isFocusing
      ? 14 + Math.sin(this.elapsed * 20) * 3
      : 26 + Math.sin(this.elapsed * 28) * 7;
    engine.width = engine.height = engineSize;
    engine.alpha = (state.isFocusing ? 0.55 : 0.9) * pulse;

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
    if (state.skillActiveLeft > 0 && skill.id === 'carpetBombing') {
      const glow = this.glowPool.get();
      glow.tint = 0xf97316;
      glow.position.set(x, y);
      glow.width = glow.height = PLAYER.radius * 6 + Math.sin(this.elapsed * 20) * 10;
      glow.alpha = 0.5;
    }
    if (state.skillActiveLeft > 0 && skill.id === 'iaido') {
      const glow = this.glowPool.get();
      glow.tint = 0xef4444;
      glow.position.set(x, y);
      glow.width = glow.height = PLAYER.radius * 5.2 + Math.sin(this.elapsed * 22) * 8;
      glow.alpha = 0.55;
    }
    if (state.skillActiveLeft > 0 && skill.id === 'swarmFrenzy') {
      const glow = this.glowPool.get();
      glow.tint = 0xef4444;
      glow.position.set(x, y);
      glow.width = glow.height = PLAYER.radius * 6.2 + Math.sin(this.elapsed * 20) * 10;
      glow.alpha = 0.45 + Math.sin(this.elapsed * 24) * 0.2;
    }
    if (state.skillActiveLeft > 0 && skill.id === 'bloodStream') {
      const glow = this.glowPool.get();
      glow.tint = 0x9f1239;
      glow.position.set(x, y);
      glow.width = glow.height = PLAYER.radius * 5.8 + Math.sin(this.elapsed * 26) * 10;
      glow.alpha = 0.5 + Math.sin(this.elapsed * 20) * 0.12;
    }
    if (state.rampageLeft > 0) {
      const glow = this.glowPool.get();
      glow.tint = 0x34d399;
      glow.position.set(x, y);
      glow.width = glow.height = PLAYER.radius * 5.4 + Math.sin(this.elapsed * 14) * 8;
      glow.alpha = 0.42;
    }
    if (state.immortalLeft > 0) {
      const glow = this.glowPool.get();
      glow.tint = 0xfb7185;
      glow.position.set(x, y);
      glow.width = glow.height = PLAYER.radius * 7.2 + Math.sin(this.elapsed * 14) * 10;
      glow.alpha = 0.55 + Math.sin(this.elapsed * 18) * 0.15;
      this.coreG.circle(x, y, PLAYER.radius + 16 + Math.sin(this.elapsed * 10) * 3)
        .stroke({ width: 3, color: 0xfb7185, alpha: 0.85 });
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
      const size = PLAYER.radius * (state.shipId === 'bomber' ? 3.85 : 3.2);
      this.playerSprite.width = size;
      this.playerSprite.height = size;
      this.playerSprite.tint = frosted
        ? 0x7dd3fc
        : state.shipSkinTint ? hex(state.shipSkinTint) : 0xffffff;
      this.playerSprite.alpha = pulse;
      if (state.redOutlineLeft > 0) {
        g.circle(x, y, PLAYER.radius * 1.7 + Math.sin(this.elapsed * 28) * 2)
          .stroke({ width: 3.5, color: 0xef4444, alpha: 0.95 });
      } else if (state.skillActiveLeft > 0 && skill.id === 'iaido') {
        g.circle(x, y, PLAYER.radius * 1.45)
          .stroke({ width: 2, color: 0xf87171, alpha: 0.7 });
      }
      if (state.isFocusing) {
        g.circle(x, y, 3.2).fill({ color: 0xfef08a, alpha: 0.95 * pulse });
        g.circle(x, y, 5.5).stroke({ width: 1.6, color: 0xfacc15, alpha: 0.9 * pulse });
      }
      return;
    }

    // Graphics 폴백
    g.poly([x, y - PLAYER.radius - 4, x - 13, y + 10, x - 4, y + 6, x, y + 9, x + 4, y + 6, x + 13, y + 10], true)
      .fill({ color: 0x7dd3fc, alpha: pulse })
      .stroke({ width: 1.5, color: 0xe0f2fe, alpha: pulse });
    g.circle(x, y - 2, 3.5).fill({ color: 0xf0f9ff, alpha: pulse });
    if (state.redOutlineLeft > 0) {
      g.circle(x, y, PLAYER.radius * 1.7).stroke({ width: 3.5, color: 0xef4444, alpha: 0.95 * pulse });
    }
    if (state.isFocusing) {
      g.circle(x, y, 3.2).fill({ color: 0xfef08a, alpha: 0.95 * pulse });
      g.circle(x, y, 5.5).stroke({ width: 1.6, color: 0xfacc15, alpha: 0.9 * pulse });
    }
  }

  private drawEnemies(state: GameState): void {
    const g = this.enemyG;
    g.clear();
    const nebulaOn = state.nebulaZones.length > 0;
    for (const e of state.enemies) {
      const r = e.def.radius * (e.scale ?? 1) * (e.elite ? 1.2 : 1) * (e.enraged ? 1.5 : 1);
      const isTrueBoss = e.def.movePattern === 'boss' || e.def.movePattern === 'bossSeraph';
      const isCommander = e.def.movePattern === 'legion';
      const isBoss = isTrueBoss || isCommander;
      if (e.def.id === 'nemesis') {
        this.drawNemesis(state, e, r);
        if (e.hp < e.maxHp) {
          g.rect(e.x - r, e.y - r - 8, r * 2, 4).fill({ color: 0x000000, alpha: 0.5 });
          g.rect(e.x - r, e.y - r - 8, r * 2 * Math.max(0, e.hp / e.maxHp), 4).fill(0xc084fc);
        }
        continue;
      }
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
        const tintNebula = nebulaOn
          && (isBoss || e.elite || state.enemies.length <= PERF.glowGruntCap)
          && state.inNebula(e.x, e.y);
        if (e.hitFlash > 0) spr.tint = 0xffffff;
        else if (tintNebula) spr.tint = 0x67e8f9;
        else if (e.goldDrone) spr.tint = 0xfacc15;
        else if (e.enraged) spr.tint = 0xf43f5e;
        else if (e.elite) spr.tint = 0xfbbf24;
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
        } else if (e.goldDrone) {
          const glow = this.glowPool.get();
          glow.tint = 0xfacc15;
          glow.position.set(e.x, e.y);
          glow.width = glow.height = r * 3.6 + Math.sin(this.elapsed * 6) * 6;
          glow.alpha = 0.7;
        } else if (isBoss || state.enemies.length <= PERF.glowGruntCap) {
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
        const color = e.hitFlash > 0 ? 0xffffff
          : e.goldDrone ? 0xfacc15
          : (e.elite ? 0xfbbf24 : hex(e.def.color));
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
        const shieldTex = fxFrame(this.atlas.fx.frontshield, this.elapsed, 8);
        if (shieldTex) {
          this.blitFx(shieldTex, e.x, e.y, {
            width: arcR * 2.35, height: arcR * 2.35,
            tint: col, alpha: 0.7 + Math.sin(this.elapsed * 7) * 0.15, add: true,
          });
        } else {
          const a0 = Math.PI * 0.06;
          const a1 = Math.PI * 0.94;
          g.moveTo(e.x + Math.cos(a0) * arcR, e.y + Math.sin(a0) * arcR);
          g.arc(e.x, e.y, arcR, a0, a1);
          g.stroke({ width: 5, color: col, alpha: 0.7 + Math.sin(this.elapsed * 7) * 0.15 });
        }
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
        const ring = fxFrame(this.atlas.fx.halo, this.elapsed, 8);
        if (ring) {
          const size = (r + 18) * 2.15;
          this.blitFx(ring, e.x, e.y, {
            rotation: this.elapsed * 0.8, width: size, height: size,
            tint: 0x67e8f9, alpha: pulse, add: true,
          });
        } else {
          g.circle(e.x, e.y, r + 18)
            .stroke({ width: 4, color: 0x67e8f9, alpha: pulse });
        }
      }
      if (e.hp < e.maxHp && !isTrueBoss) {
        g.rect(e.x - r, e.y - r - 8, r * 2, 4).fill({ color: 0x000000, alpha: 0.5 });
        g.rect(e.x - r, e.y - r - 8, r * 2 * Math.max(0, e.hp / e.maxHp), 4)
          .fill(e.elite ? 0xfbbf24 : 0x4ade80);
      }
      if ((e.bountyLeft ?? 0) > 0) {
        const frac = Math.max(0, e.bountyLeft! / CONSTELLATION_FX.bountySec);
        const by = e.y - r - 14;
        g.rect(e.x - r, by, r * 2, 3).fill({ color: 0x000000, alpha: 0.55 });
        g.rect(e.x - r, by, r * 2 * frac, 3).fill(0xfb923c);
      }
    }

    const fenceCol = hex(DANGER.high);
    const pylonTex = fxFrame(this.atlas.fx.pylon, this.elapsed, 8);
    for (const p of state.pylons) {
      if (pylonTex) {
        this.blitFx(pylonTex, p.x, p.y, { width: 28, height: 28, world: true });
      } else {
        g.circle(p.x, p.y, 6).fill(fenceCol);
        g.circle(p.x, p.y, 9).stroke({ width: 2, color: 0xfca5a5, alpha: 0.8 });
      }
    }
    const fenceBeam = fxFrame(this.atlas.fx.laser, this.elapsed, 14);
    for (const s of state.fenceLines()) {
      const dx = s.bx - s.ax;
      const dy = s.by - s.ay;
      const len = Math.hypot(dx, dy);
      if (fenceBeam && len > 4) {
        this.blitFx(fenceBeam, (s.ax + s.bx) * 0.5, (s.ay + s.by) * 0.5, {
          rotation: Math.atan2(dy, dx),
          width: len,
          height: Math.max(10, TRAPPER.fenceWidth * 2.2),
          tint: fenceCol,
          alpha: 0.55 + Math.sin(this.elapsed * 18) * 0.2,
          add: true,
        });
      } else {
        g.moveTo(s.ax, s.ay).lineTo(s.bx, s.by)
          .stroke({ width: TRAPPER.fenceWidth, color: fenceCol, alpha: 0.55 + Math.sin(this.elapsed * 18) * 0.2 });
        g.moveTo(s.ax, s.ay).lineTo(s.bx, s.by)
          .stroke({ width: 2, color: 0xfef2f2, alpha: 0.7 });
      }
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

  private drawNemesis(state: GameState, e: Enemy, r: number): void {
    const shipId = (e.nemesisShipId ?? state.shipId) as ShipId;
    const tex = this.atlas.ships[shipId];
    const tint = 0x800080;
    this.spawnParticle({
      x: e.x + (Math.random() - 0.5) * 10,
      y: e.y + 12 + Math.random() * 8,
      vx: (Math.random() - 0.5) * 24,
      vy: 90 + Math.random() * 50,
      life: 0.24 + Math.random() * 0.1,
      sizeFrom: 9,
      sizeTo: 2,
      tint: 0xef4444,
      alphaFrom: 0.9,
    });
    const glow = this.glowPool.get();
    glow.tint = tint;
    glow.position.set(e.x, e.y);
    glow.width = glow.height = r * 4.4 + Math.sin(this.elapsed * 5) * 6;
    glow.alpha = 0.58;
    if (tex) {
      const spr = this.entityPool.get(tex);
      spr.position.set(e.x, e.y);
      spr.width = spr.height = r * 2.7;
      spr.tint = e.hitFlash > 0 ? 0xffffff : tint;
      spr.alpha = 1;
      spr.rotation = 0;
    } else {
      this.enemyG.circle(e.x, e.y, r).fill({ color: tint, alpha: 0.95 });
    }
  }

  /** 보스·적 탄환 — 흰 코어 + 보라 테두리 (치명 탄 시인성) */
  private drawEnemyProjectiles(state: GameState): void {
    const outline = hex(DANGER.fatal);
    const glowOk = state.enemyProjectiles.length <= PERF.glowEnemyBulletCap;
    for (const p of state.enemyProjectiles) {
      const col = p.color ? hex(p.color) : outline;
      const tex = fxFrame(this.atlas.fx.ebullet, this.elapsed + p.x * 0.02, 12);
      if (tex) {
        const size = p.radius * 5.2;
        this.blitFx(tex, p.x, p.y, { width: size, height: size, tint: col });
      } else {
        this.coreG.circle(p.x, p.y, p.radius).stroke({ width: 2, color: col });
        this.coreG.circle(p.x, p.y, p.radius * 0.55).fill(0xffffff);
      }
      if (!glowOk) continue;
      const glow = this.glowPool.get();
      glow.tint = col;
      glow.position.set(p.x, p.y);
      glow.width = glow.height = p.radius * 5.5;
      glow.alpha = 0.9;
    }
  }

  /** 드롭 아이템 */
  private drawPickups(state: GameState): void {
    const g = this.pickupG;
    g.clear();
    for (const p of state.pickups) {
      if (p.homing) {
        const glow = this.glowPool.get();
        glow.tint = 0xf43f5e;
        glow.position.set(p.x, p.y);
        glow.width = glow.height = 48;
        glow.alpha = 0.95;
        g.circle(p.x, p.y, PICKUPS.radius + 2).fill(0xf43f5e);
        continue;
      }
      if (p.life < 3 && Math.floor(this.elapsed * 8) % 2 === 0) continue;

      const bob = Math.sin(this.elapsed * 4 + p.x) * 3;
      const y = p.y + bob;
      const tint = p.kind === 'heal' ? 0x4ade80
        : p.kind === 'magnet' ? 0x38bdf8
        : p.kind === 'cube' ? 0x67e8f9
        : p.kind === 'goldCube' || p.kind === 'voidCrate' || p.kind === 'credit' ? 0xfbbf24
        : p.kind === 'cursedCrate' ? 0x7f1d1d
        : 0xfb923c;
      const tex = this.atlas.pickups[
        p.kind === 'voidCrate' || p.kind === 'cursedCrate' || p.kind === 'credit' ? 'goldCube' : p.kind
      ];

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
        if (p.kind === 'voidCrate') {
          g.circle(p.x, y, PICKUPS.radius + 9)
            .stroke({ width: 2.4, color: 0xfde68a, alpha: 0.95 });
        } else if (p.kind === 'cursedCrate') {
          g.circle(p.x, y, PICKUPS.radius + 9)
            .stroke({ width: 2.6, color: 0x7f1d1d, alpha: 0.95 });
          spr.tint = 0x7f1d1d;
        } else if (p.kind === 'credit') {
          spr.tint = 0xfacc15;
        }
      } else {
        g.circle(p.x, y, PICKUPS.radius + 3).fill({ color: 0x0f172a, alpha: 0.85 }).stroke({ width: 2, color: tint });
        if (p.kind === 'heal') {
          g.rect(p.x - 6, y - 2, 12, 4).fill(tint);
          g.rect(p.x - 2, y - 6, 4, 12).fill(tint);
        } else if (p.kind === 'magnet') {
          g.rect(p.x - 6, y - 6, 4, 9).fill(tint);
          g.rect(p.x + 2, y - 6, 4, 9).fill(tint);
          g.rect(p.x - 6, y + 3, 12, 4).fill(tint);
        } else if (p.kind === 'cube' || p.kind === 'goldCube' || p.kind === 'voidCrate' || p.kind === 'credit' || p.kind === 'cursedCrate') {
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
    const n = state.projectiles.length;
    const glowOk = n <= PERF.glowProjCap;
    const trailOk = n <= PERF.glowProjCap;
    for (const p of state.projectiles) {
      const color = this.frenzyTint(state, p.weaponId, hex(p.color));
      const angle = Math.atan2(p.vy, p.vx);
      const spec = p.weaponId ? PROJ_FX[p.weaponId] : undefined;
      const tex = spec ? fxFrame(this.atlas.fx[spec.fx], this.elapsed + p.x * 0.01, spec.fps ?? 12) : undefined;

      if (spec && tex) {
        const h = p.radius * spec.sizeMul;
        const w = h * (spec.elong ?? 1);
        this.blitFx(tex, p.x, p.y, {
          rotation: angle,
          width: w,
          height: h,
          tint: spec.tint ? color : 0xffffff,
          add: spec.add,
          anchorX: spec.anchorX,
        });
        if (glowOk) {
          const glow = this.glowPool.get();
          glow.tint = color;
          glow.position.set(p.x, p.y);
          glow.width = glow.height = p.radius * (spec.elong ? 5 : 6);
          glow.alpha = spec.add ? 0.55 : 0.7;
        }
        if (trailOk && spec.trail) {
          const crescent = p.weaponId === 'seekingSlash' || p.weaponId === 'phantomBlade'
            || p.weaponId === 'boomerangBlade' || p.weaponId === 'infinityChakram';
          const tail = p.radius * (p.boosted ? 5 : crescent ? 6.2 : 3.2);
          this.blitStreak(
            p.x - Math.cos(angle) * tail,
            p.y - Math.sin(angle) * tail,
            angle,
            tail,
            p.radius * (p.boosted ? 1.4 : crescent ? 1.15 : 0.9),
            p.boosted ? 0xf8fafc : color,
            p.boosted ? 0.7 : crescent ? 0.42 : 0.28,
          );
        }
        continue;
      }

      if (trailOk) {
        const tail = p.radius * (p.boosted ? 6.5 : 4);
        this.blitStreak(
          p.x - Math.cos(angle) * tail,
          p.y - Math.sin(angle) * tail,
          angle,
          tail,
          p.radius * (p.boosted ? 1.8 : 1.2),
          p.boosted ? 0xf8fafc : color,
          p.boosted ? 0.85 : 0.4,
        );
        if (p.boosted) {
          const tail2 = tail * 1.15;
          this.blitStreak(
            p.x - Math.cos(angle) * tail2,
            p.y - Math.sin(angle) * tail2,
            angle,
            tail2,
            p.radius * 0.7,
            0xffffff,
            0.95,
          );
        }
      }

      if (glowOk) {
        const glow = this.glowPool.get();
        glow.tint = color;
        glow.position.set(p.x, p.y);
        glow.width = glow.height = p.radius * 6;
        glow.alpha = 1;
      }

      const core = this.glowPool.get();
      core.tint = 0xffffff;
      core.position.set(p.x, p.y);
      core.width = core.height = p.radius * 1.2;
      core.alpha = 1;
    }
  }

  private drawSpecials(state: GameState): void {
    const g = this.projG;
    g.clear();
    for (const s of state.slashes) {
      const color = hex(s.color);
      const alpha = Math.max(0.28, s.life / s.maxLife);
      const progress = 1 - s.life / s.maxLife;
      const wide = s.arcDeg > 40;
      const whip = isWhipWeapon(s.weaponId);
      const sweepAng = whip ? slashSweepAngle(s.angle, s.arcDeg, progress) : s.angle;
      const tex = fxFrameOnce(this.atlas.fx[whip ? 'whip' : wide ? 'slash' : 'beam'], progress);
      if (whip) {
        const tipX = s.x + Math.cos(sweepAng) * s.range;
        const tipY = s.y + Math.sin(sweepAng) * s.range;
        this.blitStreak(s.x, s.y, sweepAng, s.range, 10, color, 0.28 * alpha);
        this.blitStreak(s.x, s.y, sweepAng, s.range, 3.2, 0xffffff, 0.7 * alpha);
        if (tex) {
          this.blitFx(tex, s.x, s.y, {
            rotation: sweepAng,
            width: s.range * 1.08,
            height: Math.max(36, s.range * 0.22),
            tint: color, alpha, add: true,
            anchorX: 0.12, anchorY: 0.5,
          });
        }
        const glow = this.glowPool.get();
        glow.tint = color;
        glow.position.set(tipX, tipY);
        glow.width = glow.height = 28 + progress * 10;
        glow.alpha = 0.85 * alpha;
        if (this.particles.length < PERF.particleCap * 0.65) {
          this.spawnParticle({
            x: tipX + (Math.random() - 0.5) * 6,
            y: tipY + (Math.random() - 0.5) * 6,
            vx: Math.cos(sweepAng) * 40 + (Math.random() - 0.5) * 30,
            vy: Math.sin(sweepAng) * 40 + (Math.random() - 0.5) * 30,
            life: 0.16 + Math.random() * 0.08,
            sizeFrom: 14 + Math.random() * 8,
            sizeTo: 3,
            tint: 0xf5d0fe,
            alphaFrom: 0.9,
            drag: 2.4,
          });
          this.spawnParticle({
            x: tipX, y: tipY,
            life: 0.12, sizeFrom: 10, sizeTo: 4,
            tint: 0xffffff, alphaFrom: 0.8,
          });
        }
        continue;
      }
      if (tex) {
        if (wide) {
          const size = s.range * 2.4;
          this.blitFx(tex, s.x, s.y, {
            rotation: s.angle, width: size, height: size, tint: color, alpha, add: true,
          });
        } else {
          this.blitFx(tex, s.x, s.y, {
            rotation: s.angle,
            width: s.range * 1.04,
            height: Math.max(42, Math.min(96, s.range * 0.09)),
            tint: color, alpha, add: true,
            anchorX: 0.14, anchorY: 0.5,
          });
        }
        const glow = this.glowPool.get();
        glow.tint = color;
        glow.position.set(s.x + Math.cos(s.angle) * s.range * (wide ? 0.35 : 0.45), s.y + Math.sin(s.angle) * s.range * (wide ? 0.35 : 0.45));
        glow.width = glow.height = wide ? s.range * 1.6 : 48;
        glow.alpha = 0.45 * alpha;
      } else {
        const half = (s.arcDeg * Math.PI) / 360;
        g.moveTo(s.x, s.y);
        g.arc(s.x, s.y, s.range, s.angle - half, s.angle + half);
        g.lineTo(s.x, s.y);
        g.fill({ color, alpha: 0.22 * alpha });
        g.moveTo(s.x, s.y);
        g.arc(s.x, s.y, s.range, s.angle - half, s.angle + half);
        g.stroke({ width: 3, color, alpha: 0.8 * alpha });
      }
    }
    for (const o of state.orbiters) {
      const color = this.frenzyTint(state, o.weaponId, hex(o.color));
      if (o.ring) {
        const tex = fxFrame(this.atlas.fx.halo, this.elapsed, 8);
        if (tex) {
          const pulse = 1 + Math.sin(this.elapsed * 8) * 0.05;
          const size = o.radius * 2.2 * pulse;
          this.blitFx(tex, state.playerX, state.playerY, {
            rotation: this.elapsed * 0.7, width: size, height: size, tint: color, alpha: 0.92, add: true,
          });
        } else {
          g.circle(state.playerX, state.playerY, o.radius)
            .stroke({ width: 8, color, alpha: 0.45 + Math.sin(this.elapsed * 8) * 0.1 });
          g.circle(state.playerX, state.playerY, o.radius)
            .stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
        }
      } else {
        const x = state.playerX + Math.cos(o.angle) * o.radius;
        const y = state.playerY + Math.sin(o.angle) * o.radius;
        const tex = fxFrame(this.atlas.fx.rotor, this.elapsed, 18);
        if (tex) {
          const size = o.hitRadius * 4.8;
          this.blitFx(tex, x, y, {
            rotation: this.elapsed * 16 + o.angle, width: size, height: size,
            tint: color,
          });
        } else {
          const tooth = o.hitRadius * 1.35;
          const c = Math.cos(o.angle + this.elapsed * 10);
          const s = Math.sin(o.angle + this.elapsed * 10);
          g.poly([
            x + c * tooth, y + s * tooth,
            x - s * tooth * 0.7, y + c * tooth * 0.7,
            x - c * tooth, y - s * tooth,
            x + s * tooth * 0.7, y - c * tooth * 0.7,
          ], true).fill(color);
        }
        const glow = this.glowPool.get();
        glow.tint = color;
        glow.position.set(x, y);
        glow.width = glow.height = o.hitRadius * 5;
        glow.alpha = 0.7;
      }
    }
    for (const m of state.mines) {
      const color = this.frenzyTint(state, m.weaponId, hex(m.color));
      const idle = 1 + Math.sin(this.elapsed * 5 + m.x * 0.05) * 0.12;
      const r = m.radius * idle;
      const blink = m.fuse < 0.6 && Math.floor(this.elapsed * 12) % 2 === 0;
      const fxId = this.mineFxId(m.weaponId);
      const tex = fxFrame(this.atlas.fx[fxId], this.elapsed + m.x * 0.02, m.seekSpeed > 0 ? 10 : 7);
      if (tex) {
        const size = m.radius * 5.2 * idle;
        let rot = 0;
        if (m.seekSpeed > 0 && (Math.abs(m.vx) > 4 || Math.abs(m.vy) > 4)) rot = Math.atan2(m.vy, m.vx);
        else if (fxId === 'singularity') rot = this.elapsed * 1.6;
        this.blitFx(tex, m.x, m.y, {
          rotation: rot, width: size, height: size,
          tint: color,
          alpha: blink ? 1 : 0.96,
        });
      } else {
        g.circle(m.x, m.y, r).fill({ color: blink ? 0xffffff : color, alpha: blink ? 1 : 0.88 + idle * 0.08 });
        g.circle(m.x, m.y, r + 3).stroke({ width: 1.5, color, alpha: 0.55 + idle * 0.2 });
        if (m.seekSpeed > 0) {
          g.moveTo(m.x, m.y - r - 4)
            .lineTo(m.x + 4, m.y - 1)
            .lineTo(m.x - 4, m.y - 1)
            .fill(blink ? 0xffffff : color);
        }
      }
      if (m.pullRadius > 0) {
        g.circle(m.x, m.y, m.pullRadius)
          .stroke({ width: 1.5, color, alpha: 0.22 + Math.sin(this.elapsed * 6) * 0.08 });
      }
    }
    for (const m of state.hazardMines) {
      const idle = 1 + Math.sin(this.elapsed * 6 + m.x * 0.05) * 0.1;
      const blink = m.fuse < 0.55 && Math.floor(this.elapsed * 14) % 2 === 0;
      const tex = fxFrame(this.atlas.fx.mine, this.elapsed + m.x * 0.03, 7);
      const color = 0xc084fc;
      if (tex) {
        this.blitFx(tex, m.x, m.y, {
          width: m.radius * 5 * idle,
          height: m.radius * 5 * idle,
          tint: blink ? 0xffffff : color,
          alpha: 0.95,
        });
      } else {
        g.circle(m.x, m.y, m.radius * idle).fill({ color: blink ? 0xffffff : color, alpha: 0.9 });
      }
      g.circle(m.x, m.y, m.explodeRadius)
        .stroke({ width: 1.2, color, alpha: 0.2 + Math.sin(this.elapsed * 8) * 0.08 });
    }
    for (const s of state.summons) {
      const color = this.frenzyTint(state, s.weaponId, hex(s.elite ? '#fbbf24' : s.color));
      const idle = 1 + Math.sin(this.elapsed * 6 + s.x * 0.04) * 0.1;
      const scale = s.elite ? 1.35 : 1;
      const tex = fxFrame(this.atlas.fx.gatling, this.elapsed + s.x * 0.02, 10);
      if (tex) {
        this.blitFx(tex, s.x, s.y, {
          width: s.radius * 4.6 * idle * scale, height: s.radius * 4.6 * idle * scale, tint: color,
        });
      } else {
        g.circle(s.x, s.y, s.radius * idle).fill(color);
        g.rect(s.x - 2, s.y - s.radius - 8, 4, 10).fill(color);
      }
      const glow = this.glowPool.get();
      glow.tint = color;
      glow.position.set(s.x, s.y);
      glow.width = glow.height = s.radius * (s.elite ? 7.5 : 5);
      glow.alpha = s.elite ? 0.8 : 0.55;
      if (s.elite) {
        g.circle(s.x, s.y, s.radius * 1.8 + Math.sin(this.elapsed * 8) * 2)
          .stroke({ width: 2, color: 0xfde68a, alpha: 0.7 });
      }
    }
    for (const z of state.zones) {
      const color = hex(z.color);
      if (z.kind === 'segment') {
        const fade = Math.min(1, z.life / 0.22);
        this.drawCrackleSegment(g, z.x, z.y, z.x2, z.y2, z.radius, color, fade);
        const dx = z.x2 - z.x;
        const dy = z.y2 - z.y;
        const len = Math.hypot(dx, dy);
        const crack = fxFrame(this.atlas.fx.laser, this.elapsed + z.x * 0.01, 16);
        if (crack && len > 8) {
          this.blitFx(crack, (z.x + z.x2) * 0.5, (z.y + z.y2) * 0.5, {
            rotation: Math.atan2(dy, dx),
            width: len,
            height: Math.max(14, z.radius * 1.6),
            tint: color,
            alpha: 0.28 * fade,
            add: true,
          });
        }
      } else {
        g.circle(z.x, z.y, z.radius).fill({ color: 0x020617, alpha: 0.35 });
        g.circle(z.x, z.y, z.radius)
          .stroke({ width: 3, color, alpha: 0.55 + Math.sin(this.elapsed * 5) * 0.15 });
        const hole = fxFrame(this.atlas.fx.singularity, this.elapsed, 8);
        if (hole) {
          const size = z.radius * 2.15;
          this.blitFx(hole, z.x, z.y, {
            rotation: this.elapsed * 1.2, width: size, height: size, alpha: 0.85, add: true,
          });
        }
      }
    }
    for (const b of state.interceptBeams) {
      const dx = b.x2 - b.x1;
      const dy = b.y2 - b.y1;
      const len = Math.hypot(dx, dy);
      const bolt = fxFrame(this.atlas.fx.laser, this.elapsed, 16);
      if (bolt && len > 2) {
        this.blitFx(bolt, (b.x1 + b.x2) * 0.5, (b.y1 + b.y2) * 0.5, {
          rotation: Math.atan2(dy, dx),
          width: len,
          height: 14,
          tint: 0x86efac,
          alpha: Math.max(0, b.life * 8),
          add: true,
        });
      } else {
        g.moveTo(b.x1, b.y1).lineTo(b.x2, b.y2)
          .stroke({ width: 3, color: 0x86efac, alpha: Math.max(0, b.life * 8) });
      }
    }
    if (state.ampAura) {
      const a = 0.35 + Math.sin(this.elapsed * 6) * 0.08;
      const ring = fxFrame(this.atlas.fx.halo, this.elapsed, 8);
      if (ring) {
        const size = state.ampAura.r * 2.2;
        this.blitFx(ring, state.ampAura.x, state.ampAura.y, {
          rotation: this.elapsed * 0.9, width: size, height: size,
          tint: 0x818cf8, alpha: a, add: true,
        });
      } else {
        g.circle(state.ampAura.x, state.ampAura.y, state.ampAura.r)
          .fill({ color: 0x818cf8, alpha: a * 0.55 });
        g.circle(state.ampAura.x, state.ampAura.y, state.ampAura.r)
          .stroke({ width: 2, color: 0xa5b4fc, alpha: 0.7 });
      }
    }
    if (state.droneId) {
      const dx = state.playerX + 22;
      const dy = state.playerY - 16 + Math.sin(this.elapsed * 3) * 4;
      const col = state.empLeft > 0 ? 0x94a3b8
        : state.droneId === 'retriever' ? 0x38bdf8
        : state.droneId === 'defender' ? 0x86efac
        : 0x818cf8;
      const dtex = fxFrame(this.atlas.fx.drone, this.elapsed, 10);
      if (dtex) {
        this.blitFx(dtex, dx, dy, {
          width: 22, height: 22, tint: col,
        });
      } else {
        const s = 6.5;
        g.poly([dx, dy - s, dx + s * 0.75, dy, dx, dy + s * 0.85, dx - s * 0.75, dy], true).fill(col);
        g.poly([dx - 3, dy + 2, dx - 9, dy + 8, dx - 1, dy + 6], true).fill(col);
        g.poly([dx + 3, dy + 2, dx + 9, dy + 8, dx + 1, dy + 6], true).fill(col);
        g.circle(dx, dy - 1, 2).fill(0xf8fafc);
      }
      const glow = this.glowPool.get();
      glow.tint = col;
      glow.position.set(dx, dy + 5);
      glow.width = glow.height = 16;
      glow.alpha = 0.75;
    }
    if (state.turretDarkActive) {
      const pulse = 0.28 + Math.sin(this.elapsed * 6) * 0.08;
      const ring = fxFrame(this.atlas.fx.halo, this.elapsed, 8);
      if (ring) {
        this.blitFx(ring, state.playerX, state.playerY, {
          rotation: this.elapsed * 1.4, width: 92, height: 92,
          tint: 0xef4444, alpha: pulse, add: true,
        });
      } else {
        g.circle(state.playerX, state.playerY, 42).fill({ color: 0xef4444, alpha: pulse * 0.65 });
        g.circle(state.playerX, state.playerY, 42).stroke({ width: 2, color: 0xf97316, alpha: 0.7 });
      }
    }
    if (state.empLeft > 0 && Math.random() < 0.12) {
      this.spawnParticle({
        x: state.playerX + (Math.random() - 0.5) * 28,
        y: state.playerY + (Math.random() - 0.5) * 28,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        life: 0.18, sizeFrom: 6, sizeTo: 2, tint: 0xfacc15, alphaFrom: 0.9,
      });
    }
  }

  private spawnWreckShards(x: number, y: number, w: number, h: number): void {
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
      const spd = 70 + Math.random() * 160;
      this.wreckShards.push({
        x: x + (Math.random() - 0.5) * w * 0.4,
        y: y + (Math.random() - 0.5) * h * 0.4,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd + 40,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 6,
        life: 0.7 + Math.random() * 0.4,
        maxLife: 1,
        w: 10 + Math.random() * 18,
        h: 6 + Math.random() * 10,
        tint: Math.random() < 0.4 ? 0xef4444 : 0x64748b,
      });
    }
  }

  private updateWreckShards(dt: number): void {
    for (let i = this.wreckShards.length - 1; i >= 0; i--) {
      const s = this.wreckShards[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 180 * dt;
      s.rot += s.vr * dt;
      if (s.life <= 0) this.wreckShards.splice(i, 1);
    }
  }

  private drawTerrain(state: GameState): void {
    const g = this.coreG;
    this.drawNebulaZones(state, g);
    this.drawDerelict(state, g);
    this.drawOneWayShield(state, g);
    this.drawQuantumCores(state, g);
    this.drawCreditOrbs(state, g);
    this.drawWreckShards(g);
  }

  private drawNebulaZones(state: GameState, g: Graphics): void {
    for (const z of state.nebulaZones) {
      const tex = fxFrame(this.atlas.fx.nebula, this.elapsed * 0.45 + z.x * 0.002, 5);
      if (tex) {
        const size = z.r * 2.4;
        this.blitFx(tex, z.x, z.y, {
          rotation: this.elapsed * 0.07, width: size, height: size, alpha: 0.58, add: true, world: true,
        });
        const tex2 = fxFrame(this.atlas.fx.nebula, this.elapsed * 0.32 + 1.1, 5);
        if (tex2) {
          this.blitFx(tex2, z.x + 10, z.y - 8, {
            rotation: -this.elapsed * 0.045, width: size * 0.86, height: size * 0.86, alpha: 0.34, add: true, world: true,
          });
        }
        g.circle(z.x, z.y, z.r).stroke({ width: 1.5, color: 0xc4b5fd, alpha: 0.16 + Math.sin(this.elapsed * 1.6 + z.x) * 0.04 });
      } else {
        const pulse = 0.16 + Math.sin(this.elapsed * 1.6 + z.x) * 0.04;
        g.circle(z.x, z.y, z.r).fill({ color: 0x6d28d9, alpha: pulse });
        g.circle(z.x, z.y, z.r * 0.72).fill({ color: 0x4ade80, alpha: pulse * 0.45 });
      }
      const glow = this.glowPool.get();
      glow.tint = 0xa78bfa;
      glow.position.set(z.x, z.y);
      glow.width = glow.height = z.r * 2.1;
      glow.alpha = 0.16;
      if (Math.random() < 0.28) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * z.r * 0.85;
        this.spawnParticle({
          x: z.x + Math.cos(a) * d,
          y: z.y + Math.sin(a) * d,
          vx: (Math.random() - 0.5) * 20,
          vy: -12 - Math.random() * 18,
          life: 0.7, sizeFrom: 10, sizeTo: 22,
          tint: Math.random() < 0.5 ? 0xc084fc : 0x86efac,
          alphaFrom: 0.35,
        });
      }
    }
  }

  private drawOneWayShield(state: GameState, g: Graphics): void {
    const s = state.oneWayShield;
    if (!s) return;
    const fade = Math.min(1, s.life / 2);
    const tex = fxFrame(this.atlas.fx.shieldwall, this.elapsed, 8);
    if (tex) {
      this.blitFx(tex, s.x + s.w * 0.5, s.y + s.h * 0.5, {
        width: s.w * 2.15,
        height: s.h * 1.12,
        alpha: 0.72 * fade,
        add: true,
      });
    } else {
      g.rect(s.x, s.y, s.w, s.h).fill({ color: 0x22d3ee, alpha: 0.14 * fade });
      g.rect(s.x, s.y, s.w, s.h).stroke({ width: 2, color: 0x67e8f9, alpha: 0.75 * fade });
      const size = 9;
      const dx = size * 1.75;
      const dy = size * 1.5;
      const scroll = (this.elapsed * 28) % dy;
      for (let row = -1; row < s.h / dy + 2; row++) {
        for (let col = -1; col < s.w / dx + 2; col++) {
          const ox = col * dx + ((row & 1) ? dx * 0.5 : 0);
          const oy = row * dy + scroll;
          if (ox < -size || ox > s.w + size || oy < -size || oy > s.h + size) continue;
          const cx = s.x + ox;
          const cy = s.y + oy;
          const pts: number[] = [];
          for (let k = 0; k < 6; k++) {
            const a = (Math.PI / 3) * k + Math.PI / 6;
            pts.push(cx + Math.cos(a) * size, cy + Math.sin(a) * size);
          }
          g.poly(pts, true).stroke({ width: 1, color: 0xa5f3fc, alpha: 0.35 * fade });
        }
      }
      const genX = s.x + s.w * 0.5;
      const genY = s.y + s.h + 6;
      g.roundRect(genX - 8, genY - 4, 16, 10, 2).fill({ color: 0x0f172a, alpha: 0.9 * fade });
      g.circle(genX, genY, 3).fill({ color: 0x22d3ee, alpha: 0.9 * fade });
    }
  }

  private drawQuantumCores(state: GameState, g: Graphics): void {
    for (const c of state.quantumCores) {
      const hp = Math.max(0, c.hp / c.maxHp);
      const pulseHz = 3 + (1 - hp) * 10;
      const pulse = 0.55 + Math.sin(this.elapsed * pulseHz) * 0.35;
      const r = c.radius;
      const tex = fxFrame(this.atlas.fx.quantum, this.elapsed * (0.6 + (1 - hp) * 1.4), 8);
      if (tex) {
        const size = r * 2.55 * (1 + pulse * 0.06);
        this.blitFx(tex, c.x, c.y, {
          width: size, height: size,
          tint: c.hitFlash > 0 ? 0xf8fafc : 0xffffff,
          alpha: 0.95,
          world: true,
        });
      } else {
        const pts = [
          c.x, c.y - r,
          c.x + r * 0.72, c.y - r * 0.25,
          c.x + r * 0.55, c.y + r * 0.7,
          c.x - r * 0.55, c.y + r * 0.7,
          c.x - r * 0.72, c.y - r * 0.25,
        ];
        g.poly(pts, true).fill({ color: c.hitFlash > 0 ? 0xffffff : 0x7c3aed, alpha: 0.92 });
        g.poly(pts, true).stroke({ width: 2, color: 0xc4b5fd, alpha: 0.9 });
        g.circle(c.x, c.y, r * 0.32).fill({ color: 0xf97316, alpha: 0.7 + pulse * 0.25 });
      }
      const core = this.glowPool.get();
      core.tint = 0xfb923c;
      core.position.set(c.x, c.y);
      core.width = core.height = r * (1.4 + pulse * 0.8);
      core.alpha = 0.55 + pulse * 0.35;
      const cracks = Math.floor((1 - hp) * 5);
      for (let i = 0; i < cracks; i++) {
        const a = -0.9 + i * 0.55;
        g.moveTo(c.x + Math.cos(a) * r * 0.15, c.y + Math.sin(a) * r * 0.1)
          .lineTo(c.x + Math.cos(a) * r * 0.85, c.y + Math.sin(a) * r * 0.75)
          .stroke({ width: 1.5, color: 0x0f172a, alpha: 0.75 });
      }
    }
  }

  private drawDerelict(state: GameState, g: Graphics): void {
    const d = state.derelict;
    if (!d) return;
    const shadeW = d.w * TERRAIN.derelict.shadeWMul;
    const shadeX = d.x - shadeW / 2;
    const shadeY = d.y + d.h / 2;
    const shadeH = TERRAIN.derelict.shadeH;
    const solar = state.envHazard?.kind === 'solar';
    if (solar) {
      g.rect(shadeX, shadeY, shadeW, shadeH).fill({ color: 0x020617, alpha: 0.72 });
      g.rect(shadeX, shadeY, shadeW, shadeH).stroke({ width: 2, color: 0x1e293b, alpha: 0.85 });
    }
    const heat = d.breaking ? 0.35 + d.glow * 0.65 : 0;
    const tex = this.atlas.terrain.derelict;
    if (tex) {
      const spr = this.entityPool.get(tex);
      spr.position.set(d.x, d.y);
      spr.width = d.w;
      spr.height = d.h;
      spr.tint = heat > 0 ? 0xf87171 : 0xffffff;
      spr.alpha = 1;
    } else {
      g.roundRect(d.x - d.w / 2, d.y - d.h / 2, d.w, d.h, 6).fill({ color: heat > 0 ? 0x7f1d1d : 0x334155, alpha: 0.95 });
      g.roundRect(d.x - d.w / 2, d.y - d.h / 2, d.w, d.h, 6).stroke({ width: 2, color: 0x94a3b8 });
    }
    if (Math.random() < 0.45) {
      this.spawnParticle({
        x: d.x + (Math.random() - 0.5) * d.w * 0.7,
        y: d.y + (Math.random() - 0.5) * d.h * 0.4,
        vx: (Math.random() - 0.5) * 40,
        vy: -40 - Math.random() * 50,
        life: 0.22, sizeFrom: 5, sizeTo: 1,
        tint: Math.random() < 0.5 ? 0xfbbf24 : 0x38bdf8,
        alphaFrom: 0.95,
      });
    }
    if (heat > 0) {
      const glow = this.glowPool.get();
      glow.tint = 0xef4444;
      glow.position.set(d.x, d.y);
      glow.width = d.w * (1.4 + heat);
      glow.height = d.h * (1.6 + heat);
      glow.alpha = 0.35 + heat * 0.4;
    }
  }

  private drawCreditOrbs(state: GameState, g: Graphics): void {
    for (const o of state.creditOrbs) {
      const bob = Math.sin(this.elapsed * 8 + o.x) * 2;
      const y = o.y + bob;
      const tex = this.atlas.pickups.goldCube;
      if (tex) {
        const spr = this.entityPool.get(tex);
        spr.position.set(o.x, y);
        spr.width = spr.height = 22;
      } else {
        g.circle(o.x, y, 6).fill(0xfbbf24);
        g.circle(o.x, y, 3).fill(0xfef3c7);
      }
      const glow = this.glowPool.get();
      glow.tint = 0xfbbf24;
      glow.position.set(o.x, y);
      glow.width = glow.height = 18;
      glow.alpha = 0.7;
    }
  }

  private drawWreckShards(g: Graphics): void {
    for (const s of this.wreckShards) {
      const a = Math.max(0, s.life / 0.9);
      const hx = Math.cos(s.rot) * s.w * 0.5;
      const hy = Math.sin(s.rot) * s.h * 0.5;
      g.poly([
        s.x - hx, s.y - hy,
        s.x + hy, s.y - hx,
        s.x + hx, s.y + hy,
      ], true).fill({ color: s.tint, alpha: a });
    }
  }

  private drawAltarAndHazards(state: GameState): void {
    const g = this.coreG;
    const pact = state.bloodPact;
    if (pact) {
      const pulse = 0.45 + Math.sin(this.elapsed * 4) * 0.12;
      g.circle(pact.x, pact.y, pact.radius).fill({ color: 0x7f1d1d, alpha: 0.18 });
      g.circle(pact.x, pact.y, pact.radius)
        .stroke({ width: 3, color: 0xef4444, alpha: pulse });
      const frac = Math.min(1, pact.dwell / pact.needed);
      if (frac > 0) {
        g.circle(pact.x, pact.y, pact.radius * frac)
          .stroke({ width: 4, color: 0xfca5a5, alpha: 0.85 });
      }
    }
    const altar = state.altar;
    if (altar && !altar.done) {
      const riseT = Math.min(1, altar.age / VOID_ALTAR.spawnRiseSec);
      const ease = 1 - (1 - riseT) ** 3;
      const drawY = altar.y - 6 + (1 - ease) * 36;
      const scale = 0.3 + ease * 0.7;
      const glow = this.glowPool.get();
      glow.tint = 0x7c3aed;
      glow.position.set(altar.x, drawY);
      glow.width = glow.height = (70 + Math.sin(this.elapsed * 4) * 10) * scale;
      glow.alpha = (0.55 + altar.charge * 0.35) * ease;
      const tex = fxFrame(this.atlas.fx.altar, this.elapsed, 7);
      if (tex) {
        this.blitFx(tex, altar.x, drawY, {
          width: 78 * scale, height: 96 * scale, world: true,
        });
      } else {
        g.roundRect(altar.x - 10 * scale, drawY - 22 * scale, 20 * scale, 48 * scale, 3).fill(0x0f172a);
        g.roundRect(altar.x - 14 * scale, drawY + 16 * scale, 28 * scale, 8 * scale, 2).fill(0x111827);
        g.rect(altar.x - 4 * scale, drawY - 32 * scale, 8 * scale, 10 * scale).fill(0x7f1d1d);
      }
      if (altar.charge > 0 && altar.trialLeft === 0) {
        const r = VOID_ALTAR.radius + 6;
        const start = -Math.PI / 2;
        const end = start + altar.charge * Math.PI * 2;
        const t = altar.charge;
        const col = (Math.round(0xfb + (0xef - 0xfb) * t) << 16)
          | (Math.round(0xbf + (0x44 - 0xbf) * t) << 8)
          | Math.round(0x24 + (0x44 - 0x24) * t);
        g.circle(altar.x, altar.y, r).stroke({ width: 3, color: 0x334155, alpha: 0.5 });
        g.moveTo(altar.x + Math.cos(start) * r, altar.y + Math.sin(start) * r);
        g.arc(altar.x, altar.y, r, start, end);
        g.stroke({ width: 5, color: col, alpha: 0.95 });
      }
    }
    const hz = state.envHazard;
    if (!hz) return;
    if (hz.kind === 'solar') {
      for (const s of hz.shades) {
        const pad = fxFrame(this.atlas.fx.shade, this.elapsed, 7);
        if (pad) {
          this.blitFx(pad, s.x + s.w * 0.5, s.y + s.h * 0.5, {
            width: s.w * 1.15, height: s.h * 1.15,
            alpha: state.derelict ? 0.45 : 0.7,
            add: true,
            world: true,
          });
        } else if (!state.derelict) {
          g.rect(s.x, s.y, s.w, s.h).fill({ color: 0x38bdf8, alpha: 0.22 + Math.sin(this.elapsed * 5) * 0.05 });
          g.rect(s.x, s.y, s.w, s.h).stroke({ width: 2, color: 0x7dd3fc, alpha: 0.7 });
        }
      }
    } else if (hz.kind === 'asteroid') {
      const t = hz.phase === 'warn' ? 1 - hz.left / HAZARDS.asteroid.warnSec : 1;
      const alpha = 0.28 + t * 0.5;
      const beamTex = fxFrame(this.atlas.fx.lockbeam, this.elapsed, 10);
      const met = fxFrame(this.atlas.fx.meteor, this.elapsed, 14);
      for (const x of hz.beams) {
        if (beamTex) {
          this.blitFx(beamTex, x, CANVAS.height * 0.5, {
            width: HAZARDS.asteroid.beamW * 1.35,
            height: CANVAS.height * 1.08,
            alpha,
            add: true,
          });
        } else {
          const col = t > 0.7 ? 0xdc2626 : 0xf87171;
          g.rect(x - HAZARDS.asteroid.beamW / 2, 0, HAZARDS.asteroid.beamW, CANVAS.height)
            .fill({ color: col, alpha });
          g.rect(x - 2, 0, 4, CANVAS.height).fill({ color: 0xfef2f2, alpha: 0.35 + t * 0.4 });
        }
        if (met) {
          const fall = hz.phase === 'warn'
            ? (1 - hz.left / HAZARDS.asteroid.warnSec) * CANVAS.height * 0.35
            : CANVAS.height * (1 - Math.min(1, hz.left / 0.35));
          this.blitFx(met, x, fall, {
            width: HAZARDS.asteroid.beamW * 1.1,
            height: HAZARDS.asteroid.beamW * 1.55,
            alpha: 0.75 + t * 0.25,
          });
        }
      }
    } else if (hz.kind === 'emp' || state.empLeft > 0) {
      const bolt = fxFrame(this.atlas.fx.emp, this.elapsed, 12);
      if (bolt) {
        for (let i = 0; i < 5; i++) {
          const x = (0.12 + ((Math.sin(this.elapsed * 1.7 + i * 2.1) + 1) * 0.5) * 0.76) * CANVAS.width;
          const y = (0.1 + ((Math.cos(this.elapsed * 1.3 + i * 1.6) + 1) * 0.5) * 0.8) * CANVAS.height;
          this.blitFx(bolt, x, y, {
            rotation: i * 0.7 + this.elapsed * 0.4,
            width: 90 + (i % 3) * 28,
            height: 90 + (i % 3) * 28,
            alpha: 0.28,
            add: true,
          });
        }
      }
    }
  }

  private drawBloodStream(g: Graphics, b: Beam): void {
    const c = Math.cos(b.angle);
    const s = Math.sin(b.angle);
    const px = -s;
    const py = c;
    const len = b.length;
    const segs = 16;
    const flow = this.elapsed * 26;

    const ribbon = (amp: number, halfW: number, col: number, alpha: number, seed: number): void => {
      const pts: number[] = [];
      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        const dist = u * len;
        const flare = 1 + u * 0.28;
        const jag = Math.sin(u * 13 - flow + seed) * amp
          + Math.sin(u * 29 + flow * 0.55 + seed) * amp * 0.4;
        const w = halfW * flare + jag;
        pts.push(b.x + c * dist + px * w, b.y + s * dist + py * w);
      }
      for (let i = segs; i >= 0; i--) {
        const u = i / segs;
        const dist = u * len;
        const flare = 1 + u * 0.28;
        const jag = Math.sin(u * 13 - flow + seed) * amp
          + Math.sin(u * 29 + flow * 0.55 + seed) * amp * 0.4;
        const w = halfW * flare + jag;
        pts.push(b.x + c * dist - px * w, b.y + s * dist - py * w);
      }
      g.poly(pts, true).fill({ color: col, alpha });
    };

    ribbon(6.2, b.width * 0.78, 0x3f0a12, 0.62, 0.15);
    ribbon(4.6, b.width * 0.5, 0x9f1239, 0.72, 1.8);
    ribbon(3.2, b.width * 0.22, 0xe11d48, 0.58, 3.6);

    for (let i = 0; i < 12; i++) {
      const u = ((flow * 0.07 + i * 0.083) % 1 + 1) % 1;
      const dist = u * len;
      const jag = Math.sin(i * 2.3 + flow) * b.width * 0.38;
      const x = b.x + c * dist + px * jag;
      const y = b.y + s * dist + py * jag;
      const streak = 16 + (1 - u) * 28;
      this.blitStreak(
        x - c * streak,
        y - s * streak,
        b.angle,
        streak + 8,
        Math.max(1.2, 2.6 - u * 1.2),
        i % 3 === 0 ? 0xf43f5e : 0xbe123c,
        0.82 - u * 0.4,
      );
    }

    const gush = b.width * 0.52 + Math.sin(this.elapsed * 32) * 3.5;
    g.circle(b.x, b.y, gush * 1.15).fill({ color: 0x7f1d1d, alpha: 0.78 });
    g.circle(b.x, b.y, gush * 0.55).fill({ color: 0xf43f5e, alpha: 0.72 });

    if (this.particles.length < PERF.particleCap * 0.72) {
      const spread = (Math.random() - 0.5) * 0.28;
      const ca = Math.cos(b.angle + spread);
      const sa = Math.sin(b.angle + spread);
      const spd = 480 + Math.random() * 340;
      this.spawnParticle({
        x: b.x + ca * 10,
        y: b.y + sa * 10,
        vx: ca * spd,
        vy: sa * spd,
        life: 0.16 + Math.random() * 0.12,
        sizeFrom: 6 + Math.random() * 9,
        sizeTo: 1.5,
        tint: Math.random() < 0.4 ? 0xf43f5e : 0x9f1239,
        alphaFrom: 0.92,
        drag: 0.55,
      });
    }

    const glow = this.glowPool.get();
    glow.tint = 0x9f1239;
    glow.position.set(b.x, b.y);
    glow.width = glow.height = b.width * 5.2;
    glow.alpha = 0.5;
  }

  private drawBeams(state: GameState): void {
    const g = this.projG;
    for (const b of state.beams) {
      if (b.style === 'blood') {
        this.drawBloodStream(g, b);
        continue;
      }
      const color = hex(b.color);
      const pulse = 0.55 + Math.sin(this.elapsed * 28) * 0.15;
      const tex = fxFrame(this.atlas.fx.solance, this.elapsed, 14);
      if (tex) {
        this.blitFx(tex, b.x, b.y, {
          rotation: b.angle,
          width: b.length * 1.04,
          height: Math.max(40, b.width * 2.6),
          tint: color,
          alpha: 0.55 + pulse * 0.55,
          add: true,
          anchorX: 0.07,
          anchorY: 0.5,
        });
        this.blitStreak(
          b.x, b.y, b.angle, b.length,
          Math.max(3, b.width * 0.22),
          0xffffff,
          0.55 + pulse * 0.25,
        );
      } else {
        this.blitStreak(b.x, b.y, b.angle, b.length, b.width * 1.8, color, 0.22 * pulse);
        this.blitStreak(b.x, b.y, b.angle, b.length, b.width, color, 0.55);
        this.blitStreak(b.x, b.y, b.angle, b.length, Math.max(3, b.width * 0.28), 0xffffff, 0.9);
      }
      const glow = this.glowPool.get();
      glow.tint = color;
      glow.position.set(b.x, b.y);
      glow.width = glow.height = b.width * 4;
      glow.alpha = 0.8;
    }
  }

  private drawGems(state: GameState): void {
    const g = this.gemG;
    const gemTex = fxFrame(this.atlas.fx.gem, this.elapsed, 10);
    if (gemTex) {
      if (!this.gemGfxCleared) {
        g.clear();
        this.gemGfxCleared = true;
      }
    } else {
      g.clear();
      this.gemGfxCleared = false;
    }
    for (const gem of state.gems) {
      const pulse = 1 + Math.sin(this.elapsed * 6 + gem.x) * 0.15;
      const tint = gem.homing ? 0xf43f5e : 0x34d399;
      const tex = fxFrame(this.atlas.fx.gem, this.elapsed + gem.x * 0.01, 10);
      if (tex) {
        const size = 18 * pulse;
        this.blitFx(tex, gem.x, gem.y, {
          rotation: this.elapsed * 2 + gem.x * 0.05,
          width: size, height: size, tint, world: true,
        });
      } else {
        const r = 7 * pulse;
        const rot = this.elapsed * 2;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const local = [0, -r, r * 0.7, 0, 0, r, -r * 0.7, 0];
        const abs: number[] = [];
        for (let i = 0; i < 8; i += 2) {
          abs.push(gem.x + local[i] * cos - local[i + 1] * sin, gem.y + local[i] * sin + local[i + 1] * cos);
        }
        g.poly(abs, true).fill(tint);
      }

      const glow = this.glowPool.get();
      glow.tint = tint;
      glow.position.set(gem.x, gem.y);
      glow.width = glow.height = 26 * pulse;
      glow.alpha = 0.75;
    }
  }

  private drawWarnings(state: GameState): void {
    const g = this.warnG;
    g.clear();
    for (const w of state.warnings) {
      const glow = this.glowPool.get();
      glow.tint = 0xef4444;
      glow.position.set(w.indicatorX, w.indicatorY);
      glow.width = glow.height = 52 + Math.sin(this.elapsed * 10) * 10;
      glow.alpha = 0.5;

      const freq = w.timer < 0.7 ? 16 : 7;
      if (Math.floor(this.elapsed * freq) % 2 === 0) continue;

      const x = w.indicatorX;
      const y = w.indicatorY;
      const tex = fxFrame(this.atlas.fx.warn, this.elapsed, 8);
      if (tex) {
        this.blitFx(tex, x, y, { width: 36, height: 36 });
      } else {
        g.circle(x, y, 14).fill({ color: 0xef4444, alpha: 0.25 }).stroke({ width: 2, color: 0xef4444 });
        g.rect(x - 2, y - 8, 4, 10).fill(0xef4444);
        g.rect(x - 2, y + 5, 4, 4).fill(0xef4444);
      }
    }
  }
}
