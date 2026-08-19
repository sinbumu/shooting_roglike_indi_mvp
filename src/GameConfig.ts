import type {
  WeaponDef, WeaponId, Recipe, EnemyDef, EnemyId, Wave,
  ShipDef, ShipId, PassiveDef, PassiveId,
  MetaUpgradeDef, MetaUpgradeId, AchievementDef, AchievementId,
  StageDef, StageId, ChallengeDef, ChallengeId,
  AffixId, StatBoostId, TacticalId, WeaponTag,
  ShipSkinId, ProjSkinId, DroneDef, DroneId, PilotTraitId,
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
  /** Shift 정밀 비행 시 이동 속도 배율 */
  focusSpeedMul: 0.45,
  /** 피격 후 무적 시간(ms) */
  invincibleMs: 900,
  /** 보석 자석 반경 */
  magnetRadius: 90,
  maxWeaponSlots: 5,
  /** 런 중 패시브 슬롯 최대 */
  maxPassiveSlots: 4,
  /** 입력 중 목표 속도로의 지수 접근 계수 */
  accel: 14,
  /** 입력 해제 시 감속 계수 (살짝 미끄러짐) */
  friction: 10,
} as const;

/** 가상 조이스틱 설정 (CSS px 기준) */
export const JOYSTICK = {
  /** 스틱 최대 이동 반경 */
  radius: 56,
  /** 정규화 벡터 안쪽 데드존. 바깥은 재정규화 */
  deadzone: 0.12,
} as const;

