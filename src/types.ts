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
  /** 1발당 데미지 */
  damage: number;
  /** px/초 */
  speed: number;
  /** 충돌/렌더 반지름 */
  radius: number;
  /** 동시에 발사되는 투사체 수 */
  count: number;
  /** count개가 퍼지는 전체 각도(도). 0이면 정면 일점사 */
  spreadDeg: number;
  /** 유도 회전 속도(rad/s). 0이면 비유도 */
  homingTurnRate: number;
  /** 관통 가능한 적 수 */
  pierce: number;
  /** 수명(초) */
  lifetime: number;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  tier: WeaponTier;
  icon: string;
  color: string;
  desc: string;
  /** 발사 쿨타임(ms) */
  cooldownMs: number;
  projectile: ProjectileSpec;
}

/** 조합 레시피: materials 2개 소모 → result 1개 획득 */
export interface Recipe {
  materials: [WeaponId, WeaponId];
  result: WeaponId;
}

// ------------------------------------------------------------

export type EnemyId = 'drone' | 'zigzag' | 'dasher' | 'rusher' | 'tank' | 'boss';

/** 스폰 방향. top은 일반 스폰, side/bottom은 Warning(2초) 후 기습 스폰 */
export type SpawnEdge = 'top' | 'side' | 'bottom';

export type MovePattern = 'down' | 'zigzag' | 'dashAcross' | 'dashUp' | 'slowDown' | 'boss';

/** 드롭 아이템 종류: 회복 / 자석(모든 보석 흡수) / 폭탄(전체 데미지) */
export type PickupKind = 'heal' | 'magnet' | 'bomb';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  hp: number;
  speed: number;
  radius: number;
  color: string;
  /** 플레이어 접촉 시 데미지 */
  contactDamage: number;
  /** 드롭 경험치 */
  exp: number;
  spawnEdge: SpawnEdge;
  movePattern: MovePattern;
}

/** 웨이브: 시간 구간별로 어떤 적을 몇 초 간격으로 스폰할지 */
export interface WaveEntry {
  enemy: EnemyId;
  /** 스폰 간격(초) */
  interval: number;
}

export interface Wave {
  /** 시작 시각(초) */
  from: number;
  /** 종료 시각(초). Infinity 가능 */
  to: number;
  entries: WaveEntry[];
}

// ------------------------------------------------------------
// 레벨업 선택지
// ------------------------------------------------------------

export type ChoiceKind = 'merge' | 'new' | 'upgrade' | 'jackpot' | 'heal';

export interface LevelUpChoice {
  kind: ChoiceKind;
  /** 가중치 추첨용 */
  weight: number;
  title: string;
  desc: string;
  icon: string;
  color: string;
  /** merge: 재료 2개 / new·upgrade: 대상 1개 */
  weaponIds?: WeaponId[];
  resultId?: WeaponId;
}
