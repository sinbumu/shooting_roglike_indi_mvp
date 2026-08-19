import type {
  EnemyDef, EnemyId, WeaponId, PickupKind, ShipId, PassiveId, StageId, ChallengeId,
  AffixId, StatBoostId, TacticalId, MutationId, ActiveSkillId, DroneId, PilotTraitId,
  ProjectileSpec, ConstellationId,
} from './types';
import {
  CANVAS, PLAYER, LEVELING, WEAPONS, ENEMIES, GEM, SHIPS, PASSIVES, ELITE,
  STAGES, CHALLENGES, WARNING_DURATION, enemyHpScale, spawnIntervalScale,
  BOSS, SCORE, PICKUPS, COMBAT, ENDGAME, TACTICAL, AFFIXES, RIFT_EVENT,
  ARSENAL, AFFIX_SYNERGY, MUTATIONS, SHIELDER, TELEPORTER,
  SHIP_SKINS, PROJ_SKINS, MIRAGE, GUARDIAN, DROPS, HOMING,
  LEGION, LEVEL_AEGIS, TRAPPER, VORTEX, DRONE_FX,
  VOID_ALTAR, HAZARDS, AWAKEN, PILOT_FX, AFFIX_FX, TERRAIN,
  CONSTELLATION_FX, emptyConstellation,
  compatibleAffixes, ampCooldownMul,
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
  /** 크래프팅 강화로 누적되는 쿨타임 감소 (0.10 = -10%) */
  cooldownBonus?: number;
  /** 크래프팅 강화로 누적되는 투사체/폭발 반경 보너스 */
  radiusBonus?: number;
}

export interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  speed: number;
  /** 무기 기본 속력 — 유도 선회 보정용 */
  baseSpeed: number;
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
  ignoreShield?: boolean;
  weaponId?: WeaponId;
  orbitAngle?: number;
  orbitRadius?: number;
  orbitOmega?: number;
  originX?: number;
  originY?: number;
  /** 단방향 쉴드 통과 강화 */
  boosted?: boolean;
}

export interface Beam {
  x: number;
  y: number;
  angle: number;
  width: number;
  length: number;
  damage: number;
  life: number;
  tickLeft: number;
  tickInterval: number;
  color: string;
  ignoreShield: boolean;
  affix?: AffixId;
  weaponId?: WeaponId;
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
  /** 공허의 제단 시련 엘리트 */
  fromAltar?: boolean;
  mutation?: MutationId;
  teleportCd?: number;
  /** 보스 등장 페이즈 남은 시간 */
  introLeft?: number;
  /** 등장 이후 유영 타이머 (스폰 age와 분리) */
  swimAge?: number;
  /** 실더 역장 남은 타격 횟수 */
  shieldHits?: number;
  /** 트래퍼 고정 여부 */
  anchored?: boolean;
  /** 탐욕 오염 픽업에 피격되어 광폭화 */
  enraged?: boolean;
}

export interface Slash {
  x: number;
  y: number;
  angle: number;
  arcDeg: number;
  range: number;
  life: number;
  maxLife: number;
  damage: number;
  color: string;
  weaponId: WeaponId;
  deflect: boolean;
  hitIds: Set<number>;
  leaveZone?: { duration: number; tick: number; radius: number };
  fromAfterimage?: boolean;
  afterimageQueued?: boolean;
}

export interface Orbiter {
  weaponId: WeaponId;
  angle: number;
  radius: number;
  damage: number;
  hitRadius: number;
  color: string;
  pull: number;
  ring: boolean;
  tickLeft: number;
}

export interface Mine {
  x: number;
  y: number;
  radius: number;
  fuse: number;
  damage: number;
  explodeRadius: number;
  color: string;
  weaponId: WeaponId;
  seekSpeed: number;
  pullRadius: number;
  pullForce: number;
  split: number;
  zoneDuration: number;
  zoneTick: number;
  vx: number;
  vy: number;
}

export interface HazardZone {
  kind: 'circle' | 'segment';
  x: number;
  y: number;
  x2: number;
  y2: number;
  radius: number;
  life: number;
  tickLeft: number;
  tickInterval: number;
  damage: number;
  pull: number;
  color: string;
  weaponId: WeaponId;
  pulsePeak?: number;
  pulseMaxLife?: number;
}

export interface Pylon {
  x: number;
  y: number;
  tx: number;
  ty: number;
  planted: boolean;
  ownerId: number;
}

export interface InterceptBeam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
}

export interface AmpAura {
  x: number;
  y: number;
  r: number;
  life: number;
}

export interface VoidAltar {
  x: number;
  y: number;
  /** 0~1 */
  charge: number;
  trialLeft: number;
  done: boolean;
}

export interface EnvShade {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EnvHazard {
  kind: 'solar' | 'asteroid' | 'emp';
  phase: 'warn' | 'active';
  left: number;
  shades: EnvShade[];
  beams: number[];
  burnAcc: number;
}

/** 단방향 홀로그램 장벽 (적탄만 차단) */
export interface OneWayShield {
  x: number;
  y: number;
  w: number;
  h: number;
  life: number;
}

/** 파괴 가능 퀀텀 코어 */
export interface QuantumCore {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  hitFlash: number;
}

/** 둔화 성운 지대 */
export interface NebulaZone {
  x: number;
  y: number;
  r: number;
  life: number;
  vx: number;
  vy: number;
}

/** 태양풍 대피소 — 버려진 모선 잔해 */
export interface DerelictWreck {
  x: number;
  y: number;
  w: number;
  h: number;
  breaking: boolean;
  breakLeft: number;
  glow: number;
}

export interface CreditOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  life: number;
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
  /** 탐욕: 오염까지 남은 시간. 0 이하이면 적 유도 */
  corruptIn?: number;
  homing?: boolean;
}

export interface Gem {
  x: number; y: number;
  exp: number;
  life: number;
  corruptIn?: number;
  homing?: boolean;
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
  | { type: 'fired'; x: number; y: number; color: string; weaponId?: WeaponId; angle?: number; arcDeg?: number; range?: number; orbitRadius?: number }
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
  | { type: 'vacuum' }
  /** 지뢰·장판 폭발 — 적 사망과 분리 (히트스톱 없음) */
  | { type: 'blast'; x: number; y: number; color: string; radius: number }
  | { type: 'altarTick'; pitch: number }
  | { type: 'altarActivate'; x: number; y: number }
  | { type: 'altarHint' }
  | { type: 'hazardWarn'; kind: 'solar' | 'asteroid' | 'emp' }
  | { type: 'solarFlare' }
  | { type: 'asteroid' }
  | { type: 'empStart' }
  | { type: 'execProc'; x: number; y: number }
  | { type: 'terrainShieldBlock'; x: number; y: number }
  | { type: 'terrainBoost'; x: number; y: number }
  | { type: 'coreBurst'; x: number; y: number; radius: number }
  | { type: 'derelictBreak'; x: number; y: number; w: number; h: number }
  | { type: 'creditPickup'; x: number; y: number }
  | { type: 'bloodBurst'; x: number; y: number; radius: number };

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
  /** 관성 속도 (px/초) */
  velX = 0;
  velY = 0;
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
  /** 전역 진공 흡인 남은 시간(초) */
  vacuumLeft = 0;
  pendingCrafts = 0;
  pendingAltarRewards = 0;
  /** 이번 런에서 본 무기 (도감) */
  seenThisRun: Set<WeaponId> = new Set();

  /** 마지막 이동 방향 (대시용, 기본 위) */
  lastAimX = 0;
  lastAimY = -1;
  skillCdLeft = 0;
  skillActiveLeft = 0;
  worldSlow = 1;
  coreAwakened = false;
  awakeningDue = false;
  skillCharges = 0;
  skillChargeMax = 0;
  skillRechargeLeft = 0;
  private aegisAbsorbed = 0;
  pilotTrait: PilotTraitId | null = null;
  turretDarkActive = false;
  empLeft = 0;
  altar: VoidAltar | null = null;
  envHazard: EnvHazard | null = null;
  oneWayShield: OneWayShield | null = null;
  quantumCores: QuantumCore[] = [];
  nebulaZones: NebulaZone[] = [];
  derelict: DerelictWreck | null = null;
  creditOrbs: CreditOrb[] = [];
  runCreditBonus = 0;
  runCoreBonus = 0;
  pantheonEarned = 0;
  constellation: Record<ConstellationId, number> = emptyConstellation();
  fogRadius = 0;

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
  /** 획득 순서 (진화 카드용) */
  acquireOrder: WeaponId[] = [];
  /** 무기별 누적 딜 (결과창) */
  damageDealt: Partial<Record<WeaponId, number>> = {};

  // 월드
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  beams: Beam[] = [];
  enemyProjectiles: EnemyProjectile[] = [];
  gems: Gem[] = [];
  pickups: Pickup[] = [];
  warnings: SpawnWarning[] = [];
  slashes: Slash[] = [];
  orbiters: Orbiter[] = [];
  mines: Mine[] = [];
  zones: HazardZone[] = [];
  pylons: Pylon[] = [];
  interceptBeams: InterceptBeam[] = [];
  ampAura: AmpAura | null = null;
  private pendingAfterimages: { left: number; slash: Slash }[] = [];

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

  legionHpMul = 1;
  legionSpawnMul = 0;
  private wardenStacks = 0;
  private heraldStacks = 0;
  private nextCommanderAt: number = LEGION.firstAt;
  private commanderWarned = false;
  /** 레벨업 쉴드 남은 시간 */
  levelAegisLeft = 0;
  private levelAegisReduce = 0;

  droneId: DroneId | null = null;
  droneLevel = 0;
  private droneTimer = 0;
  private turretStill = 0;
  private altarTickAcc = 0;
  private nextHazardAt: number = HAZARDS.firstAt;
  private needAltarHint = false;
  private nextShieldAt: number = TERRAIN.shield.firstAt;
  private nextCoreAt: number = TERRAIN.core.firstAt;
  private nextNebulaAt: number = TERRAIN.nebula.firstAt;
  private nextCoreId = 100000;
  private derelictGoldDropped = false;
  private hunterBuffLeft = 0;
  private wheelAcc = 0;
  private wheelPending = false;
  private bloodBursting = false;
  private carpetQueue: { x: number; y: number; left: number; radius: number; damage: number }[] = [];

  nodeLv(id: ConstellationId): number {
    return this.constellation[id] ?? 0;
  }

  hasNode(id: ConstellationId): boolean {
    return this.nodeLv(id) > 0;
  }