export const LEVELING = {
  /** 레벨 n → n+1에 필요한 경험치 */
  expForLevel: (level: number): number =>
    8 + Math.floor(level * 3) + Math.floor((level / 5) ** 2),
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
//   Tier1: vulcan / spread / homing / blade / mine
//   Tier2 이종: laser / railgun / swarm
//   Tier2 동형: gatling / nova / mothership
//   Tier2 근접: rotor = blade+spread / beamSword = blade+vulcan
//   Tier2 장판: seekerMine = mine+homing / singularity = mine+spread
//   Tier3: omega / starfall / genesis / tempest / rupture / helix / solance
//          halo = rotor+nova / cleaver = beamSword+laser
//          predator = seekerMine+swarm / eventHorizon = singularity+mothership
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

  // ---------- Tier 2 동형 조합 ----------
  gatling: {
    id: 'gatling', name: '가틀링 건', tier: 2, icon: '🔥', color: '#facc15',
    desc: '[벌컨+벌컨] 퍼짐 없는 한 점 집중 초고속 연사',
    cooldownMs: 95,
    projectile: { damage: 5, speed: 920, radius: 3.5, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 0, lifetime: 1.4 },
  },
  nova: {
    id: 'nova', name: '노바 캐논', tier: 2, icon: '💥', color: '#22d3ee',
    desc: '[스프레드+스프레드] 초광각 산탄. 짧은 사거리 고화력',
    cooldownMs: 640,
    projectile: { damage: 8, speed: 460, radius: 5, count: 12, spreadDeg: 170, homingTurnRate: 0, pierce: 0, lifetime: 0.85 },
  },
  mothership: {
    id: 'mothership', name: '모선 호출', tier: 2, icon: '🛸', color: '#fb7185',
    desc: '[호밍+호밍] 느린 초대형 유도 폭탄. 명중 시 광역 폭발',
    cooldownMs: 1450,
    projectile: {
      damage: 52, speed: 210, radius: 14, count: 1, spreadDeg: 0,
      homingTurnRate: 2.4, pierce: 0, lifetime: 3.6, explodeRadius: 92,
    },
  },

  // ---------- Tier 3 (종결 무기) ----------
  omega: {
    id: 'omega', name: '오메가 캐논', tier: 3, icon: '☀️', color: '#fbbf24',
    desc: '[레이저+레일건] 모든 것을 꿰뚫는 3연장 파멸 광선',
    cooldownMs: 240,
    projectile: { damage: 50, speed: 1150, radius: 9, count: 3, spreadDeg: 12, homingTurnRate: 0, pierce: 99, lifetime: 1.3 },
  },
  starfall: {
    id: 'starfall', name: '스타폴', tier: 3, icon: '🌟', color: '#67e8f9',
    desc: '[레이저+스웜] 별의 파편 10발이 적을 쫓아 관통',
    cooldownMs: 460,
    projectile: { damage: 15, speed: 560, radius: 6, count: 10, spreadDeg: 360, homingTurnRate: 3.4, pierce: 1, lifetime: 2.4 },
  },
  genesis: {
    id: 'genesis', name: '제네시스', tier: 3, icon: '💫', color: '#c084fc',
    desc: '[레일건+스웜] 무작위 적을 조준해 궤적의 적을 꿰뚫는 고화력 관통탄',
    cooldownMs: 480,
    projectile: {
      damage: 76, speed: 1375, radius: 7, count: 1, spreadDeg: 0,
      homingTurnRate: 0, pierce: 8, lifetime: 1.4, targeted: 'random',
    },
  },
  // ---------- Tier 3 동형 T2 경로 ----------
  tempest: {
    id: 'tempest', name: '템페스트', tier: 3, icon: '🌪️', color: '#38bdf8',
    desc: '[가틀링+노바] 전방위로 무작위 탄막을 뿌리는 근접 난사',
    cooldownMs: 280,
    projectile: {
      damage: 9, speed: 640, radius: 4.5, count: 16, spreadDeg: 360,
      homingTurnRate: 0, pierce: 0, lifetime: 0.85, randomSpread: true,
    },
  },
  rupture: {
    id: 'rupture', name: '파열핵', tier: 3, icon: '☢️', color: '#fb923c',
    desc: '[가틀링+모선] 가장 먼 적을 조준. 적진을 가로지른 뒤 폭발하는 광역탄',
    cooldownMs: 560,
    projectile: {
      damage: 72, speed: 520, radius: 12, count: 1, spreadDeg: 0,
      homingTurnRate: 0, pierce: 0, lifetime: 1.5, explodeRadius: 142, ignoreShield: true,
      targeted: 'farthest',
    },
  },
  solance: {
    id: 'solance', name: '솔라 랜스', tier: 3, icon: '🔆', color: '#fde68a',
    desc: '[가틀링+레일건] 정면으로 굵은 빔이 경로의 모든 적을 지짐',
    cooldownMs: 680,
    projectile: {
      damage: 18, speed: 0, radius: 8, count: 1, spreadDeg: 0,
      homingTurnRate: 0, pierce: 99, lifetime: 0.22,
      beam: { duration: 0.22, tickInterval: 0.05, width: 20, length: 920 },
    },
  },
  helix: {
    id: 'helix', name: '해머딘', tier: 3, icon: '🌀', color: '#f472b6',
    desc: '[노바+모선] 주위를 나선형으로 돌며 퍼지는 폭발탄',
    cooldownMs: 580,
    projectile: {
      damage: 20, speed: 110, radius: 8, count: 4, spreadDeg: 360,
      homingTurnRate: 0, pierce: 0, lifetime: 2.6, explodeRadius: 85, spiral: true,
    },
  },
  // ---------- 근접 트리 ----------
  blade: {
    id: 'blade', name: '플라즈마 블레이드', tier: 1, icon: '⚔️', color: '#67e8f9',
    desc: '전방 180도를 베어 적 탄막을 소멸시키는 근접 검',
    tags: ['melee'],
    cooldownMs: 420,
    projectile: {
      damage: 14, speed: 0, radius: 8, count: 1, spreadDeg: 180, homingTurnRate: 0, pierce: 99, lifetime: 0.12,
      melee: { arcDeg: 180, range: 72, duration: 0.12, deflect: true },
    },
  },
  rotor: {
    id: 'rotor', name: '회전 톱날', tier: 2, icon: '⚙️', color: '#94a3b8',
    desc: '[블레이드+스프레드] 주위를 도는 톱날 2개. 인파이팅 방어',
    tags: ['aura'],
    cooldownMs: 120,
    projectile: {
      damage: 7, speed: 0, radius: 10, count: 2, spreadDeg: 360, homingTurnRate: 0, pierce: 99, lifetime: 0.12,
      orbit: { count: 2, radius: 52, persist: true },
    },
  },
  beamSword: {
    id: 'beamSword', name: '빔 소드', tier: 2, icon: '🗡️', color: '#38bdf8',
    desc: '[블레이드+벌컨] 화면 끝까지 전방을 가르는 광역 참격',
    tags: ['melee'],
    cooldownMs: 1400,
    projectile: {
      damage: 48, speed: 0, radius: 13, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 99, lifetime: 0.18,
      melee: { arcDeg: 18, range: 920, duration: 0.18, deflect: true },
    },
  },
  halo: {
    id: 'halo', name: '발키리의 후광', tier: 3, icon: '😇', color: '#fde68a',
    desc: '[톱날+노바] 빛의 고리가 적을 끌어당기며 갈아버림',
    tags: ['aura'],
    cooldownMs: 100,
    projectile: {
      damage: 8, speed: 0, radius: 14, count: 1, spreadDeg: 360, homingTurnRate: 0, pierce: 99, lifetime: 0.1,
      orbit: { count: 1, radius: 88, persist: true, pull: 55 },
    },
  },
  cleaver: {
    id: 'cleaver', name: '차원 절단기', tier: 3, icon: '✂️', color: '#c084fc',
    desc: '[빔소드+레이저] 벤 궤적에 2.5초 차원 균열 DoT',
    tags: ['melee'],
    cooldownMs: 1400,
    projectile: {
      damage: 42, speed: 0, radius: 14, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 99, lifetime: 0.18,
      melee: { arcDeg: 16, range: 920, duration: 0.18, deflect: true },
      drop: { fuse: 0, persist: 2.5, zoneDuration: 2.5, zoneTick: 0.12 },
    },
  },
  // ---------- 장판 트리 ----------
  mine: {
    id: 'mine', name: '중력 지뢰', tier: 1, icon: '💣', color: '#fb923c',
    desc: '이동 궤적 뒤에 3초 후 폭발하는 지뢰를 설치',
    tags: ['drop'],
    cooldownMs: 720,
    projectile: {
      damage: 22, speed: 0, radius: 10, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 0, lifetime: 3,
      explodeRadius: 68, drop: { fuse: 3 },
    },
  },
  seekerMine: {
    id: 'seekerMine', name: '추적 지뢰', tier: 2, icon: '🪲', color: '#f97316',
    desc: '[지뢰+호밍] 바닥에 깔린 지뢰가 최근접 적을 기어가 폭발',
    tags: ['drop'],
    cooldownMs: 760,
    projectile: {
      damage: 26, speed: 90, radius: 10, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 0, lifetime: 4.5,
      explodeRadius: 62, drop: { fuse: 4.5, seekSpeed: 90 },
    },
  },
  singularity: {
    id: 'singularity', name: '특이점 폭탄', tier: 2, icon: '🕳️', color: '#818cf8',
    desc: '[지뢰+스프레드] 전방으로 던져 폭발 전 적을 끌어당긴 뒤 타격',
    tags: ['drop'],
    cooldownMs: 980,
    projectile: {
      damage: 32, speed: 180, radius: 12, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 0, lifetime: 2.4,
      explodeRadius: 92, drop: { fuse: 2.4, pullRadius: 130, pullForce: 220 },
    },
  },
  predator: {
    id: 'predator', name: '프레데터 스웜', tier: 3, icon: '🦂', color: '#ef4444',
    desc: '[추적지뢰+스웜] 1차 폭발 후 소형 유도탄 4발로 2차 전개',
    tags: ['drop'],
    cooldownMs: 820,
    projectile: {
      damage: 20, speed: 180, radius: 9, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 0, lifetime: 4,
      explodeRadius: 54, drop: { fuse: 4, seekSpeed: 200, split: 4 },
    },
  },
  eventHorizon: {
    id: 'eventHorizon', name: '이벤트 호라이즌', tier: 3, icon: '🌑', color: '#1e1b4b',
    desc: '[특이점+모선] 4초간 유지되는 블랙홀 장판. 붕괴와 흡인',
    tags: ['drop'],
    cooldownMs: 1600,
    projectile: {
      damage: 14, speed: 0, radius: 16, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 0, lifetime: 1.2,
      explodeRadius: 110, drop: {
        fuse: 1.2, pullRadius: 150, pullForce: 180,
        persist: 4, zoneDuration: 4, zoneTick: 0.15,
      },
    },
  },
};

