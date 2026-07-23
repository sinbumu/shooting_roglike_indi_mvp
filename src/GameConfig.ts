import type { WeaponDef, WeaponId, Recipe, EnemyDef, EnemyId, Wave } from './types';

// ============================================================
// 게임 밸런스/데이터 전부를 여기서 관리한다 (Data-Driven)
// ============================================================

export const CANVAS = {
  width: 480,
  height: 800,
} as const;

export const PLAYER = {
  radius: 14,
  maxHp: 100,
  /** px/초 — 조이스틱/키보드 방향 이동 속도 */
  moveSpeed: 430,
  /** 피격 후 무적 시간(ms) */
  invincibleMs: 900,
  /** 보석 자석 반경 */
  magnetRadius: 90,
  maxWeaponSlots: 5,
} as const;

/** 가상 조이스틱 설정 (CSS px 기준) */
export const JOYSTICK = {
  /** 스틱 최대 이동 반경 */
  radius: 56,
} as const;

export const LEVELING = {
  /** 레벨 n → n+1에 필요한 경험치 */
  expForLevel: (level: number): number => 8 + Math.floor(level * 4.5),
  /** 무기 최대 레벨 */
  maxWeaponLevel: 8,
  /** 레벨당 데미지 배율 증가 */
  damagePerLevel: 0.3,
  /** 레벨당 쿨타임 감소율 (곱연산, 최대 45%까지) */
  cooldownPerLevel: 0.05,
  /** 대성공(Jackpot) 등장 확률 */
  jackpotChance: 0.04,
} as const;

// ------------------------------------------------------------
// 무기 트리
//   Tier1: vulcan(직사) / spread(방사) / homing(유도)
//   Tier2: laser = vulcan+spread / railgun = vulcan+homing / swarm = spread+homing
//   Tier3: omega = laser+railgun / starfall = laser+swarm / genesis = railgun+swarm
// ------------------------------------------------------------

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  // ---------- Tier 1 ----------
  vulcan: {
    id: 'vulcan', name: '벌컨', tier: 1, icon: '🔫', color: '#ffd93d',
    desc: '정면으로 빠르게 연사하는 직사형 기관포',
    cooldownMs: 320,
    projectile: { damage: 8, speed: 720, radius: 4, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 0, lifetime: 1.6 },
  },
  spread: {
    id: 'spread', name: '스프레드', tier: 1, icon: '🌊', color: '#4dd0e1',
    desc: '부채꼴로 5발을 흩뿌리는 방사형 산탄포',
    cooldownMs: 780,
    projectile: { damage: 6, speed: 520, radius: 5, count: 5, spreadDeg: 64, homingTurnRate: 0, pierce: 0, lifetime: 1.4 },
  },
  homing: {
    id: 'homing', name: '호밍 미사일', tier: 1, icon: '🚀', color: '#ff8a65',
    desc: '가장 가까운 적을 추적하는 유도형 미사일',
    cooldownMs: 950,
    projectile: { damage: 13, speed: 400, radius: 6, count: 2, spreadDeg: 90, homingTurnRate: 4.2, pierce: 0, lifetime: 2.6 },
  },

  // ---------- Tier 2 ----------
  laser: {
    id: 'laser', name: '레이저 배러지', tier: 2, icon: '⚡', color: '#a78bfa',
    desc: '[벌컨+스프레드] 관통하는 광선 3줄기를 발사',
    cooldownMs: 480,
    projectile: { damage: 12, speed: 950, radius: 5, count: 3, spreadDeg: 16, homingTurnRate: 0, pierce: 2, lifetime: 1.2 },
  },
  railgun: {
    id: 'railgun', name: '레일건', tier: 2, icon: '🎯', color: '#4ade80',
    desc: '[벌컨+호밍] 적을 살짝 추적하는 초고속 관통탄',
    cooldownMs: 700,
    projectile: { damage: 34, speed: 1050, radius: 7, count: 1, spreadDeg: 0, homingTurnRate: 1.6, pierce: 5, lifetime: 1.5 },
  },
  swarm: {
    id: 'swarm', name: '스웜 드론', tier: 2, icon: '🐝', color: '#f472b6',
    desc: '[스프레드+호밍] 전방위로 유도탄 6발을 살포',
    cooldownMs: 820,
    projectile: { damage: 10, speed: 430, radius: 5, count: 6, spreadDeg: 360, homingTurnRate: 5.2, pierce: 0, lifetime: 2.8 },
  },

  // ---------- Tier 3 (종결 무기) ----------
  omega: {
    id: 'omega', name: '오메가 캐논', tier: 3, icon: '☀️', color: '#fbbf24',
    desc: '[레이저+레일건] 모든 것을 꿰뚫는 3연장 파멸 광선',
    cooldownMs: 420,
    projectile: { damage: 38, speed: 1150, radius: 9, count: 3, spreadDeg: 12, homingTurnRate: 0, pierce: 99, lifetime: 1.3 },
  },
  starfall: {
    id: 'starfall', name: '스타폴', tier: 3, icon: '🌟', color: '#67e8f9',
    desc: '[레이저+스웜] 별의 파편 10발이 적을 쫓아 관통',
    cooldownMs: 460,
    projectile: { damage: 15, speed: 560, radius: 6, count: 10, spreadDeg: 360, homingTurnRate: 3.4, pierce: 1, lifetime: 2.4 },
  },
  genesis: {
    id: 'genesis', name: '제네시스', tier: 3, icon: '💫', color: '#c084fc',
    desc: '[레일건+스웜] 강력한 유도 관통탄 4발을 연달아 발사',
    cooldownMs: 540,
    projectile: { damage: 30, speed: 820, radius: 8, count: 4, spreadDeg: 140, homingTurnRate: 6.0, pierce: 3, lifetime: 2.2 },
  },
};

