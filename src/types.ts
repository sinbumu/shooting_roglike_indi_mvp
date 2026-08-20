// ============================================================
// 공용 타입 정의 (Data-Driven Architecture의 뼈대)
// ============================================================

export type WeaponId =
  | 'vulcan'
  | 'spread'
  | 'homing'
  | 'laser'
  | 'railgun'
  | 'swarm'
  | 'gatling'
  | 'nova'
  | 'mothership'
  | 'omega'
  | 'starfall'
  | 'genesis'
  | 'tempest'
  | 'rupture'
  | 'solance'
  | 'helix'
  | 'blade'
  | 'rotor'
  | 'beamSword'
  | 'halo'
  | 'cleaver'
  | 'mine'
  | 'seekerMine'
  | 'singularity'
  | 'predator'
  | 'eventHorizon'
  | 'plasmaWhip'
  | 'orbitalSaw'
  | 'seekingSlash'
  | 'quakeWhip'
  | 'kingSaw'
  | 'phantomBlade'
  | 'tectonicCutter'
  | 'spiderMine'
  | 'interceptorWing'
  | 'autoTurret'
  | 'sawDrone'
  | 'doomsday'
  | 'orbitalBattery'
  | 'ironMaiden'
  | 'bloodSpike'
  | 'drainAura'
  | 'bleedBurst'
  | 'bloodSeeker'
  | 'bloodGallows'
  | 'bloodNova'
  | 'vampireBats'
  | 'boomerangBlade'
  | 'infinityChakram'
  | 'shrapnelMine'
  | 'clusterDeathBomb'
  | 'toxicWeb'
  | 'absoluteLockdown'
  | 'crimsonGatling'
  | 'bloodCrossfire';

export type WeaponTier = 1 | 2 | 3;

/** 투사체 발사 파라미터 — 모든 무기는 이 조합으로 표현된다 */
export interface ProjectileSpec {
  damage: number;
  speed: number;
  radius: number;
  count: number;
  spreadDeg: number;
  homingTurnRate: number;
  pierce: number;
  lifetime: number;
  /** 명중 시 범위 폭발 반경 (모선 등) */
  explodeRadius?: number;
  /** true면 탄마다 360° 무작위 각도 */
  randomSpread?: boolean;
  /** true면 실더 역장을 무시하고 HP에 피해 */
  ignoreShield?: boolean;
  /** 있으면 투사체 대신 지속 빔 */
  beam?: {
    duration: number;
    tickInterval: number;
    width: number;
    length: number;
  };
  /** 조준 발사: 최근접 / 최원거리 / 화면 내 무작위 */
  targeted?: 'nearest' | 'farthest' | 'random';
  /** true면 원점에서 나선형으로 퍼짐 */
  spiral?: boolean;
  /** 부채 참격 (근접) */
  melee?: {
    arcDeg: number;
    range: number;
    duration: number;
    deflect: boolean;
  };
  /** 기체 주위 유지 궤도 */
  orbit?: {
    count: number;
    radius: number;
    persist: boolean;
    pull?: number;
  };
  /** 설치형 지뢰/블랙홀 */
  drop?: {
    fuse: number;
    seekSpeed?: number;
    pullRadius?: number;
    pullForce?: number;
    persist?: number;
    split?: number;
    splitPierce?: number;
    splitHoming?: number;
    splitSpeed?: number;
    splitExplode?: number;
    splitRadius?: number;
    /** 파편이 화면 가장자리에서도 폭발 */
    clusterOnEdge?: boolean;
    zoneDuration?: number;
    zoneTick?: number;
    /** 장판 안 적 이속 배율 (0.3 = 70% 감속, 0 = 정지) */
    zoneSlow?: number;
    /** true면 보스 제외 완전 정지 */
    stunNonBoss?: boolean;
  };
  /** 일정 거리 후 기체로 되돌아오는 부메랑 */
  boomerang?: {
    outboundSec: number;
    returnTurnRate: number;
  };
}

export type WeaponTag = 'projectile' | 'melee' | 'aura' | 'drop' | 'beam' | 'summon';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  tier: WeaponTier;
  icon: string;
  color: string;
  desc: string;
  cooldownMs: number;
  projectile: ProjectileSpec;
  /** 없으면 projectile. 근접/오라/장판만 명시 */
  tags?: WeaponTag[];
  /** 발사 시 최대 체력 비율 소모 (최소 HP 1) */
  hpCostFrac?: number;
  /** 적 1기 적중 시 최대 체력 비율 흡혈 */
  leechOnHit?: number;
}

export interface Recipe {
  materials: [WeaponId, WeaponId] | [WeaponId];
  result: WeaponId;
  /** T3 매트릭스 촉매. 보유해야 조합되며 소모하지 않음 */
  requirePassive?: PassiveId;
}

// ------------------------------------------------------------
// 시작 기체 / 패시브 / 메타
// ------------------------------------------------------------