export const RECIPES: Recipe[] = [
  { materials: ['vulcan', 'spread'], result: 'laser' },
  { materials: ['vulcan', 'homing'], result: 'railgun' },
  { materials: ['spread', 'homing'], result: 'swarm' },
  { materials: ['vulcan', 'vulcan'], result: 'gatling' },
  { materials: ['spread', 'spread'], result: 'nova' },
  { materials: ['homing', 'homing'], result: 'mothership' },
  { materials: ['laser', 'railgun'], result: 'omega' },
  { materials: ['laser', 'swarm'], result: 'starfall' },
  { materials: ['railgun', 'swarm'], result: 'genesis' },
  { materials: ['gatling', 'nova'], result: 'tempest' },
  { materials: ['gatling', 'mothership'], result: 'rupture' },
  { materials: ['nova', 'mothership'], result: 'helix' },
  { materials: ['gatling', 'railgun'], result: 'solance' },
  { materials: ['blade', 'spread'], result: 'rotor' },
  { materials: ['blade', 'vulcan'], result: 'beamSword' },
  { materials: ['rotor', 'nova'], result: 'halo' },
  { materials: ['beamSword', 'laser'], result: 'cleaver' },
  { materials: ['mine', 'homing'], result: 'seekerMine' },
  { materials: ['mine', 'spread'], result: 'singularity' },
  { materials: ['seekerMine', 'swarm'], result: 'predator' },
  { materials: ['singularity', 'mothership'], result: 'eventHorizon' },
];

/** 동형 조합을 위해 T1 무기를 슬롯에 몇 개까지 복제할 수 있는지 */
export const T1_DUPLICATE_CAP = 2;

/** 시작 시 지급되는 무기 */
export const STARTING_WEAPON: WeaponId = 'vulcan';

// ------------------------------------------------------------
// 위험도 색상 — contactDamage / 보스 탄막 기준
// Low <15 · Medium 15–24 · High 25+ · Fatal = 보스 탄막
// ------------------------------------------------------------

export const DANGER = {
  low: '#4ade80',
  medium: '#f97316',
  high: '#ef4444',
  fatal: '#c084fc',
} as const;

