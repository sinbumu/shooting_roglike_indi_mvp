import type {
  WeaponDef, WeaponId, Recipe, EnemyDef, EnemyId, Wave,
  ShipDef, ShipId, PassiveDef, PassiveId,
  MetaUpgradeDef, MetaUpgradeId, AchievementDef, AchievementId,
  StageDef, StageId, ChallengeDef, ChallengeId,
  AffixId, StatBoostId, TacticalId,
} from './types';

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
  /** 런 중 패시브 슬롯 최대 */
  maxPassiveSlots: 3,
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
  bossSeraph: {
    id: 'bossSeraph', name: '세라프', hp: 800, speed: 70, radius: 38, color: '#38bdf8',
    contactDamage: 28, exp: 0, spawnEdge: 'top', movePattern: 'bossSeraph',
  },
};

// ------------------------------------------------------------
// 시작 기체
// ------------------------------------------------------------

export const SHIPS: Record<ShipId, ShipDef> = {
  scout: {
    id: 'scout', name: '스카웃', icon: '🛸', color: '#7dd3fc',
    desc: '빠른 기동. 체력은 낮지만 회피에 유리합니다.',
    hpMul: 0.85, speedMul: 1.2, startingWeapon: 'vulcan', unlockCost: 0,
  },
  fortress: {
    id: 'fortress', name: '포트리스', icon: '🛡️', color: '#86efac',
    desc: '두꺼운 장갑. 느리지만 맞아도 버팁니다. 스프레드로 시작.',
    hpMul: 1.35, speedMul: 0.82, startingWeapon: 'spread', unlockCost: 120,
  },
  hunter: {
    id: 'hunter', name: '헌터', icon: '🎯', color: '#fdba74',
    desc: '균형형. 호밍으로 시작해 추격전에 강합니다.',
    hpMul: 1.0, speedMul: 1.0, startingWeapon: 'homing', unlockCost: 120,
  },
};

export const DEFAULT_SHIP: ShipId = 'scout';

// ------------------------------------------------------------
// 런 중 패시브 (레벨업 카드)
// ------------------------------------------------------------

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  magnet: {
    id: 'magnet', name: '자력장', icon: '🧲', color: '#38bdf8',
    desc: '보석 자석 반경 증가', perLevel: 35, maxLevel: 5,
  },
  thruster: {
    id: 'thruster', name: '추력 부스터', icon: '💨', color: '#a5b4fc',
    desc: '이동 속도 증가', perLevel: 0.08, maxLevel: 5,
  },
  plating: {
    id: 'plating', name: '반응장갑', icon: '🧱', color: '#94a3b8',
    desc: '받는 피해 감소', perLevel: 0.08, maxLevel: 4,
  },
  collector: {
    id: 'collector', name: '수집 모듈', icon: '📗', color: '#4ade80',
    desc: '경험치 획득량 증가', perLevel: 0.15, maxLevel: 5,
  },
  overcharge: {
    id: 'overcharge', name: '과충전', icon: '💢', color: '#fbbf24',
    desc: '모든 무기 데미지 증가', perLevel: 0.12, maxLevel: 5,
  },
};

// ------------------------------------------------------------
// 영구 메타 업그레이드 (런 간)
// ------------------------------------------------------------

export const META_UPGRADES: Record<MetaUpgradeId, MetaUpgradeDef> = {
  hull: {
    id: 'hull', name: '선체 강화', icon: '❤️',
    desc: '최대 체력 +10%/레벨', maxLevel: 5, baseCost: 40, perLevel: 0.1,
  },
  firepower: {
    id: 'firepower', name: '화력 보정', icon: '🔥',
    desc: '무기 데미지 +8%/레벨', maxLevel: 5, baseCost: 45, perLevel: 0.08,
  },
  thruster: {
    id: 'thruster', name: '엔진 개조', icon: '🚀',
    desc: '이동 속도 +6%/레벨', maxLevel: 5, baseCost: 35, perLevel: 0.06,
  },
  magnet: {
    id: 'magnet', name: '자석 코어', icon: '🧲',
    desc: '자석 반경 +15px/레벨', maxLevel: 5, baseCost: 30, perLevel: 15,
  },
  fortune: {
    id: 'fortune', name: '행운 회로', icon: '🍀',
    desc: '아이템 드롭률 +1%/레벨', maxLevel: 5, baseCost: 50, perLevel: 0.01,
  },
};

