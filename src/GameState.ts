import type { EnemyDef, EnemyId, WeaponId, PickupKind, ShipId, PassiveId, StageId, ChallengeId } from './types';
import {
  CANVAS, PLAYER, LEVELING, WEAPONS, ENEMIES, GEM, SHIPS, PASSIVES, ELITE,
  STAGES, CHALLENGES, WARNING_DURATION, enemyHpScale, spawnIntervalScale,
  BOSS, SCORE, PICKUPS,
} from './GameConfig';
import type { MetaSave } from './Meta';
import { metaBonuses } from './Meta';
import type { Wave } from './types';

// ============================================================
// 런타임 엔티티
// ============================================================

export interface WeaponSlot {
  weaponId: WeaponId;
  level: number;
  cooldownLeft: number; // ms
}

export interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  speed: number;
  damage: number;
  radius: number;
  homingTurnRate: number;
  pierceLeft: number;
  life: number;
  color: string;
  hitIds: Set<number>;
}

export interface Enemy {
  id: number;
  def: EnemyDef;
  x: number; y: number;
  hp: number;
  maxHp: number;
  age: number;
  baseX: number;
  dir: number;
  hitFlash: number;
  elite: boolean;
  /** 보스 전용 공격 쿨다운 */
  ringCd?: number;
  aimedCd?: number;
  spiralAngle?: number;
}

export interface PassiveSlot {
  passiveId: PassiveId;
  level: number;
}

/** 보스가 발사하는 적 탄환 */
export interface EnemyProjectile {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  damage: number;
}

/** 드롭 아이템 (회복/자석/폭탄) */
export interface Pickup {
  kind: PickupKind;
  x: number; y: number;
  life: number;
}

export interface Gem {
  x: number; y: number;
  exp: number;
  life: number;
  magnetized: boolean;
}

/** 기습 스폰 경고 — 2초 대기 후 실제 적으로 전환 */
export interface SpawnWarning {
  /** 경고 인디케이터 표시 좌표(화면 끝단) */
  indicatorX: number;
  indicatorY: number;
  /** 실제 적이 등장할 화면 밖 좌표 */
  spawnX: number;
  spawnY: number;
  enemyId: EnemyId;
  dir: number;
  timer: number;
}

export type GameStatus = 'ready' | 'playing' | 'paused' | 'levelup' | 'gameover' | 'victory';

/**
 * 1회성 게임 이벤트. GameState는 push만 하고,
 * main(사운드/진동/배너/히트스톱)과 Renderer(이펙트)가 소비한다.
 */
export type FxEvent =
  | { type: 'enemyDied'; x: number; y: number; color: string; radius: number }
  | { type: 'enemyHit'; x: number; y: number; color: string; damage: number }
  | { type: 'fired'; x: number; y: number; color: string }
  | { type: 'gemPickup'; x: number; y: number }
  | { type: 'playerHit' }
  | { type: 'levelUp'; x: number; y: number }
  | { type: 'banner'; text: string }
  | { type: 'bossWarn' }
  | { type: 'bossSpawned'; x: number; y: number }
  | { type: 'bossDied'; x: number; y: number }
  | { type: 'pickup'; kind: PickupKind; x: number; y: number }
  | { type: 'bomb' }
  | { type: 'victory' }
  | { type: 'gameover' }
  | { type: 'achievement'; id: string; name: string }
  | { type: 'story'; text: string };

// ============================================================

export class GameState {
  status: GameStatus = 'ready';

  // 플레이어
  playerX = CANVAS.width / 2;
  playerY = CANVAS.height * 0.78;
  moveX = 0;
  moveY = 0;
  shipId: ShipId = 'scout';
  stageId: StageId = 'orbit';
  challengeId: ChallengeId = 'standard';
  maxHp: number = PLAYER.maxHp;
  hp: number = PLAYER.maxHp;
  moveSpeed: number = PLAYER.moveSpeed;
  magnetRadius: number = PLAYER.magnetRadius;
  damageMul = 1;
  armorReduce = 0;
  expMul = 1;
  dropChanceBonus = 0;
  enemyHpMul = 1;
  scoreMul = 1;
  creditMul = 1;
  maxWeaponSlots: number = PLAYER.maxWeaponSlots;
  maxPassiveSlots: number = PLAYER.maxPassiveSlots;
  victoryTime = 300;
  bgTop = 0x0b0e22;
  bgBottom = 0x070812;
  invincibleLeft = 0;