// ------------------------------------------------------------
// 적 데이터
// ------------------------------------------------------------

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  drone: {
    id: 'drone', name: '드론', hp: 18, speed: 95, radius: 14, color: DANGER.low,
    contactDamage: 10, exp: 1, spawnEdge: 'top', movePattern: 'down',
  },
  zigzag: {
    id: 'zigzag', name: '지그재그', hp: 28, speed: 120, radius: 15, color: DANGER.low,
    contactDamage: 12, exp: 2, spawnEdge: 'top', movePattern: 'zigzag',
  },
  dasher: {
    id: 'dasher', name: '대셔', hp: 26, speed: 280, radius: 13, color: DANGER.medium,
    contactDamage: 16, exp: 3, spawnEdge: 'side', movePattern: 'dashAcross',
  },
  rusher: {
    id: 'rusher', name: '러셔', hp: 42, speed: 220, radius: 16, color: DANGER.medium,
    contactDamage: 20, exp: 4, spawnEdge: 'bottom', movePattern: 'dashUp',
  },
  tank: {
    id: 'tank', name: '탱크', hp: 210, speed: 42, radius: 26, color: DANGER.high,
    contactDamage: 25, exp: 10, spawnEdge: 'top', movePattern: 'slowDown',
  },
  shielder: {
    id: 'shielder', name: '실더', hp: 160, speed: 55, radius: 20, color: DANGER.medium,
    contactDamage: 18, exp: 8, spawnEdge: 'top', movePattern: 'shieldDown',
  },
  teleporter: {
    id: 'teleporter', name: '텔레포터', hp: 70, speed: 90, radius: 14, color: DANGER.medium,
    contactDamage: 22, exp: 6, spawnEdge: 'top', movePattern: 'teleport',
  },
  splinter: {
    id: 'splinter', name: '파편', hp: 10, speed: 170, radius: 8, color: DANGER.low,
    contactDamage: 8, exp: 1, spawnEdge: 'top', movePattern: 'down',
  },
  mirage: {
    id: 'mirage', name: '미라지', hp: 55, speed: 135, radius: 15, color: DANGER.medium,
    contactDamage: 18, exp: 7, spawnEdge: 'top', movePattern: 'cloakDown',
  },
  guardian: {
    id: 'guardian', name: '가디언', hp: 420, speed: 38, radius: 28, color: DANGER.high,
    contactDamage: 26, exp: 14, spawnEdge: 'top', movePattern: 'auraDown',
  },
  warden: {
    id: 'warden', name: '방어의 군단장', hp: 780, speed: 38, radius: 36, color: DANGER.high,
    contactDamage: 28, exp: 22, spawnEdge: 'top', movePattern: 'legion',
  },
  herald: {
    id: 'herald', name: '무리의 군단장', hp: 560, speed: 52, radius: 32, color: DANGER.high,
    contactDamage: 26, exp: 20, spawnEdge: 'top', movePattern: 'legion',
  },
  architect: {
    id: 'architect', name: '기술의 군단장', hp: 680, speed: 44, radius: 34, color: DANGER.high,
    contactDamage: 27, exp: 22, spawnEdge: 'top', movePattern: 'legion',
  },
  trapper: {
    id: 'trapper', name: '트래퍼', hp: 380, speed: 48, radius: 24, color: DANGER.high,
    contactDamage: 26, exp: 16, spawnEdge: 'top', movePattern: 'anchorFence',
  },
  vortex: {
    id: 'vortex', name: '보텍스', hp: 300, speed: 36, radius: 26, color: DANGER.high,
    contactDamage: 25, exp: 15, spawnEdge: 'side', movePattern: 'vortexPull',
  },
  boss: {
    id: 'boss', name: '드레드노트', hp: 950, speed: 60, radius: 42, color: DANGER.high,
    contactDamage: 30, exp: 0, spawnEdge: 'top', movePattern: 'boss',
  },
  bossSeraph: {
    id: 'bossSeraph', name: '세라프', hp: 800, speed: 70, radius: 38, color: DANGER.high,
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
    activeSkill: {
      id: 'phaseDash', name: '위상 대시', icon: '🌀',
      cooldown: 6, dashDist: 110, iframeMs: 250,
    },
  },
  fortress: {
    id: 'fortress', name: '포트리스', icon: '🛡️', color: '#86efac',
    desc: '두꺼운 장갑. 느리지만 맞아도 버팁니다. 스프레드로 시작.',
    hpMul: 1.35, speedMul: 0.82, startingWeapon: 'spread', unlockCost: 1200,
    activeSkill: {
      id: 'aegis', name: '절대 방벽', icon: '🛡️',
      cooldown: 12, duration: 2.5, radius: 72,
      knockback: 46, pulseDamage: 38, pulseInterval: 0.3,
    },
  },
  hunter: {
    id: 'hunter', name: '헌터', icon: '🎯', color: '#fdba74',
    desc: '균형형. 호밍으로 시작해 추격전에 강합니다.',
    hpMul: 1.0, speedMul: 1.0, startingWeapon: 'homing', unlockCost: 1200,
    activeSkill: {
      id: 'timeDilation', name: '시간 왜곡', icon: '⏱️',
      cooldown: 15, duration: 4, slowMul: 0.4,
    },
  },
};

export const DEFAULT_SHIP: ShipId = 'scout';

// ------------------------------------------------------------
// 런 중 패시브 (레벨업 카드)
// ------------------------------------------------------------

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  evasion: {
    id: 'evasion', name: '소형화', icon: '🪶', color: '#67e8f9',
    desc: '피격 판정 -8% 감소', perLevel: 0.08, maxLevel: 5,
  },
  cripple: {
    id: 'cripple', name: '구속장', icon: '🕸️', color: '#c084fc',
    desc: '적 이동 속도 -4% 감소', perLevel: 0.04, maxLevel: 5,
  },
  aegis: {
    id: 'aegis', name: '레벨업 쉴드', icon: '🛡️', color: '#86efac',
    desc: '레벨업 시 짧은 피해 감소 보호막', perLevel: 0.1, maxLevel: 5,
  },
  plating: {
    id: 'plating', name: '반응장갑', icon: '🧱', color: '#94a3b8',
    desc: '받는 피해 -8% 감소', perLevel: 0.08, maxLevel: 4,
  },
  collector: {
    id: 'collector', name: '수집 모듈', icon: '📗', color: '#4ade80',
    desc: '경험치 획득량 +15% 증가', perLevel: 0.15, maxLevel: 5,
  },
  overcharge: {
    id: 'overcharge', name: '과충전', icon: '💢', color: '#fbbf24',
    desc: '모든 무기 데미지 +12% 증가', perLevel: 0.12, maxLevel: 5,
  },
  overload: {
    id: 'overload', name: '과부하 코어', icon: '☢️', color: '#f97316',
    desc: '쿨타임 30% 감소, 최대 체력 40% 감소',
    perLevel: 0, maxLevel: 1, hpMul: 0.6, cooldownMul: 0.7,
  },
};

// ------------------------------------------------------------
// 영구 메타 업그레이드 (런 간)
// ------------------------------------------------------------

