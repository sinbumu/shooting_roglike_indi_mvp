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
  | 'solance';

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
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  tier: WeaponTier;
  icon: string;
  color: string;
  desc: string;
  cooldownMs: number;
  projectile: ProjectileSpec;
}

export interface Recipe {
  materials: [WeaponId, WeaponId];
  result: WeaponId;
}

// ------------------------------------------------------------
// 시작 기체 / 패시브 / 메타
// ------------------------------------------------------------

export type ShipId = 'scout' | 'fortress' | 'hunter';

export type ActiveSkillId = 'phaseDash' | 'aegis' | 'timeDilation';

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

export type PassiveId = 'magnet' | 'thruster' | 'plating' | 'collector' | 'overcharge' | 'overload';

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
export type ProjSkinId = 'vulcanCrimson' | 'spreadIon' | 'homingNova';

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
  | 'nebula_clear'
  | 'rift_clear'
  | 'challenge_clear';

export interface AchievementDef {
  id: AchievementId;
  name: string;
  desc: string;
  icon: string;
  reward: number;
}

export type StageId = 'orbit' | 'nebula' | 'rift';

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
  | 'boss'
  | 'bossSeraph';

/** 후반 돌연변이 */
export type MutationId = 'explode' | 'split' | 'burst';

export type PickupKind = 'heal' | 'magnet' | 'bomb' | 'cube';

/** Tier3 / 엔드게임 무기 접사 */
export type AffixId = 'split' | 'pierce' | 'chain';

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

export type CraftOp = 'affix' | 'damage' | 'speed';

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
  | 'craft';

export interface LevelUpChoice {
  kind: ChoiceKind;
  weight: number;
  title: string;
  desc: string;
  icon: string;
  color: string;
  weaponIds?: WeaponId[];
  resultId?: WeaponId;
  passiveId?: PassiveId;
  statId?: StatBoostId;
  tacticalId?: TacticalId;
  affixId?: AffixId;
  craftOp?: CraftOp;
}