export const META = {
  storageKey: 'stellar-meta-v2',
  creditsPerScore: 0.01,
  clearBonus: 40,
  bossKillBonus: 25,
} as const;

export const ACHIEVEMENTS: Record<AchievementId, AchievementDef> = {
  first_blood: { id: 'first_blood', name: '첫 격추', desc: '적을 1기 처치', icon: '✨', reward: 10 },
  survive_60: { id: 'survive_60', name: '1분 생존', desc: '60초 이상 생존', icon: '⏱️', reward: 15 },
  survive_180: { id: 'survive_180', name: '3분 생존', desc: '180초 이상 생존', icon: '⌛', reward: 30 },
  clear_mission: { id: 'clear_mission', name: '미션 클리어', desc: '5분 생존 성공', icon: '🏆', reward: 80 },
  boss_slayer: { id: 'boss_slayer', name: '보스 슬레이어', desc: '보스를 1기 이상 처치', icon: '💀', reward: 35 },
  tier2: { id: 'tier2', name: '상위 무장', desc: 'Tier2 무기 획득', icon: '⚡', reward: 25 },
  tier3: { id: 'tier3', name: '종결 무장', desc: 'Tier3 무기 획득', icon: '🌟', reward: 60 },
  combo_20: { id: 'combo_20', name: '광란', desc: '콤보 20 달성', icon: '🔥', reward: 20 },
  score_10k: { id: 'score_10k', name: '만점 비행사', desc: '한 판 10,000점', icon: '🎯', reward: 40 },
  elite_hunter: { id: 'elite_hunter', name: '엘리트 헌터', desc: '엘리트 적 처치', icon: '👑', reward: 20 },
  nebula_clear: { id: 'nebula_clear', name: '성운 돌파', desc: '성운 전선 클리어', icon: '🌌', reward: 50 },
  rift_clear: { id: 'rift_clear', name: '균열 돌파', desc: '공허 균열 클리어', icon: '🕳️', reward: 70 },
  challenge_clear: { id: 'challenge_clear', name: '도전자', desc: '표준 외 도전 모드로 클리어', icon: '🎖️', reward: 45 },
};

/** 엘리트 적 (일반 적의 강화 버전) */
export const ELITE = {
  /** 이 시각(초) 이후부터 엘리트 등장 가능 */
  unlockAt: 40,
  /** 스폰 시 엘리트가 될 확률 */
  chance: 0.12,
  hpMul: 2.4,
  speedMul: 1.15,
  damageMul: 1.35,
  expMul: 3,
  scoreMul: 3,
  /** 처치 시 아이템 확정 드롭 */
  guaranteedPickup: true,
} as const;

// ------------------------------------------------------------
// 보스전
// ------------------------------------------------------------

export const BOSS = {
  /** 보스 등장 시각(초) */
  times: [75, 165, 255],
  /** 회차별 보스 종류 (순환) */
  roster: ['boss', 'bossSeraph', 'boss'] as const satisfies readonly EnemyId[],
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
  /** 세라프: 나선 탄막 */
  spiralInterval: 0.12,
  spiralSpeed: 200,
  /** 처치 보너스 점수 */
  score: 5000,
  /** HP 비율 이하에서 페이즈 2 (1회) */
  phaseHpRatio: 0.5,
  /** 페이즈 전환 시 보석 수 = gemDrop * 이 값 */
  phaseGemMul: 0.6,
  /** 페이즈 2 탄막 간격 배율 (<1 = 더 빽빽) */
  phaseFireRateMul: 0.75,
} as const;

export const COMBAT = {
  baseCritChance: 0.08,
  baseCritMul: 1.5,
} as const;