export const META_UPGRADES: Record<MetaUpgradeId, MetaUpgradeDef> = {
  hull: {
    id: 'hull', name: '선체 강화', icon: '❤️',
    desc: '최대 체력 +10%/레벨', maxLevel: 5, baseCost: 900, perLevel: 0.1,
  },
  firepower: {
    id: 'firepower', name: '화력 보정', icon: '🔥',
    desc: '무기 데미지 +8%/레벨', maxLevel: 5, baseCost: 1200, perLevel: 0.08,
  },
  thruster: {
    id: 'thruster', name: '엔진 개조', icon: '🚀',
    desc: '이동 속도 +6%/레벨', maxLevel: 5, baseCost: 700, perLevel: 0.06,
  },
  magnet: {
    id: 'magnet', name: '자석 코어', icon: '🧲',
    desc: '자석 반경 +15px/레벨', maxLevel: 5, baseCost: 500, perLevel: 15,
  },
  fortune: {
    id: 'fortune', name: '행운 회로', icon: '🍀',
    desc: '아이템 드롭률 +1%/레벨', maxLevel: 5, baseCost: 1500, perLevel: 0.01,
  },
  overclock: {
    id: 'overclock', name: '오버클럭', icon: '⚙️',
    desc: '모든 무기 데미지 +0.2%/레벨 (상한 없음)',
    maxLevel: Infinity, baseCost: 2000, costMul: 1.15, perLevel: 0.002,
  },
  lightArmor: {
    id: 'lightArmor', name: '초경량 장갑', icon: '🪶',
    desc: '이동 속도 +0.2%/레벨 (상한 없음)',
    maxLevel: Infinity, baseCost: 2000, costMul: 1.15, perLevel: 0.002,
  },
};

export const META = {
  storageKey: 'stellar-meta-v2',
  creditsPerScore: 0.001,
  clearBonus: 400,
  bossKillBonus: 250,
} as const;

export const GACHA = {
  cost: 10000,
  dudRefund: 500,
  jackpotFallback: 5000,
  winFallback: 2000,
  jackpotChance: 0.1,
  winChance: 0.3,
} as const;

export const SHIP_SKINS: Record<ShipSkinId, {
  id: ShipSkinId; shipId: ShipId; name: string; tint: string;
}> = {
  darkScout: { id: 'darkScout', shipId: 'scout', name: '다크 매터 스카웃', tint: '#818cf8' },
  gildedFortress: { id: 'gildedFortress', shipId: 'fortress', name: '도금 포트리스', tint: '#fbbf24' },
  voidHunter: { id: 'voidHunter', shipId: 'hunter', name: '보이드 헌터', tint: '#22d3ee' },
};

export const PROJ_SKINS: Record<ProjSkinId, {
  id: ProjSkinId; weaponId: WeaponId; name: string; color: string;
}> = {
  vulcanCrimson: { id: 'vulcanCrimson', weaponId: 'vulcan', name: '크림슨 레이저', color: '#ef4444' },
  spreadIon: { id: 'spreadIon', weaponId: 'spread', name: '이온 스프레드', color: '#a3e635' },
  homingNova: { id: 'homingNova', weaponId: 'homing', name: '노바 호밍', color: '#f472b6' },
  bladeCrimson: { id: 'bladeCrimson', weaponId: 'blade', name: '크림슨 블레이드', color: '#ef4444' },
  mineToxic: { id: 'mineToxic', weaponId: 'mine', name: '맹독 지뢰', color: '#a3e635' },
};