  // 성장
  level = 1;
  exp = 0;
  expToNext = LEVELING.expForLevel(1);
  pendingLevelUps = 0;

  weapons: WeaponSlot[] = [];
  passives: PassiveSlot[] = [];

  // 월드
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  enemyProjectiles: EnemyProjectile[] = [];
  gems: Gem[] = [];
  pickups: Pickup[] = [];
  warnings: SpawnWarning[] = [];

  time = 0;
  kills = 0;
  eliteKills = 0;
  bossKills = 0;
  score = 0;
  comboCount = 0;
  maxCombo = 0;
  comboTimer = 0;

  bossId: number | null = null;
  events: FxEvent[] = [];

  private nextEnemyId = 1;
  private spawnTimers = new Map<string, number>();
  private bossIndex = 0;
  private bossWarned = false;
  private lastWaveNo = 0;
  private waves: Wave[] = STAGES.orbit.waves;
  private bossTimes: readonly number[] = STAGES.orbit.bossTimes;
  private bossRoster: readonly EnemyId[] = STAGES.orbit.bossRoster;
  private storyBeats: { at: number; text: string }[] = [];
  private nextStoryIdx = 0;

  /** 기체 + 스테이지 + 도전 + 메타로 런 시작 */
  start(shipId: ShipId, meta: MetaSave, stageId?: StageId, challengeId?: ChallengeId): void {
    const ship = SHIPS[shipId];
    const stage = STAGES[stageId ?? meta.selectedStage];
    const challenge = CHALLENGES[challengeId ?? meta.selectedChallenge];
    const m = metaBonuses(meta);

    this.shipId = shipId;
    this.stageId = stage.id;
    this.challengeId = challenge.id;
    this.waves = stage.waves;
    this.bossTimes = stage.bossTimes;
    this.bossRoster = stage.bossRoster;
    this.storyBeats = stage.story;
    this.nextStoryIdx = 0;
    this.victoryTime = stage.victoryTime;
    this.bgTop = stage.bgTop;
    this.bgBottom = stage.bgBottom;

    this.maxWeaponSlots = challenge.weaponSlotCap ?? PLAYER.maxWeaponSlots;
    this.maxPassiveSlots = challenge.passiveSlotCap ?? PLAYER.maxPassiveSlots;
    this.enemyHpMul = challenge.enemyHpMul ?? 1;
    this.scoreMul = challenge.scoreMul ?? 1;
    this.creditMul = challenge.creditMul ?? 1;

    const hpMul = ship.hpMul * m.hpMul * (challenge.hpMul ?? 1);
    this.maxHp = Math.round(PLAYER.maxHp * hpMul);
    this.hp = this.maxHp;
    this.baseMoveSpeed = PLAYER.moveSpeed * ship.speedMul * m.speedMul;
    this.baseMagnet = PLAYER.magnetRadius + m.magnetAdd;
    this.baseDamageMul = m.damageMul;
    this.dropChanceBonus = m.dropChanceAdd;
    this.passives = [];
    this.applyPassiveEffects();
    this.weapons = [{ weaponId: ship.startingWeapon, level: 1, cooldownLeft: 300 }];
    this.status = 'playing';

    if (this.storyBeats[0]?.at === 0) {
      this.events.push({ type: 'story', text: this.storyBeats[0].text });
      this.nextStoryIdx = 1;
    }
  }

  private baseMoveSpeed: number = PLAYER.moveSpeed;
  private baseMagnet: number = PLAYER.magnetRadius;
  private baseDamageMul = 1;

  /** 패시브 레벨 합산 → 런타임 스탯 재계산 */
  applyPassiveEffects(): void {
    let magnetAdd = 0;
    let speedAdd = 0;
    let armor = 0;
    let expAdd = 0;
    let dmgAdd = 0;
    for (const p of this.passives) {
      const v = PASSIVES[p.passiveId].perLevel * p.level;
      switch (p.passiveId) {
        case 'magnet': magnetAdd += v; break;
        case 'thruster': speedAdd += v; break;
        case 'plating': armor += v; break;
        case 'collector': expAdd += v; break;
        case 'overcharge': dmgAdd += v; break;
      }
    }
    this.magnetRadius = this.baseMagnet + magnetAdd;
    this.moveSpeed = this.baseMoveSpeed * (1 + speedAdd);
    this.armorReduce = Math.min(0.7, armor);
    this.expMul = 1 + expAdd;
    this.damageMul = this.baseDamageMul * (1 + dmgAdd);
  }