export type ShipId = 'scout' | 'fortress' | 'hunter' | 'bomber' | 'yaksha' | 'overlord' | 'crimson';

export type DroneId = 'retriever' | 'defender' | 'amplifier';

export interface DroneDef {
  id: DroneId;
  name: string;
  icon: string;
  color: string;
  tag: string;
  desc: string;
  unlockCost: number;
  maxLevel: number;
  baseCost: number;
  costMul: number;
}

export type ActiveSkillId = 'phaseDash' | 'aegis' | 'timeDilation' | 'carpetBombing' | 'iaido' | 'swarmFrenzy' | 'bloodStream';

export type AwakeningId =
  | 'scoutDash'
  | 'fortressAegis'
  | 'hunterStasis'
  | 'bomberNapalm'
  | 'bomberMinelayer'
  | 'yakshaAsura'
  | 'yakshaSwordAura'
  | 'overlordLegion'
  | 'overlordNetwork'
  | 'crimsonImmortal'
  | 'crimsonOverdrive';

export interface CoreAwakeningDef {
  id: AwakeningId;
  shipId: ShipId;
  name: string;
  icon: string;
  color: string;
  desc: string;
}

export interface ActiveSkillDef {
  id: ActiveSkillId;
  name: string;
  icon: string;
  cooldown: number;
  duration?: number;
  dashDist?: number;
  iframeMs?: number;
  radius?: number;
  knockback?: number;
  pulseDamage?: number;
  pulseInterval?: number;
  /** 적·적탄 속도 배율 (1보다 작으면 슬로우) */
  slowMul?: number;
  bombCount?: number;
  explodeRadius?: number;
  hpCostFrac?: number;
  leechPerHit?: number;
}

export interface ShipDef {
  id: ShipId;
  name: string;
  icon: string;
  color: string;
  desc: string;
  /** 기본 대비 최대 체력 배율 */
  hpMul: number;
  /** 기본 대비 이동속도 배율 */
  speedMul: number;
  startingWeapon: WeaponId;
  /** 언락 비용 (0이면 처음부터 보유) */
  unlockCost: number;
  activeSkill: ActiveSkillDef;
}

export type PassiveId =
  | 'evasion' | 'cripple' | 'aegis' | 'plating' | 'collector' | 'overcharge' | 'overload'
  | 'titaniumPlate' | 'thrusterMod' | 'highExplosive' | 'quantumCell' | 'extendedMag'
  | 'nanoPlate' | 'regenModule' | 'critLens' | 'accelMotor';

export interface PassiveDef {
  id: PassiveId;
  name: string;
  icon: string;
  color: string;
  desc: string;
  /** 레벨당 효과 수치 (의미는 id별 상이) */
  perLevel: number;
  maxLevel: number;
  /** 있으면 최대 체력에 곱함 (과부하 코어) */
  hpMul?: number;
  /** 있으면 무기 쿨타임에 곱함 */
  cooldownMul?: number;
}

export type MetaUpgradeId =
  | 'hull' | 'firepower' | 'thruster' | 'magnet' | 'fortune'
  | 'overclock' | 'lightArmor';

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  icon: string;
  desc: string;
  /** Infinity = 상한 없음 (파라곤) */
  maxLevel: number;
  /** 레벨 n → n+1 비용 = round(baseCost * costMul^n) */
  baseCost: number;
  /** 기본 1.5 */
  costMul?: number;
  /** 레벨당 보너스 (배율 또는 가산 — id별) */
  perLevel: number;
}

export type ShipSkinId = 'darkScout' | 'gildedFortress' | 'voidHunter';
export type ProjSkinId = 'vulcanCrimson' | 'spreadIon' | 'homingNova' | 'bladeCrimson' | 'mineToxic';

export type AchievementId =
  | 'first_blood'
  | 'survive_60'
  | 'survive_180'
  | 'clear_mission'
  | 'boss_slayer'
  | 'tier2'
  | 'tier3'
  | 'combo_20'
  | 'score_10k'
  | 'elite_hunter'
  | 'rift_clear'
  | 'legion_clear'
  | 'challenge_clear';

export interface AchievementDef {
  id: AchievementId;
  name: string;
  desc: string;
  icon: string;
  reward: number;
}

export type StageId = 'orbit' | 'rift' | 'legion';

export interface StoryBeat {
  /** 경과 초 */
  at: number;
  text: string;
}

export interface StageDef {
  id: StageId;
  name: string;
  icon: string;
  color: string;
  desc: string;
  /** 이전 스테이지 클리어로 해금 (없으면 기본 해금) */
  unlockAfter?: StageId;
  victoryTime: number;
  bgTop: number;
  bgBottom: number;
  waves: Wave[];
  bossTimes: readonly number[];
  bossRoster: readonly EnemyId[];
  story: StoryBeat[];
  clearCreditMul: number;
}

export type ChallengeId = 'standard' | 'tight' | 'fragile' | 'bare';