  /** 기체 + 스테이지 + 도전 + 메타로 런 시작 */
  start(shipId: ShipId, meta: MetaSave, stageId?: StageId, challengeId?: ChallengeId): void {
    const ship = SHIPS[shipId];
    const stage = STAGES[stageId ?? meta.selectedStage];
    const challenge = CHALLENGES[challengeId ?? meta.selectedChallenge];
    const m = metaBonuses(meta);

    this.shipId = shipId;
    this.stageId = stage.id;
    this.challengeId = challenge.id;
    this.constellation = { ...emptyConstellation(), ...meta.constellation };
    this.fogRadius = this.hasNode('darkFog') ? CONSTELLATION_FX.fogRadius : 0;
    this.pantheonEarned = 0;
    this.runCoreBonus = 0;
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
    const abyss = this.nodeLv('endlessAbyss');
    if (abyss > 0) this.enemyHpMul *= Math.pow(1 + CONSTELLATION_FX.abyssPerStack, abyss);
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
    const orbit = this.nodeLv('infiniteOrbit');
    if (orbit > 0) {
      this.runStats.projSpeedMul *= Math.pow(1 + CONSTELLATION_FX.orbitSpeed, orbit);
      this.runStats.critMul += CONSTELLATION_FX.orbitCrit * orbit;
      this.runStats.moveSpeedMul *= Math.pow(1 + CONSTELLATION_FX.orbitMove, orbit);
    }
    if (this.hasNode('glassCannon')) {
      this.baseMaxHp = 1;
      this.maxHp = 1;
      this.hp = 1;
    }
    this.shieldLeft = 0;
    this.magnetStormLeft = 0;
    this.pendingCrafts = 0;
    this.pendingAltarRewards = 0;
    this.lastAimX = 0;
    this.lastAimY = -1;
    this.velX = 0;
    this.velY = 0;
    this.isFocusing = false;
    this.skillCdLeft = 0;
    this.skillActiveLeft = 0;
    this.worldSlow = 1;
    this.coreAwakened = false;
    this.awakeningDue = false;
    this.skillCharges = 0;
    this.skillChargeMax = 0;
    this.skillRechargeLeft = 0;
    this.aegisAbsorbed = 0;
    this.pilotTrait = meta.selectedTrait ?? null;
    this.turretDarkActive = false;
    this.turretStill = 0;
    this.empLeft = 0;
    this.altar = null;
    this.envHazard = null;
    this.oneWayShield = null;
    this.quantumCores = [];
    this.nebulaZones = [];
    this.derelict = null;
    this.creditOrbs = [];
    this.runCreditBonus = 0;
    this.hunterBuffLeft = 0;
    this.wheelAcc = 0;
    this.wheelPending = false;
    this.bloodBursting = false;
    this.carpetQueue = [];
    this.derelictGoldDropped = false;
    this.nextShieldAt = TERRAIN.shield.firstAt;
    this.nextCoreAt = TERRAIN.core.firstAt;
    this.nextNebulaAt = TERRAIN.nebula.firstAt;
    this.nextCoreId = 100000;
    this.altarTickAcc = 0;
    this.nextHazardAt = HAZARDS.firstAt;
    this.needAltarHint = !meta.seenAltarHint;
    this.vacuumLeft = 0;
    this.seenThisRun = new Set(meta.seenWeapons ?? []);
    this.seenThisRun.add(ship.startingWeapon);
    this.nextRiftAt = RIFT_EVENT.firstAt;
    this.riftWarnAt = null;
    this.riftActive = 0;
    this.nextCommanderAt = this.hasNode('traitorLegion')
      ? CONSTELLATION_FX.legionInterval
      : LEGION.firstAt;
    this.commanderWarned = false;
    this.acquireOrder = [ship.startingWeapon];
    this.damageDealt = {};
    this.droneId = meta.selectedDrone ?? null;
    this.droneLevel = this.droneId ? Math.max(1, meta.droneLevels?.[this.droneId] ?? 1) : 0;
    this.droneTimer = 0;
    this.ampAura = null;
    this.pendingAfterimages = [];
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
    let armor = 0;
    let expAdd = 0;
    let dmgAdd = 0;
    let hpMul = 1;
    let cdMul = 1;
    if (this.empLeft <= 0) {
      for (const p of this.passives) {
        const def = PASSIVES[p.passiveId];
        const v = def.perLevel * p.level;
        switch (p.passiveId) {
          case 'plating': armor += v; break;
          case 'collector': expAdd += v; break;
          case 'overcharge': dmgAdd += v; break;
          case 'overload':
            hpMul *= def.hpMul ?? 1;
            cdMul *= def.cooldownMul ?? 1;
            break;
        }
      }
    }
    this.baseExpMul = 1 + expAdd;
    const storm = this.magnetStormLeft > 0;
    const hunter = this.hunterBuffLeft > 0;
    const magnetMul = (storm ? (TACTICAL.magnetStorm.magnetMul ?? 1) : 1)
      * (hunter ? CONSTELLATION_FX.hunterMagnetMul : 1);
    const stormExp = (storm ? (TACTICAL.magnetStorm.expMul ?? 1) : 1)
      * (hunter ? CONSTELLATION_FX.hunterExpMul : 1);
    this.magnetRadius = this.baseMagnet * magnetMul;
    this.moveSpeed = this.baseMoveSpeed * this.runStats.moveSpeedMul;
    this.armorReduce = Math.min(0.7, armor);
    this.expMul = this.baseExpMul * stormExp;
    this.damageMul = this.baseDamageMul * (1 + dmgAdd);
    if (this.hasNode('glassCannon')) this.damageMul *= CONSTELLATION_FX.glassDmgMul;
    if (this.hasNode('overloadGear')) {
      this.damageMul += Math.max(0, 1 - cdMul) * CONSTELLATION_FX.overloadDmgPerCdr;
      this.cooldownMul = 1;
    } else {
      this.cooldownMul = cdMul;
    }
    if (this.hasNode('disasterEye') && this.envHazard?.phase === 'active') {
      this.cooldownMul *= CONSTELLATION_FX.hazardCdMul;
    }
    if (this.hasNode('berserker')) {
      const spd = Math.hypot(this.velX, this.velY);
      this.damageMul *= Math.max(0.15, spd / CONSTELLATION_FX.berserkerSpdRef);
    }
    const newMax = this.hasNode('glassCannon')
      ? 1
      : Math.max(1, Math.round(this.baseMaxHp * hpMul));
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

  applyAffix(weaponId: WeaponId, affixId: AffixId, slotIndex?: number): void {
    const slot = this.slotById(weaponId, slotIndex);
    if (slot) slot.affix = affixId;
  }

  /** 어픽스 없는 랜덤 무기에 부여. 성공 여부 반환 */
  grantRandomAffix(): boolean {
    const candidates = this.weapons.filter((w) => !w.affix && compatibleAffixes(w.weaponId).length > 0);
    if (candidates.length === 0) return false;
    const slot = candidates[Math.floor(Math.random() * candidates.length)];
    const ids = compatibleAffixes(slot.weaponId);
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
    this.spawnPickup('cube', x, y);
  }

  private spawnPickup(kind: PickupKind, x: number, y: number, life: number = PICKUPS.lifetime): Pickup {
    const p: Pickup = {
      kind,
      x: Math.max(24, Math.min(CANVAS.width - 24, x)),
      y: Math.max(24, Math.min(CANVAS.height - 24, y)),
      life,
    };
    if (this.hasNode('greed')) {
      p.corruptIn = CONSTELLATION_FX.greedLife;
      p.life = CONSTELLATION_FX.greedLife + 12;
    }
    this.pickups.push(p);
    return p;
  }

  private spawnGem(x: number, y: number, exp: number): void {
    const g: Gem = { x, y, exp, life: GEM.lifetime };
    if (this.hasNode('greed')) {
      g.corruptIn = CONSTELLATION_FX.greedLife;
      g.life = CONSTELLATION_FX.greedLife + 12;
    }
    const n = this.bossGemMul();
    if (n > 1) g.exp *= n;
    this.gems.push(g);
  }

  private bossGemMul(): number {
    if (!this.hasNode('twinDread')) return 1;
    if (this.enemies.some((e) => this.isTrueBoss(e))) return CONSTELLATION_FX.twinGemMul;
    return 1;
  }

  growthExhausted(): boolean {
    if (this.weapons.length < this.maxWeaponSlots) return false;
    if (this.weapons.some((w) => w.level < LEVELING.maxWeaponLevel)) return false;
    if (this.passives.length < this.maxPassiveSlots) return false;
    return this.passives.every((p) => p.level >= PASSIVES[p.passiveId].maxLevel);
  }

  noteWeapon(id: WeaponId): void {
    this.seenThisRun.add(id);
    this.acquireOrder.push(id);
  }

  untrackAcquire(id: WeaponId): void {
    const i = this.acquireOrder.lastIndexOf(id);
    if (i >= 0) this.acquireOrder.splice(i, 1);
  }

  private slotById(weaponId: WeaponId, slotIndex?: number): WeaponSlot | undefined {
    if (slotIndex != null && slotIndex >= 0 && slotIndex < this.weapons.length) {
      const s = this.weapons[slotIndex];
      if (s.weaponId === weaponId) return s;
    }
    return this.weapons.find((w) => w.weaponId === weaponId);
  }

  private weaponLabel(slot: WeaponSlot): string {
    const name = WEAPONS[slot.weaponId].name;
    const dups = this.weapons.filter((w) => w.weaponId === slot.weaponId).length >= 2;
    if (!dups) return name;
    return `${name}(${this.weapons.indexOf(slot) + 1}슬롯)`;
  }

  /** 어픽스 리롤 (T3 + 기존 어픽스) */
  rerollAffix(weaponId: WeaponId, slotIndex?: number): boolean {
    const slot = this.slotById(weaponId, slotIndex);
    if (!slot || WEAPONS[weaponId].tier !== 3 || !slot.affix) return false;
    const ids = compatibleAffixes(weaponId).filter((id) => id !== slot.affix);
    if (ids.length === 0) return false;
    slot.affix = ids[Math.floor(Math.random() * ids.length)];
    this.events.push({ type: 'banner', text: `${AFFIXES[slot.affix].label} 리롤!` });
    return true;
  }

  /** 어픽스 부여 (T3 + 무어픽스) */
  grantAffix(weaponId: WeaponId, slotIndex?: number): boolean {
    const slot = this.slotById(weaponId, slotIndex);
    if (!slot || WEAPONS[weaponId].tier !== 3 || slot.affix) return false;
    const ids = compatibleAffixes(weaponId);
    if (ids.length === 0) return false;
    slot.affix = ids[Math.floor(Math.random() * ids.length)];
    this.events.push({ type: 'banner', text: `${AFFIXES[slot.affix].label} 부여!` });
    return true;
  }

  buffWeaponDamage(weaponId: WeaponId, slotIndex?: number): boolean {
    const slot = this.slotById(weaponId, slotIndex);
    if (!slot) return false;
    slot.damageBonus = (slot.damageBonus ?? 0) + ARSENAL.buffDamage;
    this.events.push({
      type: 'banner',
      text: `${this.weaponLabel(slot)} 데미지 +${Math.round(slot.damageBonus * 100)}%`,
    });
    return true;
  }

  buffWeaponSpeed(weaponId: WeaponId, slotIndex?: number): boolean {
    const slot = this.slotById(weaponId, slotIndex);
    if (!slot) return false;
    slot.speedBonus = (slot.speedBonus ?? 0) + ARSENAL.buffSpeed;
    this.events.push({
      type: 'banner',
      text: `${this.weaponLabel(slot)} 투속 +${Math.round(slot.speedBonus * 100)}%`,
    });
    return true;
  }

  buffWeaponCooldown(weaponId: WeaponId, slotIndex?: number): boolean {
    const slot = this.slotById(weaponId, slotIndex);
    if (!slot) return false;
    slot.cooldownBonus = Math.min(
      ARSENAL.cooldownBonusCap,
      (slot.cooldownBonus ?? 0) + ARSENAL.buffCooldown,
    );
    this.events.push({
      type: 'banner',
      text: `${this.weaponLabel(slot)} 쿨 -${Math.round(slot.cooldownBonus * 100)}%`,
    });
    return true;
  }

  buffWeaponRadius(weaponId: WeaponId, slotIndex?: number): boolean {
    const slot = this.slotById(weaponId, slotIndex);
    if (!slot) return false;
    slot.radiusBonus = (slot.radiusBonus ?? 0) + ARSENAL.buffRadius;
    this.events.push({
      type: 'banner',
      text: `${this.weaponLabel(slot)} 크기 +${Math.round(slot.radiusBonus * 100)}%`,
    });
    return true;
  }

  applyTactical(id: TacticalId): void {
    switch (id) {
      case 'emp': {
        this.enemyProjectiles.length = 0;
        for (const e of [...this.enemies]) {
          const isBoss = this.isBossLike(e);
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
    this.updateSlashes(dt);
    this.updateOrbiters(dt);
    this.updateMines(dt);
    this.updateZones(dt);
    this.updatePylons(dt);
    this.updateDrones(dt);
    this.updateAltar(dt);
    this.updateHazard(dt);
    this.updateConstellation(dt);
    this.updateTerrain(dt);
    this.updateSpawns(dt);
    this.updateBossSchedule();
    this.updateCommanderSchedule();
    this.updateRiftEvent(dt);
    this.updateWarnings(dt);
    const edt = dt * this.worldSlow;
    this.updateEnemies(edt);
    this.updateProjectiles(dt);
    this.updateBeams(dt);
    this.updateEnemyProjectiles(edt);
    this.updateGems(dt);
    this.updatePickups(dt);
    this.checkFenceCollision();
    this.checkPlayerCollision(dt);
    return this.status;
  }

  private updateBuffs(dt: number): void {
    if (this.shieldLeft > 0) this.shieldLeft -= dt;
    if (this.vacuumLeft > 0) this.vacuumLeft = Math.max(0, this.vacuumLeft - dt);
    if (this.magnetStormLeft > 0) {
      this.magnetStormLeft -= dt;
      if (this.magnetStormLeft <= 0) {
        this.magnetStormLeft = 0;
        this.applyPassiveEffects();
      }
    }
    if (this.hunterBuffLeft > 0) {
      this.hunterBuffLeft = Math.max(0, this.hunterBuffLeft - dt);
      if (this.hunterBuffLeft <= 0) this.applyPassiveEffects();
    }
    if (this.levelAegisLeft > 0) {
      this.levelAegisLeft = Math.max(0, this.levelAegisLeft - dt);
    }
    if (this.wardenStacks > 0) {
      this.legionHpMul += LEGION.hpPerSec * this.wardenStacks * dt;
    }
    if (this.heraldStacks > 0) {
      this.legionSpawnMul += LEGION.spawnPerSec * this.heraldStacks * dt;
    }
  }

  private updateConstellation(dt: number): void {
    if (this.hasNode('disasterEye') && this.envHazard?.phase === 'active') {
      this.skillCdLeft = 0;
      this.skillRechargeLeft = 0;
      if (this.skillChargeMax > 0) this.skillCharges = this.skillChargeMax;
    }
    if (this.hasNode('berserker') && Math.hypot(this.velX, this.velY) < 18) {
      this.hp -= this.maxHp * CONSTELLATION_FX.berserkerHpPct * dt;
      if (this.hp <= 0) {
        this.hp = 0;
        this.status = 'gameover';
        this.events.push({ type: 'gameover' });
      }
    }
    if (this.hasNode('berserker')) this.applyPassiveEffects();
    if (this.hasNode('fateWheel')) {
      this.wheelAcc += dt;
      if (this.wheelAcc >= CONSTELLATION_FX.wheelPeriod && !this.envHazard) {
        this.wheelAcc = 0;
        const kinds: Array<'solar' | 'asteroid' | 'emp'> = ['solar', 'asteroid', 'emp'];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        this.wheelPending = true;
        this.beginHazardWarn(kind);
      }
    }
  }

  tryUseSkill(): boolean {
    if (this.status !== 'playing') return false;
    const skill = SHIPS[this.shipId].activeSkill;
    const dashAwake = this.coreAwakened && skill.id === 'phaseDash';
    if (dashAwake) {
      if (this.skillCharges <= 0) return false;
    } else if (this.skillCdLeft > 0) {
      return false;
    }

    if (dashAwake) {
      this.skillCharges--;
      if (this.skillRechargeLeft <= 0) this.skillRechargeLeft = skill.cooldown;
    } else {
      this.skillCdLeft = skill.cooldown;
    }
    this.skillActiveLeft = skill.duration ?? 0;

    if (skill.id === 'phaseDash') {
      const dist = skill.dashDist ?? 110;
      const r = PLAYER.radius;
      const ox = this.playerX;
      const oy = this.playerY;
      this.playerX = Math.max(r, Math.min(CANVAS.width - r, this.playerX + this.lastAimX * dist));
      this.playerY = Math.max(r, Math.min(CANVAS.height - r, this.playerY + this.lastAimY * dist));
      this.invincibleLeft = Math.max(this.invincibleLeft, skill.iframeMs ?? 250);
      if (this.coreAwakened) this.dashTrailKill(ox, oy, this.playerX, this.playerY);
      this.events.push({ type: 'skill', id: skill.id, x: this.playerX, y: this.playerY });
      this.events.push({ type: 'banner', text: `${skill.icon} ${this.coreAwakened ? '초공간 붕괴' : skill.name}` });
    } else if (skill.id === 'aegis') {
      this.aegisAbsorbed = 0;
      this.events.push({ type: 'skill', id: skill.id, x: this.playerX, y: this.playerY });
      this.events.push({ type: 'banner', text: `${skill.icon} ${this.coreAwakened ? '반사 역장' : skill.name}` });
      this.aegisShockwave(skill);
    } else if (skill.id === 'timeDilation') {
      this.worldSlow = this.coreAwakened ? 0 : (skill.slowMul ?? 0.4);
      this.events.push({ type: 'skill', id: skill.id, x: this.playerX, y: this.playerY });
      this.events.push({ type: 'banner', text: `${skill.icon} ${this.coreAwakened ? '정지장' : skill.name}` });
    } else if (skill.id === 'carpetBombing') {
      this.armCarpetBombing(skill);
      this.events.push({ type: 'skill', id: skill.id, x: this.playerX, y: this.playerY });
      this.events.push({ type: 'banner', text: `${skill.icon} ${this.coreAwakened ? '포화 융단' : skill.name}` });
    }
    return true;
  }

  private updateSkills(dt: number): void {
    if (this.skillCdLeft > 0) this.skillCdLeft = Math.max(0, this.skillCdLeft - dt);
    const skill = SHIPS[this.shipId].activeSkill;
    if (this.coreAwakened && skill.id === 'phaseDash') {
      if (this.skillCharges < this.skillChargeMax && this.skillRechargeLeft > 0) {
        this.skillRechargeLeft = Math.max(0, this.skillRechargeLeft - dt);
        if (this.skillRechargeLeft <= 0) {
          this.skillCharges++;
          this.skillRechargeLeft = this.skillCharges < this.skillChargeMax ? skill.cooldown : 0;
        }
      }
    }
    if (this.skillActiveLeft > 0) {
      const prev = this.skillActiveLeft;
      this.skillActiveLeft = Math.max(0, this.skillActiveLeft - dt);
      if (prev > 0 && this.skillActiveLeft <= 0) {
        this.worldSlow = 1;
        if (skill.id === 'aegis') {
          this.aegisShockwave(skill);
          if (this.coreAwakened && this.aegisAbsorbed > 0) this.aegisNova();
        }
      }
    }
    if (skill.id === 'aegis' && this.skillActiveLeft > 0) this.tickAegis();
    this.tickCarpetBombing(dt);
  }

  private armCarpetBombing(skill: typeof SHIPS[ShipId]['activeSkill']): void {
    const n = Math.max(1, Math.round((skill.bombCount ?? 12) * (this.coreAwakened ? AWAKEN.carpetBombMul : 1)));
    const radius = (skill.explodeRadius ?? 100) * (this.coreAwakened ? AWAKEN.carpetRadiusMul : 1);
    const damage = PICKUPS.bombDamage * (this.coreAwakened ? AWAKEN.carpetDmgMul : 1);
    const dur = skill.duration ?? 1.5;
    this.carpetQueue = [];
    for (let i = 0; i < n; i++) {
      const near = i % 2 === 0;
      let x: number;
      let y: number;
      if (near) {
        const a = Math.random() * Math.PI * 2;
        const d = 36 + Math.random() * 110;
        x = this.playerX + Math.cos(a) * d;
        y = this.playerY + Math.sin(a) * d;
      } else {
        x = 40 + Math.random() * (CANVAS.width - 80);
        y = 50 + Math.random() * (CANVAS.height - 100);
      }
      this.carpetQueue.push({
        x: Math.max(24, Math.min(CANVAS.width - 24, x)),
        y: Math.max(24, Math.min(CANVAS.height - 24, y)),
        left: (i / n) * dur,
        radius,
        damage,
      });
    }
  }

  private tickCarpetBombing(dt: number): void {
    if (this.carpetQueue.length === 0) return;
    for (let i = this.carpetQueue.length - 1; i >= 0; i--) {
      const b = this.carpetQueue[i];
      b.left -= dt;
      if (b.left > 0) continue;
      this.detonateCarpet(b.x, b.y, b.radius, b.damage);
      this.carpetQueue.splice(i, 1);
    }
  }

  private detonateCarpet(x: number, y: number, radius: number, damage: number): void {
    const r2 = radius * radius;
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = this.enemyProjectiles[i];
      if ((p.x - x) ** 2 + (p.y - y) ** 2 <= r2) this.enemyProjectiles.splice(i, 1);
    }
    for (const e of [...this.enemies]) {
      const hitR = e.def.radius * (e.elite ? 1.15 : 1) + radius;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 > hitR * hitR) continue;
      if (this.tryAbsorbShield(e, true)) continue;
      this.damageEnemy(e, damage);
    }
    this.events.push({ type: 'blast', x, y, color: '#f97316', radius: radius * 0.55 });
  }

  /** 지속 중에는 탄막만 소거. 데미지는 전개/종료 충격파만. */
  private tickAegis(): void {
    const radius = SHIPS[this.shipId].activeSkill.radius ?? 72;
    const r2 = radius * radius;
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = this.enemyProjectiles[i];
      if ((p.x - this.playerX) ** 2 + (p.y - this.playerY) ** 2 <= r2) {
        this.enemyProjectiles.splice(i, 1);
        if (this.coreAwakened) this.aegisAbsorbed++;
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

  private dashTrailKill(x1: number, y1: number, x2: number, y2: number): void {
    for (const e of [...this.enemies]) {
      const hitR = e.def.radius * (e.elite ? 1.15 : 1) + PLAYER.radius;
      if (distToSegment(e.x, e.y, x1, y1, x2, y2) > hitR) continue;
      if (this.isBossLike(e)) {
        this.damageEnemy(e, e.maxHp * AWAKEN.dashBossHpPct);
      } else {
        this.damageEnemy(e, e.hp + 1);
      }
    }
  }

  private aegisNova(): void {
    const dmg = AWAKEN.aegisPerShot * this.aegisAbsorbed;
    this.aegisAbsorbed = 0;
    for (const e of [...this.enemies]) {
      if (this.tryAbsorbShield(e, true)) continue;
      this.damageEnemy(e, dmg);
    }
    this.events.push({ type: 'solarFlare' });
    this.events.push({ type: 'banner', text: '💥 반사 역장 방출' });
  }

  activateAwakening(): void {
    this.coreAwakened = true;
    this.awakeningDue = false;
    const skill = SHIPS[this.shipId].activeSkill;
    if (skill.id === 'phaseDash') {
      this.skillChargeMax = AWAKEN.dashCharges;
      this.skillCharges = AWAKEN.dashCharges;
      this.skillRechargeLeft = 0;
      this.skillCdLeft = 0;
    }
    this.events.push({ type: 'banner', text: '✨ 코어 각성' });
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
      this.lastAimX = dirX;
      this.lastAimY = dirY;
    }
    if (this.isFocusing) analog *= PLAYER.focusSpeedMul;

    if (this.pilotTrait === 'turretDark') {
      if (analog < 0.05) {
        this.turretStill += dt;
        if (this.turretStill >= PILOT_FX.turretStillSec) this.turretDarkActive = true;
      } else {
        this.turretStill = 0;
        this.turretDarkActive = false;
      }
    }

    const skill = SHIPS[this.shipId].activeSkill;
    const locked = this.skillActiveLeft > 0 && skill.id === 'aegis';
    if (!locked) {
      const targetVx = dirX * this.moveSpeed * analog;
      const targetVy = dirY * this.moveSpeed * analog;
      const rate = analog > 0.001 ? PLAYER.accel : PLAYER.friction;
      const k = 1 - Math.exp(-rate * dt);
      this.velX += (targetVx - this.velX) * k;
      this.velY += (targetVy - this.velY) * k;
      const neb = this.nebulaMulAt(this.playerX, this.playerY);
      this.playerX += this.velX * dt * neb;
      this.playerY += this.velY * dt * neb;
      const r = PLAYER.radius;
      this.playerX = Math.max(r, Math.min(CANVAS.width - r, this.playerX));
      this.playerY = Math.max(r, Math.min(CANVAS.height - r, this.playerY));
      this.applyVortexPull(dt);
      this.playerX = Math.max(r, Math.min(CANVAS.width - r, this.playerX));
      this.playerY = Math.max(r, Math.min(CANVAS.height - r, this.playerY));
    } else {
      this.velX = 0;
      this.velY = 0;
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
        const stasis = this.coreAwakened
          && SHIPS[this.shipId].activeSkill.id === 'timeDilation'
          && this.skillActiveLeft > 0
          ? AWAKEN.stasisCooldownMul : 1;
        const cdScale = (1 - Math.min(0.45, (slot.level - 1) * LEVELING.cooldownPerLevel)) * this.cooldownMul
          * (this.inAmplifierAura() ? ampCooldownMul(this.droneLevel) : 1)
          * stasis;
        const craftCd = Math.min(ARSENAL.cooldownBonusCap, slot.cooldownBonus ?? 0);
        const raw = def.cooldownMs * cdScale * (1 - craftCd);
        slot.cooldownLeft += Math.max(def.cooldownMs * ARSENAL.cooldownFloor, raw);
      }
    }
  }

  private fireWeapon(slot: WeaponSlot): void {
    const def = WEAPONS[slot.weaponId];
    const p = def.projectile;
    const puristLow = this.hasNode('purist') && def.tier <= 2;
    let damage = p.damage
      * (1 + (slot.level - 1) * LEVELING.damagePerLevel)
      * this.damageMul
      * (1 + (slot.damageBonus ?? 0))
      * (this.turretDarkActive ? PILOT_FX.turretDmgMul : 1);
    let speedMul = this.runStats.projSpeedMul * (1 + (slot.speedBonus ?? 0));
    if (this.hasNode('spacetime')) {
      speedMul = Math.max(CONSTELLATION_FX.speedFloor, 1 / Math.max(speedMul, CONSTELLATION_FX.speedFloor));
      damage *= 1 / speedMul;
    }
    if (this.hasNode('pacifist') && !p.drop) damage = 0;
    if (this.hasNode('pacifist') && p.drop) damage *= CONSTELLATION_FX.pacifistEnvMul;
    let speed = p.speed * speedMul;
    if (p.homingTurnRate > 0) {
      damage *= HOMING.damageMul;
      if (!this.hasNode('endlessAbyss') && !this.hasNode('spacetime')) {
        speed = Math.min(speed, HOMING.maxSpeed);
      }
    }
    let pierce = p.pierce;
    if (slot.affix === 'pierce') pierce += AFFIX_SYNERGY.pierce.affixBonus;
    const color = this.projSkinColors[slot.weaponId] ?? def.color;
    let baseAngle = -Math.PI / 2; // 위쪽
    if (p.melee) {
      baseAngle = Math.atan2(this.lastAimY, this.lastAimX);
    } else if (p.targeted) {
      const target = this.pickTargetedEnemy(p.targeted);
      if (target) baseAngle = Math.atan2(target.y - this.playerY, target.x - this.playerX);
    }
    let sizeMul = 1 + (slot.radiusBonus ?? 0);
    if (puristLow) sizeMul *= CONSTELLATION_FX.puristRadiusMul;
    const shotCount = p.count + (puristLow ? CONSTELLATION_FX.puristExtraCount : 0);

    if (p.melee) {
      const arcDeg = Math.min(360, p.melee.arcDeg * sizeMul);
      const range = p.melee.range * sizeMul;
      this.slashes.push({
        x: this.playerX,
        y: this.playerY,
        angle: baseAngle,
        arcDeg,
        range,
        life: p.melee.duration,
        maxLife: p.melee.duration,
        damage,
        color,
        weaponId: slot.weaponId,
        deflect: p.melee.deflect,
        hitIds: new Set(),
        leaveZone: p.drop?.zoneDuration
          ? { duration: p.drop.zoneDuration, tick: p.drop.zoneTick ?? 0.12, radius: 18 * sizeMul }
          : undefined,
      });
      this.events.push({
        type: 'fired',
        x: this.playerX, y: this.playerY - PLAYER.radius,
        color, weaponId: slot.weaponId, angle: baseAngle, arcDeg, range,
      });
      return;
    }

    if (p.orbit) {
      const spawned = this.syncOrbiters(slot, damage, color, sizeMul);
      if (spawned) {
        this.events.push({
          type: 'fired',
          x: this.playerX, y: this.playerY,
          color, weaponId: slot.weaponId,
          orbitRadius: p.orbit.radius * sizeMul,
        });
      }
      return;
    }

    if (p.drop) {
      const thrown = slot.weaponId === 'singularity' && p.speed > 0;
      const spawnX = thrown
        ? this.playerX + this.lastAimX * (PLAYER.radius + 10)
        : this.playerX - this.lastAimX * (PLAYER.radius + 18);
      const spawnY = thrown
        ? this.playerY + this.lastAimY * (PLAYER.radius + 10)
        : this.playerY - this.lastAimY * (PLAYER.radius + 18);
      this.mines.push({
        x: spawnX,
        y: spawnY,
        radius: p.radius * sizeMul,
        fuse: p.drop.fuse,
        damage,
        explodeRadius: (p.explodeRadius ?? 60) * sizeMul,
        color,
        weaponId: slot.weaponId,
        seekSpeed: p.drop.seekSpeed ?? 0,
        pullRadius: p.drop.pullRadius ?? 0,
        pullForce: p.drop.pullForce ?? 0,
        split: p.drop.split ?? 0,
        zoneDuration: p.drop.zoneDuration ?? 0,
        zoneTick: p.drop.zoneTick ?? 0.15,
        vx: thrown ? this.lastAimX * p.speed : 0,
        vy: thrown ? this.lastAimY * p.speed : 0,
      });
      this.events.push({
        type: 'fired',
        x: spawnX, y: spawnY,
        color, weaponId: slot.weaponId,
      });
      return;
    }

    if (p.beam) {
      this.beams.push({
        x: this.playerX,
        y: this.playerY - PLAYER.radius,
        angle: baseAngle,
        width: p.beam.width * sizeMul,
        length: p.beam.length,
        damage,
        life: p.beam.duration,
        tickLeft: 0,
        tickInterval: p.beam.tickInterval,
        color,
        ignoreShield: !!p.ignoreShield,
        affix: slot.affix,
        weaponId: slot.weaponId,
      });
      this.events.push({
        type: 'fired',
        x: this.playerX, y: this.playerY - PLAYER.radius,
        color, weaponId: slot.weaponId,
      });
      return;
    }

    const originX = this.playerX;
    const originY = this.playerY - PLAYER.radius;
    for (let i = 0; i < shotCount; i++) {
      let angle: number;
      if (p.randomSpread) {
        angle = Math.random() * Math.PI * 2;
      } else if (shotCount === 1 || p.spreadDeg === 0) {
        angle = baseAngle;
      } else if (p.spreadDeg >= 360) {
        angle = (Math.PI * 2 * i) / shotCount + (p.spiral ? 0 : this.time);
      } else {
        const arc = (p.spreadDeg * Math.PI) / 180;
        angle = baseAngle - arc / 2 + (arc * i) / Math.max(1, shotCount - 1);
      }
      const proj: Projectile = {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed,
        baseSpeed: p.speed,
        damage,
        radius: p.radius * sizeMul,
        homingTurnRate: p.homingTurnRate,
        pierceLeft: pierce,
        life: p.lifetime,
        color,
        hitIds: new Set(),
        affix: slot.affix,
        pierceHits: 0,
        explodeRadius: p.explodeRadius ? p.explodeRadius * sizeMul : undefined,
        shieldPierce: p.pierce > 0 || p.spreadDeg >= 180 || p.homingTurnRate >= 4 || (p.explodeRadius ?? 0) > 0,
        ignoreShield: p.ignoreShield,
        weaponId: slot.weaponId,
      };
      if (p.spiral) {
        proj.orbitAngle = angle;
        proj.orbitRadius = PLAYER.radius + 8;
        proj.orbitOmega = 2.8;
        proj.originX = originX;
        proj.originY = originY;
        proj.x = originX + Math.cos(angle) * proj.orbitRadius;
        proj.y = originY + Math.sin(angle) * proj.orbitRadius;
      }
      this.projectiles.push(proj);
    }
    this.events.push({
      type: 'fired',
      x: this.playerX, y: this.playerY - PLAYER.radius,
      color, weaponId: slot.weaponId,
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
        const interval = entry.interval * scale / (1 + this.legionSpawnMul)
          / (this.hasNode('bloodFeast') ? CONSTELLATION_FX.bloodSpawnMul : 1);
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
      if (this.hasNode('twinDread')) {
        const twin = this.addEnemy(bossType, CANVAS.width / 2 + 70, -90, 1, false);
        twin.hp = twin.maxHp = boss.maxHp;
        twin.phase = 1;
      }
      this.bossIndex++;
      this.bossWarned = false;
      this.events.push({ type: 'bossSpawned', x: boss.x, y: boss.y });
      this.events.push({ type: 'banner', text: `⚠ ${ENEMIES[bossType].name}` });
    }
  }

  private updateCommanderSchedule(): void {
    if (this.stageId !== 'legion' && !this.hasNode('traitorLegion')) return;
    if (this.time < this.nextCommanderAt - BOSS.warningLead) return;

    if (!this.commanderWarned && this.time < this.nextCommanderAt) {
      this.commanderWarned = true;
      this.events.push({ type: 'bossWarn' });
      this.events.push({ type: 'banner', text: '⚠ 군단장 접근 중' });
    }
    if (this.time < this.nextCommanderAt) return;

    const pool = LEGION.commanders;
    const id = pool[Math.floor(Math.random() * pool.length)];
    const e = this.addEnemy(id, CANVAS.width / 2, -60, 1, false);
    e.introLeft = BOSS.introDuration;
    e.swimAge = 0;
    if (id === 'warden') this.wardenStacks++;
    if (id === 'herald') this.heraldStacks++;
    if (id === 'architect') {
      e.shieldHits = LEGION.techShieldBase + Math.floor(this.time * LEGION.techShieldPerSec);
    }
    this.nextCommanderAt += this.hasNode('traitorLegion')
      ? CONSTELLATION_FX.legionInterval
      : LEGION.interval;
    this.commanderWarned = false;
    this.events.push({ type: 'bossSpawned', x: e.x, y: e.y });
    this.events.push({ type: 'banner', text: `⚠ ${ENEMIES[id].name}` });
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
    this.nextRiftAt = this.time + RIFT_EVENT.cooldown
      * (this.hasNode('voidPredator') ? CONSTELLATION_FX.riftCooldownMul : 1);
    this.events.push({ type: 'riftWarn' });
    this.events.push({ type: 'banner', text: '⚠ RIFT INCOMING' });
  }

  private spawnRiftElites(): void {
    const pool = RIFT_EVENT.elitePool;
    const n = RIFT_EVENT.eliteCount * (this.hasNode('voidPredator') ? CONSTELLATION_FX.riftEliteMul : 1);
    for (let i = 0; i < n; i++) {
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

  private updateAltar(dt: number): void {
    if (!this.altar) {
      if (this.time < VOID_ALTAR.firstAt) return;
      if (this.nearBossWindow()) return;
      const x = 80 + Math.random() * (CANVAS.width - 160);
      const y = 280 + Math.random() * 180;
      this.altar = { x, y, charge: 0, trialLeft: 0, done: false };
      if (this.needAltarHint) {
        this.needAltarHint = false;
        this.events.push({
          type: 'banner',
          text: '[안내] 제단 근처에 3초간 머물러 공허의 시련에 도전하세요.',
        });
        this.events.push({ type: 'altarHint' });
      }
      return;
    }
    if (this.altar.done || this.altar.trialLeft > 0) return;
    const dist = Math.hypot(this.playerX - this.altar.x, this.playerY - this.altar.y);
    if (dist <= VOID_ALTAR.radius) {
      const chargeSec = this.hasNode('altarFrenzy') ? CONSTELLATION_FX.altarChargeSec : VOID_ALTAR.chargeSec;
      this.altar.charge = Math.min(1, this.altar.charge + dt / chargeSec);
      this.altarTickAcc += dt;
      if (this.altarTickAcc >= 0.18) {
        this.altarTickAcc = 0;
        this.events.push({ type: 'altarTick', pitch: this.altar.charge });
      }
      if (this.altar.charge >= 1) this.activateAltar();
    } else {
      this.altar.charge = 0;
      this.altarTickAcc = 0;
    }
  }

  private activateAltar(): void {
    const altar = this.altar;
    if (!altar) return;
    altar.charge = 1;
    const pool = VOID_ALTAR.elitePool;
    let spawned = 0;
    for (let i = 0; i < VOID_ALTAR.eliteCount; i++) {
      const ang = (Math.PI * 2 * i) / VOID_ALTAR.eliteCount;
      const x = Math.max(30, Math.min(CANVAS.width - 30, this.playerX + Math.cos(ang) * VOID_ALTAR.ringRadius));
      const y = Math.max(40, Math.min(CANVAS.height - 40, this.playerY + Math.sin(ang) * VOID_ALTAR.ringRadius));
      const enemyId = pool[i % pool.length];
      const e = this.addEnemy(enemyId, x, y, 1, false, true);
      e.fromAltar = true;
      spawned++;
    }
    altar.trialLeft = spawned;
    this.events.push({ type: 'altarActivate', x: altar.x, y: altar.y });
    this.events.push({ type: 'banner', text: '🩸 공허의 시련' });
  }

  private onAltarEliteKilled(): void {
    if (!this.altar) return;
    this.altar.trialLeft = Math.max(0, this.altar.trialLeft - 1);
    if (this.altar.trialLeft > 0) return;
    if (this.hasNode('altarFrenzy')) {
      this.altar.done = false;
      this.altar.charge = 0;
    } else {
      this.altar.done = true;
    }
    this.spawnPickup('goldCube', this.altar.x, this.altar.y, PICKUPS.lifetime * 2);
    this.events.push({ type: 'banner', text: '✨ 공허의 보상' });
  }

  private updateHazard(dt: number): void {
    if (this.envHazard) {
      this.envHazard.left -= dt;
      if (this.envHazard.kind === 'solar' && this.envHazard.phase === 'active') {
        this.envHazard.burnAcc += dt;
        if (this.envHazard.burnAcc >= 0.2) {
          const ticks = this.envHazard.burnAcc;
          this.envHazard.burnAcc = 0;
          this.tickSolarBurn(ticks);
        }
      }
      if (this.envHazard.left > 0) return;
      if (this.envHazard.phase === 'warn') {
        this.triggerHazard();
        return;
      }
      if (this.envHazard.kind === 'emp') {
        this.empLeft = 0;
        this.applyPassiveEffects();
      }
      if (this.envHazard.kind === 'solar') this.beginDerelictBreak();
      if (this.wheelPending) {
        this.wheelPending = false;
        this.runCreditBonus += CONSTELLATION_FX.wheelCredits * this.nodeLv('fateWheel');
        this.runCoreBonus += CONSTELLATION_FX.wheelCores * this.nodeLv('fateWheel');
        this.events.push({ type: 'banner', text: '🎡 운명의 수레바퀴: 생존 보상' });
      }
      this.envHazard = null;
      if (this.hasNode('disasterEye')) this.applyPassiveEffects();
      return;
    }

    if (this.empLeft > 0) {
      this.empLeft = Math.max(0, this.empLeft - dt);
      if (this.empLeft <= 0) this.applyPassiveEffects();
    }

    if (this.time < this.nextHazardAt) return;
    if (this.nearBossWindow()) {
      this.nextHazardAt = this.time + 8;
      return;
    }
    this.beginHazardWarn();
  }

  private beginHazardWarn(forced?: 'solar' | 'asteroid' | 'emp'): void {
    const kind = forced ?? (this.stageId === 'orbit' ? 'solar' as const
      : this.stageId === 'rift' ? 'asteroid' as const
      : 'emp' as const);
    const warn = kind === 'solar' ? HAZARDS.solar.warnSec
      : kind === 'asteroid' ? HAZARDS.asteroid.warnSec
      : 0;
    if (kind === 'solar') this.spawnDerelict();
    this.envHazard = {
      kind,
      phase: warn > 0 ? 'warn' : 'active',
      left: warn > 0 ? warn : HAZARDS.emp.duration,
      shades: kind === 'solar' ? this.derelictShade() : [],
      beams: kind === 'asteroid' ? this.rollBeams() : [],
      burnAcc: 0,
    };
    this.nextHazardAt = this.time + HAZARDS.cooldown;
    this.events.push({ type: 'hazardWarn', kind });
    const label = kind === 'solar' ? '☀ 태양풍 접근'
      : kind === 'asteroid' ? '☄ 소행성 낙하'
      : '⚡ EMP 스톰';
    this.events.push({ type: 'banner', text: label });
    if (kind === 'emp') this.triggerHazard();
  }

  private derelictShade(): EnvShade[] {
    if (!this.derelict) return [];
    const d = this.derelict;
    const w = d.w * TERRAIN.derelict.shadeWMul;
    return [{
      x: d.x - w / 2,
      y: d.y + d.h / 2,
      w,
      h: TERRAIN.derelict.shadeH,
    }];
  }

  private spawnDerelict(): void {
    const w = TERRAIN.derelict.w;
    const h = TERRAIN.derelict.h;
    this.derelict = {
      x: 80 + Math.random() * (CANVAS.width - 160),
      y: TERRAIN.derelict.y,
      w,
      h,
      breaking: false,
      breakLeft: 0,
      glow: 0,
    };
    if (this.envHazard) this.envHazard.shades = this.derelictShade();
  }

  private beginDerelictBreak(): void {
    if (!this.derelict || this.derelict.breaking) return;
    this.derelict.breaking = true;
    this.derelict.breakLeft = TERRAIN.derelict.glowSec;
    this.derelict.glow = 0;
    this.events.push({ type: 'banner', text: '🛸 잔해 과열' });
  }

  private finishDerelictBreak(): void {
    const d = this.derelict;
    if (!d) return;
    this.events.push({ type: 'derelictBreak', x: d.x, y: d.y, w: d.w, h: d.h });
    if (!this.derelictGoldDropped) {
      this.derelictGoldDropped = true;
      this.spawnPickup('goldCube', d.x, d.y, PICKUPS.lifetime * 2);
    } else {
      this.spawnPickup('heal', d.x, d.y - 10);
    }
    const n = TERRAIN.derelict.creditOrbs;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
      const spd = 90 + Math.random() * 140;
      this.creditOrbs.push({
        x: d.x,
        y: d.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        value: TERRAIN.derelict.creditEach,
        life: 8,
      });
    }
    this.derelict = null;
  }

  private rollBeams(): number[] {
    const n = HAZARDS.asteroid.beamMin
      + Math.floor(Math.random() * (HAZARDS.asteroid.beamMax - HAZARDS.asteroid.beamMin + 1));
    const xs: number[] = [];
    let tries = 0;
    while (xs.length < n && tries < 50) {
      tries++;
      const x = 50 + Math.random() * (CANVAS.width - 100);
      if (xs.every((o) => Math.abs(o - x) > HAZARDS.asteroid.beamW + 10)) xs.push(x);
    }
    return xs;
  }

  private inSolarShade(px: number, py: number): boolean {
    if (!this.envHazard) return false;
    return this.envHazard.shades.some((s) => px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h);
  }

  private triggerHazard(): void {
    if (!this.envHazard) return;
    const h = this.envHazard;
    h.phase = 'active';
    if (h.kind === 'solar') {
      h.left = HAZARDS.solar.burnSec * (this.hasNode('disasterEye') ? CONSTELLATION_FX.hazardDurMul : 1);
      h.burnAcc = 0;
      this.events.push({ type: 'solarFlare' });
    } else if (h.kind === 'asteroid') {
      h.left = 0.35;
      this.strikeAsteroids();
      this.events.push({ type: 'asteroid' });
    } else {
      h.left = HAZARDS.emp.duration * (this.hasNode('disasterEye') ? CONSTELLATION_FX.hazardDurMul : 1);
      this.empLeft = h.left;
      this.ampAura = null;
      this.applyPassiveEffects();
      this.events.push({ type: 'empStart' });
    }
    if (this.hasNode('disasterEye')) this.applyPassiveEffects();
  }

  private tickSolarBurn(dt: number): void {
    const pct = HAZARDS.solar.hpPctPerSec * dt;
    if (!this.inSolarShade(this.playerX, this.playerY)) {
      this.hurtPlayer(this.maxHp * pct);
    }
    for (const e of [...this.enemies]) {
      if (this.inSolarShade(e.x, e.y)) continue;
      this.damageEnemy(e, e.maxHp * pct * (this.hasNode('pacifist') ? CONSTELLATION_FX.pacifistEnvMul : 1));
    }
  }

  private strikeAsteroids(): void {
    if (!this.envHazard) return;
    const half = HAZARDS.asteroid.beamW / 2;
    const pxHit = this.envHazard.beams.some((x) => Math.abs(this.playerX - x) <= half + this.playerHitRadius());
    if (pxHit) this.hurtPlayer(this.maxHp * 20);
    for (const e of [...this.enemies]) {
      const hit = this.envHazard.beams.some((x) => Math.abs(e.x - x) <= half + e.def.radius);
      if (!hit) continue;
      if (this.isTrueBoss(e) || this.isBossLike(e)) {
        this.damageEnemy(e, e.maxHp * HAZARDS.asteroid.bossHpPct
          * (this.hasNode('pacifist') ? CONSTELLATION_FX.pacifistEnvMul : 1));
      } else {
        this.damageEnemy(e, e.hp + 1);
      }
    }
  }

  // ---------- 지형 기믹 ----------

  inNebula(x: number, y: number): boolean {
    return this.nebulaMulAt(x, y) < 0.999;
  }

  private nebulaMulAt(x: number, y: number): number {
    for (const z of this.nebulaZones) {
      if ((x - z.x) ** 2 + (y - z.y) ** 2 <= z.r * z.r) return TERRAIN.nebula.slowMul;
    }
    return 1;
  }

  private inShieldAabb(x: number, y: number, pad = 0): boolean {
    const s = this.oneWayShield;
    if (!s) return false;
    return x >= s.x - pad && x <= s.x + s.w + pad && y >= s.y - pad && y <= s.y + s.h + pad;
  }

  private updateTerrain(dt: number): void {
    this.updateShieldTerrain(dt);
    this.updateCoreTerrain(dt);
    this.updateNebulaTerrain(dt);
    this.updateDerelictTerrain(dt);
    this.updateCreditOrbs(dt);
  }

  private updateShieldTerrain(dt: number): void {
    if (this.oneWayShield) {
      this.oneWayShield.life -= dt;
      if (this.oneWayShield.life <= 0) this.oneWayShield = null;
    }
    if (this.oneWayShield || this.time < this.nextShieldAt) return;
    const cfg = TERRAIN.shield;
    const left = Math.random() < 0.5;
    this.oneWayShield = {
      x: left ? cfg.sidePad : CANVAS.width - cfg.sidePad - cfg.w,
      y: cfg.yMin + Math.random() * (cfg.yMax - cfg.yMin),
      w: cfg.w,
      h: cfg.h,
      life: cfg.life,
    };
    this.nextShieldAt = this.time + cfg.cooldown;
  }

  private updateCoreTerrain(dt: number): void {
    for (const c of this.quantumCores) {
      if (c.hitFlash > 0) c.hitFlash = Math.max(0, c.hitFlash - dt);
    }
    if (this.quantumCores.length > 0 || this.time < this.nextCoreAt) return;
    const cfg = TERRAIN.core;
    const hp = Math.round(cfg.hp * enemyHpScale(this.time));
    this.quantumCores.push({
      id: this.nextCoreId++,
      x: 70 + Math.random() * (CANVAS.width - 140),
      y: 160 + Math.random() * 280,
      hp,
      maxHp: hp,
      radius: cfg.radius,
      hitFlash: 0,
    });
    this.nextCoreAt = this.time + cfg.cooldown;
  }

  private updateNebulaTerrain(dt: number): void {
    for (let i = this.nebulaZones.length - 1; i >= 0; i--) {
      const z = this.nebulaZones[i];
      z.life -= dt;
      z.x += z.vx * dt;
      z.y += z.vy * dt;
      const pad = z.r * 0.4;
      if (z.x < pad || z.x > CANVAS.width - pad) z.vx *= -1;
      if (z.y < 80 + pad || z.y > CANVAS.height - 100 - pad) z.vy *= -1;
      z.x = Math.max(pad, Math.min(CANVAS.width - pad, z.x));
      z.y = Math.max(80 + pad, Math.min(CANVAS.height - 100 - pad, z.y));
      if (z.life <= 0) this.nebulaZones.splice(i, 1);
    }
    if (this.nebulaZones.length > 0 || this.time < this.nextNebulaAt) return;
    const cfg = TERRAIN.nebula;
    const ang = Math.random() * Math.PI * 2;
    this.nebulaZones.push({
      x: 90 + Math.random() * (CANVAS.width - 180),
      y: 180 + Math.random() * 320,
      r: cfg.radius,
      life: cfg.life,
      vx: Math.cos(ang) * cfg.drift,
      vy: Math.sin(ang) * cfg.drift,
    });
    this.nextNebulaAt = this.time + cfg.cooldown;
  }

  private updateDerelictTerrain(dt: number): void {
    const d = this.derelict;
    if (!d) return;
    if (this.envHazard?.kind === 'solar') {
      this.envHazard.shades = this.derelictShade();
    }
    if (!d.breaking) return;
    d.breakLeft -= dt;
    const max = TERRAIN.derelict.glowSec;
    d.glow = 1 - Math.max(0, d.breakLeft) / max;
    if (d.breakLeft <= 0) this.finishDerelictBreak();
  }

  private updateCreditOrbs(dt: number): void {
    for (let i = this.creditOrbs.length - 1; i >= 0; i--) {
      const o = this.creditOrbs[i];
      o.life -= dt;
      if (o.life <= 0) {
        this.creditOrbs.splice(i, 1);
        continue;
      }
      o.vy += 40 * dt;
      const dx = this.playerX - o.x;
      const dy = this.playerY - o.y;
      const dist = Math.hypot(dx, dy);
      if (this.vacuumLeft > 0 || dist < this.magnetRadius + 20) {
        const step = GEM.magnetSpeed * dt;
        o.x += (dx / Math.max(dist, 1)) * step;
        o.y += (dy / Math.max(dist, 1)) * step;
      } else {
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.vx *= 0.96;
        o.vy *= 0.96;
      }
      if (dist < PLAYER.radius + 10) {
        this.runCreditBonus += o.value;
        this.events.push({ type: 'creditPickup', x: o.x, y: o.y });
        this.creditOrbs.splice(i, 1);
      }
    }
  }

  private tryBoostProjectile(p: Projectile): void {
    if (p.boosted || !this.inShieldAabb(p.x, p.y, p.radius)) return;
    p.boosted = true;
    p.radius *= TERRAIN.shield.boostRadius;
    this.events.push({ type: 'terrainBoost', x: p.x, y: p.y });
  }

  private tryBlockEnemyBullet(p: EnemyProjectile): boolean {
    if (!this.inShieldAabb(p.x, p.y, p.radius)) return false;
    this.events.push({ type: 'terrainShieldBlock', x: p.x, y: p.y });
    return true;
  }

  private damageCore(c: QuantumCore, dmg: number): void {
    c.hp -= dmg;
    c.hitFlash = 0.1;
    this.events.push({ type: 'enemyHit', x: c.x, y: c.y, color: '#f97316', damage: Math.round(dmg) });
    if (c.hp > 0) return;
    this.burstCore(c);
  }

  private burstCore(c: QuantumCore): void {
    const r = TERRAIN.core.explodeRadius;
    const dmg = TERRAIN.core.damage;
    this.events.push({ type: 'coreBurst', x: c.x, y: c.y, radius: r });
    for (const e of [...this.enemies]) {
      if ((e.x - c.x) ** 2 + (e.y - c.y) ** 2 > (r + e.def.radius) ** 2) continue;
      if (this.tryAbsorbShield(e, true)) continue;
      this.damageEnemy(e, dmg);
    }
    this.quantumCores = this.quantumCores.filter((q) => q.id !== c.id);
  }

  private hitCoresCircle(x: number, y: number, radius: number, dmg: number, hitIds?: Set<number>): void {
    for (const c of [...this.quantumCores]) {
      if (hitIds?.has(c.id)) continue;
      if ((c.x - x) ** 2 + (c.y - y) ** 2 > (c.radius + radius) ** 2) continue;
      hitIds?.add(c.id);
      this.damageCore(c, dmg);
    }
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
    const isBoss = this.isBossPattern(def.movePattern);
    const giant = this.hasNode('giantMarch') && allowElite && !isBoss && enemyId !== 'splinter';
    const elite = forceElite
      || giant
      || (allowElite
        && !isBoss
        && enemyId !== 'splinter'
        && enemyId !== 'guardian'
        && enemyId !== 'trapper'
        && enemyId !== 'vortex'
        && this.time >= ELITE.unlockAt
        && Math.random() < ELITE.chance);

    let hp = def.hp * enemyHpScale(this.time) * this.enemyHpMul * this.legionHpMul;
    if (elite) hp *= ELITE.hpMul;

    const enemy: Enemy = {
      id: this.nextEnemyId++,
      def, x, y,
      hp, maxHp: hp,
      age: 0, baseX: x, dir,
      hitFlash: 0,
      elite,
      phase: (def.movePattern === 'boss' || def.movePattern === 'bossSeraph') ? 1 : undefined,
      mutation: enemyId === 'splinter' ? undefined : mutation,
      introLeft: isBoss ? BOSS.introDuration : undefined,
      swimAge: isBoss ? 0 : undefined,
      shieldHits: enemyId === 'shielder'
        ? SHIELDER.hits * (this.hasNode('shieldBreaker') ? CONSTELLATION_FX.shieldHitsMul : 1)
        : undefined,
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

      const moveMul = this.enemyMoveMul() * this.nebulaMulAt(e.x, e.y)
        * (this.hasNode('hunterToy') && (e.def.id === 'teleporter' || e.def.id === 'mirage')
          ? CONSTELLATION_FX.hunterSpeedMul : 1);
      const eliteMul = (e.elite ? ELITE.speedMul : 1) * (e.enraged ? 1.5 : 1);

      switch (e.def.movePattern) {
        case 'down':
        case 'slowDown':
          e.y += e.def.speed * eliteMul * moveMul * dt;
          break;
        case 'zigzag':
          e.y += e.def.speed * 0.75 * eliteMul * moveMul * dt;
          e.x = e.baseX + Math.sin(e.age * 2.6) * 70;
          break;
        case 'dashAcross':
          e.x += e.def.speed * eliteMul * moveMul * e.dir * dt;
          e.y += 26 * moveMul * dt;
          break;
        case 'dashUp':
          e.y -= e.def.speed * eliteMul * moveMul * dt;
          break;
        case 'shieldDown':
        case 'cloakDown':
        case 'auraDown':
          e.y += e.def.speed * eliteMul * moveMul * dt;
          break;
        case 'teleport':
          this.updateTeleporter(e, dt * moveMul);
          break;
        case 'boss':
          this.updateBoss(e, dt * moveMul);
          break;
        case 'bossSeraph':
          this.updateBossSeraph(e, dt * moveMul);
          break;
        case 'legion':
          this.updateCommander(e, dt * moveMul);
          break;
        case 'anchorFence':
          this.updateTrapper(e, dt * moveMul);
          break;
        case 'vortexPull':
          this.updateVortex(e, dt * moveMul);
          break;
      }

      const isBoss = this.isBossLike(e);
      const out =
        e.y > H + margin || e.y < -margin - 200 ||
        e.x < -margin - 200 || e.x > W + margin + 200;
      if (out && e.age > 1.5 && !isBoss && !e.anchored) {
        if (e.def.id === 'trapper') this.clearPylons(e.id);
        this.enemies.splice(i, 1);
      }
    }
  }

  private updateCommander(e: Enemy, dt: number): void {
    if (this.updateBossIntro(e, dt)) return;
    e.swimAge = (e.swimAge ?? 0) + dt;
    e.x = CANVAS.width / 2 + Math.sin(e.swimAge * 0.55) * 130;
    e.y = BOSS.introTargetY + Math.sin(e.swimAge * 0.35) * 16;
  }

  private updateTrapper(e: Enemy, dt: number): void {
    const targetY = 170;
    if (!e.anchored) {
      e.y += e.def.speed * dt;
      if (e.y >= targetY) {
        e.y = targetY;
        e.anchored = true;
        const d = TRAPPER.pylonDist * (this.hasNode('deathArena') ? CONSTELLATION_FX.fenceRadiusMul : 1);
        const cx = Math.max(d, Math.min(CANVAS.width - d, this.playerX));
        const cy = Math.max(d, Math.min(CANVAS.height - d, this.playerY));
        const dirs: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        for (const [dx, dy] of dirs) {
          this.pylons.push({
            x: e.x, y: e.y,
            tx: cx + dx * d,
            ty: cy + dy * d,
            planted: false,
            ownerId: e.id,
          });
        }
      }
    }
  }

  private updateVortex(e: Enemy, dt: number): void {
    e.y += e.def.speed * 0.45 * dt;
    const dx = this.playerX - e.x;
    const step = e.def.speed * 0.3 * dt;
    if (Math.abs(dx) > 4) e.x += Math.sign(dx) * Math.min(Math.abs(dx), step);
  }

  private clearPylons(ownerId: number): void {
    this.pylons = this.pylons.filter((p) => p.ownerId !== ownerId);
  }

  private updatePylons(dt: number): void {
    for (const p of this.pylons) {
      if (p.planted) continue;
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);
      const step = TRAPPER.pylonSpeed * dt;
      if (dist <= step) {
        p.x = p.tx;
        p.y = p.ty;
        p.planted = true;
      } else {
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
      }
    }
  }

  fenceLines(): { ax: number; ay: number; bx: number; by: number }[] {
    return this.fenceSegments();
  }

  private fenceSegments(): { ax: number; ay: number; bx: number; by: number }[] {
    const byOwner = new Map<number, Pylon[]>();
    for (const p of this.pylons) {
      if (!p.planted) continue;
      const list = byOwner.get(p.ownerId) ?? [];
      list.push(p);
      byOwner.set(p.ownerId, list);
    }
    const segs: { ax: number; ay: number; bx: number; by: number }[] = [];
    for (const list of byOwner.values()) {
      if (list.length < 2) continue;
      const cx = list.reduce((s, p) => s + p.x, 0) / list.length;
      const cy = list.reduce((s, p) => s + p.y, 0) / list.length;
      list.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        const b = list[(i + 1) % list.length];
        segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y });
      }
    }
    return segs;
  }

