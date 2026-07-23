import type { EnemyDef, EnemyId, WeaponId } from './types';
import {
  CANVAS, PLAYER, LEVELING, WEAPONS, ENEMIES, WAVES, GEM,
  WARNING_DURATION, STARTING_WEAPON, enemyHpScale, spawnIntervalScale,
} from './GameConfig';

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
  /** dashAcross 방향 (-1: 왼쪽으로, 1: 오른쪽으로) */
  dir: number;
  hitFlash: number;
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

export type GameStatus = 'ready' | 'playing' | 'levelup' | 'gameover';

/**
 * 렌더러가 이펙트(파티클/흔들림 등)를 재생할 수 있도록 알리는 1회성 이벤트.
 * GameState는 매 프레임 push만 하고, Renderer가 소비 후 비운다.
 */
export type FxEvent =
  | { type: 'enemyDied'; x: number; y: number; color: string; radius: number }
  | { type: 'enemyHit'; x: number; y: number; color: string }
  | { type: 'fired'; x: number; y: number; color: string }
  | { type: 'gemPickup'; x: number; y: number }
  | { type: 'playerHit' }
  | { type: 'levelUp'; x: number; y: number };

// ============================================================

export class GameState {
  status: GameStatus = 'ready';

  // 플레이어
  playerX = CANVAS.width / 2;
  playerY = CANVAS.height * 0.78;
  /** 입력 방향 벡터 (조이스틱/키보드가 매 프레임 갱신, 크기 0~1) */
  moveX = 0;
  moveY = 0;
  hp: number = PLAYER.maxHp;
  invincibleLeft = 0; // ms

  // 성장
  level = 1;
  exp = 0;
  expToNext = LEVELING.expForLevel(1);
  /** 연속 레벨업 대기 수 (한 번에 여러 레벨 오를 수 있음) */
  pendingLevelUps = 0;

  weapons: WeaponSlot[] = [];

  // 월드
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  gems: Gem[] = [];
  warnings: SpawnWarning[] = [];

  time = 0; // 초
  kills = 0;

  /** 렌더러가 소비하는 이펙트 이벤트 큐 */
  events: FxEvent[] = [];

  private nextEnemyId = 1;
  /** 웨이브 엔트리별 스폰 누적 타이머 (key = waveIdx:entryIdx) */
  private spawnTimers = new Map<string, number>();

  start(): void {
    this.status = 'playing';
    this.weapons = [{ weaponId: STARTING_WEAPON, level: 1, cooldownLeft: 300 }];
  }

  // ==========================================================
  // 메인 업데이트 (dt: 초)
  // ==========================================================

  /** 1프레임 진행 후 현재 상태를 반환 (호출부에서 상태 전환 감지용) */
  update(dt: number): GameStatus {
    if (this.status !== 'playing') return this.status;

    this.time += dt;
    this.updatePlayer(dt);
    this.updateWeapons(dt);
    this.updateSpawns(dt);
    this.updateWarnings(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateGems(dt);
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
    this.playerX += mx * PLAYER.moveSpeed * dt;
    this.playerY += my * PLAYER.moveSpeed * dt;
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
    const damage = p.damage * (1 + (slot.level - 1) * LEVELING.damagePerLevel);

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
    WAVES.forEach((wave, wi) => {
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

  private addEnemy(enemyId: EnemyId, x: number, y: number, dir: number): void {
    const def = ENEMIES[enemyId];
    const hp = def.hp * enemyHpScale(this.time);
    this.enemies.push({
      id: this.nextEnemyId++,
      def, x, y,
      hp, maxHp: hp,
      age: 0, baseX: x, dir,
      hitFlash: 0,
    });
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
          e.y += e.def.speed * dt;
          break;
        case 'zigzag':
          e.y += e.def.speed * 0.75 * dt;
          e.x = e.baseX + Math.sin(e.age * 2.6) * 70;
          break;
        case 'dashAcross':
          e.x += e.def.speed * e.dir * dt;
          e.y += 26 * dt;
          break;
        case 'dashUp':
          e.y -= e.def.speed * dt;
          break;
      }

      // 화면을 완전히 벗어나면 제거
      const out =
        e.y > H + margin || e.y < -margin - 200 ||
        e.x < -margin - 200 || e.x > W + margin + 200;
      // 진입 직후(화면 밖에서 안으로 들어오는 중)는 제거하지 않도록 age 체크
      if (out && e.age > 1.5) this.enemies.splice(i, 1);
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
        const rr = p.radius + e.def.radius;
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
    this.events.push({ type: 'enemyHit', x: e.x, y: e.y, color: e.def.color });
    if (e.hp <= 0) {
      this.kills++;
      this.events.push({ type: 'enemyDied', x: e.x, y: e.y, color: e.def.color, radius: e.def.radius });
      // EXP 보석 드롭
      this.gems.push({
        x: e.x, y: e.y,
        exp: e.def.exp,
        life: GEM.lifetime,
        magnetized: false,
      });
      const idx = this.enemies.indexOf(e);
      if (idx >= 0) this.enemies.splice(idx, 1);
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

      if (g.magnetized || dist < PLAYER.magnetRadius) {
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
    this.exp += amount;
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
      const rr = PLAYER.radius + e.def.radius - 4; // 판정 약간 관대하게
      if ((this.playerX - e.x) ** 2 + (this.playerY - e.y) ** 2 <= rr * rr) {
        this.hp -= e.def.contactDamage;
        this.invincibleLeft = PLAYER.invincibleMs;
        this.events.push({ type: 'playerHit' });
        if (this.hp <= 0) {
          this.hp = 0;
          this.status = 'gameover';
        }
        return;
      }
    }
  }
}