export interface ChallengeDef {
  id: ChallengeId;
  name: string;
  icon: string;
  desc: string;
  weaponSlotCap?: number;
  passiveSlotCap?: number;
  hpMul?: number;
  enemyHpMul?: number;
  scoreMul?: number;
  creditMul?: number;
}

// ------------------------------------------------------------

export type EnemyId =
  | 'drone'
  | 'zigzag'
  | 'dasher'
  | 'rusher'
  | 'tank'
  | 'shielder'
  | 'teleporter'
  | 'splinter'
  | 'mirage'
  | 'guardian'
  | 'warden'
  | 'herald'
  | 'architect'
  | 'trapper'
  | 'vortex'
  | 'boss'
  | 'bossSeraph';

export type SpawnEdge = 'top' | 'side' | 'bottom';

export type MovePattern =
  | 'down'
  | 'zigzag'
  | 'dashAcross'
  | 'dashUp'
  | 'slowDown'
  | 'shieldDown'
  | 'teleport'
  | 'cloakDown'
  | 'auraDown'
  | 'legion'
  | 'anchorFence'
  | 'vortexPull'
  | 'boss'
  | 'bossSeraph';

/** 후반 돌연변이 */
export type MutationId = 'explode' | 'split' | 'burst';

export type PickupKind = 'heal' | 'magnet' | 'bomb' | 'cube' | 'goldCube';

export type PilotTraitId = 'lastStand' | 'turretDark' | 'executioner';

/** Tier3 / 엔드게임 무기 접사 */
export type AffixId = 'split' | 'pierce' | 'chain' | 'afterimage' | 'echo' | 'brilliance';

/** 한계 돌파 미세 스탯 */
export type StatBoostId = 'projSpeed' | 'critMul' | 'moveSpeed';

/** 전술 폴백 소모품 */
export type TacticalId = 'emp' | 'shield' | 'magnetStorm';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  hp: number;
  speed: number;
  radius: number;
  color: string;
  contactDamage: number;
  exp: number;
  spawnEdge: SpawnEdge;
  movePattern: MovePattern;
}

export interface WaveEntry {
  enemy: EnemyId;
  interval: number;
  mutation?: MutationId;
}

export interface Wave {
  from: number;
  to: number;
  entries: WaveEntry[];
}

// ------------------------------------------------------------
// 레벨업 선택지
// ------------------------------------------------------------

export type CraftOp = 'affix' | 'damage' | 'speed' | 'cooldown' | 'radius';

export type ChoiceKind =
  | 'merge'
  | 'new'
  | 'upgrade'
  | 'jackpot'
  | 'heal'
  | 'passive'
  | 'passiveUp'
  | 'statBoost'
  | 'tactical'
  | 'affix'
  | 'craft'
  | 'evolve'
  | 'awakening'
  | 'altarReward';

export interface LevelUpChoice {
  kind: ChoiceKind;
  weight: number;
  title: string;
  desc: string;
  icon: string;
  color: string;
  weaponIds?: WeaponId[];
  /** `weapons[]` 인덱스. 동형 다중 장착 시 크래프트/어픽스 대상을 구분 */
  weaponSlotIndex?: number;
  resultId?: WeaponId;
  passiveId?: PassiveId;
  statId?: StatBoostId;
  tacticalId?: TacticalId;
  affixId?: AffixId;
  craftOp?: CraftOp;
  altarOp?: 'slot' | 'credits';
  awakeningId?: AwakeningId;
  /** 기체 특화 태그와 일치 */
  isSynergy?: boolean;
  /** 이 카드를 고르면 즉시 T2/T3 조합이 가능해짐 */
  canEvolve?: boolean;
  /** 보유 무기/패시브와 같은 조합 트리 */
  hasCombo?: boolean;
  synergyColor?: string;
}

// ------------------------------------------------------------
// 성좌 (v1.8)
// ------------------------------------------------------------

export type ConstellationCategory = 'stage' | 'elite' | 'rule' | 'risk' | 'sink';

export type ConstellationId =
  | 'voidPredator'
  | 'disasterEye'
  | 'traitorLegion'
  | 'shieldBreaker'
  | 'deathArena'
  | 'twinDread'
  | 'hunterToy'
  | 'spacetime'
  | 'overloadGear'
  | 'purist'
  | 'sniper'
  | 'berserker'
  | 'pacifist'
  | 'greed'
  | 'glassCannon'
  | 'bloodFeast'
  | 'giantMarch'
  | 'darkFog'
  | 'endlessAbyss'
  | 'fateWheel'
  | 'altarFrenzy'
  | 'infiniteOrbit';

export interface ConstellationDef {
  id: ConstellationId;
  category: ConstellationCategory;
  name: string;
  icon: string;
  color: string;
  penalty: string;
  reward: string;
  /** 첫 해금 비용. 반복 노드는 투자마다 cost + floor(level/3) */
  cost: number;
  prereq: ConstellationId | null;
  repeatable: boolean;
}