  private checkFenceCollision(): void {
    if (!this.hasNode('glassCannon') && (this.invincibleLeft > 0 || this.shieldLeft > 0)) return;
    const r = this.playerHitRadius();
    for (const s of this.fenceSegments()) {
      if (distToSegment(this.playerX, this.playerY, s.ax, s.ay, s.bx, s.by) <= r + TRAPPER.fenceWidth) {
        this.hurtPlayer(TRAPPER.fenceDamage);
        return;
      }
    }
  }

  private applyVortexPull(dt: number): void {
    for (const e of this.enemies) {
      if (e.def.id !== 'vortex') continue;
      const dx = e.x - this.playerX;
      const dy = e.y - this.playerY;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > VORTEX.pullRadius) continue;
      const falloff = 1 - dist / VORTEX.pullRadius;
      this.playerX += (dx / dist) * VORTEX.playerAccel * falloff * dt;
      this.playerY += (dy / dist) * VORTEX.playerAccel * falloff * dt;
    }
  }

  private applyVortexToProjectile(p: Projectile, dt: number): void {
    for (const e of this.enemies) {
      if (e.def.id !== 'vortex') continue;
      const ox = p.originX ?? p.x;
      const oy = p.originY ?? p.y;
      const dx = e.x - ox;
      const dy = e.y - oy;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > VORTEX.pullRadius) continue;
      const falloff = 1 - dist / VORTEX.pullRadius;
      const ax = (dx / dist) * VORTEX.projAccel * falloff * dt;
      const ay = (dy / dist) * VORTEX.projAccel * falloff * dt;
      if (p.originX != null && p.originY != null) {
        p.originX += ax;
        p.originY += ay;
      } else {
        p.vx += ax * 8;
        p.vy += ay * 8;
      }
    }
  }

  private syncOrbiters(slot: WeaponSlot, damage: number, color: string, sizeMul: number): boolean {
    const spec = WEAPONS[slot.weaponId].projectile.orbit;
    if (!spec) return false;
    const extra = this.hasNode('purist') && WEAPONS[slot.weaponId].tier <= 2
      ? CONSTELLATION_FX.puristExtraCount : 0;
    const count = spec.count + extra;
    const existing = this.orbiters.filter((o) => o.weaponId === slot.weaponId);
    const radius = spec.radius * sizeMul;
    const hitR = WEAPONS[slot.weaponId].projectile.radius * sizeMul;
    if (existing.length === count) {
      for (const o of existing) {
        o.damage = damage;
        o.radius = radius;
        o.hitRadius = hitR;
        o.color = color;
        o.pull = spec.pull ?? 0;
      }
      return false;
    }
    this.orbiters = this.orbiters.filter((o) => o.weaponId !== slot.weaponId);
    for (let i = 0; i < count; i++) {
      this.orbiters.push({
        weaponId: slot.weaponId,
        angle: (Math.PI * 2 * i) / count,
        radius,
        damage,
        hitRadius: hitR,
        color,
        pull: spec.pull ?? 0,
        ring: count === 1,
        tickLeft: 0,
      });
    }
    return true;
  }

  private updateOrbiters(dt: number): void {
    const owned = new Set(this.weapons.map((w) => w.weaponId));
    this.orbiters = this.orbiters.filter((o) => owned.has(o.weaponId));
    for (const o of this.orbiters) {
      o.angle += dt * (o.ring ? 1.6 : 5.5);
      o.tickLeft -= dt;
      const px = this.playerX + Math.cos(o.angle) * o.radius;
      const py = this.playerY + Math.sin(o.angle) * o.radius;
      if (o.pull > 0) {
        for (const e of this.enemies) {
          const dx = this.playerX - e.x;
          const dy = this.playerY - e.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 8 && dist <= o.radius + e.def.radius) {
            e.x += (dx / dist) * o.pull * dt;
            e.y += (dy / dist) * o.pull * dt;
          }
        }
      }
      if (o.tickLeft > 0) continue;
      o.tickLeft = 0.1;
      for (const e of [...this.enemies]) {
        if (this.isCloaked(e)) continue;
        let hit = false;
        if (o.ring) {
          hit = Math.hypot(e.x - this.playerX, e.y - this.playerY) <= o.radius + e.def.radius;
        } else {
          hit = (px - e.x) ** 2 + (py - e.y) ** 2 <= (o.hitRadius + e.def.radius) ** 2;
        }
        if (!hit) continue;
        if (this.tryAbsorbShield(e, true)) continue;
        this.damageEnemy(e, o.damage, o.weaponId);
      }
      this.hitCoresCircle(px, py, o.hitRadius, o.damage);
    }
  }

  private weaponAffix(id: WeaponId): AffixId | undefined {
    return this.weapons.find((w) => w.weaponId === id)?.affix;
  }

  private updateSlashes(dt: number): void {
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.life -= dt;
      const half = (s.arcDeg * Math.PI) / 360;
      for (const e of [...this.enemies]) {
        if (s.hitIds.has(e.id) || this.isCloaked(e)) continue;
        const dx = e.x - s.x;
        const dy = e.y - s.y;
        const dist = Math.hypot(dx, dy);
        if (dist > s.range + e.def.radius) continue;
        let ang = Math.atan2(dy, dx) - s.angle;
        while (ang > Math.PI) ang -= Math.PI * 2;
        while (ang < -Math.PI) ang += Math.PI * 2;
        if (Math.abs(ang) > half + 0.12) continue;
        s.hitIds.add(e.id);
        if (this.tryAbsorbShield(e, true)) continue;
        this.damageEnemy(e, s.damage, s.weaponId);
        this.procMeleeAffix(s, e);
      }
      this.hitCoresCircle(s.x, s.y, s.range * 0.55, s.damage, s.hitIds);
      if (s.deflect) {
        for (let k = this.enemyProjectiles.length - 1; k >= 0; k--) {
          const p = this.enemyProjectiles[k];
          const dx = p.x - s.x;
          const dy = p.y - s.y;
          const dist = Math.hypot(dx, dy);
          if (dist > s.range) continue;
          let ang = Math.atan2(dy, dx) - s.angle;
          while (ang > Math.PI) ang -= Math.PI * 2;
          while (ang < -Math.PI) ang += Math.PI * 2;
          if (Math.abs(ang) > half + 0.12) continue;
          this.enemyProjectiles.splice(k, 1);
        }
      }
      if (s.life <= 0) {
        if (s.leaveZone) {
          const x2 = s.x + Math.cos(s.angle) * s.range;
          const y2 = s.y + Math.sin(s.angle) * s.range;
          this.zones.push({
            kind: 'segment',
            x: s.x, y: s.y, x2, y2,
            radius: s.leaveZone.radius,
            life: s.leaveZone.duration,
            tickLeft: 0,
            tickInterval: s.leaveZone.tick,
            damage: s.damage * 0.35,
            pull: 0,
            color: s.color,
            weaponId: s.weaponId,
          });
        }
        this.slashes.splice(i, 1);
      }
    }
    for (let i = this.pendingAfterimages.length - 1; i >= 0; i--) {
      const p = this.pendingAfterimages[i];
      p.left -= dt;
      if (p.left > 0) continue;
      this.slashes.push(p.slash);
      this.events.push({
        type: 'fired',
        x: p.slash.x, y: p.slash.y,
        color: p.slash.color,
        weaponId: p.slash.weaponId,
        angle: p.slash.angle,
        arcDeg: p.slash.arcDeg,
        range: p.slash.range,
      });
      this.pendingAfterimages.splice(i, 1);
    }
  }

  private procMeleeAffix(s: Slash, e: Enemy): void {
    const ax = this.weaponAffix(s.weaponId);
    if (ax === 'afterimage' && !s.fromAfterimage && !s.afterimageQueued) {
      s.afterimageQueued = true;
      const mul = AFFIX_FX.afterimageMul;
      this.pendingAfterimages.push({
        left: AFFIX_FX.afterimageDelay,
        slash: {
          x: s.x, y: s.y, angle: s.angle,
          arcDeg: s.arcDeg * mul,
          range: s.range * mul,
          life: s.maxLife,
          maxLife: s.maxLife,
          damage: s.damage * mul,
          color: s.color,
          weaponId: s.weaponId,
          deflect: false,
          hitIds: new Set(),
          fromAfterimage: true,
        },
      });
    }
    if (ax === 'brilliance') {
      const peak = Math.max(24, s.range * AFFIX_FX.brillianceRadiusMul);
      this.zones.push({
        kind: 'circle',
        x: e.x, y: e.y, x2: e.x, y2: e.y,
        radius: 8,
        life: AFFIX_FX.brillianceLife,
        tickLeft: 0,
        tickInterval: 0.08,
        damage: s.damage * 0.35,
        pull: 0,
        color: s.color,
        weaponId: s.weaponId,
        pulsePeak: peak,
        pulseMaxLife: AFFIX_FX.brillianceLife,
      });
    }
  }

  private updateMines(dt: number): void {
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.seekSpeed > 0) {
        const t = this.nearestEnemy(m.x, m.y, new Set());
        if (t) {
          const dx = t.x - m.x;
          const dy = t.y - m.y;
          const dist = Math.hypot(dx, dy) || 1;
          m.x += (dx / dist) * m.seekSpeed * dt;
          m.y += (dy / dist) * m.seekSpeed * dt;
          if (dist < t.def.radius + m.radius + 6) m.fuse = 0;
        }
      }
      if (m.pullRadius > 0) {
        for (const e of this.enemies) {
          const dx = m.x - e.x;
          const dy = m.y - e.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 4 && dist <= m.pullRadius) {
            e.x += (dx / dist) * m.pullForce * dt;
            e.y += (dy / dist) * m.pullForce * dt;
          }
        }
      }
      m.fuse -= dt;
      if (m.fuse > 0) continue;
      this.detonateMine(m);
      this.mines.splice(i, 1);
    }
  }

  private detonateMine(m: Mine): void {
    const r2 = m.explodeRadius * m.explodeRadius;
    for (const e of [...this.enemies]) {
      if ((e.x - m.x) ** 2 + (e.y - m.y) ** 2 <= r2) {
        if (this.isCloaked(e)) continue;
        if (this.tryAbsorbShield(e, true)) continue;
        this.damageEnemy(e, m.damage, m.weaponId);
      }
    }
    this.hitCoresCircle(m.x, m.y, m.explodeRadius, m.damage);
    this.events.push({ type: 'blast', x: m.x, y: m.y, color: m.color, radius: m.explodeRadius * 0.45 });
    if (m.split > 0) {
      for (let k = 0; k < m.split; k++) {
        const a = (Math.PI * 2 * k) / m.split;
        this.projectiles.push({
          x: m.x, y: m.y,
          vx: Math.cos(a) * 240,
          vy: Math.sin(a) * 240,
          speed: 240,
          baseSpeed: 240,
          damage: m.damage * 0.55,
          radius: 5,
          homingTurnRate: 4.5,
          pierceLeft: 0,
          life: 1.6,
          color: m.color,
          hitIds: new Set(),
          explodeRadius: 36,
          weaponId: m.weaponId,
        });
      }
    }
    if (m.zoneDuration > 0) {
      this.zones.push({
        kind: 'circle',
        x: m.x, y: m.y, x2: m.x, y2: m.y,
        radius: m.explodeRadius,
        life: m.zoneDuration,
        tickLeft: 0,
        tickInterval: m.zoneTick || 0.15,
        damage: m.damage * 0.4,
        pull: m.pullForce * 0.6,
        color: m.color,
        weaponId: m.weaponId,
      });
    }
  }

  private updateZones(dt: number): void {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.life -= dt;
      z.tickLeft -= dt;
      if (z.pulsePeak && z.pulseMaxLife) {
        const t = 1 - Math.max(0, z.life) / z.pulseMaxLife;
        z.radius = z.pulsePeak * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
      }
      if (z.pull > 0) {
        for (const e of this.enemies) {
          const dx = z.x - e.x;
          const dy = z.y - e.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 4 && dist <= z.radius) {
            e.x += (dx / dist) * z.pull * dt;
            e.y += (dy / dist) * z.pull * dt;
          }
        }
      }
      if (z.tickLeft <= 0) {
        z.tickLeft += z.tickInterval;
        for (const e of [...this.enemies]) {
          if (this.isCloaked(e)) continue;
          let hit = false;
          if (z.kind === 'segment') {
            hit = distToSegment(e.x, e.y, z.x, z.y, z.x2, z.y2) <= z.radius + e.def.radius;
          } else {
            hit = (e.x - z.x) ** 2 + (e.y - z.y) ** 2 <= (z.radius + e.def.radius) ** 2;
          }
          if (!hit) continue;
          if (this.tryAbsorbShield(e, true)) continue;
          this.damageEnemy(e, z.damage, z.weaponId);
        }
      }
      if (z.life <= 0) this.zones.splice(i, 1);
    }
  }

  private inAmplifierAura(): boolean {
    if (!this.ampAura) return false;
    return Math.hypot(this.playerX - this.ampAura.x, this.playerY - this.ampAura.y) <= this.ampAura.r;
  }

  private updateDrones(dt: number): void {
    for (let i = this.interceptBeams.length - 1; i >= 0; i--) {
      this.interceptBeams[i].life -= dt;
      if (this.interceptBeams[i].life <= 0) this.interceptBeams.splice(i, 1);
    }
    if (this.ampAura) {
      this.ampAura.life -= dt;
      if (this.ampAura.life <= 0) this.ampAura = null;
    }
    if (!this.droneId || this.empLeft > 0) return;
    this.droneTimer += dt;
    const lv = this.droneLevel;
    if (this.droneId === 'retriever') {
      const interval = Math.max(0.6, DRONE_FX.retrieverInterval - DRONE_FX.retrieverPerLv * (lv - 1));
      if (this.droneTimer >= interval) {
        this.droneTimer = 0;
        const r = DRONE_FX.retrieverRadius;
        for (let i = this.gems.length - 1; i >= 0; i--) {
          const g = this.gems[i];
          if (g.homing) continue;
          if (Math.hypot(g.x - this.playerX, g.y - this.playerY) <= r) {
            this.events.push({ type: 'gemPickup', x: g.x, y: g.y });
            const mul = this.hasNode('greed') && (g.corruptIn == null || g.corruptIn > 0)
              ? CONSTELLATION_FX.greedRewardMul : 1;
            this.gainExp(g.exp * mul);
            this.gems.splice(i, 1);
          }
        }
        for (let i = this.pickups.length - 1; i >= 0; i--) {
          const p = this.pickups[i];
          if (p.homing) continue;
          if (Math.hypot(p.x - this.playerX, p.y - this.playerY) <= r) {
            this.pickups.splice(i, 1);
            this.applyPickup(p);
          }
        }
      }
    } else if (this.droneId === 'defender') {
      if (this.droneTimer >= DRONE_FX.defenderInterval) {
        this.droneTimer = 0;
        const cap = DRONE_FX.defenderBase + (lv - 1);
        let n = 0;
        for (let i = this.enemyProjectiles.length - 1; i >= 0 && n < cap; i--) {
          const p = this.enemyProjectiles[i];
          const toPx = this.playerX - p.x;
          const toPy = this.playerY - p.y;
          if (p.vx * toPx + p.vy * toPy <= 0) continue;
          this.interceptBeams.push({
            x1: this.playerX + 18, y1: this.playerY - 12,
            x2: p.x, y2: p.y, life: 0.12,
          });
          this.enemyProjectiles.splice(i, 1);
          n++;
        }
        if (n > 0) {
          this.events.push({ type: 'shieldBlock', x: this.playerX + 18, y: this.playerY - 12 });
        }
      }
    } else if (this.droneId === 'amplifier') {
      if (this.droneTimer >= DRONE_FX.amplifierInterval) {
        this.droneTimer = 0;
        this.ampAura = {
          x: this.playerX, y: this.playerY,
          r: DRONE_FX.amplifierRadius,
          life: DRONE_FX.amplifierDuration,
        };
        this.events.push({ type: 'vacuum' });
      }
    }
  }

  private updateTeleporter(e: Enemy, dt: number): void {
    const spd = e.def.speed * (e.elite ? ELITE.speedMul : 1);
    e.y += spd * dt;
    e.teleportCd = (e.teleportCd ?? 0) - dt;
    const dist = Math.hypot(this.playerX - e.x, this.playerY - e.y);
    if ((e.teleportCd ?? 0) <= 0 && dist < TELEPORTER.triggerDist * (this.hasNode('hunterToy') ? 1.6 : 1) && dist > 24) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const r = e.def.radius;
      e.x = Math.max(r, Math.min(CANVAS.width - r, this.playerX + side * (38 + Math.random() * 36)));
      e.y = Math.max(r, Math.min(CANVAS.height - r, this.playerY + 40 + Math.random() * 28));
      e.teleportCd = TELEPORTER.cooldown * (this.hasNode('hunterToy') ? 0.45 : 1);
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
      p.x += p.vx * dt * this.nebulaMulAt(p.x, p.y);
      p.y += p.vy * dt * this.nebulaMulAt(p.x, p.y);
      if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) {
        this.enemyProjectiles.splice(i, 1);
        continue;
      }
      if (this.tryBlockEnemyBullet(p)) {
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
      if ((this.hasNode('glassCannon') || (this.invincibleLeft <= 0 && this.shieldLeft <= 0)) && !aegis) {
        const rr = this.playerHitRadius() + p.radius - 3;
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
          const maxTurn = p.homingTurnRate * (p.speed / Math.max(p.baseSpeed, 1)) * dt;
          const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
          const next = cur + turn;
          p.vx = Math.cos(next) * p.speed;
          p.vy = Math.sin(next) * p.speed;
        }
      }

      const techSlow = this.architectAlive() ? LEGION.techSpeedMul : 1;
      const neb = this.nebulaMulAt(p.x, p.y);
      this.applyVortexToProjectile(p, dt);
      if (p.originX != null && p.originY != null && p.orbitAngle != null && p.orbitRadius != null) {
        p.orbitAngle += (p.orbitOmega ?? 2.8) * dt * techSlow * neb;
        p.orbitRadius += p.speed * dt * techSlow * neb;
        p.x = p.originX + Math.cos(p.orbitAngle) * p.orbitRadius;
        p.y = p.originY + Math.sin(p.orbitAngle) * p.orbitRadius;
      } else {
        p.x += p.vx * dt * techSlow * neb;
        p.y += p.vy * dt * techSlow * neb;
      }

      this.tryBoostProjectile(p);

      // 적과 충돌
      let removed = false;
      for (const e of this.enemies) {
        if (p.hitIds.has(e.id)) continue;
        const hitR = e.def.radius * (e.elite ? 1.15 : 1);
        const rr = p.radius + hitR;
        if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 <= rr * rr) {
          if (this.isCloaked(e)) continue;
          if (!p.ignoreShield && this.tryAbsorbShield(e, this.isShielderFrontHit(p))) {
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
          if (this.rollCrit()) dmg *= this.runStats.critMul;
          this.damageEnemy(e, dmg, p.weaponId);
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

      let coreRemoved = false;
      for (const c of [...this.quantumCores]) {
        if (p.hitIds.has(c.id)) continue;
        const rr = p.radius + c.radius;
        if ((p.x - c.x) ** 2 + (p.y - c.y) ** 2 > rr * rr) continue;
        p.hitIds.add(c.id);
        this.damageCore(c, p.damage);
        if (p.explodeRadius) this.explodeProjectile(p, { id: c.id } as Enemy);
        if (p.pierceLeft <= 0) {
          this.projectiles.splice(i, 1);
          coreRemoved = true;
          break;
        }
        p.pierceLeft--;
      }
      if (coreRemoved) continue;

      // 화면 밖
      if (p.x < -60 || p.x > CANVAS.width + 60 || p.y < -60 || p.y > CANVAS.height + 60) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateBeams(dt: number): void {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.x = this.playerX;
      b.y = this.playerY - PLAYER.radius;
      b.life -= dt;
      b.tickLeft -= dt;
      if (b.tickLeft <= 0) {
        this.tickBeam(b);
        b.tickLeft += b.tickInterval;
      }
      if (b.life <= 0) this.beams.splice(i, 1);
    }
  }

  private tickBeam(b: Beam): void {
    const x2 = b.x + Math.cos(b.angle) * b.length;
    const y2 = b.y + Math.sin(b.angle) * b.length;
    const half = b.width * 0.5;
    for (const e of [...this.enemies]) {
      if (this.isCloaked(e)) continue;
      const hitR = e.def.radius * (e.elite ? 1.15 : 1) + half;
      if (distToSegment(e.x, e.y, b.x, b.y, x2, y2) > hitR) continue;
      const fromFront = Math.sin(b.angle) < -0.2;
      if (!b.ignoreShield && this.tryAbsorbShield(e, fromFront)) continue;
      let dmg = b.damage;
      if (this.rollCrit()) dmg *= this.runStats.critMul;
      this.damageEnemy(e, dmg, b.weaponId);
    }
    this.hitCoresCircle(b.x, b.y, b.width, b.damage);
  }

  private isCloaked(e: Enemy): boolean {
    if (e.def.id !== 'mirage') return false;
    return Math.hypot(this.playerX - e.x, this.playerY - e.y) > MIRAGE.revealRadius;
  }

  private inGuardianAura(e: Enemy): boolean {
    if (e.def.id === 'guardian') return false;
    for (const g of this.enemies) {
      if (g.def.id !== 'guardian' || g.id === e.id) continue;
      if (Math.hypot(g.x - e.x, g.y - e.y) <= GUARDIAN.auraRadius
        * (this.hasNode('shieldBreaker') ? CONSTELLATION_FX.guardianAuraMul : 1) + e.def.radius) return true;
    }
    return false;
  }

  /** 실더 정면 역장 / 군단장 전방위 역장. true면 HP 데미지 없음 */
  private tryAbsorbShield(e: Enemy, fromFront: boolean): boolean {
    if (e.def.id === 'architect') {
      if ((e.shieldHits ?? 0) <= 0) return false;
      e.shieldHits = (e.shieldHits ?? 1) - 1;
      e.hitFlash = 0.07;
      this.events.push({ type: 'shieldBlock', x: e.x, y: e.y });
      if (e.shieldHits <= 0) {
        e.shieldHits = 0;
        this.events.push({ type: 'banner', text: '🛡️ 기술 역장 파괴' });
      }
      return true;
    }
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
    this.vacuumLeft = DROPS.vacuumDuration;
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
        if (!p.ignoreShield && this.tryAbsorbShield(e, p.y > e.y)) continue;
        this.damageEnemy(e, p.damage * 0.55, p.weaponId);
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
        baseSpeed: p.baseSpeed,
        damage,
        radius: Math.max(3, p.radius * 0.8),
        homingTurnRate: 0,
        pierceLeft: 0,
        life: syn.shardLife,
        color: p.color,
        hitIds: new Set(p.hitIds),
        noSplit: true,
        weaponId: p.weaponId,
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
      if (this.rollCrit()) dmg *= this.runStats.critMul;
      this.damageEnemy(best, dmg, p.weaponId);
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

  /** 화면 안 적만. 은신(미라지) 제외 */
  private onScreenEnemies(): Enemy[] {
    const out: Enemy[] = [];
    for (const e of this.enemies) {
      if (this.isCloaked(e)) continue;
      if (e.x < 0 || e.x > CANVAS.width || e.y < 0 || e.y > CANVAS.height) continue;
      out.push(e);
    }
    return out;
  }

  private pickTargetedEnemy(mode: NonNullable<ProjectileSpec['targeted']>): Enemy | null {
    const pool = this.onScreenEnemies();
    if (pool.length === 0) return null;
    if (mode === 'random') {
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const px = this.playerX;
    const py = this.playerY;
    let best = pool[0];
    let bestD = (best.x - px) ** 2 + (best.y - py) ** 2;
    for (let i = 1; i < pool.length; i++) {
      const e = pool[i];
      const d = (e.x - px) ** 2 + (e.y - py) ** 2;
      if (mode === 'farthest' ? d > bestD : d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private modHitDamage(dmg: number, e: Enemy, weaponId?: WeaponId): number {
    const def = weaponId ? WEAPONS[weaponId] : null;
    const isMine = !!def?.projectile.drop;
    const isWeapon = !!def && !isMine;
    if (this.hasNode('pacifist') && isWeapon) return 0;
    if (this.hasNode('pacifist') && !isWeapon) dmg *= CONSTELLATION_FX.pacifistEnvMul;
    if (this.hasNode('sniper')) {
      const dist = Math.hypot(e.x - this.playerX, e.y - this.playerY);
      if (dist <= CONSTELLATION_FX.sniperNear) dmg *= CONSTELLATION_FX.sniperNearMul;
      else if (dist >= CONSTELLATION_FX.sniperFar) dmg *= CONSTELLATION_FX.sniperFarMul;
    }
    if (this.hasNode('deathArena') && this.playerInsideFence()) dmg *= CONSTELLATION_FX.arenaDmgMul;
    return dmg;
  }

  private playerInsideFence(): boolean {
    const segs = this.fenceSegments();
    if (segs.length < 3) return false;
    let hits = 0;
    const px = this.playerX;
    const py = this.playerY;
    for (const s of segs) {
      const [x1, y1, x2, y2] = [s.ax, s.ay, s.bx, s.by];
      const cond = ((y1 > py) !== (y2 > py))
        && (px < (x2 - x1) * (py - y1) / ((y2 - y1) || 1e-6) + x1);
      if (cond) hits++;
    }
    return hits % 2 === 1;
  }

  private enrageEnemy(e: Enemy): void {
    e.hp = e.maxHp;
    e.enraged = true;
    if (!e.elite && !this.isBossLike(e)) {
      e.elite = true;
      e.maxHp *= ELITE.hpMul;
      e.hp = e.maxHp;
    }
  }

  private tryBloodBurst(x: number, y: number): void {
    if (!this.hasNode('bloodFeast') || this.bloodBursting) return;
    if (Math.random() >= CONSTELLATION_FX.bloodChance) return;
    this.bloodBursting = true;
    const r = CONSTELLATION_FX.bloodRadius;
    this.events.push({ type: 'bloodBurst', x, y, radius: r });
    for (const other of [...this.enemies]) {
      if ((other.x - x) ** 2 + (other.y - y) ** 2 > r * r) continue;
      this.damageEnemy(other, other.maxHp * 0.35);
    }
    this.bloodBursting = false;
  }

  private damageEnemy(e: Enemy, dmg: number, weaponId?: WeaponId, fromEcho = false): void {
    if (this.isCloaked(e)) return;
    dmg = this.modHitDamage(dmg, e, weaponId);
    if (this.inGuardianAura(e)) dmg *= GUARDIAN.damageTakenMul;
    const prevRatio = e.hp / e.maxHp;
    const applied = Math.min(e.hp, dmg);
    e.hp -= dmg;
    e.hitFlash = 0.08;
    if (weaponId && applied > 0) {
      this.damageDealt[weaponId] = (this.damageDealt[weaponId] ?? 0) + applied;
    }
    this.events.push({ type: 'enemyHit', x: e.x, y: e.y, color: e.def.color, damage: Math.round(dmg) });

    if (
      this.pilotTrait === 'executioner'
      && !this.isBossLike(e)
      && !e.elite
      && e.hp > 0
      && e.hp / e.maxHp <= PILOT_FX.execHp
    ) {
      e.hp = 0;
      this.events.push({ type: 'execProc', x: e.x, y: e.y });
    }

    if (
      this.isTrueBoss(e)
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
      let fogScore = 1;
      if (this.hasNode('darkFog') && Math.hypot(e.x - this.playerX, e.y - this.playerY) > CONSTELLATION_FX.fogRadius) {
        fogScore = CONSTELLATION_FX.fogScoreMul;
      }
      this.score += Math.round(
        Math.max(1, expDrop) * SCORE.killBase * (1 + this.comboCount * SCORE.comboBonus)
          * scoreMul * this.scoreMul * fogScore,
      );

      if (this.hasNode('traitorLegion') && e.def.movePattern === 'legion') {
        this.runStats.moveSpeedMul *= 1 + CONSTELLATION_FX.legionStack;
        this.runStats.projSpeedMul *= 1 + CONSTELLATION_FX.legionStack;
        this.applyPassiveEffects();
      }
      if (this.hasNode('shieldBreaker') && (e.def.id === 'shielder' || e.def.id === 'guardian')) {
        for (const other of this.enemies) {
          if (other.id === e.id) continue;
          other.hp = Math.max(1, other.hp * (1 - CONSTELLATION_FX.empHpFrac));
        }
        this.events.push({ type: 'banner', text: '💥 방패 붕괴 EMP' });
      }
      if (this.hasNode('hunterToy') && (e.def.id === 'teleporter' || e.def.id === 'mirage')) {
        this.hunterBuffLeft = CONSTELLATION_FX.hunterBuffSec;
        this.applyPassiveEffects();
        this.events.push({ type: 'banner', text: '🎯 사냥 표식: 자석·EXP 3배' });
      }

      if (this.isTrueBoss(e)) {
        this.killBoss(e);
      } else {
        if (e.elite) this.eliteKills++;
        if (e.fromRift) {
          this.dropCube(e.x, e.y);
          if (this.hasNode('voidPredator') && Math.random() < CONSTELLATION_FX.riftCubeChance) {
            this.dropCube(e.x + 16, e.y);
          }
          this.onRiftEliteKilled();
        }
        if (e.fromAltar) this.onAltarEliteKilled();
        this.applyDeathMutation(e);
        if (e.def.id === 'trapper') this.clearPylons(e.id);
        this.events.push({
          type: 'enemyDied',
          x: e.x, y: e.y,
          color: e.elite ? '#fbbf24' : e.def.color,
          radius: e.def.radius * (e.elite ? 1.3 : 1),
        });
        this.spawnGem(e.x, e.y, Math.max(1, expDrop));
        const dropRate = PICKUPS.dropChance + this.dropChanceBonus;
        if ((e.elite && ELITE.guaranteedPickup && !e.fromAltar) || Math.random() < dropRate) {
          const r = Math.random();
          const kind: PickupKind = r < 0.45 ? 'heal' : r < 0.8 ? 'magnet' : 'bomb';
          this.spawnPickup(kind, e.x, e.y);
        }
        if (this.hasNode('giantMarch') && !this.isBossLike(e) && Math.random() < CONSTELLATION_FX.giantCubeChance) {
          this.dropCube(e.x, e.y - 10);
        }
        if (e.elite) this.vacuumDrops();
      }
      this.tryBloodBurst(e.x, e.y);

      if (
        !fromEcho
        && weaponId
        && this.weaponAffix(weaponId) === 'echo'
        && Math.random() < AFFIX_FX.echoChance
      ) {
        this.echoBurst(e.x, e.y, weaponId, e.id);
      }

      const idx = this.enemies.indexOf(e);
      if (idx >= 0) this.enemies.splice(idx, 1);
    }
  }

  private echoBurst(x: number, y: number, weaponId: WeaponId, skipId: number): void {
    const slot = this.weapons.find((w) => w.weaponId === weaponId);
    const def = WEAPONS[weaponId];
    const sizeMul = 1 + (slot?.radiusBonus ?? 0);
    const r = AFFIX_FX.echoRadius * sizeMul;
    const dmg = def.projectile.damage
      * (1 + ((slot?.level ?? 1) - 1) * LEVELING.damagePerLevel)
      * this.damageMul
      * (1 + (slot?.damageBonus ?? 0))
      * 0.8;
    this.events.push({ type: 'blast', x, y, color: def.color, radius: r * 0.7 });
    for (const other of [...this.enemies]) {
      if (other.id === skipId) continue;
      if ((other.x - x) ** 2 + (other.y - y) ** 2 > r * r) continue;
      if (this.isCloaked(other)) continue;
      if (this.tryAbsorbShield(other, true)) continue;
      this.damageEnemy(other, dmg, weaponId, true);
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
      this.spawnGem(e.x + (Math.random() - 0.5) * 220, e.y + Math.random() * 160 + 10, 3);
    }
    this.events.push({ type: 'bossPhase', x: e.x, y: e.y });
    this.events.push({ type: 'banner', text: '⚡ PHASE 2' });
    this.dropCube(e.x, e.y);
    this.vacuumDrops();
  }

  private killBoss(e: Enemy): void {
    const other = this.enemies.find((x) => this.isTrueBoss(x) && x.id !== e.id);
    this.bossId = other?.id ?? null;
    this.bossKills++;
    if (this.hasNode('twinDread')) this.runCoreBonus += CONSTELLATION_FX.twinCoreMul - 1;
    this.score += Math.round(BOSS.score * this.scoreMul);
    this.events.push({ type: 'bossDied', x: e.x, y: e.y });
    this.events.push({ type: 'banner', text: `${e.def.name} 격파!` });
    for (let k = 0; k < BOSS.gemDrop; k++) {
      this.spawnGem(e.x + (Math.random() - 0.5) * 200, e.y + Math.random() * 140 + 20, 3);
    }
    this.spawnPickup('heal', e.x - 40, e.y + 60);
    this.spawnPickup('magnet', e.x + 40, e.y + 60);
  }

  // ---------- 드롭 아이템 ----------

  private updatePickups(dt: number): void {
    const top = CANVAS.height * DROPS.topBand;
    const vacuum = this.vacuumLeft > 0;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (p.corruptIn != null && !p.homing) {
        p.corruptIn -= dt;
        if (p.corruptIn <= 0) {
          p.homing = true;
          p.corruptIn = 0;
        }
      }
      p.life -= dt;
      if (p.life <= 0 && !p.homing) {
        this.pickups.splice(i, 1);
        continue;
      }
      if (p.homing) {
        const t = this.nearestEnemy(p.x, p.y, new Set());
        if (!t) {
          this.pickups.splice(i, 1);
          continue;
        }
        const dx = t.x - p.x;
        const dy = t.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const step = CONSTELLATION_FX.greedHoming * dt;
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
        if (dist <= t.def.radius + PICKUPS.radius + 8) {
          this.enrageEnemy(t);
          this.events.push({ type: 'banner', text: '💰 탐욕의 오염' });
          this.pickups.splice(i, 1);
        }
        continue;
      }
      const dx = this.playerX - p.x;
      const dy = this.playerY - p.y;
      const dist = Math.hypot(dx, dy);
      if (vacuum) {
        const step = GEM.magnetSpeed * dt;
        p.x += (dx / Math.max(dist, 1)) * step;
        p.y += (dy / Math.max(dist, 1)) * step;
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
    if (p.homing) return;
    const greedFresh = this.hasNode('greed') && (p.corruptIn == null || p.corruptIn > 0);
    this.events.push({ type: 'pickup', kind: p.kind, x: p.x, y: p.y });
    switch (p.kind) {
      case 'heal':
        this.hp = Math.min(this.maxHp, this.hp + PICKUPS.healAmount);
        break;
      case 'magnet':
        this.vacuumDrops();
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
      case 'goldCube':
        this.pendingAltarRewards++;
        this.status = 'levelup';
        this.events.push({ type: 'banner', text: '🏆 VOID CACHE' });
        if (greedFresh) this.runCreditBonus += 80 * CONSTELLATION_FX.greedRewardMul;
        break;
    }
  }

  // ---------- 보석 & 경험치 ----------

  private updateGems(dt: number): void {
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      if (g.corruptIn != null && !g.homing) {
        g.corruptIn -= dt;
        if (g.corruptIn <= 0) {
          g.homing = true;
          g.corruptIn = 0;
        }
      }
      g.life -= dt;
      if (g.life <= 0 && !g.homing) {
        this.gems.splice(i, 1);
        continue;
      }
      if (g.homing) {
        const t = this.nearestEnemy(g.x, g.y, new Set());
        if (!t) {
          this.gems.splice(i, 1);
          continue;
        }
        const dx = t.x - g.x;
        const dy = t.y - g.y;
        const dist = Math.hypot(dx, dy) || 1;
        const step = CONSTELLATION_FX.greedHoming * dt;
        g.x += (dx / dist) * step;
        g.y += (dy / dist) * step;
        if (dist <= t.def.radius + GEM.radius + 6) {
          this.enrageEnemy(t);
          this.gems.splice(i, 1);
        }
        continue;
      }
      const dx = this.playerX - g.x;
      const dy = this.playerY - g.y;
      const dist = Math.hypot(dx, dy);

      if (this.vacuumLeft > 0 || dist < this.magnetRadius) {
        const step = GEM.magnetSpeed * dt;
        g.x += (dx / Math.max(dist, 1)) * step;
        g.y += (dy / Math.max(dist, 1)) * step;
      } else if (g.y < CANVAS.height * DROPS.topBand) {
        g.y += DROPS.gravity * dt;
      }

      if (dist < PLAYER.radius + GEM.radius + 4) {
        this.gems.splice(i, 1);
        this.events.push({ type: 'gemPickup', x: g.x, y: g.y });
        const mul = this.hasNode('greed') && (g.corruptIn == null || g.corruptIn > 0)
          ? CONSTELLATION_FX.greedRewardMul : 1;
        this.gainExp(g.exp * mul);
      }
    }
  }

  private gainExp(amount: number): void {
    this.exp += amount * this.expMul;
    let leveled = 0;
    while (this.exp >= this.expToNext) {
      this.exp -= this.expToNext;
      const prevLv = this.level;
      this.level++;
      this.expToNext = LEVELING.expForLevel(this.level);
      this.pendingLevelUps++;
      leveled++;
      if (this.growthExhausted()) {
        this.pantheonEarned++;
        this.events.push({ type: 'banner', text: '✨ 판테온 공명 +1' });
      }
      if (prevLv < AWAKEN.level && this.level >= AWAKEN.level) this.awakeningDue = true;
    }
    if (leveled > 0) {
      const aegisLv = this.passiveLevel('aegis');
      if (aegisLv > 0) {
        this.levelAegisLeft = LEVEL_AEGIS.durationBase + LEVEL_AEGIS.durationPerLv * (aegisLv - 1);
        this.levelAegisReduce = LEVEL_AEGIS.reduceBase + LEVEL_AEGIS.reducePerLv * (aegisLv - 1);
      }
    }
    if (this.pendingLevelUps > 0) {
      this.events.push({ type: 'levelUp', x: this.playerX, y: this.playerY });
      this.status = 'levelup'; // main 루프에서 감지해 일시정지 + UI 표시
    }
  }

  // ---------- 플레이어 피격 ----------

  private checkPlayerCollision(_dt: number): void {
    if (!this.hasNode('glassCannon') && (this.invincibleLeft > 0 || this.shieldLeft > 0)) return;
    if (this.skillActiveLeft > 0 && SHIPS[this.shipId].activeSkill.id === 'aegis') return;
    for (const e of this.enemies) {
      const rr = this.playerHitRadius() + e.def.radius * (e.elite ? 1.15 : 1) * (e.enraged ? 1.5 : 1) - 4;
      if ((this.playerX - e.x) ** 2 + (this.playerY - e.y) ** 2 <= rr * rr) {
        const abyss = this.nodeLv('endlessAbyss');
        const dmg = e.def.contactDamage * (e.elite ? ELITE.damageMul : 1)
          * Math.pow(1 + CONSTELLATION_FX.abyssPerStack, abyss);
        this.hurtPlayer(dmg);
        return;
      }
    }
  }

  private glassIgnoresGuard(): boolean {
    return this.hasNode('glassCannon');
  }

  private hurtPlayer(damage: number): void {
    if (!this.glassIgnoresGuard()) {
      if (this.invincibleLeft > 0 || this.shieldLeft > 0) return;
    }
    if (this.skillActiveLeft > 0 && SHIPS[this.shipId].activeSkill.id === 'aegis') return;
    let taken = damage * (1 - this.armorReduce);
    if (this.levelAegisLeft > 0) taken *= 1 - this.levelAegisReduce;
    this.hp -= taken;
    this.invincibleLeft = this.glassIgnoresGuard() ? 0 : PLAYER.invincibleMs;
    this.events.push({ type: 'playerHit' });
    if (this.hp <= 0) {
      this.hp = 0;
      this.status = 'gameover';
      this.events.push({ type: 'gameover' });
    }
  }

  playerHitRadius(): number {
    const lv = this.passiveLevel('evasion');
    const shrunk = PLAYER.radius * (1 - PASSIVES.evasion.perLevel * lv);
    if (this.hasNode('glassCannon')) return Math.max(1, shrunk);
    if (this.empLeft > 0) return PLAYER.radius;
    return shrunk;
  }

  private passiveLevel(id: PassiveId): number {
    return this.passives.find((p) => p.passiveId === id)?.level ?? 0;
  }

  private enemyMoveMul(): number {
    if (this.empLeft > 0) return 1;
    const lv = this.passiveLevel('cripple');
    return Math.max(0.2, 1 - PASSIVES.cripple.perLevel * lv);
  }

  private rollCrit(): boolean {
    if (this.hasNode('deathArena') && this.playerInsideFence()) return true;
    const chance = this.pilotTrait === 'lastStand' && this.hp / this.maxHp <= PILOT_FX.lastStandHp
      ? 1
      : COMBAT.baseCritChance;
    return Math.random() < chance;
  }

  private architectAlive(): boolean {
    return this.enemies.some((e) => e.def.id === 'architect');
  }

  private isBossPattern(pattern: Enemy['def']['movePattern']): boolean {
    return pattern === 'boss' || pattern === 'bossSeraph' || pattern === 'legion';
  }

  private isBossLike(e: Enemy): boolean {
    return this.isBossPattern(e.def.movePattern);
  }

  private isTrueBoss(e: Enemy): boolean {
    return e.def.movePattern === 'boss' || e.def.movePattern === 'bossSeraph';
  }
}

function distToSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby || 1;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}
