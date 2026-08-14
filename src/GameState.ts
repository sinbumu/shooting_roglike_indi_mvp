import type {
  EnemyDef, EnemyId, WeaponId, PickupKind, ShipId, PassiveId, StageId, ChallengeId,
  AffixId, StatBoostId, TacticalId, MutationId, ActiveSkillId,
} from './types';
import {
  CANVAS, PLAYER, LEVELING, WEAPONS, ENEMIES, GEM, SHIPS, PASSIVES, ELITE,
  STAGES, CHALLENGES, WARNING_DURATION, enemyHpScale, spawnIntervalScale,
  BOSS, SCORE, PICKUPS, COMBAT, ENDGAME, TACTICAL, AFFIXES, RIFT_EVENT,
  ARSENAL, AFFIX_SYNERGY, MUTATIONS, SHIELDER, TELEPORTER,
  SHIP_SKINS, PROJ_SKINS, MIRAGE, GUARDIAN, DROPS,
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
  affix?: AffixId;
  /** 크래프팅 강화로 누적되는 데미지 보너스 (0.15 = +15%) */
  damageBonus?: number;
  /** 크래프팅 강화로 누적되는 투사체 속도 보너스 */
  speedBonus?: number;
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
  affix?: AffixId;
  /** 분열 자식탄 — 재분열 방지 */
  noSplit?: boolean;
  /** 관통 시너지: 몇 번 관통했는지 */
  pierceHits?: number;
  explodeRadius?: number;
  /** 실더 정면 쉴드 관통 (관통·스웜 등) */
  shieldPierce?: boolean;
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
  /** 1 = 평시, 2 = 페이즈2 */
  phase?: number;
  /** 돌발 균열로 스폰된 엘리트 */
  fromRift?: boolean;
  mutation?: MutationId;
  teleportCd?: number;
  /** 보스 등장 페이즈 남은 시간 */
  introLeft?: number;
  /** 등장 이후 유영 타이머 (스폰 age와 분리) */
  swimAge?: number;
  /** 실더 역장 남은 타격 횟수 */
  shieldHits?: number;
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
  magnetized?: boolean;
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
  mutation?: MutationId;
}

export type GameStatus = 'ready' | 'playing' | 'paused' | 'levelup' | 'gameover' | 'victory';

/**
 * 1회성 게임 이벤트. GameState는 push만 하고,
 * main(사운드/진동/배너/히트스톱)과 Renderer(이펙트)가 소비한다.
 */
export type FxEvent =
  | { type: 'enemyDied'; x: number; y: number; color: string; radius: number }
  | { type: 'enemyHit'; x: number; y: number; color: string; damage: number }
  | { type: 'fired'; x: number; y: number; color: string; weaponId?: WeaponId }
  | { type: 'gemPickup'; x: number; y: number }
  | { type: 'playerHit' }
  | { type: 'levelUp'; x: number; y: number }
  | { type: 'banner'; text: string }
  | { type: 'bossWarn' }
  | { type: 'bossSpawned'; x: number; y: number }
  | { type: 'bossDied'; x: number; y: number }
  | { type: 'bossPhase'; x: number; y: number }
  | { type: 'pickup'; kind: PickupKind; x: number; y: number }
  | { type: 'bomb' }
  | { type: 'jackpot' }
  | { type: 'riftWarn' }
  | { type: 'riftReward' }
  | { type: 'victory' }
  | { type: 'gameover' }
  | { type: 'achievement'; id: string; name: string }
  | { type: 'story'; text: string }
  | { type: 'skill'; id: ActiveSkillId; x: number; y: number }
  | { type: 'teleport'; x: number; y: number }
  | { type: 'shieldBlock'; x: number; y: number }
  | { type: 'vacuum' };

export interface RunStats {
  projSpeedMul: number;
  critMul: number;
  moveSpeedMul: number;
}

// ============================================================

export class GameState {
  status: GameStatus = 'ready';

  // 플레이어
  playerX = CANVAS.width / 2;
  playerY = CANVAS.height * 0.78;
  moveX = 0;
  moveY = 0;
  /** 키보드 Shift 정밀 비행 */
  isFocusing = false;
  shipId: ShipId = 'scout';
  stageId: StageId = 'orbit';
  challengeId: ChallengeId = 'standard';
  /** 블랙마켓 기체 스킨 (CSS hex) */
  shipSkinTint: string | null = null;
  /** 무기별 투사체 스킨 색 */
  projSkinColors: Partial<Record<WeaponId, string>> = {};
  maxHp: number = PLAYER.maxHp;
  hp: number = PLAYER.maxHp;
  moveSpeed: number = PLAYER.moveSpeed;
  magnetRadius: number = PLAYER.magnetRadius;
  damageMul = 1;
  armorReduce = 0;
  expMul = 1;
  dropChanceBonus = 0;
  cooldownMul = 1;
  enemyHpMul = 1;
  scoreMul = 1;
  creditMul = 1;
  maxWeaponSlots: number = PLAYER.maxWeaponSlots;
  maxPassiveSlots: number = PLAYER.maxPassiveSlots;
  victoryTime = 300;
  bgTop = 0x0b0e22;
  bgBottom = 0x070812;
  invincibleLeft = 0;
  /** 과충전 쉴드 남은 시간(초) — 피격 i-frame과 별도 */
  shieldLeft = 0;
  /** 자기장 폭주 남은 시간(초) */
  magnetStormLeft = 0;
  pendingCrafts = 0;