/** 한계 돌파 — 슬롯/강화 소진 후 레벨업 풀 */
export const ENDGAME = {
  stats: {
    projSpeed: {
      id: 'projSpeed' as StatBoostId,
      title: '투사체 가속',
      desc: '투사체 속도 +2%',
      icon: '💨',
      color: '#7dd3fc',
      amount: 0.02,
      weight: 40,
    },
    critMul: {
      id: 'critMul' as StatBoostId,
      title: '치명 증폭',
      desc: '치명타 배율 +5%',
      icon: '💥',
      color: '#fbbf24',
      amount: 0.05,
      weight: 40,
    },
    moveSpeed: {
      id: 'moveSpeed' as StatBoostId,
      title: '기동 한계돌파',
      desc: '이동 속도 +3%',
      icon: '⚡',
      color: '#a5b4fc',
      amount: 0.03,
      weight: 40,
    },
  },
  /** Tier3 조합 성공 시 어픽스 부여 확률 */
  tier3AffixChance: 0.4,
} as const;

export const TACTICAL: Record<TacticalId, {
  id: TacticalId;
  title: string;
  desc: string;
  icon: string;
  color: string;
  weight: number;
  duration?: number;
  magnetMul?: number;
  expMul?: number;
}> = {
  emp: {
    id: 'emp', title: 'EMP 폭발',
    desc: '화면 적 탄 소멸 · 잡몹 제거 · 보스에 큰 피해',
    icon: '📡', color: '#38bdf8', weight: 28,
  },
  shield: {
    id: 'shield', title: '과충전 쉴드',
    desc: '10초간 무적 (충돌·탄 피해 무시)',
    icon: '🛡️', color: '#86efac', weight: 28, duration: 10,
  },
  magnetStorm: {
    id: 'magnetStorm', title: '자기장 폭주',
    desc: '15초간 자석 300% · 경험치 1.5배',
    icon: '🧲', color: '#c084fc', weight: 28, duration: 15,
    magnetMul: 3, expMul: 1.5,
  },
};

export const AFFIXES: Record<AffixId, {
  id: AffixId;
  name: string;
  label: string;
  desc: string;
  icon: string;
  color: string;
  weight: number;
}> = {
  split: {
    id: 'split', name: '분열', label: '[분열]',
    desc: '명중 소멸 시 3갈래로 쪼개짐',
    icon: '✳️', color: '#f472b6', weight: 30,
  },
  pierce: {
    id: 'pierce', name: '관통', label: '[관통]',
    desc: '투사체 관통 횟수 +2',
    icon: '➡️', color: '#4ade80', weight: 30,
  },
  chain: {
    id: 'chain', name: '연쇄', label: '[연쇄]',
    desc: '명중 시 가까운 적에게 전이',
    icon: '🔗', color: '#fbbf24', weight: 30,
  },
};

/** 돌발 균열 이벤트 웨이브 */
export const RIFT_EVENT = {
  firstAt: 50,
  cooldown: 55,
  /** 보스 스폰 전후 이 초 안이면 스킵 */
  bossAvoidWindow: 8,
  warnLead: 2.2,
  eliteCount: 6,
  elitePool: ['dasher', 'rusher', 'tank', 'zigzag'] as const satisfies readonly EnemyId[],
} as const;

/** 런 전용 크래프팅 화폐 (퀀텀 큐브) */
export const QUANTUM = {
  phaseDrop: 1,
  riftEliteDrop: 1,
  jackpotDrop: 1,
} as const;

/** 무기고 (Arsenal Terminal) */
export const ARSENAL = {
  openTimes: [180, 270] as const,
  costs: { reroll: 1, grant: 2, buff: 1 },
  buffDamage: 0.1,
  /** 엔드게임 레벨업 카드 가중치 */
  choiceWeight: 22,
} as const;

/** 어픽스 × 보조 스탯 시너지 수치 */
export const AFFIX_SYNERGY = {
  chain: {
    baseJumps: 2,
    baseRange: 140,
    /** 자석 반경 보너스 +20%마다 */
    magnetStep: 0.2,
    jumpsPerStep: 1,
    rangePerStep: 0.15,
    damageMul: 0.55,
  },
  pierce: {
    affixBonus: 2,
    /** 관통 히트마다 기본 데미지 배수 */
    baseFalloff: 0.8,
    /** 투속 +10%마다 감소율 상쇄 (5%p) */
    speedStep: 0.1,
    falloffMitigation: 0.05,
    minFalloff: 0.5,
    /** projSpeedMul 초과 시 가속 딜 */
    accelThreshold: 1.4,
    accelMul: 1.1,
  },
  split: {
    damageMul: 0.5,
    shardLife: 0.55,
    shardSpeedMul: 0.85,
  },
} as const;

