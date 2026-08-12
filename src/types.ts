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
  | 'omega'
  | 'starfall'
  | 'genesis';

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
}

export type PassiveId = 'magnet' | 'thruster' | 'plating' | 'collector' | 'overcharge';

export interface PassiveDef {
  id: PassiveId;
  name: string;
  icon: string;
  color: string;
  desc: string;
  /** 레벨당 효과 수치 (의미는 id별 상이) */
  perLevel: number;
  maxLevel: number;
}

export type MetaUpgradeId = 'hull' | 'firepower' | 'thruster' | 'magnet' | 'fortune';

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  icon: string;
  desc: string;
  maxLevel: number;
  /** 레벨 n → n+1 비용 = baseCost * (n+1) */
  baseCost: number;
  /** 레벨당 보너스 (배율 또는 가산 — id별) */
  perLevel: number;
}

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
  | 'boss'
  | 'bossSeraph';

export type SpawnEdge = 'top' | 'side' | 'bottom';

export type MovePattern =
  | 'down'
  | 'zigzag'
  | 'dashAcross'
  | 'dashUp'
  | 'slowDown'
  | 'boss'
  | 'bossSeraph';

export type PickupKind = 'heal' | 'magnet' | 'bomb';

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
}

export interface Wave {
  from: number;
  to: number;
  entries: WaveEntry[];
}

// ------------------------------------------------------------
// 레벨업 선택지
// ------------------------------------------------------------

export type ChoiceKind =
  | 'merge'
  | 'new'
  | 'upgrade'
  | 'jackpot'
  | 'heal'
  | 'passive'
  | 'passiveUp';

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
}