  /** 마지막 이동 방향 (대시용, 기본 위) */
  lastAimX = 0;
  lastAimY = -1;
  skillCdLeft = 0;
  skillActiveLeft = 0;
  worldSlow = 1;

  runStats: RunStats = {
    projSpeedMul: 1,
    critMul: COMBAT.baseCritMul,
    moveSpeedMul: 1,
  };

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

  private nextRiftAt: number = RIFT_EVENT.firstAt;
  private riftWarnAt: number | null = null;
  private riftActive = 0;
  private baseExpMul = 1;

  /** 기체 + 스테이지 + 도전 + 메타로 런 시작 */
  start(shipId: ShipId, meta: MetaSave, stageId?: StageId, challengeId?: ChallengeId): void {
    const ship = SHIPS[shipId];
    const stage = STAGES[stageId ?? meta.selectedStage];
    const challenge = CHALLENGES[challengeId ?? meta.selectedChallenge];
    const m = metaBonuses(meta);

    this.shipId = shipId;
    this.stageId = stage.id;
    this.challengeId = challenge.id;
    const skinId = meta.equippedShipSkins?.[shipId];
    this.shipSkinTint = skinId ? SHIP_SKINS[skinId].tint : null;
    this.projSkinColors = {};
    for (const [wid, pid] of Object.entries(meta.equippedProjSkins ?? {})) {
      const def = PROJ_SKINS[pid as keyof typeof PROJ_SKINS];
      if (def) this.projSkinColors[wid as WeaponId] = def.color;
    }
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
    this.baseMaxHp = Math.round(PLAYER.maxHp * hpMul);
    this.maxHp = this.baseMaxHp;
    this.hp = this.maxHp;
    this.baseMoveSpeed = PLAYER.moveSpeed * ship.speedMul * m.speedMul;
    this.baseMagnet = PLAYER.magnetRadius + m.magnetAdd;
    this.baseDamageMul = m.damageMul;
    this.dropChanceBonus = m.dropChanceAdd;
    this.passives = [];
    this.runStats = {
      projSpeedMul: 1,
      critMul: COMBAT.baseCritMul,
      moveSpeedMul: 1,
    };
    this.shieldLeft = 0;
    this.magnetStormLeft = 0;
    this.pendingCrafts = 0;
    this.lastAimX = 0;
    this.lastAimY = -1;
    this.isFocusing = false;
    this.skillCdLeft = 0;
    this.skillActiveLeft = 0;
    this.worldSlow = 1;
    this.nextRiftAt = RIFT_EVENT.firstAt;
    this.riftWarnAt = null;
    this.riftActive = 0;
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
  private baseMaxHp: number = PLAYER.maxHp;

  /** 패시브 + 한계돌파 + 버프 타이머 → 런타임 스탯 재계산 */
  applyPassiveEffects(): void {
    let magnetAdd = 0;
    let speedAdd = 0;
    let armor = 0;
    let expAdd = 0;
    let dmgAdd = 0;
    let hpMul = 1;
    let cdMul = 1;
    for (const p of this.passives) {
      const def = PASSIVES[p.passiveId];
      const v = def.perLevel * p.level;
      switch (p.passiveId) {
        case 'magnet': magnetAdd += v; break;
        case 'thruster': speedAdd += v; break;
        case 'plating': armor += v; break;
        case 'collector': expAdd += v; break;
        case 'overcharge': dmgAdd += v; break;
        case 'overload':
          hpMul *= def.hpMul ?? 1;
          cdMul *= def.cooldownMul ?? 1;
          break;
      }
    }
    this.baseExpMul = 1 + expAdd;
    const storm = this.magnetStormLeft > 0;
    const magnetMul = storm ? (TACTICAL.magnetStorm.magnetMul ?? 1) : 1;
    const stormExp = storm ? (TACTICAL.magnetStorm.expMul ?? 1) : 1;
    this.magnetRadius = (this.baseMagnet + magnetAdd) * magnetMul;
    this.moveSpeed = this.baseMoveSpeed * (1 + speedAdd) * this.runStats.moveSpeedMul;
    this.armorReduce = Math.min(0.7, armor);
    this.expMul = this.baseExpMul * stormExp;
    this.damageMul = this.baseDamageMul * (1 + dmgAdd);
    this.cooldownMul = cdMul;
    const newMax = Math.max(1, Math.round(this.baseMaxHp * hpMul));
    if (newMax !== this.maxHp) {
      const ratio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
      this.maxHp = newMax;
      this.hp = Math.min(newMax, Math.max(1, this.hp * ratio));
    }
  }

  applyStatBoost(id: StatBoostId): void {
    const def = ENDGAME.stats[id];
    if (id === 'projSpeed') this.runStats.projSpeedMul *= 1 + def.amount;
    else if (id === 'critMul') this.runStats.critMul += def.amount;
    else if (id === 'moveSpeed') {
      this.runStats.moveSpeedMul *= 1 + def.amount;
      this.applyPassiveEffects();
    }
  }

  applyAffix(weaponId: WeaponId, affixId: AffixId): void {
    const slot = this.weapons.find((w) => w.weaponId === weaponId);
    if (slot) slot.affix = affixId;
  }

  /** 어픽스 없는 랜덤 무기에 부여. 성공 여부 반환 */
  grantRandomAffix(): boolean {
    const candidates = this.weapons.filter((w) => !w.affix);
    if (candidates.length === 0) return false;
    const slot = candidates[Math.floor(Math.random() * candidates.length)];
    const ids = Object.keys(AFFIXES) as AffixId[];
    slot.affix = ids[Math.floor(Math.random() * ids.length)];
    const ax = AFFIXES[slot.affix];
    this.events.push({
      type: 'banner',
      text: `${ax.label} ${WEAPONS[slot.weaponId].name}!`,
    });
    return true;
  }

  applyInstantJackpot(): void {
    for (const slot of this.weapons) {
      slot.level = Math.min(LEVELING.maxWeaponLevel, slot.level + 1);
    }
    this.dropCube(this.playerX, this.playerY);
    this.events.push({ type: 'jackpot' });
    this.events.push({ type: 'banner', text: '🎰 JACKPOT!' });
  }

  dropCube(x: number, y: number): void {
    this.pickups.push({
      kind: 'cube',
      x: Math.max(24, Math.min(CANVAS.width - 24, x)),
      y: Math.max(24, Math.min(CANVAS.height - 24, y)),
      life: PICKUPS.lifetime,
    });
  }

  /** 어픽스 리롤 (T3 + 기존 어픽스) */
  rerollAffix(weaponId: WeaponId): boolean {
    const slot = this.weapons.find((w) => w.weaponId === weaponId);
    if (!slot || WEAPONS[weaponId].tier !== 3 || !slot.affix) return false;
    const ids = (Object.keys(AFFIXES) as AffixId[]).filter((id) => id !== slot.affix);
    slot.affix = ids[Math.floor(Math.random() * ids.length)] ?? slot.affix;
    this.events.push({ type: 'banner', text: `${AFFIXES[slot.affix].label} 리롤!` });
    return true;
  }

  /** 어픽스 부여 (T3 + 무어픽스) */
  grantAffix(weaponId: WeaponId): boolean {
    const slot = this.weapons.find((w) => w.weaponId === weaponId);
    if (!slot || WEAPONS[weaponId].tier !== 3 || slot.affix) return false;
    const ids = Object.keys(AFFIXES) as AffixId[];
    slot.affix = ids[Math.floor(Math.random() * ids.length)];
    this.events.push({ type: 'banner', text: `${AFFIXES[slot.affix].label} 부여!` });
    return true;
  }

  buffWeaponDamage(weaponId: WeaponId): boolean {
    const slot = this.weapons.find((w) => w.weaponId === weaponId);
    if (!slot) return false;
    slot.damageBonus = (slot.damageBonus ?? 0) + ARSENAL.buffDamage;
    this.events.push({
      type: 'banner',
      text: `${WEAPONS[weaponId].name} 데미지 +${Math.round(slot.damageBonus * 100)}%`,
    });
    return true;
  }

  buffWeaponSpeed(weaponId: WeaponId): boolean {
    const slot = this.weapons.find((w) => w.weaponId === weaponId);
    if (!slot) return false;
    slot.speedBonus = (slot.speedBonus ?? 0) + ARSENAL.buffSpeed;
    this.events.push({
      type: 'banner',
      text: `${WEAPONS[weaponId].name} 투속 +${Math.round(slot.speedBonus * 100)}%`,
    });
    return true;
  }

  applyTactical(id: TacticalId): void {
    switch (id) {
      case 'emp': {
        this.enemyProjectiles.length = 0;
        for (const e of [...this.enemies]) {
          const isBoss = e.def.movePattern === 'boss' || e.def.movePattern === 'bossSeraph';
          if (isBoss) this.damageEnemy(e, PICKUPS.bombDamage * 1.2);
          else this.damageEnemy(e, e.hp + 1);
        }
        this.events.push({ type: 'bomb' });
        this.events.push({ type: 'banner', text: '📡 EMP!' });
        break;
      }
      case 'shield':
        this.shieldLeft = TACTICAL.shield.duration ?? 10;
        this.events.push({ type: 'banner', text: '🛡️ 과충전 쉴드' });
        break;
      case 'magnetStorm':
        this.magnetStormLeft = TACTICAL.magnetStorm.duration ?? 15;
        for (const g of this.gems) g.magnetized = true;
        this.applyPassiveEffects();
        this.events.push({ type: 'banner', text: '🧲 자기장 폭주' });
        break;
    }
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
    this.updateBuffs(dt);
    this.updateSkills(dt);
    this.updateWeapons(dt);
    this.updateSpawns(dt);
    this.updateBossSchedule();
    this.updateRiftEvent(dt);
    this.updateWarnings(dt);
    const edt = dt * this.worldSlow;
    this.updateEnemies(edt);
    this.updateProjectiles(dt);
    this.updateEnemyProjectiles(edt);
    this.updateGems(dt);
    this.updatePickups(dt);
    this.checkPlayerCollision(dt);
    return this.status;
  }

  private updateBuffs(dt: number): void {
    if (this.shieldLeft > 0) this.shieldLeft -= dt;
    if (this.magnetStormLeft > 0) {
      this.magnetStormLeft -= dt;
      if (this.magnetStormLeft <= 0) {
        this.magnetStormLeft = 0;
        this.applyPassiveEffects();
      }
    }
  }

  tryUseSkill(): boolean {
    if (this.status !== 'playing') return false;
    if (this.skillCdLeft > 0) return false;
    const skill = SHIPS[this.shipId].activeSkill;
    this.skillCdLeft = skill.cooldown;
    this.skillActiveLeft = skill.duration ?? 0;

    if (skill.id === 'phaseDash') {
      const dist = skill.dashDist ?? 110;
      const r = PLAYER.radius;
      this.playerX = Math.max(r, Math.min(CANVAS.width - r, this.playerX + this.lastAimX * dist));
      this.playerY = Math.max(r, Math.min(CANVAS.height - r, this.playerY + this.lastAimY * dist));
      this.invincibleLeft = Math.max(this.invincibleLeft, skill.iframeMs ?? 250);
      this.events.push({ type: 'skill', id: skill.id, x: this.playerX, y: this.playerY });
      this.events.push({ type: 'banner', text: `${skill.icon} ${skill.name}` });
    } else if (skill.id === 'aegis') {
      this.events.push({ type: 'skill', id: skill.id, x: this.playerX, y: this.playerY });
      this.events.push({ type: 'banner', text: `${skill.icon} ${skill.name}` });
      this.aegisShockwave(skill);
    } else if (skill.id === 'timeDilation') {
      this.worldSlow = skill.slowMul ?? 0.4;
      this.events.push({ type: 'skill', id: skill.id, x: this.playerX, y: this.playerY });
      this.events.push({ type: 'banner', text: `${skill.icon} ${skill.name}` });
    }
    return true;
  }

  private updateSkills(dt: number): void {
    if (this.skillCdLeft > 0) this.skillCdLeft = Math.max(0, this.skillCdLeft - dt);
    const skill = SHIPS[this.shipId].activeSkill;
    if (this.skillActiveLeft > 0) {
      const prev = this.skillActiveLeft;
      this.skillActiveLeft = Math.max(0, this.skillActiveLeft - dt);
      if (prev > 0 && this.skillActiveLeft <= 0) {
        this.worldSlow = 1;
        if (skill.id === 'aegis') this.aegisShockwave(skill);
      }
    }
    if (skill.id === 'aegis' && this.skillActiveLeft > 0) this.tickAegis();
  }

  /** 지속 중에는 탄막만 소거. 데미지는 전개/종료 충격파만. */
  private tickAegis(): void {
    const radius = SHIPS[this.shipId].activeSkill.radius ?? 72;
    const r2 = radius * radius;
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = this.enemyProjectiles[i];
      if ((p.x - this.playerX) ** 2 + (p.y - this.playerY) ** 2 <= r2) {
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }

  private aegisShockwave(skill: typeof SHIPS[ShipId]['activeSkill']): void {
    const radius = skill.radius ?? 72;
    const knock = skill.knockback ?? 46;
    const dmg = skill.pulseDamage ?? 38;
    for (const e of [...this.enemies]) {
      const dx = e.x - this.playerX;
      const dy = e.y - this.playerY;
      const dist = Math.hypot(dx, dy);
      if (dist > radius + e.def.radius) continue;
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      e.x += nx * knock;
      e.y += ny * knock;
      if (this.tryAbsorbShield(e, true)) continue;
      this.damageEnemy(e, dmg);
    }
    this.events.push({ type: 'skill', id: 'aegis', x: this.playerX, y: this.playerY });
  }

  // ---------- 플레이어 이동 (방향 벡터 × 속도) ----------

  private updatePlayer(dt: number): void {
    const mx = this.moveX;
    const my = this.moveY;
    const mag = Math.hypot(mx, my);
    let dirX = 0;
    let dirY = 0;
    let analog = 0;
    if (mag > 0.001) {
      dirX = mx / mag;
      dirY = my / mag;
      analog = Math.min(1, mag);
      if (mag > 0.15) {
        this.lastAimX = dirX;
        this.lastAimY = dirY;
      }
    }
    if (this.isFocusing) analog *= PLAYER.focusSpeedMul;

    const skill = SHIPS[this.shipId].activeSkill;
    const locked = this.skillActiveLeft > 0 && skill.id === 'aegis';
    if (!locked) {
      this.playerX += dirX * this.moveSpeed * analog * dt;
      this.playerY += dirY * this.moveSpeed * analog * dt;
      const r = PLAYER.radius;
      this.playerX = Math.max(r, Math.min(CANVAS.width - r, this.playerX));
      this.playerY = Math.max(r, Math.min(CANVAS.height - r, this.playerY));
    }

    if (this.invincibleLeft > 0) this.invincibleLeft -= dt * 1000;
  }

  // ---------- 오토 슈팅 ----------

  private updateWeapons(dt: number): void {
    for (const slot of this.weapons) {
      slot.cooldownLeft -= dt * 1000;
      if (slot.cooldownLeft <= 0) {
        this.fireWeapon(slot);
        const def = WEAPONS[slot.weaponId];
        const cdScale = (1 - Math.min(0.45, (slot.level - 1) * LEVELING.cooldownPerLevel)) * this.cooldownMul;
        slot.cooldownLeft += def.cooldownMs * cdScale;
      }
    }
  }

  private fireWeapon(slot: WeaponSlot): void {
    const def = WEAPONS[slot.weaponId];
    const p = def.projectile;
    const damage = p.damage
      * (1 + (slot.level - 1) * LEVELING.damagePerLevel)
      * this.damageMul
      * (1 + (slot.damageBonus ?? 0));
    const speed = p.speed * this.runStats.projSpeedMul * (1 + (slot.speedBonus ?? 0));
    let pierce = p.pierce;
    if (slot.affix === 'pierce') pierce += AFFIX_SYNERGY.pierce.affixBonus;

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
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed,
        damage,
        radius: p.radius,
        homingTurnRate: p.homingTurnRate,
        pierceLeft: pierce,
        life: p.lifetime,
        color: this.projSkinColors[slot.weaponId] ?? def.color,
        hitIds: new Set(),
        affix: slot.affix,
        pierceHits: 0,
        explodeRadius: p.explodeRadius,
        shieldPierce: p.pierce > 0 || p.spreadDeg >= 180 || p.homingTurnRate >= 4 || (p.explodeRadius ?? 0) > 0,
      });
    }
    this.events.push({
      type: 'fired',
      x: this.playerX, y: this.playerY - PLAYER.radius,
      color: this.projSkinColors[slot.weaponId] ?? def.color,
      weaponId: slot.weaponId,
    });
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
          this.spawnEnemy(entry.enemy, entry.mutation);
        } else {
          this.spawnTimers.set(key, t);
        }
      });
    });
  }

  private spawnEnemy(enemyId: EnemyId, mutation?: MutationId): void {
    const def = ENEMIES[enemyId];
    const W = CANVAS.width;
    const H = CANVAS.height;

    if (def.spawnEdge === 'top') {
      const x = def.radius + Math.random() * (W - def.radius * 2);
      this.addEnemy(enemyId, x, -def.radius * 2, 1, true, false, mutation);
      return;
    }

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
        mutation,
      });
    } else {
      const x = def.radius + Math.random() * (W - def.radius * 2);
      this.warnings.push({
        indicatorX: x,
        indicatorY: H - 18,
        spawnX: x,
        spawnY: H + def.radius * 2,
        enemyId,
        dir: 1,
        timer: WARNING_DURATION,
        mutation,
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
      boss.phase = 1;
      this.bossId = boss.id;
      this.bossIndex++;
      this.bossWarned = false;
      this.events.push({ type: 'bossSpawned', x: boss.x, y: boss.y });
      this.events.push({ type: 'banner', text: `⚠ ${ENEMIES[bossType].name}` });
    }
  }

  private nearBossWindow(): boolean {
    if (this.bossId != null) return true;
    for (const t of this.bossTimes) {
      if (Math.abs(this.time - t) < RIFT_EVENT.bossAvoidWindow) return true;
    }
    return false;
  }

  private updateRiftEvent(_dt: number): void {
    if (this.riftWarnAt != null && this.time >= this.riftWarnAt) {
      this.riftWarnAt = null;
      this.spawnRiftElites();
      return;
    }

    if (this.riftActive > 0) return;
    if (this.time < this.nextRiftAt) return;
    if (this.nearBossWindow()) {
      this.nextRiftAt = this.time + 8;
      return;
    }

    this.riftWarnAt = this.time + RIFT_EVENT.warnLead;
    this.nextRiftAt = this.time + RIFT_EVENT.cooldown;
    this.events.push({ type: 'riftWarn' });
    this.events.push({ type: 'banner', text: '⚠ RIFT INCOMING' });
  }

  private spawnRiftElites(): void {
    const pool = RIFT_EVENT.elitePool;
    for (let i = 0; i < RIFT_EVENT.eliteCount; i++) {
      const enemyId = pool[i % pool.length];
      const def = ENEMIES[enemyId];
      const x = def.radius + Math.random() * (CANVAS.width - def.radius * 2);
      const y = -30 - i * 28;
      const e = this.addEnemy(enemyId, x, y, 1, false, true);
      e.fromRift = true;
      this.riftActive++;
    }
    this.events.push({ type: 'banner', text: '🌀 돌발 균열!' });
  }

  private onRiftEliteKilled(): void {
    this.riftActive = Math.max(0, this.riftActive - 1);
    if (this.riftActive > 0) return;
    this.events.push({ type: 'riftReward' });
    if (Math.random() < 0.5 && this.grantRandomAffix()) {
      // affix granted
    } else {
      this.applyInstantJackpot();
    }
    this.events.push({ type: 'banner', text: '✨ 균열 보상!' });
  }

  private updateWarnings(dt: number): void {
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const w = this.warnings[i];
      w.timer -= dt;
      if (w.timer <= 0) {
        this.addEnemy(w.enemyId, w.spawnX, w.spawnY, w.dir, true, false, w.mutation);
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
    forceElite = false,
    mutation?: MutationId,
  ): Enemy {
    const def = ENEMIES[enemyId];
    const isBoss = def.movePattern === 'boss' || def.movePattern === 'bossSeraph';
    const elite = forceElite
      || (allowElite
        && !isBoss
        && enemyId !== 'splinter'
        && enemyId !== 'guardian'
        && this.time >= ELITE.unlockAt
        && Math.random() < ELITE.chance);

    let hp = def.hp * enemyHpScale(this.time) * this.enemyHpMul;
    if (elite) hp *= ELITE.hpMul;

    const enemy: Enemy = {
      id: this.nextEnemyId++,
      def, x, y,
      hp, maxHp: hp,
      age: 0, baseX: x, dir,
      hitFlash: 0,
      elite,
      phase: isBoss ? 1 : undefined,
      mutation: enemyId === 'splinter' ? undefined : mutation,
      introLeft: isBoss ? BOSS.introDuration : undefined,
      swimAge: isBoss ? 0 : undefined,
      shieldHits: enemyId === 'shielder' ? SHIELDER.hits : undefined,
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
        case 'shieldDown':
        case 'cloakDown':
        case 'auraDown':
          e.y += e.def.speed * (e.elite ? ELITE.speedMul : 1) * dt;
          break;
        case 'teleport':
          this.updateTeleporter(e, dt);
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

  private updateTeleporter(e: Enemy, dt: number): void {
    const spd = e.def.speed * (e.elite ? ELITE.speedMul : 1);
    e.y += spd * dt;
    e.teleportCd = (e.teleportCd ?? 0) - dt;
    const dist = Math.hypot(this.playerX - e.x, this.playerY - e.y);
    if (e.teleportCd <= 0 && dist < TELEPORTER.triggerDist && dist > 24) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const r = e.def.radius;
      e.x = Math.max(r, Math.min(CANVAS.width - r, this.playerX + side * (38 + Math.random() * 36)));
      e.y = Math.max(r, Math.min(CANVAS.height - r, this.playerY + 40 + Math.random() * 28));
      e.teleportCd = TELEPORTER.cooldown;
      e.hitFlash = 0.15;
      this.events.push({ type: 'teleport', x: e.x, y: e.y });
    }
  }

  private updateBossIntro(e: Enemy, dt: number): boolean {
    if ((e.introLeft ?? 0) <= 0) return false;
    e.introLeft = Math.max(0, (e.introLeft ?? 0) - dt);
    e.x = CANVAS.width / 2;
    const speed = (BOSS.introTargetY + 80) / BOSS.introDuration;
    e.y += speed * dt;
    if (e.y > BOSS.introTargetY) e.y = BOSS.introTargetY;
    return e.introLeft > 0;
  }

  /** 보스: 등장 후 좌우 유영하며 탄막 + 조준 사격 */
  private updateBoss(e: Enemy, dt: number): void {
    if (this.updateBossIntro(e, dt)) return;
    e.swimAge = (e.swimAge ?? 0) + dt;
    e.x = CANVAS.width / 2 + Math.sin(e.swimAge * 0.7) * 150;
    const fireMul = (e.phase ?? 1) >= 2 ? BOSS.phaseFireRateMul : 1;

    e.ringCd = (e.ringCd ?? 2.0) - dt;
    if (e.ringCd <= 0) {
      e.ringCd = BOSS.ringInterval * fireMul;
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
      e.aimedCd = BOSS.aimedInterval * fireMul;
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
    if (this.updateBossIntro(e, dt)) return;
    e.swimAge = (e.swimAge ?? 0) + dt;
    e.x = CANVAS.width / 2 + Math.sin(e.swimAge * 1.1) * 170;
    e.spiralAngle = (e.spiralAngle ?? 0) + dt * 4.5;
    const fireMul = (e.phase ?? 1) >= 2 ? BOSS.phaseFireRateMul : 1;

    e.ringCd = (e.ringCd ?? 0) - dt;
    if (e.ringCd <= 0) {
      e.ringCd = BOSS.spiralInterval * fireMul;
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
      e.aimedCd = 2.0 * fireMul;
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
      const aegis = this.skillActiveLeft > 0 && SHIPS[this.shipId].activeSkill.id === 'aegis';
      if (aegis) {
        const ar = SHIPS[this.shipId].activeSkill.radius ?? 72;
        if ((this.playerX - p.x) ** 2 + (this.playerY - p.y) ** 2 <= ar * ar) {
          this.enemyProjectiles.splice(i, 1);
          continue;
        }
      }
      if (this.invincibleLeft <= 0 && this.shieldLeft <= 0 && !aegis) {
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
          if (this.isCloaked(e)) continue;
          if (this.tryAbsorbShield(e, this.isShielderFrontHit(p))) {
            this.projectiles.splice(i, 1);
            removed = true;
            break;
          }
          p.hitIds.add(e.id);
          let dmg = p.damage;
          if (p.affix === 'pierce') {
            dmg *= this.pierceDamageMul(p);
            p.pierceHits = (p.pierceHits ?? 0) + 1;
          }
          if (Math.random() < COMBAT.baseCritChance) dmg *= this.runStats.critMul;
          this.damageEnemy(e, dmg);
          if (p.explodeRadius) this.explodeProjectile(p, e);

          if (p.affix === 'chain') {
            this.applyChain(p, e);
          }

          if (p.pierceLeft <= 0) {
            if (p.affix === 'split' && !p.noSplit) {
              this.spawnSplitShards(p);
            }
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

  private isCloaked(e: Enemy): boolean {
    if (e.def.id !== 'mirage') return false;
    return Math.hypot(this.playerX - e.x, this.playerY - e.y) > MIRAGE.revealRadius;
  }

  private inGuardianAura(e: Enemy): boolean {
    if (e.def.id === 'guardian') return false;
    for (const g of this.enemies) {
      if (g.def.id !== 'guardian' || g.id === e.id) continue;
      if (Math.hypot(g.x - e.x, g.y - e.y) <= GUARDIAN.auraRadius + e.def.radius) return true;
    }
    return false;
  }

  /** 실더 정면 역장: 1타격 흡수 후 투사체 소멸. true면 HP 데미지 없음 */
  private tryAbsorbShield(e: Enemy, fromFront: boolean): boolean {
    if (e.def.id !== 'shielder') return false;
    if ((e.shieldHits ?? 0) <= 0) return false;
    if (!fromFront) return false;
    e.shieldHits = (e.shieldHits ?? 1) - 1;
    e.hitFlash = 0.07;
    this.events.push({ type: 'shieldBlock', x: e.x, y: e.y + e.def.radius });
    if (e.shieldHits <= 0) {
      e.shieldHits = 0;
      this.events.push({ type: 'banner', text: '🛡️ 역장 파괴' });
    }
    return true;
  }

  private vacuumDrops(): void {
    for (const g of this.gems) g.magnetized = true;
    for (const p of this.pickups) p.magnetized = true;
    this.events.push({ type: 'vacuum' });
  }

  private isShielderFrontHit(p: Projectile): boolean {
    const spd = Math.hypot(p.vx, p.vy) || 1;
    const incomingY = -p.vy / spd;
    return incomingY > SHIELDER.frontDot;
  }

  private explodeProjectile(p: Projectile, origin: Enemy): void {
    const r = p.explodeRadius ?? 0;
    if (r <= 0) return;
    const r2 = r * r;
    for (const e of [...this.enemies]) {
      if (e.id === origin.id || p.hitIds.has(e.id)) continue;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r2) {
        p.hitIds.add(e.id);
        if (this.isCloaked(e)) continue;
        if (this.tryAbsorbShield(e, p.y > e.y)) continue;
        this.damageEnemy(e, p.damage * 0.55);
      }
    }
    this.events.push({ type: 'enemyDied', x: p.x, y: p.y, color: p.color, radius: r * 0.45 });
  }

  private pierceDamageMul(p: Projectile): number {
    const syn = AFFIX_SYNERGY.pierce;
    const hits = p.pierceHits ?? 0;
    if (hits <= 0) return 1;
    const speedBonus = this.runStats.projSpeedMul - 1;
    if (this.runStats.projSpeedMul > syn.accelThreshold) {
      return Math.pow(syn.accelMul, hits);
    }
    const steps = Math.floor(speedBonus / syn.speedStep);
    const falloff = Math.max(
      syn.minFalloff,
      syn.baseFalloff + steps * syn.falloffMitigation,
    );
    return Math.pow(falloff, hits);
  }

  private spawnSplitShards(p: Projectile): void {
    const syn = AFFIX_SYNERGY.split;
    const base = Math.atan2(p.vy, p.vx);
    const moveBonus = Math.max(0, this.moveSpeed / PLAYER.moveSpeed - 1);
    const shardCrit = Math.min(0.85, COMBAT.baseCritChance + moveBonus);
    for (const off of [-0.45, 0, 0.45]) {
      const a = base + off;
      const spd = p.speed * syn.shardSpeedMul;
      let damage = p.damage * syn.damageMul;
      if (Math.random() < shardCrit) damage *= this.runStats.critMul;
      this.projectiles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        speed: spd,
        damage,
        radius: Math.max(3, p.radius * 0.8),
        homingTurnRate: 0,
        pierceLeft: 0,
        life: syn.shardLife,
        color: p.color,
        hitIds: new Set(p.hitIds),
        noSplit: true,
      });
    }
  }

  private applyChain(p: Projectile, from: Enemy): void {
    const syn = AFFIX_SYNERGY.chain;
    const magnetBonus = Math.max(0, this.magnetRadius / PLAYER.magnetRadius - 1);
    const steps = Math.floor(magnetBonus / syn.magnetStep);
    const jumps = syn.baseJumps + steps * syn.jumpsPerStep;
    const range = syn.baseRange * (1 + steps * syn.rangePerStep);
    const rangeSq = range * range;

    let origin = from;
    for (let j = 0; j < jumps; j++) {
      let best: Enemy | null = null;
      let bestD = rangeSq;
      for (const e of this.enemies) {
        if (p.hitIds.has(e.id)) continue;
        if (this.isCloaked(e)) continue;
        const d = (e.x - origin.x) ** 2 + (e.y - origin.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (!best) break;
      p.hitIds.add(best.id);
      if (this.tryAbsorbShield(best, true)) {
        origin = best;
        continue;
      }
      let dmg = p.damage * syn.damageMul;
      if (Math.random() < COMBAT.baseCritChance) dmg *= this.runStats.critMul;
      this.damageEnemy(best, dmg);
      origin = best;
    }
  }

  private nearestEnemy(x: number, y: number, exclude: Set<number>): Enemy | null {
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (exclude.has(e.id)) continue;
      if (this.isCloaked(e)) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private damageEnemy(e: Enemy, dmg: number): void {
    if (this.isCloaked(e)) return;
    if (this.inGuardianAura(e)) dmg *= GUARDIAN.damageTakenMul;
    const isBoss = e.def.movePattern === 'boss' || e.def.movePattern === 'bossSeraph';
    const prevRatio = e.hp / e.maxHp;
    e.hp -= dmg;
    e.hitFlash = 0.08;
    this.events.push({ type: 'enemyHit', x: e.x, y: e.y, color: e.def.color, damage: Math.round(dmg) });

    if (
      isBoss
      && (e.phase ?? 1) < 2
      && prevRatio > BOSS.phaseHpRatio
      && e.hp / e.maxHp <= BOSS.phaseHpRatio
      && e.hp > 0
    ) {
      this.triggerBossPhase(e);
    }

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

      if (isBoss) {
        this.killBoss(e);
      } else {
        if (e.elite) this.eliteKills++;
        if (e.fromRift) {
          this.dropCube(e.x, e.y);
          this.onRiftEliteKilled();
        }
        this.applyDeathMutation(e);
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
        if (e.elite) this.vacuumDrops();
      }

      const idx = this.enemies.indexOf(e);
      if (idx >= 0) this.enemies.splice(idx, 1);
    }
  }

  private applyDeathMutation(e: Enemy): void {
    if (!e.mutation) return;
    if (e.mutation === 'explode') {
      const rr = MUTATIONS.explodeRadius;
      if ((this.playerX - e.x) ** 2 + (this.playerY - e.y) ** 2 <= rr * rr) {
        this.hurtPlayer(MUTATIONS.explodeDamage);
      }
      this.events.push({ type: 'enemyDied', x: e.x, y: e.y, color: '#fb923c', radius: rr * 0.5 });
    } else if (e.mutation === 'split') {
      for (const ox of [-18, 18]) {
        this.addEnemy('splinter', e.x + ox, e.y, 1, false);
      }
    } else if (e.mutation === 'burst') {
      for (let k = 0; k < MUTATIONS.burstCount; k++) {
        const a = (Math.PI * 2 * k) / MUTATIONS.burstCount;
        this.enemyProjectiles.push({
          x: e.x, y: e.y,
          vx: Math.cos(a) * MUTATIONS.burstSpeed,
          vy: Math.sin(a) * MUTATIONS.burstSpeed,
          radius: 5,
          damage: MUTATIONS.burstDamage,
        });
      }
    }
  }

  private triggerBossPhase(e: Enemy): void {
    e.phase = 2;
    this.enemyProjectiles.length = 0;
    const gems = Math.round(BOSS.gemDrop * BOSS.phaseGemMul);
    for (let k = 0; k < gems; k++) {
      this.gems.push({
        x: e.x + (Math.random() - 0.5) * 220,
        y: e.y + Math.random() * 160 + 10,
        exp: 3,
        life: GEM.lifetime,
        magnetized: false,
      });
    }
    this.events.push({ type: 'bossPhase', x: e.x, y: e.y });
    this.events.push({ type: 'banner', text: '⚡ PHASE 2' });
    this.dropCube(e.x, e.y);
    this.vacuumDrops();
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

  private updatePickups(dt: number): void {
    const top = CANVAS.height * DROPS.topBand;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pickups.splice(i, 1);
        continue;
      }
      if (p.magnetized) {
        const dx = this.playerX - p.x;
        const dy = this.playerY - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const step = GEM.magnetSpeed * dt;
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
      } else if (p.y < top) {
        p.y += DROPS.gravity * dt;
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
        for (const e of [...this.enemies]) {
          if (this.tryAbsorbShield(e, true)) continue;
          this.damageEnemy(e, PICKUPS.bombDamage);
        }
        break;
      }
      case 'cube':
        this.pendingCrafts++;
        this.status = 'levelup';
        this.events.push({ type: 'banner', text: '🧊 CRAFTING' });
        break;
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
      } else if (g.y < CANVAS.height * DROPS.topBand) {
        g.y += DROPS.gravity * dt;
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
    if (this.invincibleLeft > 0 || this.shieldLeft > 0) return;
    if (this.skillActiveLeft > 0 && SHIPS[this.shipId].activeSkill.id === 'aegis') return;
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
    if (this.invincibleLeft > 0 || this.shieldLeft > 0) return;
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