export const RECIPES: Recipe[] = [
  { materials: ['vulcan', 'spread'], result: 'laser' },
  { materials: ['vulcan', 'homing'], result: 'railgun' },
  { materials: ['spread', 'homing'], result: 'swarm' },
  { materials: ['laser', 'railgun'], result: 'omega' },
  { materials: ['laser', 'swarm'], result: 'starfall' },
  { materials: ['railgun', 'swarm'], result: 'genesis' },
];

/** 시작 시 지급되는 무기 */
export const STARTING_WEAPON: WeaponId = 'vulcan';

// ------------------------------------------------------------
// 적 데이터
// ------------------------------------------------------------

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  drone: {
    id: 'drone', name: '드론', hp: 18, speed: 95, radius: 14, color: '#f87171',
    contactDamage: 10, exp: 1, spawnEdge: 'top', movePattern: 'down',
  },
  zigzag: {
    id: 'zigzag', name: '지그재그', hp: 28, speed: 120, radius: 15, color: '#fb923c',
    contactDamage: 12, exp: 2, spawnEdge: 'top', movePattern: 'zigzag',
  },
  dasher: {
    id: 'dasher', name: '대셔', hp: 26, speed: 280, radius: 13, color: '#e879f9',
    contactDamage: 16, exp: 3, spawnEdge: 'side', movePattern: 'dashAcross',
  },
  rusher: {
    id: 'rusher', name: '러셔', hp: 42, speed: 220, radius: 16, color: '#f43f5e',
    contactDamage: 20, exp: 4, spawnEdge: 'bottom', movePattern: 'dashUp',
  },
  tank: {
    id: 'tank', name: '탱크', hp: 210, speed: 42, radius: 26, color: '#94a3b8',
    contactDamage: 25, exp: 10, spawnEdge: 'top', movePattern: 'slowDown',
  },
  boss: {
    id: 'boss', name: '드레드노트', hp: 950, speed: 60, radius: 42, color: '#dc2626',
    contactDamage: 30, exp: 0, spawnEdge: 'top', movePattern: 'boss',
  },
};

// ------------------------------------------------------------
// 보스전
// ------------------------------------------------------------

export const BOSS = {
  /** 보스 등장 시각(초) */
  times: [75, 165, 255],
  /** 등장 몇 초 전에 경고 배너를 띄울지 */
  warningLead: 3,
  /** 회차별 체력 배율 (1 + index * 이 값) */
  hpGrowth: 1.6,
  /** 처치 시 드롭되는 보석 수 */
  gemDrop: 24,
  /** 보스 탄환 데미지 */
  bulletDamage: 12,
  /** 전방위 탄막: 발사 간격(초) / 탄 수 / 탄속 */
  ringInterval: 2.6,
  ringCount: 14,
  ringSpeed: 150,
  /** 조준 3연사: 발사 간격(초) / 탄속 */
  aimedInterval: 1.5,
  aimedSpeed: 270,
  /** 처치 보너스 점수 */
  score: 5000,
} as const;

// ------------------------------------------------------------
// 승리 조건 / 점수 / 드롭 아이템
// ------------------------------------------------------------

/** 이 시간(초)까지 생존하면 미션 클리어 */
export const VICTORY_TIME = 300;

export const SCORE = {
  /** 처치 점수 = 적 경험치 × killBase × (1 + 콤보 × comboBonus) */
  killBase: 10,
  comboBonus: 0.04,
  /** 콤보 유지 시간(초) */
  comboWindow: 2.0,
} as const;

export const PICKUPS = {
  /** 일반 적 처치 시 드롭 확률 */
  dropChance: 0.035,
  healAmount: 25,
  bombDamage: 250,
  radius: 11,
  lifetime: 12,
} as const;

/** 기습형(side/bottom) 적이 경고 상태로 대기하는 시간(초) */
export const WARNING_DURATION = 2.0;

/** 시간에 따른 적 체력 배율 — 30초마다 +40% */
export const enemyHpScale = (timeSec: number): number => 1 + (timeSec / 30) * 0.4;

/** 시간에 따른 스폰 간격 배율 — 점점 빨라져 최소 35%까지 */
export const spawnIntervalScale = (timeSec: number): number =>
  Math.max(0.35, 1 - timeSec / 180);

// ------------------------------------------------------------
// 웨이브 스케줄
// ------------------------------------------------------------

export const WAVES: Wave[] = [
  { from: 0,  to: Infinity, entries: [{ enemy: 'drone', interval: 1.1 }] },
  { from: 15, to: Infinity, entries: [{ enemy: 'zigzag', interval: 2.4 }] },
  { from: 35, to: Infinity, entries: [{ enemy: 'dasher', interval: 4.5 }] },
  { from: 55, to: Infinity, entries: [{ enemy: 'rusher', interval: 6.0 }] },
  { from: 75, to: Infinity, entries: [{ enemy: 'tank', interval: 9.0 }] },
  // 후반 물량 러시
  { from: 120, to: Infinity, entries: [{ enemy: 'drone', interval: 0.9 }, { enemy: 'dasher', interval: 5.0 }] },
];

// ------------------------------------------------------------
// 기타 상수
// ------------------------------------------------------------

export const GEM = {
  radius: 7,
  /** 자석에 끌려올 때 속도 */
  magnetSpeed: 520,
  /** 화면에 남아있는 최대 시간(초) */
  lifetime: 25,
} as const;

export const HEAL_CARD_RATIO = 0.3; // 회복 카드: 최대 체력의 30%