// ------------------------------------------------------------
// 승리 조건 / 점수 / 드롭 아이템
// ------------------------------------------------------------

/** 기본 승리 시간 (스테이지별로 덮어씀) */
export const VICTORY_TIME = 300;

export const SCORE = {
  killBase: 10,
  comboBonus: 0.04,
  comboWindow: 2.0,
} as const;

export const PICKUPS = {
  dropChance: 0.035,
  healAmount: 25,
  bombDamage: 250,
  radius: 11,
  lifetime: 12,
} as const;

export const WARNING_DURATION = 2.0;

export const enemyHpScale = (timeSec: number): number => 1 + (timeSec / 30) * 0.4;

export const spawnIntervalScale = (timeSec: number): number =>
  Math.max(0.35, 1 - timeSec / 180);

// ------------------------------------------------------------
// 스테이지 (테마 · 웨이브 · 스토리)
// ------------------------------------------------------------

const ORBIT_WAVES: Wave[] = [
  { from: 0, to: Infinity, entries: [{ enemy: 'drone', interval: 1.1 }] },
  { from: 15, to: Infinity, entries: [{ enemy: 'zigzag', interval: 2.4 }] },
  { from: 35, to: Infinity, entries: [{ enemy: 'dasher', interval: 4.5 }] },
  { from: 55, to: Infinity, entries: [{ enemy: 'rusher', interval: 6.0 }] },
  { from: 75, to: Infinity, entries: [{ enemy: 'tank', interval: 9.0 }] },
  { from: 120, to: Infinity, entries: [{ enemy: 'drone', interval: 0.9 }, { enemy: 'dasher', interval: 5.0 }] },
];

const NEBULA_WAVES: Wave[] = [
  { from: 0, to: Infinity, entries: [{ enemy: 'zigzag', interval: 1.4 }] },
  { from: 10, to: Infinity, entries: [{ enemy: 'drone', interval: 1.0 }] },
  { from: 25, to: Infinity, entries: [{ enemy: 'dasher', interval: 3.5 }] },
  { from: 45, to: Infinity, entries: [{ enemy: 'rusher', interval: 5.0 }] },
  { from: 60, to: Infinity, entries: [{ enemy: 'tank', interval: 7.5 }] },
  { from: 100, to: Infinity, entries: [{ enemy: 'dasher', interval: 3.0 }, { enemy: 'zigzag', interval: 1.2 }] },
];

const RIFT_WAVES: Wave[] = [
  { from: 0, to: Infinity, entries: [{ enemy: 'drone', interval: 0.85 }] },
  { from: 8, to: Infinity, entries: [{ enemy: 'dasher', interval: 3.2 }] },
  { from: 20, to: Infinity, entries: [{ enemy: 'rusher', interval: 4.2 }] },
  { from: 35, to: Infinity, entries: [{ enemy: 'tank', interval: 6.5 }] },
  { from: 50, to: Infinity, entries: [{ enemy: 'zigzag', interval: 1.1 }] },
  { from: 90, to: Infinity, entries: [{ enemy: 'dasher', interval: 2.4 }, { enemy: 'rusher', interval: 3.8 }, { enemy: 'drone', interval: 0.7 }] },
];