  // ==========================================================
  // 메인 업데이트 (dt: 초)
  // ==========================================================

  /** 1프레임 진행 후 현재 상태를 반환 (호출부에서 상태 전환 감지용) */
  update(dt: number): GameStatus {
    if (this.status !== 'playing') return this.status;

    this.time += dt;

    // 승리 조건
    if (this.time >= this.victoryTime) {
      this.status = 'victory';
      this.events.push({ type: 'victory' });
      return this.status;
    }

    while (
      this.nextStoryIdx < this.storyBeats.length
      && this.time >= this.storyBeats[this.nextStoryIdx].at
    ) {
      this.events.push({ type: 'story', text: this.storyBeats[this.nextStoryIdx].text });
      this.nextStoryIdx++;
    }

    // 웨이브 배너 (30초 단위)
    const waveNo = Math.floor(this.time / 30) + 1;
    if (waveNo !== this.lastWaveNo) {
      this.lastWaveNo = waveNo;
      this.events.push({ type: 'banner', text: `WAVE ${waveNo}` });
    }

    // 콤보 유지 시간
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    this.updatePlayer(dt);
    this.updateWeapons(dt);
    this.updateSpawns(dt);
    this.updateBossSchedule();
    this.updateWarnings(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateEnemyProjectiles(dt);
    this.updateGems(dt);
    this.updatePickups(dt);
    this.checkPlayerCollision(dt);
    return this.status;
  }

  // ---------- 플레이어 이동 (방향 벡터 × 속도) ----------

  private updatePlayer(dt: number): void {
    let mx = this.moveX;
    let my = this.moveY;
    const mag = Math.hypot(mx, my);
    if (mag > 1) {
      // 대각선 이동이 더 빨라지지 않도록 정규화
      mx /= mag;
      my /= mag;
    }
    this.playerX += mx * this.moveSpeed * dt;
    this.playerY += my * this.moveSpeed * dt;
    const r = PLAYER.radius;
    this.playerX = Math.max(r, Math.min(CANVAS.width - r, this.playerX));
    this.playerY = Math.max(r, Math.min(CANVAS.height - r, this.playerY));

    if (this.invincibleLeft > 0) this.invincibleLeft -= dt * 1000;
  }

  // ---------- 오토 슈팅 ----------

  private updateWeapons(dt: number): void {
    for (const slot of this.weapons) {
      slot.cooldownLeft -= dt * 1000;
      if (slot.cooldownLeft <= 0) {
        this.fireWeapon(slot);
        const def = WEAPONS[slot.weaponId];
        const cdScale = 1 - Math.min(0.45, (slot.level - 1) * LEVELING.cooldownPerLevel);
        slot.cooldownLeft += def.cooldownMs * cdScale;
      }
    }
  }

  private fireWeapon(slot: WeaponSlot): void {
    const def = WEAPONS[slot.weaponId];
    const p = def.projectile;
    const damage = p.damage * (1 + (slot.level - 1) * LEVELING.damagePerLevel) * this.damageMul;

    const baseAngle = -Math.PI / 2; // 위쪽
    for (let i = 0; i < p.count; i++) {
      let angle: number;
      if (p.count === 1 || p.spreadDeg === 0) {
        angle = baseAngle;
      } else if (p.spreadDeg >= 360) {
        angle = (Math.PI * 2 * i) / p.count + this.time; // 회전 살포
      } else {
        const arc = (p.spreadDeg * Math.PI) / 180;
        angle = baseAngle - arc / 2 + (arc * i) / (p.count - 1);
      }
      this.projectiles.push({
        x: this.playerX,
        y: this.playerY - PLAYER.radius,
        vx: Math.cos(angle) * p.speed,
        vy: Math.sin(angle) * p.speed,
        speed: p.speed,
        damage,
        radius: p.radius,
        homingTurnRate: p.homingTurnRate,
        pierceLeft: p.pierce,
        life: p.lifetime,
        color: def.color,
        hitIds: new Set(),
      });
    }
    this.events.push({ type: 'fired', x: this.playerX, y: this.playerY - PLAYER.radius, color: def.color });
  }

  // ---------- 적 스폰 (웨이브 스케줄) ----------

  private updateSpawns(dt: number): void {
    const scale = spawnIntervalScale(this.time);
    this.waves.forEach((wave, wi) => {
      if (this.time < wave.from || this.time >= wave.to) return;
      wave.entries.forEach((entry, ei) => {
        const key = `${wi}:${ei}`;
        const t = (this.spawnTimers.get(key) ?? 0) + dt;
        const interval = entry.interval * scale;
        if (t >= interval) {
          this.spawnTimers.set(key, t - interval);
          this.spawnEnemy(entry.enemy);
        } else {
          this.spawnTimers.set(key, t);
        }
      });
    });
  }

  private spawnEnemy(enemyId: EnemyId): void {
    const def = ENEMIES[enemyId];
    const W = CANVAS.width;
    const H = CANVAS.height;

    if (def.spawnEdge === 'top') {
      // 일반 스폰: 화면 위에서 바로 등장
      const x = def.radius + Math.random() * (W - def.radius * 2);
      this.addEnemy(enemyId, x, -def.radius * 2, 1);
      return;
    }

    // 기습형: 화면 밖 좌표에 2초 대기 + 끝단에 경고 인디케이터
    if (def.spawnEdge === 'side') {
      const fromLeft = Math.random() < 0.5;
      const y = H * 0.15 + Math.random() * H * 0.55;
      this.warnings.push({
        indicatorX: fromLeft ? 18 : W - 18,
        indicatorY: y,
        spawnX: fromLeft ? -def.radius * 2 : W + def.radius * 2,
        spawnY: y,
        enemyId,
        dir: fromLeft ? 1 : -1,
        timer: WARNING_DURATION,
      });
    } else {
      // bottom
      const x = def.radius + Math.random() * (W - def.radius * 2);
      this.warnings.push({
        indicatorX: x,
        indicatorY: H - 18,
        spawnX: x,
        spawnY: H + def.radius * 2,
        enemyId,
        dir: 1,
        timer: WARNING_DURATION,
      });
    }
  }

  // ---------- 보스 스케줄 ----------

  private updateBossSchedule(): void {
    if (this.bossIndex >= this.bossTimes.length) return;
    const spawnAt = this.bossTimes[this.bossIndex];

    if (!this.bossWarned && this.time >= spawnAt - BOSS.warningLead) {
      this.bossWarned = true;
      this.events.push({ type: 'bossWarn' });
      this.events.push({ type: 'banner', text: '⚠ BOSS 접근 중' });
    }
    if (this.time >= spawnAt) {
      const bossType = this.bossRoster[this.bossIndex % this.bossRoster.length];
      const boss = this.addEnemy(bossType, CANVAS.width / 2, -60, 1, false);
      boss.hp = boss.maxHp = ENEMIES[bossType].hp * (1 + this.bossIndex * BOSS.hpGrowth) * this.enemyHpMul;
      this.bossId = boss.id;
      this.bossIndex++;
      this.bossWarned = false;
      this.events.push({ type: 'bossSpawned', x: boss.x, y: boss.y });
      this.events.push({ type: 'banner', text: `⚠ ${ENEMIES[bossType].name}` });
    }
  }

  private updateWarnings(dt: number): void {
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const w = this.warnings[i];
      w.timer -= dt;
      if (w.timer <= 0) {
        this.addEnemy(w.enemyId, w.spawnX, w.spawnY, w.dir);
        this.warnings.splice(i, 1);
      }
    }
  }