export const ACHIEVEMENTS: Record<AchievementId, AchievementDef> = {
  first_blood: { id: 'first_blood', name: '첫 격추', desc: '적을 1기 처치', icon: '✨', reward: 100 },
  survive_60: { id: 'survive_60', name: '1분 생존', desc: '60초 이상 생존', icon: '⏱️', reward: 150 },
  survive_180: { id: 'survive_180', name: '3분 생존', desc: '180초 이상 생존', icon: '⌛', reward: 300 },
  clear_mission: { id: 'clear_mission', name: '미션 클리어', desc: '5분 생존 성공', icon: '🏆', reward: 800 },
  boss_slayer: { id: 'boss_slayer', name: '보스 슬레이어', desc: '보스를 1기 이상 처치', icon: '💀', reward: 350 },
  tier2: { id: 'tier2', name: '상위 무장', desc: 'Tier2 무기 획득', icon: '⚡', reward: 250 },
  tier3: { id: 'tier3', name: '종결 무장', desc: 'Tier3 무기 획득', icon: '🌟', reward: 600 },
  combo_20: { id: 'combo_20', name: '광란', desc: '콤보 20 달성', icon: '🔥', reward: 200 },
  score_10k: { id: 'score_10k', name: '만점 비행사', desc: '한 판 10,000점', icon: '🎯', reward: 400 },
  elite_hunter: { id: 'elite_hunter', name: '엘리트 헌터', desc: '엘리트 적 처치', icon: '👑', reward: 200 },
  rift_clear: { id: 'rift_clear', name: '균열 돌파', desc: '공허 균열 클리어', icon: '🕳️', reward: 700 },
  legion_clear: { id: 'legion_clear', name: '군단 격파', desc: '군단장의 성역 클리어', icon: '👑', reward: 900 },
  challenge_clear: { id: 'challenge_clear', name: '도전자', desc: '표준 외 도전 모드로 클리어', icon: '🎖️', reward: 450 },
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

/** 후반 돌연변이 (180초~) */
export const MUTATIONS = {
  unlockAt: 180,
  explodeRadius: 52,
  explodeDamage: 22,
  burstCount: 8,
  burstSpeed: 120,
  burstDamage: 10,
} as const;

export const SHIELDER = {
  /** 정면(아래쪽) 판정: 입사 방향과 하향 벡터 내적 임계 (낮을수록 더 넓음) */
  frontDot: 0.08,
  /** 쉴드가 깨지려면 필요한 타격 횟수 (데미지 무관) */
  hits: 50,
} as const;

export const MIRAGE = {
  revealRadius: 200,
} as const;

export const GUARDIAN = {
  auraRadius: 220,
  damageTakenMul: 0.5,
} as const;

export const DROPS = {
  /** 이 y비율 위에서 드롭은 아래로 흘러내림 */
  topBand: 0.15,
  gravity: 70,
  /** 전역 진공 흡인 지속 시간(초) */
  vacuumDuration: 1.2,
} as const;

/** 유도탄 AFK 억제 */
export const HOMING = {
  damageMul: 0.75,
  maxSpeed: 640,
} as const;

/** 군단 스테이지 군단장 */
export const LEGION = {
  interval: 60,
  firstAt: 60,
  hpPerSec: 0.005,
  spawnPerSec: 0.01,
  techSpeedMul: 0.5,
  techShieldBase: 10,
  techShieldPerSec: 0.1,
  commanders: ['warden', 'herald', 'architect'] as const,
} as const;

/** 레벨업 쉴드 패시브 (lv1 = 0.2초 / 30% 감소) */
export const LEVEL_AEGIS = {
  durationBase: 0.2,
  durationPerLv: 0.1,
  reduceBase: 0.3,
  reducePerLv: 0.1,
} as const;

export const TELEPORTER = {
  triggerDist: 115,
  cooldown: 2.4,
} as const;

export const TRAPPER = {
  pylonDist: 110,
  pylonSpeed: 280,
  fenceDamage: 28,
  fenceWidth: 8,
} as const;

export const VORTEX = {
  pullRadius: 170,
  playerAccel: 140,
  projAccel: 220,
} as const;

export const DRONES: Record<DroneId, DroneDef> = {
  retriever: {
    id: 'retriever', name: '수집 드론', icon: '🧲', color: '#38bdf8',
    tag: '[자동 파밍]',
    desc: '3초(레벨업 시 -0.2초)마다 기체 반경 400px 내의 경험치와 드롭 아이템을 즉시 수집.',
    unlockCost: 800, maxLevel: 5, baseCost: 600, costMul: 1.5,
  },
  defender: {
    id: 'defender', name: '요격 드론', icon: '🛡️', color: '#86efac',
    tag: '[탄막 방어]',
    desc: '5초마다 날아오는 투사체 최대 3개(레벨당 +1) 요격.',
    unlockCost: 1000, maxLevel: 5, baseCost: 600, costMul: 1.5,
  },
  amplifier: {
    id: 'amplifier', name: '증폭 드론', icon: '📡', color: '#818cf8',
    tag: '[쿨타임 버프]',
    desc: '15초마다 반경 80px 오라를 깔아, 안에 있으면 최종 쿨타임이 레벨에 따라 감소.',
    unlockCost: 1200, maxLevel: 5, baseCost: 600, costMul: 1.5,
  },
};

export const DRONE_FX = {
  retrieverRadius: 400,
  retrieverInterval: 3,
  retrieverPerLv: 0.2,
  defenderInterval: 5,
  defenderBase: 3,
  amplifierInterval: 15,
  amplifierRadius: 80,
  amplifierDuration: 6,
  /** Lv.1 최종 쿨 배율 (0.6 = 40% 감소) */
  amplifierCooldownMul: 0.6,
  amplifierCooldownMulPerLv: 0.05,
  amplifierCooldownMulFloor: 0.4,
} as const;

export function ampCooldownMul(level: number): number {
  return Math.max(
    DRONE_FX.amplifierCooldownMulFloor,
    DRONE_FX.amplifierCooldownMul - DRONE_FX.amplifierCooldownMulPerLv * (level - 1),
  );
}

// ------------------------------------------------------------
// 보스전
// ------------------------------------------------------------

export const BOSS = {
  /** 등장 페이즈: 패턴/탄막 없이 중앙 상단으로 미끄러져 내려옴 (초) */
  introDuration: 1.8,
  introTargetY: 130,
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
  tags: WeaponTag[];
}> = {
  split: {
    id: 'split', name: '분열', label: '[분열]',
    desc: '명중 소멸 시 3갈래로 쪼개짐',
    icon: '✳️', color: '#f472b6', weight: 30, tags: ['projectile'],
  },
  pierce: {
    id: 'pierce', name: '관통', label: '[관통]',
    desc: '투사체 관통 횟수 +2',
    icon: '➡️', color: '#4ade80', weight: 30, tags: ['projectile'],
  },
  chain: {
    id: 'chain', name: '연쇄', label: '[연쇄]',
    desc: '명중 시 가까운 적에게 전이',
    icon: '🔗', color: '#fbbf24', weight: 30, tags: ['projectile'],
  },
  afterimage: {
    id: 'afterimage', name: '잔상', label: '[잔상]',
    desc: '타격 0.5초 뒤 60% 크기·데미지로 한 번 더 벤다',
    icon: '👻', color: '#67e8f9', weight: 30, tags: ['melee'],
  },
  echo: {
    id: 'echo', name: '메아리', label: '[메아리]',
    desc: '처치 시 20% 확률로 그 자리에서 폭발',
    icon: '💥', color: '#fb923c', weight: 30, tags: ['melee'],
  },
  brilliance: {
    id: 'brilliance', name: '화려한 빛', label: '[화려한 빛]',
    desc: '타격 지점이 커졌다 줄어드는 광역 장판',
    icon: '✨', color: '#fde68a', weight: 30, tags: ['melee'],
  },
};

export const AFFIX_FX = {
  afterimageDelay: 0.5,
  afterimageMul: 0.6,
  echoChance: 0.2,
  echoRadius: 52,
  brillianceLife: 0.45,
  brillianceRadiusMul: 0.22,
} as const;

export function weaponTags(def: WeaponDef): WeaponTag[] {
  if (def.tags && def.tags.length > 0) return def.tags;
  if (def.projectile.melee) return ['melee'];
  if (def.projectile.orbit) return ['aura'];
  if (def.projectile.drop) return ['drop'];
  return ['projectile'];
}

/** 기본 관통이 이 값 이상이면 pierce 어픽스는 무의미하므로 풀에서 제외 */
const PIERCE_AFFIX_MIN = 5;

export function compatibleAffixes(weaponId: WeaponId): AffixId[] {
  const def = WEAPONS[weaponId];
  const tags = weaponTags(def);
  return (Object.keys(AFFIXES) as AffixId[]).filter((id) => {
    if (!AFFIXES[id].tags.some((t) => tags.includes(t))) return false;
    if (id === 'pierce' && def.projectile.pierce >= PIERCE_AFFIX_MIN) return false;
    return true;
  });
}

export function isTickWeapon(id: WeaponId): boolean {
  const tags = weaponTags(WEAPONS[id]);
  return tags.includes('melee') || tags.includes('aura');
}

/** 공허의 제단 */
export const VOID_ALTAR = {
  firstAt: 100,
  radius: 50,
  chargeSec: 3,
  eliteCount: 12,
  ringRadius: 130,
  creditMul: 3,
  elitePool: ['dasher', 'rusher', 'tank', 'zigzag'] as const satisfies readonly EnemyId[],
} as const;

/** 스테이지 환경 재해 */
export const HAZARDS = {
  firstAt: 90,
  cooldown: 75,
  bossAvoidWindow: 8,
  solar: {
    warnSec: 3,
    burnSec: 4,
    hpPctPerSec: 0.1,
    shadeMin: 2,
    shadeMax: 3,
    shadeW: 110,
    shadeH: 110,
  },
  asteroid: {
    warnSec: 2,
    beamW: 80,
    beamMin: 3,
    beamMax: 4,
    bossHpPct: 0.25,
  },
  emp: {
    duration: 10,
  },
} as const;

/** 기믹형 지형지물 (쉴드 / 퀀텀 코어 / 성운 / 모선 잔해) */
export const TERRAIN = {
  shield: {
    firstAt: 35,
    cooldown: 28,
    life: 18,
    w: 28,
    h: 170,
    boostRadius: 1.5,
    sidePad: 36,
    yMin: 140,
    yMax: 500,
  },
  core: {
    firstAt: 50,
    cooldown: 40,
    hp: 220,
    radius: 34,
    explodeRadius: 168,
    damage: 420,
  },
  nebula: {
    firstAt: 25,
    cooldown: 32,
    life: 22,
    radius: 150,
    slowMul: 0.55,
    drift: 18,
  },
  derelict: {
    w: 168,
    h: 78,
    shadeH: 168,
    shadeWMul: 0.92,
    y: 168,
    glowSec: 0.55,
    creditOrbs: 8,
    creditEach: 18,
  },
} as const;

/** Lv.50 코어 각성 */
export const AWAKEN = {
  level: 50,
  dashCharges: 3,
  dashBossHpPct: 0.1,
  aegisPerShot: 45,
  stasisCooldownMul: 0.5,
} as const;

export const PILOT_TRAITS: Record<PilotTraitId, {
  id: PilotTraitId;
  name: string;
  icon: string;
  color: string;
  tag: string;
  desc: string;
  cost: number;
}> = {
  lastStand: {
    id: 'lastStand', name: '배수진', icon: '🩸', color: '#ef4444',
    tag: '[치명]',
    desc: '체력이 30% 이하일 때 모든 공격이 치명타가 됩니다.',
    cost: 1,
  },
  turretDark: {
    id: 'turretDark', name: '포대 암전', icon: '🛑', color: '#f97316',
    tag: '[고정 포격]',
    desc: '입력 없이 2초간 정지하면 붉은 오라가 켜지고 데미지 +40%. 이동 시 즉시 해제.',
    cost: 1,
  },
  executioner: {
    id: 'executioner', name: '처형인', icon: '☠️', color: '#e2e8f0',
    tag: '[즉사]',
    desc: '체력 15% 이하인 일반 적을 타격하면 즉사합니다.',
    cost: 1,
  },
};

export const PILOT_FX = {
  lastStandHp: 0.3,
  turretStillSec: 2,
  turretDmgMul: 1.4,
  execHp: 0.15,
} as const;

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

/** 퀀텀 큐브(오브) 드롭 — 획득 시 즉시 크래프팅 3선택지 */
export const QUANTUM = {
  phaseDrop: 1,
  riftEliteDrop: 1,
  jackpotDrop: 1,
} as const;

/** 크래프팅 강화 수치 (오브 3선택지) */
export const ARSENAL = {
  buffDamage: 0.15,
  buffSpeed: 0.2,
  buffCooldown: 0.10,
  buffRadius: 0.15,
  /** 크래프트 쿨 감소 누적 상한 */
  cooldownBonusCap: 0.5,
  /** 최종 쿨타임 하한 (무기 기본값 대비) */
  cooldownFloor: 0.35,
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
  { from: 180, to: Infinity, entries: [
    { enemy: 'shielder', interval: 7.2 },
    { enemy: 'teleporter', interval: 6.8 },
    { enemy: 'mirage', interval: 8.0 },
    { enemy: 'guardian', interval: 18 },
    { enemy: 'drone', interval: 1.6, mutation: 'explode' },
    { enemy: 'zigzag', interval: 3.4, mutation: 'split' },
    { enemy: 'tank', interval: 14, mutation: 'burst' },
    { enemy: 'trapper', interval: 20 },
    { enemy: 'vortex', interval: 22 },
  ] },
];

const RIFT_WAVES: Wave[] = [
  { from: 0, to: Infinity, entries: [{ enemy: 'drone', interval: 0.85 }] },
  { from: 8, to: Infinity, entries: [{ enemy: 'dasher', interval: 3.2 }] },
  { from: 20, to: Infinity, entries: [{ enemy: 'rusher', interval: 4.2 }] },
  { from: 35, to: Infinity, entries: [{ enemy: 'tank', interval: 6.5 }] },
  { from: 50, to: Infinity, entries: [{ enemy: 'zigzag', interval: 1.1 }] },
  { from: 90, to: Infinity, entries: [{ enemy: 'dasher', interval: 2.4 }, { enemy: 'rusher', interval: 3.8 }, { enemy: 'drone', interval: 0.7 }] },
  { from: 120, to: Infinity, entries: [{ enemy: 'trapper', interval: 16 }, { enemy: 'vortex', interval: 18 }] },
  { from: 150, to: Infinity, entries: [
    { enemy: 'shielder', interval: 5.5 },
    { enemy: 'teleporter', interval: 4.8 },
    { enemy: 'mirage', interval: 6.4 },
    { enemy: 'guardian', interval: 14 },
    { enemy: 'drone', interval: 1.1, mutation: 'split' },
    { enemy: 'tank', interval: 10, mutation: 'burst' },
    { enemy: 'zigzag', interval: 2.4, mutation: 'explode' },
  ] },
];

const LEGION_WAVES: Wave[] = [
  { from: 0, to: Infinity, entries: [{ enemy: 'drone', interval: 0.7 }] },
  { from: 6, to: Infinity, entries: [{ enemy: 'dasher', interval: 2.6 }] },
  { from: 16, to: Infinity, entries: [{ enemy: 'rusher', interval: 3.6 }] },
  { from: 28, to: Infinity, entries: [{ enemy: 'tank', interval: 5.5 }] },
  { from: 40, to: Infinity, entries: [{ enemy: 'zigzag', interval: 0.9 }] },
  { from: 70, to: Infinity, entries: [
    { enemy: 'dasher', interval: 2.0 },
    { enemy: 'rusher', interval: 3.2 },
    { enemy: 'drone', interval: 0.55 },
  ] },
  { from: 90, to: Infinity, entries: [{ enemy: 'trapper', interval: 14 }, { enemy: 'vortex', interval: 16 }] },
  { from: 120, to: Infinity, entries: [
    { enemy: 'shielder', interval: 4.8 },
    { enemy: 'teleporter', interval: 4.2 },
    { enemy: 'mirage', interval: 5.5 },
    { enemy: 'guardian', interval: 12 },
    { enemy: 'drone', interval: 0.9, mutation: 'split' },
    { enemy: 'tank', interval: 8, mutation: 'burst' },
    { enemy: 'zigzag', interval: 2.0, mutation: 'explode' },
  ] },
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
  rift: {
    id: 'rift', name: '공허 균열', icon: '🕳️', color: '#fb7185',
    desc: '최전선. 물량과 탄막이 동시에 몰려옵니다. 4분 30초.',
    unlockAfter: 'orbit',
    victoryTime: 270,
    bgTop: 0x2a0a14, bgBottom: 0x0c0408,
    waves: RIFT_WAVES,
    bossTimes: [45, 120, 210],
    bossRoster: ['boss', 'bossSeraph', 'boss'],
    clearCreditMul: 1.25,
    story: [
      { at: 0, text: '균열 너머. 귀환 좌표는 확보되지 않았습니다.' },
      { at: 40, text: '조기 보스 경보! 대비하세요.' },
      { at: 90, text: '공허가 밀려옵니다. 콤보를 유지하세요.' },
      { at: 200, text: '마지막 파도. 여기서 끝내십시오.' },
    ],
  },
  legion: {
    id: 'legion', name: '군단장의 성역', icon: '👑', color: '#fbbf24',
    desc: '7분 지구전. 군단장이 60초마다 누적 패널티를 겁니다.',
    unlockAfter: 'rift',
    victoryTime: 420,
    bgTop: 0x1a1030, bgBottom: 0x0a0618,
    waves: LEGION_WAVES,
    bossTimes: [70, 200, 340],
    bossRoster: ['boss', 'bossSeraph', 'boss'],
    clearCreditMul: 1.5,
    story: [
      { at: 0, text: '군단장의 성역. 생존 시간 7분. 패널티는 처치해도 남습니다.' },
      { at: 55, text: '첫 군단장 접근. 방어·무리·기술 중 하나가 옵니다.' },
      { at: 68, text: '드레드노트급 반응. 군단장과 겹치지 않게.' },
      { at: 195, text: '성역 심부. 누적 패널티를 계산하세요.' },
      { at: 330, text: '마지막 파도. 여기서 끝내십시오.' },
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
    desc: '기본 규칙. 슬롯 5·패시브 4.',
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