export const STAGES: Record<StageId, StageDef> = {
  orbit: {
    id: 'orbit', name: '궤도 방벽', icon: '🛰️', color: '#7dd3fc',
    desc: '지구 궤도. 기본 전선. 시스템을 익히기 좋습니다.',
    victoryTime: 300,
    bgTop: 0x0b0e22, bgBottom: 0x070812,
    waves: ORBIT_WAVES,
    bossTimes: [75, 165, 255],
    bossRoster: ['boss', 'bossSeraph', 'boss'],
    clearCreditMul: 1,
    story: [
      { at: 0, text: '궤도 방벽 방어 개시. 생존 시간 5분.' },
      { at: 30, text: '적 함대 밀도 상승. 빌드를 서두르세요.' },
      { at: 72, text: '대형 반응 확인… 드레드노트급 접근.' },
      { at: 162, text: '두 번째 고비. 탄막을 읽으세요.' },
      { at: 250, text: '최종 방어선. 조금만 더!' },
    ],
  },
  nebula: {
    id: 'nebula', name: '성운 전선', icon: '🌌', color: '#c084fc',
    desc: '시야가 흐린 성운. 기습이 빠르고 보스가 먼저 옵니다.',
    unlockAfter: 'orbit',
    victoryTime: 270,
    bgTop: 0x1a1030, bgBottom: 0x0a0618,
    waves: NEBULA_WAVES,
    bossTimes: [55, 140, 230],
    bossRoster: ['bossSeraph', 'boss', 'bossSeraph'],
    clearCreditMul: 1.25,
    story: [
      { at: 0, text: '성운 속으로 진입. 센서 교란 주의.' },
      { at: 25, text: '측면 돌파가 잦습니다. Warning을 믿으세요.' },
      { at: 52, text: '푸른 섬광… 세라프가 먼저 나타납니다.' },
      { at: 135, text: '성운 핵에 접근 중. 화력을 모으세요.' },
      { at: 220, text: '돌파까지 얼마 남지 않았습니다.' },
    ],
  },
  rift: {
    id: 'rift', name: '공허 균열', icon: '🕳️', color: '#fb7185',
    desc: '최전선. 물량과 탄막이 동시에 몰려옵니다. 4분 30초.',
    unlockAfter: 'nebula',
    victoryTime: 270,
    bgTop: 0x2a0a14, bgBottom: 0x0c0408,
    waves: RIFT_WAVES,
    bossTimes: [45, 120, 210],
    bossRoster: ['boss', 'bossSeraph', 'boss'],
    clearCreditMul: 1.5,
    story: [
      { at: 0, text: '균열 너머. 귀환 좌표는 확보되지 않았습니다.' },
      { at: 40, text: '조기 보스 경보! 대비하세요.' },
      { at: 90, text: '공허가 밀려옵니다. 콤보를 유지하세요.' },
      { at: 200, text: '마지막 파도. 여기서 끝내십시오.' },
    ],
  },
};

export const DEFAULT_STAGE: StageId = 'orbit';

/** 하위 호환: 기본 스테이지 웨이브 */
export const WAVES = STAGES.orbit.waves;

// ------------------------------------------------------------
// 도전 모드
// ------------------------------------------------------------

export const CHALLENGES: Record<ChallengeId, ChallengeDef> = {
  standard: {
    id: 'standard', name: '표준', icon: '⭐',
    desc: '기본 규칙. 슬롯 5·패시브 3.',
  },
  tight: {
    id: 'tight', name: '제한 무장', icon: '🔒',
    desc: '무기 슬롯 3. 조합 선택이 더 중요합니다.',
    weaponSlotCap: 3, scoreMul: 1.25, creditMul: 1.2,
  },
  fragile: {
    id: 'fragile', name: '유리 장갑', icon: '💔',
    desc: '최대 체력 50%. 실수는 곧바로 끝입니다.',
    hpMul: 0.5, scoreMul: 1.35, creditMul: 1.25,
  },
  bare: {
    id: 'bare', name: '맨몸 출격', icon: '🪶',
    desc: '패시브 슬롯 0. 무기만으로 버티세요.',
    passiveSlotCap: 0, scoreMul: 1.3, creditMul: 1.2,
  },
};

export const DEFAULT_CHALLENGE: ChallengeId = 'standard';

export const GEM = {
  radius: 7,
  magnetSpeed: 520,
  lifetime: 25,
} as const;

export const HEAL_CARD_RATIO = 0.3;

/** 엔드게임 폴백 풀에서 수리 카드 가중치 */
export const HEAL_CARD_WEIGHT = 18;