  private addEnemy(
    enemyId: EnemyId,
    x: number,
    y: number,
    dir: number,
    allowElite = true,
  ): Enemy {
    const def = ENEMIES[enemyId];
    const isBoss = def.movePattern === 'boss' || def.movePattern === 'bossSeraph';
    const elite = allowElite
      && !isBoss
      && this.time >= ELITE.unlockAt
      && Math.random() < ELITE.chance;

    let hp = def.hp * enemyHpScale(this.time) * this.enemyHpMul;
    if (elite) hp *= ELITE.hpMul;

    const enemy: Enemy = {
      id: this.nextEnemyId++,
      def, x, y,
      hp, maxHp: hp,
      age: 0, baseX: x, dir,
      hitFlash: 0,
      elite,
    };
    this.enemies.push(enemy);
    return enemy;
  }

  // ---------- 적 이동 ----------

  private updateEnemies(dt: number): void {
    const W = CANVAS.width;
    const H = CANVAS.height;
    const margin = 80;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.age += dt;
      if (e.hitFlash > 0) e.hitFlash -= dt;

      switch (e.def.movePattern) {
        case 'down':
        case 'slowDown':
          e.y += e.def.speed * (e.elite ? ELITE.speedMul : 1) * dt;
          break;
        case 'zigzag':
          e.y += e.def.speed * 0.75 * (e.elite ? ELITE.speedMul : 1) * dt;
          e.x = e.baseX + Math.sin(e.age * 2.6) * 70;
          break;
        case 'dashAcross':
          e.x += e.def.speed * (e.elite ? ELITE.speedMul : 1) * e.dir * dt;
          e.y += 26 * dt;
          break;
        case 'dashUp':
          e.y -= e.def.speed * (e.elite ? ELITE.speedMul : 1) * dt;
          break;
        case 'boss':
          this.updateBoss(e, dt);
          break;
        case 'bossSeraph':
          this.updateBossSeraph(e, dt);
          break;
      }

      const isBoss = e.def.movePattern === 'boss' || e.def.movePattern === 'bossSeraph';
      const out =
        e.y > H + margin || e.y < -margin - 200 ||
        e.x < -margin - 200 || e.x > W + margin + 200;
      if (out && e.age > 1.5 && !isBoss) this.enemies.splice(i, 1);
    }
  }

  /** 보스: 상단에 진입 후 좌우로 유영하며 탄막 + 조준 사격 */
  private updateBoss(e: Enemy, dt: number): void {
    if (e.y < 130) {
      e.y += 80 * dt;
      return;
    }
    e.x = CANVAS.width / 2 + Math.sin(e.age * 0.7) * 150;

    e.ringCd = (e.ringCd ?? 2.0) - dt;
    if (e.ringCd <= 0) {
      e.ringCd = BOSS.ringInterval;
      for (let k = 0; k < BOSS.ringCount; k++) {
        const a = (Math.PI * 2 * k) / BOSS.ringCount + e.age;
        this.enemyProjectiles.push({
          x: e.x, y: e.y,
          vx: Math.cos(a) * BOSS.ringSpeed,
          vy: Math.sin(a) * BOSS.ringSpeed,
          radius: 6,
          damage: BOSS.bulletDamage,
        });
      }
    }

    e.aimedCd = (e.aimedCd ?? 1.2) - dt;
    if (e.aimedCd <= 0) {
      e.aimedCd = BOSS.aimedInterval;
      const base = Math.atan2(this.playerY - e.y, this.playerX - e.x);
      for (const off of [-0.22, 0, 0.22]) {
        this.enemyProjectiles.push({
          x: e.x, y: e.y,
          vx: Math.cos(base + off) * BOSS.aimedSpeed,
          vy: Math.sin(base + off) * BOSS.aimedSpeed,
          radius: 7,
          damage: BOSS.bulletDamage,
        });
      }
    }
  }

  /** 세라프: 좌우 유영 + 연속 나선 탄 */
  private updateBossSeraph(e: Enemy, dt: number): void {
    if (e.y < 120) {
      e.y += 90 * dt;
      return;
    }
    e.x = CANVAS.width / 2 + Math.sin(e.age * 1.1) * 170;
    e.spiralAngle = (e.spiralAngle ?? 0) + dt * 4.5;

    e.ringCd = (e.ringCd ?? 0) - dt;
    if (e.ringCd <= 0) {
      e.ringCd = BOSS.spiralInterval;
      const a = e.spiralAngle;
      for (const off of [0, Math.PI]) {
        this.enemyProjectiles.push({
          x: e.x, y: e.y,
          vx: Math.cos(a + off) * BOSS.spiralSpeed,
          vy: Math.sin(a + off) * BOSS.spiralSpeed,
          radius: 5,
          damage: BOSS.bulletDamage,
        });
      }
    }

    e.aimedCd = (e.aimedCd ?? 1.8) - dt;
    if (e.aimedCd <= 0) {
      e.aimedCd = 2.0;
      const base = Math.atan2(this.playerY - e.y, this.playerX - e.x);
      this.enemyProjectiles.push({
        x: e.x, y: e.y,
        vx: Math.cos(base) * BOSS.aimedSpeed * 1.1,
        vy: Math.sin(base) * BOSS.aimedSpeed * 1.1,
        radius: 8,
        damage: BOSS.bulletDamage + 4,
      });
    }
  }

  // ---------- 적 탄환 ----------

  private updateEnemyProjectiles(dt: number): void {
    const W = CANVAS.width;
    const H = CANVAS.height;
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = this.enemyProjectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) {
        this.enemyProjectiles.splice(i, 1);
        continue;
      }
      if (this.invincibleLeft <= 0) {
        const rr = PLAYER.radius + p.radius - 3;
        if ((this.playerX - p.x) ** 2 + (this.playerY - p.y) ** 2 <= rr * rr) {
          this.enemyProjectiles.splice(i, 1);
          this.hurtPlayer(p.damage);
        }
      }
    }
  }

  // ---------- 투사체 ----------

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // 유도
      if (p.homingTurnRate > 0 && this.enemies.length > 0) {
        const target = this.nearestEnemy(p.x, p.y, p.hitIds);
        if (target) {
          const cur = Math.atan2(p.vy, p.vx);
          const want = Math.atan2(target.y - p.y, target.x - p.x);
          let diff = want - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const maxTurn = p.homingTurnRate * dt;
          const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
          const next = cur + turn;
          p.vx = Math.cos(next) * p.speed;
          p.vy = Math.sin(next) * p.speed;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // 적과 충돌
      let removed = false;
      for (const e of this.enemies) {
        if (p.hitIds.has(e.id)) continue;
        const hitR = e.def.radius * (e.elite ? 1.15 : 1);
        const rr = p.radius + hitR;
        if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 <= rr * rr) {
          p.hitIds.add(e.id);
          this.damageEnemy(e, p.damage);
          if (p.pierceLeft <= 0) {
            this.projectiles.splice(i, 1);
            removed = true;
            break;
          }
          p.pierceLeft--;
        }
      }
      if (removed) continue;

      // 화면 밖
      if (p.x < -60 || p.x > CANVAS.width + 60 || p.y < -60 || p.y > CANVAS.height + 60) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private nearestEnemy(x: number, y: number, exclude: Set<number>): Enemy | null {
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (exclude.has(e.id)) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private damageEnemy(e: Enemy, dmg: number): void {
    e.hp -= dmg;
    e.hitFlash = 0.08;
    this.events.push({ type: 'enemyHit', x: e.x, y: e.y, color: e.def.color, damage: dmg });
    if (e.hp <= 0) {
      this.kills++;
      this.comboCount++;
      this.maxCombo = Math.max(this.maxCombo, this.comboCount);
      this.comboTimer = SCORE.comboWindow;

      const expDrop = Math.round(e.def.exp * (e.elite ? ELITE.expMul : 1));
      const scoreMul = e.elite ? ELITE.scoreMul : 1;
      this.score += Math.round(
        Math.max(1, expDrop) * SCORE.killBase * (1 + this.comboCount * SCORE.comboBonus) * scoreMul * this.scoreMul,
      );

      const isBoss = e.def.movePattern === 'boss' || e.def.movePattern === 'bossSeraph';
      if (isBoss) {
        this.killBoss(e);
      } else {
        if (e.elite) this.eliteKills++;
        this.events.push({
          type: 'enemyDied',
          x: e.x, y: e.y,
          color: e.elite ? '#fbbf24' : e.def.color,
          radius: e.def.radius * (e.elite ? 1.3 : 1),
        });
        this.gems.push({
          x: e.x, y: e.y,
          exp: Math.max(1, expDrop),
          life: GEM.lifetime,
          magnetized: false,
        });
        const dropRate = PICKUPS.dropChance + this.dropChanceBonus;
        if ((e.elite && ELITE.guaranteedPickup) || Math.random() < dropRate) {
          const r = Math.random();
          const kind: PickupKind = r < 0.45 ? 'heal' : r < 0.8 ? 'magnet' : 'bomb';
          this.pickups.push({ kind, x: e.x, y: e.y, life: PICKUPS.lifetime });
        }
      }

      const idx = this.enemies.indexOf(e);
      if (idx >= 0) this.enemies.splice(idx, 1);
    }
  }

  private killBoss(e: Enemy): void {
    this.bossId = null;
    this.bossKills++;
    this.score += Math.round(BOSS.score * this.scoreMul);
    this.events.push({ type: 'bossDied', x: e.x, y: e.y });
    this.events.push({ type: 'banner', text: `${e.def.name} 격파!` });
    for (let k = 0; k < BOSS.gemDrop; k++) {
      this.gems.push({
        x: e.x + (Math.random() - 0.5) * 200,
        y: e.y + Math.random() * 140 + 20,
        exp: 3,
        life: GEM.lifetime,
        magnetized: false,
      });
    }
    this.pickups.push({ kind: 'heal', x: e.x - 40, y: e.y + 60, life: PICKUPS.lifetime });
    this.pickups.push({ kind: 'magnet', x: e.x + 40, y: e.y + 60, life: PICKUPS.lifetime });
  }

  // ---------- 드롭 아이템 ----------

  private updatePickups(_dt: number): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= _dt;
      if (p.life <= 0) {
        this.pickups.splice(i, 1);
        continue;
      }
      const rr = PLAYER.radius + PICKUPS.radius + 6;
      if ((this.playerX - p.x) ** 2 + (this.playerY - p.y) ** 2 <= rr * rr) {
        this.pickups.splice(i, 1);
        this.applyPickup(p);
      }
    }
  }

  private applyPickup(p: Pickup): void {
    this.events.push({ type: 'pickup', kind: p.kind, x: p.x, y: p.y });
    switch (p.kind) {
      case 'heal':
        this.hp = Math.min(this.maxHp, this.hp + PICKUPS.healAmount);
        break;
      case 'magnet':
        for (const g of this.gems) g.magnetized = true;
        break;
      case 'bomb': {
        this.events.push({ type: 'bomb' });
        for (const e of [...this.enemies]) this.damageEnemy(e, PICKUPS.bombDamage);
        break;
      }
    }
  }

  // ---------- 보석 & 경험치 ----------

  private updateGems(dt: number): void {
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      g.life -= dt;
      if (g.life <= 0) {
        this.gems.splice(i, 1);
        continue;
      }
      const dx = this.playerX - g.x;
      const dy = this.playerY - g.y;
      const dist = Math.hypot(dx, dy);

      if (g.magnetized || dist < this.magnetRadius) {
        g.magnetized = true;
        const step = GEM.magnetSpeed * dt;
        g.x += (dx / Math.max(dist, 1)) * step;
        g.y += (dy / Math.max(dist, 1)) * step;
      }

      if (dist < PLAYER.radius + GEM.radius + 4) {
        this.gems.splice(i, 1);
        this.events.push({ type: 'gemPickup', x: g.x, y: g.y });
        this.gainExp(g.exp);
      }
    }
  }

  private gainExp(amount: number): void {
    this.exp += amount * this.expMul;
    while (this.exp >= this.expToNext) {
      this.exp -= this.expToNext;
      this.level++;
      this.expToNext = LEVELING.expForLevel(this.level);
      this.pendingLevelUps++;
    }
    if (this.pendingLevelUps > 0) {
      this.events.push({ type: 'levelUp', x: this.playerX, y: this.playerY });
      this.status = 'levelup'; // main 루프에서 감지해 일시정지 + UI 표시
    }
  }

  // ---------- 플레이어 피격 ----------

  private checkPlayerCollision(_dt: number): void {
    if (this.invincibleLeft > 0) return;
    for (const e of this.enemies) {
      const rr = PLAYER.radius + e.def.radius * (e.elite ? 1.15 : 1) - 4;
      if ((this.playerX - e.x) ** 2 + (this.playerY - e.y) ** 2 <= rr * rr) {
        const dmg = e.def.contactDamage * (e.elite ? ELITE.damageMul : 1);
        this.hurtPlayer(dmg);
        return;
      }
    }
  }

  private hurtPlayer(damage: number): void {
    if (this.invincibleLeft > 0) return;
    this.hp -= damage * (1 - this.armorReduce);
    this.invincibleLeft = PLAYER.invincibleMs;
    this.events.push({ type: 'playerHit' });
    if (this.hp <= 0) {
      this.hp = 0;
      this.status = 'gameover';
      this.events.push({ type: 'gameover' });
    }
  }
}
