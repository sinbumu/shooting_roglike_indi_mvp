import type {
  WeaponDef, WeaponId, Recipe, EnemyDef, EnemyId, Wave,
  ShipDef, ShipId, PassiveDef, PassiveId,
  MetaUpgradeDef, MetaUpgradeId, AchievementDef, AchievementId,
  StageDef, StageId, ChallengeDef, ChallengeId,
  AffixId, StatBoostId, TacticalId, WeaponTag,
  ShipSkinId, ProjSkinId, DroneDef, DroneId, PilotTraitId,
  ConstellationDef, ConstellationId,
  CoreAwakeningDef,
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
  expForLevel: (level: number): number => {
    const base = 8 + Math.floor(level * 3) + Math.floor((level / 5) ** 2);
    return Math.max(1, Math.floor(base * (1.02 ** level)));
  },
  /** 무기 최대 레벨 */
  maxWeaponLevel: 8,
  /** 레벨당 데미지 배율 증가 */
  damagePerLevel: 0.3,
  /** 레벨당 쿨타임 감소율 (곱연산, 최대 45%까지) */
  cooldownPerLevel: 0.05,
  /** 대성공(Jackpot) 등장 확률 */
  jackpotChance: 0.04,
  /** 이 레벨까지는 레벨업마다 즉시 3선택지 */
  instantUntil: 15,
  /** 이후에는 이 배수에 도달했을 때만 모달을 연다 (쌓인 pending 일괄 소비) */
  batchEvery: 5,
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
    tags: ['summon'],
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
    tags: ['summon'],
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
    tags: ['beam'],
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
    tags: ['drop', 'summon'],
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
  // ---------- 매트릭스 T1 ----------
  plasmaWhip: {
    id: 'plasmaWhip', name: '플라즈마 채찍', tier: 1, icon: '🌀', color: '#f0abfc',
    desc: '전방을 길게 훑는 에너지 채찍',
    tags: ['melee'],
    cooldownMs: 480,
    projectile: {
      damage: 16, speed: 0, radius: 8, count: 1, spreadDeg: 70, homingTurnRate: 0, pierce: 99, lifetime: 0.14,
      melee: { arcDeg: 70, range: 118, duration: 0.22, deflect: true },
    },
  },
  spiderMine: {
    id: 'spiderMine', name: '스파이더 마인', tier: 1, icon: '🕷️', color: '#94a3b8',
    desc: '기어가는 지뢰를 풀어 최근접 적에게 붙인다',
    tags: ['drop', 'summon'],
    cooldownMs: 780,
    projectile: {
      damage: 20, speed: 110, radius: 9, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 0, lifetime: 4.2,
      explodeRadius: 58, drop: { fuse: 4.2, seekSpeed: 110 },
    },
  },
  bloodSpike: {
    id: 'bloodSpike', name: '핏빛 쐐기', tier: 1, icon: '🩸', color: '#fb7185',
    desc: '체력 1%를 소모해 전방으로 쐐기를 발사',
    hpCostFrac: 0.01,
    cooldownMs: 520,
    projectile: { damage: 18, speed: 640, radius: 5, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 1, lifetime: 1.5 },
  },
  // ---------- 채찍 T2/T3 ----------
  orbitalSaw: {
    id: 'orbitalSaw', name: '궤도 전기톱', tier: 2, icon: '⚙️', color: '#cbd5e1',
    desc: '[채찍+빔소드] 주위를 도는 톱날',
    tags: ['melee', 'aura'],
    cooldownMs: 110,
    projectile: {
      damage: 9, speed: 0, radius: 11, count: 2, spreadDeg: 360, homingTurnRate: 0, pierce: 99, lifetime: 0.12,
      orbit: { count: 2, radius: 60, persist: true },
    },
  },
  seekingSlash: {
    id: 'seekingSlash', name: '유도 참격', tier: 2, icon: '🌙', color: '#7dd3fc',
    desc: '[채찍+호밍] 휘두를 때 유도 검기 2발 사출',
    tags: ['melee'],
    cooldownMs: 500,
    projectile: {
      damage: 15, speed: 520, radius: 8, count: 2, spreadDeg: 70, homingTurnRate: 0, pierce: 1, lifetime: 1.55,
      melee: { arcDeg: 70, range: 118, duration: 0.22, deflect: true },
    },
  },
  quakeWhip: {
    id: 'quakeWhip', name: '진동 채찍', tier: 2, icon: '〰️', color: '#fbbf24',
    desc: '[채찍+지뢰] 벤 자리에 짧은 진동 장판',
    tags: ['melee'],
    cooldownMs: 620,
    projectile: {
      damage: 18, speed: 0, radius: 9, count: 1, spreadDeg: 80, homingTurnRate: 0, pierce: 99, lifetime: 0.16,
      melee: { arcDeg: 80, range: 130, duration: 0.24, deflect: true },
      drop: { fuse: 0, persist: 1.4, zoneDuration: 1.4, zoneTick: 0.14 },
    },
  },
  kingSaw: {
    id: 'kingSaw', name: '명왕의 톱니', tier: 3, icon: '👑', color: '#e2e8f0',
    desc: '[궤도톱+티타늄 장갑] 거대한 궤도 톱니',
    tags: ['melee', 'aura'],
    cooldownMs: 90,
    projectile: {
      damage: 12, speed: 0, radius: 15, count: 3, spreadDeg: 360, homingTurnRate: 0, pierce: 99, lifetime: 0.1,
      orbit: { count: 3, radius: 78, persist: true },
    },
  },
  phantomBlade: {
    id: 'phantomBlade', name: '비검: 환영검무', tier: 3, icon: '✨', color: '#e0e7ff',
    desc: '[유도 참격+추진기] 휘두를 때 유도 검기 12발, 관통 +2',
    tags: ['melee'],
    cooldownMs: 480,
    projectile: {
      damage: 13, speed: 560, radius: 7, count: 12, spreadDeg: 360, homingTurnRate: 0, pierce: 3, lifetime: 1.7,
      melee: { arcDeg: 78, range: 128, duration: 0.22, deflect: true },
    },
  },
  tectonicCutter: {
    id: 'tectonicCutter', name: '지각 절단기', tier: 3, icon: '🌋', color: '#fb923c',
    desc: '[진동 채찍+고폭약] 광역 진동 참격',
    tags: ['melee'],
    cooldownMs: 720,
    projectile: {
      damage: 40, speed: 0, radius: 12, count: 1, spreadDeg: 100, homingTurnRate: 0, pierce: 99, lifetime: 0.18,
      melee: { arcDeg: 100, range: 160, duration: 0.28, deflect: true },
      explodeRadius: 88,
      drop: { fuse: 0, persist: 2.0, zoneDuration: 2.0, zoneTick: 0.12 },
    },
  },
  // ---------- 스파이더 T2/T3 ----------
  interceptorWing: {
    id: 'interceptorWing', name: '요격기 편대', tier: 2, icon: '✈️', color: '#7dd3fc',
    desc: '[스파이더+스웜] 유도 요격기 살포. 둠스데이 폭주 시 관통 레이저로 변환',
    tags: ['summon'],
    cooldownMs: 700,
    projectile: { damage: 11, speed: 460, radius: 5, count: 5, spreadDeg: 360, homingTurnRate: 5.6, pierce: 0, lifetime: 2.6 },
  },
  autoTurret: {
    id: 'autoTurret', name: '자동 포탑', tier: 2, icon: '🗼', color: '#facc15',
    desc: '[스파이더+가틀링] 제자리 사격 포탑을 설치',
    tags: ['drop', 'summon'],
    cooldownMs: 1100,
    projectile: {
      damage: 8, speed: 0, radius: 12, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 0, lifetime: 8,
      drop: { fuse: 8, persist: 8 },
    },
  },
  sawDrone: {
    id: 'sawDrone', name: '톱니 드론', tier: 2, icon: '🦷', color: '#94a3b8',
    desc: '[스파이더+빔소드] 주위를 도는 톱니 드론',
    tags: ['summon', 'aura'],
    cooldownMs: 120,
    projectile: {
      damage: 8, speed: 0, radius: 10, count: 2, spreadDeg: 360, homingTurnRate: 0, pierce: 99, lifetime: 0.12,
      orbit: { count: 2, radius: 70, persist: true },
    },
  },
  doomsday: {
    id: 'doomsday', name: '프로토콜: 둠스데이', tier: 3, icon: '☠️', color: '#ef4444',
    desc: '[요격기+양자 배터리] 군단 폭주 중 요격탄이 화면을 가로지르는 붉은 관통 레이저로 변환',
    tags: ['summon'],
    cooldownMs: 560,
    projectile: { damage: 14, speed: 520, radius: 6, count: 10, spreadDeg: 360, homingTurnRate: 6.0, pierce: 1, lifetime: 2.8 },
  },
  orbitalBattery: {
    id: 'orbitalBattery', name: '궤도 폭격 신호소', tier: 3, icon: '📡', color: '#fde68a',
    desc: '[자동 포탑+확장 탄창] 군단 폭주 중 폭격 주기 5배·폭발 반경 2배',
    tags: ['drop', 'summon'],
    cooldownMs: 1000,
    projectile: {
      damage: 14, speed: 0, radius: 14, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 0, lifetime: 10,
      drop: { fuse: 10, persist: 10 },
    },
  },
  ironMaiden: {
    id: 'ironMaiden', name: '아이언 메이든 군단', tier: 3, icon: '🛡️', color: '#cbd5e1',
    desc: '[톱니 드론+나노 장갑] 틱 0.1초. 군단 폭주 중 처치 시 기생 드론이 근처 적에게 전염',
    tags: ['summon', 'aura'],
    cooldownMs: 100,
    projectile: {
      damage: 11, speed: 0, radius: 12, count: 4, spreadDeg: 360, homingTurnRate: 0, pierce: 99, lifetime: 0.1,
      orbit: { count: 4, radius: 86, persist: true },
    },
  },
  // ---------- 핏빛 T2/T3 ----------
  drainAura: {
    id: 'drainAura', name: '착취의 오라', tier: 2, icon: '🩸', color: '#e11d48',
    desc: '[핏빛 쐐기+지뢰] 주변 적을 태우며 흡혈',
    tags: ['aura'],
    leechOnHit: 0.004,
    cooldownMs: 100,
    projectile: {
      damage: 7, speed: 0, radius: 14, count: 1, spreadDeg: 360, homingTurnRate: 0, pierce: 99, lifetime: 0.1,
      orbit: { count: 1, radius: 78, persist: true },
    },
  },
  bleedBurst: {
    id: 'bleedBurst', name: '출혈 폭발', tier: 2, icon: '💥', color: '#fb7185',
    desc: '[핏빛 쐐기+스프레드] 명중 시 터지는 혈탄',
    hpCostFrac: 0.008,
    leechOnHit: 0.006,
    cooldownMs: 700,
    projectile: {
      damage: 9, speed: 500, radius: 5, count: 6, spreadDeg: 70, homingTurnRate: 0, pierce: 0, lifetime: 1.2,
      explodeRadius: 42,
    },
  },
  bloodSeeker: {
    id: 'bloodSeeker', name: '피의 추적자', tier: 2, icon: '🦇', color: '#be123c',
    desc: '[핏빛 쐐기+호밍] 흡혈 유도탄',
    hpCostFrac: 0.008,
    leechOnHit: 0.008,
    cooldownMs: 820,
    projectile: { damage: 16, speed: 420, radius: 6, count: 2, spreadDeg: 50, homingTurnRate: 5.0, pierce: 0, lifetime: 2.4 },
  },
  bloodGallows: {
    id: 'bloodGallows', name: '선혈의 처형대', tier: 3, icon: '☠️', color: '#9f1239',
    desc: '[착취 오라+재생 모듈] 강화 흡혈 오라',
    tags: ['aura'],
    leechOnHit: 0.008,
    cooldownMs: 90,
    projectile: {
      damage: 11, speed: 0, radius: 16, count: 1, spreadDeg: 360, homingTurnRate: 0, pierce: 99, lifetime: 0.1,
      orbit: { count: 1, radius: 102, persist: true, pull: 28 },
    },
  },
  bloodNova: {
    id: 'bloodNova', name: '블러드 노바', tier: 3, icon: '🌹', color: '#fb7185',
    desc: '[출혈 폭발+치명타 렌즈] 전방위 혈폭',
    hpCostFrac: 0.012,
    leechOnHit: 0.01,
    cooldownMs: 640,
    projectile: {
      damage: 12, speed: 480, radius: 6, count: 14, spreadDeg: 170, homingTurnRate: 0, pierce: 0, lifetime: 0.9,
      explodeRadius: 52,
    },
  },
  vampireBats: {
    id: 'vampireBats', name: '흡혈 박쥐 떼', tier: 3, icon: '🦇', color: '#881337',
    desc: '[피의 추적자+가속 모터] 흡혈 유도 편대',
    hpCostFrac: 0.01,
    leechOnHit: 0.01,
    tags: ['summon'],
    cooldownMs: 620,
    projectile: { damage: 13, speed: 500, radius: 5, count: 8, spreadDeg: 360, homingTurnRate: 5.8, pierce: 0, lifetime: 2.5 },
  },
  // ---------- v1.10 교차 매트릭스 ----------
  boomerangBlade: {
    id: 'boomerangBlade', name: '부메랑 참격', tier: 2, icon: '🪃', color: '#7dd3fc',
    desc: '[블레이드+호밍] 적을 관통한 뒤 기체로 돌아와 2차 타격',
    tags: ['melee', 'projectile'],
    cooldownMs: 640,
    projectile: {
      damage: 18, speed: 560, radius: 9, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 8, lifetime: 2.4,
      boomerang: { outboundSec: 0.42, returnTurnRate: 8 },
    },
  },
  infinityChakram: {
    id: 'infinityChakram', name: '영겁의 차크람', tier: 3, icon: '☸️', color: '#e0e7ff',
    desc: '[부메랑 참격+가속 모터] 6개의 차크람이 기체를 따라 휘며 적을 가른다',
    tags: ['melee', 'projectile'],
    cooldownMs: 720,
    projectile: {
      damage: 14, speed: 500, radius: 10, count: 6, spreadDeg: 360, homingTurnRate: 0, pierce: 12, lifetime: 3.4,
      boomerang: { outboundSec: 0.38, returnTurnRate: 14 },
    },
  },
  shrapnelMine: {
    id: 'shrapnelMine', name: '산탄 폭뢰', tier: 2, icon: '💥', color: '#fdba74',
    desc: '[지뢰+벌컨] 폭발과 동시에 360도 관통 파편 16발',
    tags: ['drop', 'projectile'],
    cooldownMs: 760,
    projectile: {
      damage: 20, speed: 0, radius: 10, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 0, lifetime: 2.8,
      explodeRadius: 62,
      drop: {
        fuse: 2.8, split: 16, splitPierce: 2, splitHoming: 0, splitSpeed: 420,
        splitExplode: 0, splitRadius: 3.5,
      },
    },
  },
  clusterDeathBomb: {
    id: 'clusterDeathBomb', name: '클러스터 데스밤', tier: 3, icon: '☢️', color: '#ef4444',
    desc: '[산탄 폭뢰+고폭약] 거대 파편 8개가 적·화면 끝에서 2차 폭발',
    tags: ['drop', 'projectile'],
    cooldownMs: 900,
    projectile: {
      damage: 24, speed: 0, radius: 12, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 0, lifetime: 2.6,
      explodeRadius: 72,
      drop: {
        fuse: 2.6, split: 8, splitPierce: 0, splitHoming: 0, splitSpeed: 280,
        splitExplode: 52, splitRadius: 8, clusterOnEdge: true,
      },
    },
  },
  toxicWeb: {
    id: 'toxicWeb', name: '맹독 거미줄', tier: 2, icon: '🕸️', color: '#a3e635',
    desc: '[스파이더+지뢰] 폭발 위치에 3초 거미줄. 이속 70% 감소·틱 피해',
    tags: ['summon', 'drop'],
    cooldownMs: 820,
    projectile: {
      damage: 16, speed: 115, radius: 9, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 0, lifetime: 4,
      explodeRadius: 58,
      drop: { fuse: 4, seekSpeed: 115, zoneDuration: 3, zoneTick: 0.2, zoneSlow: 0.3 },
    },
  },
  absoluteLockdown: {
    id: 'absoluteLockdown', name: '절대 구속의 둥지', tier: 3, icon: '🔒', color: '#c084fc',
    desc: '[맹독 거미줄+구속장] 3배 장판. 일반·엘리트 완전 정지',
    tags: ['summon', 'drop', 'aura'],
    cooldownMs: 900,
    projectile: {
      damage: 18, speed: 130, radius: 11, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 0, lifetime: 3.8,
      explodeRadius: 174,
      drop: {
        fuse: 3.8, seekSpeed: 130, zoneDuration: 3.4, zoneTick: 0.15,
        zoneSlow: 0, stunNonBoss: true,
      },
    },
  },
  crimsonGatling: {
    id: 'crimsonGatling', name: '핏빛 기관포', tier: 2, icon: '🩸', color: '#fb7185',
    desc: '[핏빛 쐐기+벌컨] 격발마다 체력 0.2%를 소모해 관통 쐐기를 난사',
    tags: ['projectile'],
    hpCostFrac: 0.002,
    cooldownMs: 90,
    projectile: { damage: 6, speed: 880, radius: 4, count: 1, spreadDeg: 0, homingTurnRate: 0, pierce: 2, lifetime: 1.2 },
  },
  bloodCrossfire: {
    id: 'bloodCrossfire', name: '피의 십자포화', tier: 3, icon: '✝️', color: '#be123c',
    desc: '[핏빛 기관포+확장 탄창] 4방향 난사. 잃은 체력만큼 굵기·연사 증폭',
    tags: ['projectile'],
    hpCostFrac: 0.002,
    cooldownMs: 110,
    projectile: { damage: 7, speed: 820, radius: 5, count: 4, spreadDeg: 360, homingTurnRate: 0, pierce: 2, lifetime: 1.3 },
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
  { materials: ['plasmaWhip', 'beamSword'], result: 'orbitalSaw' },
  { materials: ['plasmaWhip', 'homing'], result: 'seekingSlash' },
  { materials: ['plasmaWhip', 'mine'], result: 'quakeWhip' },
  { materials: ['orbitalSaw'], result: 'kingSaw', requirePassive: 'titaniumPlate' },
  { materials: ['seekingSlash'], result: 'phantomBlade', requirePassive: 'thrusterMod' },
  { materials: ['quakeWhip'], result: 'tectonicCutter', requirePassive: 'highExplosive' },
  { materials: ['spiderMine', 'swarm'], result: 'interceptorWing' },
  { materials: ['spiderMine', 'gatling'], result: 'autoTurret' },
  { materials: ['spiderMine', 'beamSword'], result: 'sawDrone' },
  { materials: ['interceptorWing'], result: 'doomsday', requirePassive: 'quantumCell' },
  { materials: ['autoTurret'], result: 'orbitalBattery', requirePassive: 'extendedMag' },
  { materials: ['sawDrone'], result: 'ironMaiden', requirePassive: 'nanoPlate' },
  { materials: ['bloodSpike', 'mine'], result: 'drainAura' },
  { materials: ['bloodSpike', 'spread'], result: 'bleedBurst' },
  { materials: ['bloodSpike', 'homing'], result: 'bloodSeeker' },
  { materials: ['drainAura'], result: 'bloodGallows', requirePassive: 'regenModule' },
  { materials: ['bleedBurst'], result: 'bloodNova', requirePassive: 'critLens' },
  { materials: ['bloodSeeker'], result: 'vampireBats', requirePassive: 'accelMotor' },
  { materials: ['blade', 'homing'], result: 'boomerangBlade' },
  { materials: ['boomerangBlade'], result: 'infinityChakram', requirePassive: 'accelMotor' },
  { materials: ['mine', 'vulcan'], result: 'shrapnelMine' },
  { materials: ['shrapnelMine'], result: 'clusterDeathBomb', requirePassive: 'highExplosive' },
  { materials: ['spiderMine', 'mine'], result: 'toxicWeb' },
  { materials: ['toxicWeb'], result: 'absoluteLockdown', requirePassive: 'cripple' },
  { materials: ['bloodSpike', 'vulcan'], result: 'crimsonGatling' },
  { materials: ['crimsonGatling'], result: 'bloodCrossfire', requirePassive: 'extendedMag' },
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
  bomber: {
    id: 'bomber', name: '붐바르딜로-크로코딜로', icon: '🐊', color: '#4d7c0f',
    desc: '중무장 폭격기. 매우 느리지만 압도적인 맷집과 폭발력을 자랑합니다. 중력 지뢰로 시작.',
    hpMul: 1.5, speedMul: 0.75, startingWeapon: 'mine', unlockCost: 2000,
    activeSkill: {
      id: 'carpetBombing', name: '융단 폭격', icon: '💥',
      cooldown: 20, duration: 1.5, bombCount: 12, explodeRadius: 100,
    },
  },
  yaksha: {
    id: 'yaksha', name: '야차', icon: '⚔️', color: '#ef4444',
    desc: '근접만 발사. 채찍으로 시작하며 발도술로 카운터합니다.',
    hpMul: 1.15, speedMul: 1.05, startingWeapon: 'plasmaWhip', unlockCost: 2500,
    activeSkill: {
      id: 'iaido', name: '거합도 - 발도술', icon: '🗡️',
      cooldown: 8, duration: 0.5, pulseDamage: 85,
    },
  },
  overlord: {
    id: 'overlord', name: '오버로드', icon: '🛸', color: '#38bdf8',
    desc: '본체 화력은 약하지만 소환 편대를 지휘합니다. 스파이더 마인으로 시작.',
    hpMul: 1.2, speedMul: 0.9, startingWeapon: 'spiderMine', unlockCost: 2500,
    activeSkill: {
      id: 'swarmFrenzy', name: '프로토콜: 군단 폭주', icon: '🔥',
      cooldown: 16, duration: 5,
    },
  },
  crimson: {
    id: 'crimson', name: '크림슨 팩트', icon: '🩸', color: '#be123c',
    desc: '쉴드 없음. 잃은 체력만큼 광분합니다. 핏빛 쐐기로 시작.',
    hpMul: 1.3, speedMul: 1.0, startingWeapon: 'bloodSpike', unlockCost: 2800,
    activeSkill: {
      id: 'bloodStream', name: '혈사포', icon: '💉',
      cooldown: 12, duration: 2.5, hpCostFrac: 0.2, leechPerHit: 0.01,
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
  titaniumPlate: {
    id: 'titaniumPlate', name: '티타늄 장갑', icon: '🛡️', color: '#cbd5e1',
    desc: '최대 체력 +12%', perLevel: 0.12, maxLevel: 5,
  },
  thrusterMod: {
    id: 'thrusterMod', name: '추진기', icon: '🚀', color: '#7dd3fc',
    desc: '이동 속도 +6%', perLevel: 0.06, maxLevel: 5,
  },
  highExplosive: {
    id: 'highExplosive', name: '고폭약', icon: '💣', color: '#fb923c',
    desc: '폭발/타격 반경 +10%', perLevel: 0.1, maxLevel: 5,
  },
  quantumCell: {
    id: 'quantumCell', name: '양자 배터리', icon: '🔋', color: '#a78bfa',
    desc: '무기 쿨타임 8% 감소', perLevel: 0.08, maxLevel: 5,
  },
  extendedMag: {
    id: 'extendedMag', name: '확장 탄창', icon: '📦', color: '#facc15',
    desc: '투사체 발사 수 증가', perLevel: 0.4, maxLevel: 5,
  },
  nanoPlate: {
    id: 'nanoPlate', name: '나노 장갑', icon: '🧱', color: '#86efac',
    desc: '받는 피해 -6% 감소', perLevel: 0.06, maxLevel: 5,
  },
  regenModule: {
    id: 'regenModule', name: '재생 모듈', icon: '💚', color: '#4ade80',
    desc: '초당 최대 체력 0.4% 회복', perLevel: 0.004, maxLevel: 5,
  },
  critLens: {
    id: 'critLens', name: '치명타 렌즈', icon: '🎯', color: '#fbbf24',
    desc: '치명타 확률 +4%p', perLevel: 0.04, maxLevel: 5,
  },
  accelMotor: {
    id: 'accelMotor', name: '가속 모터', icon: '⚡', color: '#38bdf8',
    desc: '투사체 속도 +8%', perLevel: 0.08, maxLevel: 5,
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

/** 후반 탄막·몹팩 프레임 가드 */
export const PERF = {
  maxDpr: 1.5,
  hitFxPerFrame: 8,
  muzzleFxPerFrame: 6,
  deathFxPerFrame: 4,
  enginePuffInterval: 0.04,
  particleCap: 180,
  glowProjCap: 70,
  glowEnemyBulletCap: 40,
  glowGruntCap: 48,
  hudInterval: 0.1,
  homingSeekR: 280,
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

/** v1.8 성좌 — 격납고 해금, 런 적용 */
export const CONSTELLATION_CAT_COLOR: Record<ConstellationDef['category'], string> = {
  stage: '#38bdf8',
  elite: '#4ade80',
  rule: '#c084fc',
  risk: '#f87171',
  sink: '#facc15',
};

export const CONSTELLATION: Record<ConstellationId, ConstellationDef> = {
  voidPredator: {
    id: 'voidPredator', category: 'stage', name: '공허의 포식자', icon: '🌀', color: '#38bdf8',
    penalty: '돌발 균열 쿨 50% 감소 · 엘리트 3배',
    reward: '균열 처치 시 퀀텀 큐브 드랍률 대폭 상승',
    cost: 1, prereq: null, repeatable: false,
  },
  disasterEye: {
    id: 'disasterEye', category: 'stage', name: '재해의 눈', icon: '👁', color: '#38bdf8',
    penalty: '환경 재해 지속 시간 2배',
    reward: '재해 중 무기 쿨 70% 감소 · 액티브 즉시 충전',
    cost: 2, prereq: 'voidPredator', repeatable: false,
  },
  traitorLegion: {
    id: 'traitorLegion', category: 'stage', name: '반역의 군단', icon: '⚔', color: '#38bdf8',
    penalty: '군단장 스폰 주기 30초',
    reward: '처치 시 기동·투속 2%씩 무한 누적',
    cost: 3, prereq: 'disasterEye', repeatable: false,
  },
  shieldBreaker: {
    id: 'shieldBreaker', category: 'elite', name: '방패 부수기', icon: '🛡', color: '#4ade80',
    penalty: '실더/가디언 방어 기믹 2배',
    reward: '처치 시 화면 적 현재 체력 50% 증발',
    cost: 1, prereq: null, repeatable: false,
  },
  deathArena: {
    id: 'deathArena', category: 'elite', name: '죽음의 투기장', icon: '🏟', color: '#4ade80',
    penalty: '트래퍼 펜스 반경 50% 축소',
    reward: '펜스 안 데미지 +300% · 치명타 100%',
    cost: 2, prereq: 'shieldBreaker', repeatable: false,
  },
  twinDread: {
    id: 'twinDread', category: 'elite', name: '드레드노트의 쌍둥이', icon: '👥', color: '#4ade80',
    penalty: '모든 보스 2기 동시 스폰',
    reward: '보스 코어 3배 · 보스전 보석 5배',
    cost: 3, prereq: 'deathArena', repeatable: false,
  },
  hunterToy: {
    id: 'hunterToy', category: 'elite', name: '사냥꾼의 장난감', icon: '🎯', color: '#4ade80',
    penalty: '텔레포터/미라지 기동력 극대화',
    reward: '처치 시 10초간 자석·경험치 3배',
    cost: 3, prereq: 'deathArena', repeatable: false,
  },
  spacetime: {
    id: 'spacetime', category: 'rule', name: '시공간 역행', icon: '⏳', color: '#c084fc',
    penalty: '투사체 속도 증감이 음수로 역전 (하한 10%)',
    reward: '최종 투속이 느릴수록 데미지 기하급수 폭증',
    cost: 1, prereq: null, repeatable: false,
  },
  overloadGear: {
    id: 'overloadGear', category: 'rule', name: '과부하 톱니바퀴', icon: '⚙', color: '#c084fc',
    penalty: '무기 쿨타임 감소 0% 고정',
    reward: '깎인 쿨감의 500%만큼 최종 데미지 증폭',
    cost: 2, prereq: 'spacetime', repeatable: false,
  },
  purist: {
    id: 'purist', category: 'rule', name: '순수주의자의 광기', icon: '✨', color: '#c084fc',
    penalty: '3티어 종결 무기 장착/진화 불가',
    reward: 'T1·T2 투사체 개수 +3 · 타격 반경 200%',
    cost: 3, prereq: 'overloadGear', repeatable: false,
  },
  sniper: {
    id: 'sniper', category: 'rule', name: '저격수의 고독', icon: '🔭', color: '#c084fc',
    penalty: '200px 이내 근접 데미지 90% 감소',
    reward: '400px 밖 원거리 데미지 1000% 증폭',
    cost: 3, prereq: 'overloadGear', repeatable: false,
  },
  berserker: {
    id: 'berserker', category: 'rule', name: '광전사의 춤', icon: '💃', color: '#c084fc',
    penalty: '정지 시 초당 최대 체력 15% 감소',
    reward: '현재 이동 속도에 비례해 딜 증폭',
    cost: 3, prereq: 'overloadGear', repeatable: false,
  },
  pacifist: {
    id: 'pacifist', category: 'rule', name: '평화주의자', icon: '🕊', color: '#c084fc',
    penalty: '플레이어 무기 데미지 0 고정',
    reward: '드론·지뢰·환경 재해 데미지 1000% 증폭',
    cost: 3, prereq: 'overloadGear', repeatable: false,
  },
  greed: {
    id: 'greed', category: 'risk', name: '탐욕의 대가', icon: '💰', color: '#f87171',
    penalty: '픽업 수명 2초. 만료 시 적에게 역유도되어 풀피·광폭화',
    reward: '2초 내 획득 시 크레딧·경험치 500% 증폭',
    cost: 1, prereq: null, repeatable: false,
  },
  glassCannon: {
    id: 'glassCannon', category: 'risk', name: '유리 대포의 극의', icon: '🪟', color: '#f87171',
    penalty: '최대 체력 1 · 무적/쉴드 무효',
    reward: '회피 상한 해제 · 기본 데미지 10배',
    cost: 2, prereq: 'greed', repeatable: false,
  },
  bloodFeast: {
    id: 'bloodFeast', category: 'risk', name: '피의 축제', icon: '🩸', color: '#f87171',
    penalty: '적 스폰 속도 3배',
    reward: '처치 시 15% 확률 광역 혈폭발',
    cost: 3, prereq: 'glassCannon', repeatable: false,
  },
  giantMarch: {
    id: 'giantMarch', category: 'risk', name: '거인들의 진격', icon: '🦶', color: '#f87171',
    penalty: '일반 몹이 엘리트급 스펙',
    reward: '확률적으로 퀀텀 큐브 드랍',
    cost: 4, prereq: 'bloodFeast', repeatable: false,
  },
  darkFog: {
    id: 'darkFog', category: 'risk', name: '칠흑의 안개', icon: '🌫', color: '#f87171',
    penalty: '시야 반경 300px로 축소',
    reward: '암전 속 적 처치 시 스코어 10배',
    cost: 5, prereq: 'giantMarch', repeatable: false,
  },
  endlessAbyss: {
    id: 'endlessAbyss', category: 'sink', name: '끝없는 심연', icon: '♾', color: '#facc15',
    penalty: '투자마다 적 체력/공격력 복리 5% 증가',
    reward: '치명타 배율·투속 상한 해제',
    cost: 1, prereq: null, repeatable: true,
  },
  fateWheel: {
    id: 'fateWheel', category: 'sink', name: '운명의 수레바퀴', icon: '🎡', color: '#facc15',
    penalty: '30초마다 무작위 재해 강제 발생',
    reward: '재해 생존 시 대량 크레딧·보스 코어',
    cost: 1, prereq: 'endlessAbyss', repeatable: true,
  },
  altarFrenzy: {
    id: 'altarFrenzy', category: 'sink', name: '제단 폭주', icon: '🕯', color: '#facc15',
    penalty: '시련이 더 자주 찾아옴',
    reward: '제단 충전 1초 · 반복 사용 · 보상 무한 중첩',
    cost: 1, prereq: 'fateWheel', repeatable: true,
  },
  infiniteOrbit: {
    id: 'infiniteOrbit', category: 'sink', name: '무한의 궤도', icon: '🪐', color: '#facc15',
    penalty: '없음 (한계 돌파 통합)',
    reward: '투자마다 투속 +2% · 기동 +3% · 치명 배율 +5%',
    cost: 1, prereq: 'altarFrenzy', repeatable: true,
  },
};

export const CONSTELLATION_FX = {
  holdSec: 0.5,
  riftCooldownMul: 0.5,
  riftEliteMul: 3,
  riftCubeChance: 0.55,
  hazardDurMul: 2,
  hazardCdMul: 0.3,
  legionInterval: 30,
  legionStack: 0.02,
  shieldHitsMul: 2,
  guardianAuraMul: 2,
  empHpFrac: 0.5,
  fenceRadiusMul: 0.5,
  arenaDmgMul: 4,
  twinGemMul: 5,
  twinCoreMul: 3,
  hunterSpeedMul: 1.85,
  hunterBuffSec: 10,
  hunterMagnetMul: 3,
  hunterExpMul: 3,
  speedFloor: 0.1,
  overloadDmgPerCdr: 5,
  puristExtraCount: 3,
  puristRadiusMul: 3,
  sniperNear: 200,
  sniperFar: 400,
  sniperNearMul: 0.1,
  sniperFarMul: 11,
  berserkerHpPct: 0.15,
  berserkerSpdRef: 430,
  pacifistEnvMul: 11,
  greedLife: 2,
  greedHoming: 600,
  greedRewardMul: 6,
  glassDmgMul: 10,
  bloodSpawnMul: 3,
  bloodChance: 0.15,
  bloodRadius: 90,
  giantCubeChance: 0.08,
  fogRadius: 300,
  fogScoreMul: 10,
  abyssPerStack: 0.05,
  wheelPeriod: 30,
  wheelCredits: 180,
  wheelCores: 1,
  altarChargeSec: 1,
  orbitSpeed: 0.02,
  orbitMove: 0.03,
  orbitCrit: 0.05,
} as const;

export function constellationUnlockCost(id: ConstellationId, currentLevel: number): number {
  const def = CONSTELLATION[id];
  if (!def.repeatable) return def.cost;
  return def.cost + Math.floor(currentLevel / 3);
}

export function emptyConstellation(): Record<ConstellationId, number> {
  const out = {} as Record<ConstellationId, number>;
  for (const id of Object.keys(CONSTELLATION) as ConstellationId[]) out[id] = 0;
  return out;
}

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
    desc: '명중 시 주변 적에게 번개처럼 튕기며 전이(체인)',
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
  let tags: WeaponTag[];
  if (def.tags && def.tags.length > 0) tags = [...def.tags];
  else if (def.projectile.beam) tags = ['beam'];
  else if (def.projectile.melee) tags = ['melee'];
  else if (def.projectile.orbit) tags = ['aura'];
  else if (def.projectile.drop) tags = ['drop'];
  else tags = ['projectile'];
  if (
    tags.includes('summon')
    && !tags.includes('melee')
    && !tags.includes('aura')
    && !tags.includes('drop')
    && !tags.includes('beam')
    && !tags.includes('projectile')
  ) {
    tags.push('projectile');
  }
  return tags;
}

export function isMeleeFamily(id: WeaponId): boolean {
  return weaponTags(WEAPONS[id]).includes('melee');
}

/** 채찍 계열 — 부채 즉발이 아니라 좌→우 스윕 판정 */
export function isWhipWeapon(id: WeaponId): boolean {
  return id === 'plasmaWhip' || id === 'quakeWhip' || id === 'tectonicCutter'
    || id === 'seekingSlash' || id === 'phantomBlade';
}

/** progress 0=호 시작, 1=호 끝. 채찍 끝단 각도 */
export function slashSweepAngle(angle: number, arcDeg: number, progress01: number): number {
  const half = (arcDeg * Math.PI) / 360;
  const p = Math.min(1, Math.max(0, progress01));
  return angle - half + p * 2 * half;
}

export function isSummonFamily(id: WeaponId): boolean {
  return weaponTags(WEAPONS[id]).includes('summon');
}

/** 야차가 발사할 수 없는 원거리 (근접/소환 제외) */
export function isRangedFamily(id: WeaponId): boolean {
  const tags = weaponTags(WEAPONS[id]);
  return !tags.includes('melee') && !tags.includes('summon');
}

/** 레벨업 카드 시너지용 기체 특화 태그 */
export function shipSpecialtyTags(shipId: ShipId): WeaponTag[] {
  if (shipId === 'yaksha') return ['melee'];
  if (shipId === 'overlord') return ['summon'];
  if (shipId === 'crimson') return ['projectile', 'aura'];
  return [];
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
  const def = WEAPONS[id];
  const tags = weaponTags(def);
  if (tags.includes('aura') || tags.includes('beam')) return true;
  return tags.includes('melee') && !!def.projectile.melee;
}

/** 공허의 제단 */
export const VOID_ALTAR = {
  firstAt: 100,
  radius: 50,
  chargeSec: 3,
  eliteCount: 12,
  ringRadius: 130,
  creditMul: 3,
  /** 스폰 시 바닥에서 솟아오르는 연출 시간 */
  spawnRiseSec: 0.8,
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

/** 거합도 참격 연출 — 피해는 즉발, 렌더만 이 길이를 씀 */
export const IAIDO_FX = {
  duration: 0.52,
  fade: 0.16,
  /** 칼날이 화면을 가로지르는 시간 비율 */
  sweep: 0.38,
  bladeW: 240,
  bladeH: 72,
} as const;

/** 유도 참격 / 환영검무 검기 */
export const SEEKING_SLASH = {
  scatterSec: 0.2,
  turnRate: 8.6,
  dmgMul: 0.7,
} as const;

/** 피의 십자포화: 잃은 HP 비율로 굵기·연사 증폭 */
export const BLOOD_CROSSFIRE = {
  sizePerMissing: 1.0,
  firePerMissing: 0.55,
} as const;

/** Lv.50 코어 각성 */
export const AWAKEN = {
  level: 50,
  dashCharges: 3,
  dashBossHpPct: 0.1,
  aegisPerShot: 45,
  stasisCooldownMul: 0.5,
  carpetBombMul: 2,
  carpetRadiusMul: 1.4,
  carpetDmgMul: 1.5,
  napalmDuration: 5,
  napalmSlow: 0.5,
  napalmTick: 0.2,
  minelayerInterval: 1.5,
  mineCap: 20,
  summonCap: 8,
  legionBonus: 5,
  eliteMul: 3,
  eliteDrones: 5,
  eliteDroneOrbit: 58,
  frenzyMul: 3,
  orbitalFrenzyRate: 5,
  orbitalFrenzyRadius: 2,
  maidenTick: 0.1,
  maidenSpreadR: 220,
  networkStore: 0.5,
  immortalHpFrac: 0.01,
  immortalDuration: 5,
  immortalCd: 60,
  overdriveCap: 9,
  overdriveLeechMul: 0.5,
  swordAuraSpeed: 860,
} as const;

export const CORE_AWAKENINGS: Record<ShipId, CoreAwakeningDef[]> = {
  scout: [{
    id: 'scoutDash', shipId: 'scout', name: '초공간 붕괴', icon: '🌀', color: '#7dd3fc',
    desc: '위상 대시가 3회 충전식이 되고, 궤적의 일반 적을 즉사시키며 보스에게 최대 체력 10% 피해를 줍니다.',
  }],
  fortress: [{
    id: 'fortressAegis', shipId: 'fortress', name: '반사 역장', icon: '🛡️', color: '#86efac',
    desc: '방벽이 적 탄막을 흡수하고, 종료 시 흡수 수에 비례한 화면 전체 폭발을 방출합니다.',
  }],
  hunter: [{
    id: 'hunterStasis', shipId: 'hunter', name: '정지장', icon: '⏱️', color: '#fdba74',
    desc: '시간 왜곡이 4초간 적과 탄막을 완전 정지시키고, 그 동안 무기 쿨타임이 절반이 됩니다.',
  }],
  bomber: [
    {
      id: 'bomberNapalm', shipId: 'bomber', name: '네이팜 스톰', icon: '🔥', color: '#fb923c',
      desc: '융단 폭격이 24회로 늘고, 폭발 자리에 5초간 둔화·지속 피해 화염 장판이 남습니다.',
    },
    {
      id: 'bomberMinelayer', shipId: 'bomber', name: '궤도 지뢰 부설기', icon: '💣', color: '#f97316',
      desc: '이동 경로에 1.5초마다 중력 지뢰가 자동 매설됩니다. 지뢰 수 상한이 사라집니다.',
    },
  ],
  yaksha: [
    {
      id: 'yakshaAsura', shipId: 'yaksha', name: '수라의 길', icon: '🗡️', color: '#ef4444',
      desc: '거합도 카운터에 성공하면 스킬 쿨타임이 즉시 초기화됩니다.',
    },
    {
      id: 'yakshaSwordAura', shipId: 'yaksha', name: '검강', icon: '⚔️', color: '#fca5a5',
      desc: '근접 무기가 타격할 때마다 전방으로 화면 끝까지 관통하는 검기를 추가로 발사합니다.',
    },
  ],
  overlord: [
    {
      id: 'overlordLegion', shipId: 'overlord', name: '무한의 군단장', icon: '👑', color: '#38bdf8',
      desc: '소환수 상한 +5. 군단 폭주 시 5초간 초거대 엘리트 드론 5기가 기체 주변에 임시 소환됩니다.',
    },
    {
      id: 'overlordNetwork', shipId: 'overlord', name: '초전도 네트워크', icon: '⚡', color: '#67e8f9',
      desc: '군단 폭주 동안 소환 피해의 50%를 저장하고, 종료 시 기체 중심의 맵 전체 EMP로 방출합니다.',
    },
  ],
  crimson: [
    {
      id: 'crimsonImmortal', shipId: 'crimson', name: '불사귀', icon: '💀', color: '#fb7185',
      desc: '체력이 1% 미만이 되는 피해를 받으면 5초 무적, 그동안 혈사포 쿨타임 0. (재사용 60초)',
    },
    {
      id: 'crimsonOverdrive', shipId: 'crimson', name: '피의 역류', icon: '🩸', color: '#9f1239',
      desc: '광분 상한이 +300%에서 +900%로 풀립니다. 혈사포 흡혈량은 절반이 됩니다.',
    },
  ],
};

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
  /** 경과 초당 힐량 배율 증가 (180초에 2배) */
  healScalePerSec: 1 / 180,
  /** 경과 초당 폭탄 피해 배율 증가 */
  bombScalePerSec: 1 / 180,
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
