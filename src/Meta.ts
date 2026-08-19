import type {
  AchievementId, MetaUpgradeId, ShipId, StageId, ChallengeId,
  ShipSkinId, ProjSkinId, WeaponId, DroneId,
} from './types';
import {
  ACHIEVEMENTS, META, META_UPGRADES, SHIPS, DEFAULT_SHIP,
  STAGES, DEFAULT_STAGE, DEFAULT_CHALLENGE,
  GACHA, SHIP_SKINS, PROJ_SKINS, DRONES,
} from './GameConfig';
import type { GameState } from './GameState';
import { WEAPONS } from './GameConfig';

export interface RunStats {
  runs: number;
  clears: number;
  kills: number;
  playTimeSec: number;
}

export interface MetaSave {
  credits: number;
  upgrades: Record<MetaUpgradeId, number>;
  unlockedShips: ShipId[];
  unlockedStages: StageId[];
  clearedStages: StageId[];
  achievements: AchievementId[];
  selectedShip: ShipId;
  selectedStage: StageId;
  selectedChallenge: ChallengeId;
  bestScore: number;
  stats: RunStats;
  unlockedShipSkins: ShipSkinId[];
  unlockedProjSkins: ProjSkinId[];
  equippedShipSkins: Partial<Record<ShipId, ShipSkinId>>;
  equippedProjSkins: Partial<Record<WeaponId, ProjSkinId>>;
  seenWeapons: WeaponId[];
  unlockedDrones: DroneId[];
  selectedDrone: DroneId | null;
  droneLevels: Record<DroneId, number>;
}

function defaultSave(): MetaSave {
  return {
    credits: 0,
    upgrades: { hull: 0, firepower: 0, thruster: 0, magnet: 0, fortune: 0, overclock: 0, lightArmor: 0 },
    unlockedShips: ['scout'],
    unlockedStages: ['orbit'],
    clearedStages: [],
    achievements: [],
    selectedShip: DEFAULT_SHIP,
    selectedStage: DEFAULT_STAGE,
    selectedChallenge: DEFAULT_CHALLENGE,
    bestScore: 0,
    stats: { runs: 0, clears: 0, kills: 0, playTimeSec: 0 },
    unlockedShipSkins: [],
    unlockedProjSkins: [],
    equippedShipSkins: {},
    equippedProjSkins: {},
    seenWeapons: [],
    unlockedDrones: [],
    selectedDrone: null,
    droneLevels: { retriever: 1, defender: 1, amplifier: 1 },
  };
}

function migrateStageId(id: string): StageId | null {
  if (id === 'nebula') return 'rift';
  if (id in STAGES) return id as StageId;
  return null;
}

function migrateStageList(ids: string[] | undefined, fallback: StageId[]): StageId[] {
  const out: StageId[] = [];
  for (const raw of ids ?? []) {
    const mapped = migrateStageId(raw);
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out.length ? out : fallback;
}

export function loadMeta(): MetaSave {
  try {
    // v1 → v2 마이그레이션
    const raw = localStorage.getItem(META.storageKey)
      ?? localStorage.getItem('stellar-meta-v1');
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<MetaSave> & {
      unlockedStages?: string[];
      clearedStages?: string[];
      selectedStage?: string;
    };
    const base = defaultSave();
    const unlockedStages = migrateStageList(parsed.unlockedStages, base.unlockedStages);
    const clearedStages = (parsed.clearedStages ?? []).filter(
      (id): id is StageId => typeof id === 'string' && id in STAGES,
    );
    const selected = parsed.selectedStage ? migrateStageId(parsed.selectedStage) : null;
    return {
      ...base,
      ...parsed,
      upgrades: { ...base.upgrades, ...parsed.upgrades },
      unlockedShips: parsed.unlockedShips?.length ? parsed.unlockedShips : base.unlockedShips,
      unlockedStages,
      clearedStages,
      achievements: (parsed.achievements ?? []).filter(
        (id): id is AchievementId => typeof id === 'string' && id in ACHIEVEMENTS,
      ),
      selectedShip: parsed.selectedShip && (parsed.unlockedShips ?? base.unlockedShips).includes(parsed.selectedShip)
        ? parsed.selectedShip
        : DEFAULT_SHIP,
      selectedStage: selected && unlockedStages.includes(selected) ? selected : DEFAULT_STAGE,
      selectedChallenge: parsed.selectedChallenge ?? DEFAULT_CHALLENGE,
      stats: { ...base.stats, ...parsed.stats },
      unlockedShipSkins: parsed.unlockedShipSkins ?? [],
      unlockedProjSkins: parsed.unlockedProjSkins ?? [],
      equippedShipSkins: parsed.equippedShipSkins ?? {},
      equippedProjSkins: parsed.equippedProjSkins ?? {},
      seenWeapons: parsed.seenWeapons ?? [],
      unlockedDrones: parsed.unlockedDrones ?? [],
      selectedDrone: parsed.selectedDrone && (parsed.unlockedDrones ?? []).includes(parsed.selectedDrone)
        ? parsed.selectedDrone
        : null,
      droneLevels: {
        retriever: 1, defender: 1, amplifier: 1,
        ...parsed.droneLevels,
      },
    };
  } catch {
    return defaultSave();
  }
}

export function saveMeta(meta: MetaSave): void {
  localStorage.setItem(META.storageKey, JSON.stringify(meta));
}

export function upgradeCost(id: MetaUpgradeId, currentLevel: number): number {
  const def = META_UPGRADES[id];
  const mul = def.costMul ?? 1.5;
  return Math.round(def.baseCost * Math.pow(mul, currentLevel));
}

export function tryBuyUpgrade(meta: MetaSave, id: MetaUpgradeId): boolean {
  const def = META_UPGRADES[id];
  const lv = meta.upgrades[id] ?? 0;
  if (Number.isFinite(def.maxLevel) && lv >= def.maxLevel) return false;
  const cost = upgradeCost(id, lv);
  if (meta.credits < cost) return false;
  meta.credits -= cost;
  meta.upgrades[id] = lv + 1;
  saveMeta(meta);
  return true;
}

export function tryUnlockShip(meta: MetaSave, id: ShipId): boolean {
  if (meta.unlockedShips.includes(id)) return false;
  const cost = SHIPS[id].unlockCost;
  if (meta.credits < cost) return false;
  meta.credits -= cost;
  meta.unlockedShips.push(id);
  saveMeta(meta);
  return true;
}

export function selectShip(meta: MetaSave, id: ShipId): boolean {
  if (!meta.unlockedShips.includes(id)) return false;
  meta.selectedShip = id;
  saveMeta(meta);
  return true;
}

export function selectStage(meta: MetaSave, id: StageId): boolean {
  if (!meta.unlockedStages.includes(id)) return false;
  meta.selectedStage = id;
  saveMeta(meta);
  return true;
}

export function selectChallenge(meta: MetaSave, id: ChallengeId): void {
  meta.selectedChallenge = id;
  saveMeta(meta);
}

export function droneUpgradeCost(id: DroneId, currentLevel: number): number {
  const def = DRONES[id];
  return Math.round(def.baseCost * Math.pow(def.costMul, currentLevel - 1));
}

export function tryUnlockDrone(meta: MetaSave, id: DroneId): boolean {
  if (meta.unlockedDrones.includes(id)) return false;
  const cost = DRONES[id].unlockCost;
  if (meta.credits < cost) return false;
  meta.credits -= cost;
  meta.unlockedDrones.push(id);
  meta.droneLevels[id] = 1;
  saveMeta(meta);
  return true;
}

export function selectDrone(meta: MetaSave, id: DroneId | null): boolean {
  if (id === null) {
    meta.selectedDrone = null;
    saveMeta(meta);
    return true;
  }
  if (!meta.unlockedDrones.includes(id)) return false;
  meta.selectedDrone = meta.selectedDrone === id ? null : id;
  saveMeta(meta);
  return true;
}

export function tryUpgradeDrone(meta: MetaSave, id: DroneId): boolean {
  if (!meta.unlockedDrones.includes(id)) return false;
  const def = DRONES[id];
  const lv = meta.droneLevels[id] ?? 1;
  if (lv >= def.maxLevel) return false;
  const cost = droneUpgradeCost(id, lv);
  if (meta.credits < cost) return false;
  meta.credits -= cost;
  meta.droneLevels[id] = lv + 1;
  saveMeta(meta);
  return true;
}

function unlockNextStages(meta: MetaSave, cleared: StageId): void {
  for (const stage of Object.values(STAGES)) {
    if (stage.unlockAfter === cleared && !meta.unlockedStages.includes(stage.id)) {
      meta.unlockedStages.push(stage.id);
    }
  }
  if (!meta.clearedStages.includes(cleared)) meta.clearedStages.push(cleared);
}

export function mergeSeenWeapons(meta: MetaSave, ids: WeaponId[]): void {
  const set = new Set(meta.seenWeapons);
  for (const id of ids) set.add(id);
  meta.seenWeapons = [...set];
}

export function settleRun(
  meta: MetaSave,
  state: GameState,
  cleared: boolean,
): { newly: AchievementId[]; creditsGained: number } {
  const stage = STAGES[state.stageId];
  const creditMul = (state.creditMul || 1) * (cleared ? stage.clearCreditMul : 1);

  const baseGain = Math.floor(
    (state.score * META.creditsPerScore
      + (cleared ? META.clearBonus : 0)
      + state.bossKills * META.bossKillBonus) * creditMul,
  );

  meta.stats.runs += 1;
  meta.stats.kills += state.kills;
  meta.stats.playTimeSec += Math.floor(state.time);
  if (cleared) {
    meta.stats.clears += 1;
    unlockNextStages(meta, state.stageId);
  }

  const newly = evaluateAchievements(meta, state, cleared);
  let achvReward = 0;
  for (const id of newly) {
    meta.achievements.push(id);
    achvReward += ACHIEVEMENTS[id].reward;
  }

  const creditsGained = baseGain + achvReward;
  meta.credits += creditsGained;
  if (state.score > meta.bestScore) meta.bestScore = state.score;
  mergeSeenWeapons(meta, [...state.seenThisRun]);
  saveMeta(meta);
  return { newly, creditsGained };
}

function evaluateAchievements(
  meta: MetaSave,
  state: GameState,
  cleared: boolean,
): AchievementId[] {
  const have = new Set(meta.achievements);
  const unlocked: AchievementId[] = [];
  const tryUnlock = (id: AchievementId, ok: boolean): void => {
    if (ok && !have.has(id)) unlocked.push(id);
  };

  tryUnlock('first_blood', state.kills >= 1);
  tryUnlock('survive_60', state.time >= 60);
  tryUnlock('survive_180', state.time >= 180);
  tryUnlock('clear_mission', cleared && state.stageId === 'orbit');
  tryUnlock('rift_clear', cleared && state.stageId === 'rift');
  tryUnlock('legion_clear', cleared && state.stageId === 'legion');
  tryUnlock('challenge_clear', cleared && state.challengeId !== 'standard');
  tryUnlock('boss_slayer', state.bossKills >= 1);
  tryUnlock('combo_20', state.maxCombo >= 20);
  tryUnlock('score_10k', state.score >= 10000);
  tryUnlock('elite_hunter', state.eliteKills >= 1);

  const tiers = state.weapons.map((w) => WEAPONS[w.weaponId].tier);
  tryUnlock('tier2', tiers.some((t) => t >= 2));
  tryUnlock('tier3', tiers.some((t) => t >= 3));

  return unlocked;
}

export function metaBonuses(meta: MetaSave): {
  hpMul: number;
  damageMul: number;
  speedMul: number;
  magnetAdd: number;
  dropChanceAdd: number;
} {
  const u = meta.upgrades;
  return {
    hpMul: 1 + (u.hull ?? 0) * META_UPGRADES.hull.perLevel,
    damageMul: 1
      + (u.firepower ?? 0) * META_UPGRADES.firepower.perLevel
      + (u.overclock ?? 0) * META_UPGRADES.overclock.perLevel,
    speedMul: 1
      + (u.thruster ?? 0) * META_UPGRADES.thruster.perLevel
      + (u.lightArmor ?? 0) * META_UPGRADES.lightArmor.perLevel,
    magnetAdd: (u.magnet ?? 0) * META_UPGRADES.magnet.perLevel,
    dropChanceAdd: (u.fortune ?? 0) * META_UPGRADES.fortune.perLevel,
  };
}

const DUD_LINES = [
  '상인이 비웃습니다. 잔돈이나 챙기시죠.',
  '오늘은 별이 안 좋군요. 자선 환급입니다.',
  '꽝. 상자 안에서 먼지와 500 크레딧이 나왔습니다.',
];

export type GachaTier = 'jackpot' | 'win' | 'dud';

export interface GachaResult {
  tier: GachaTier;
  message: string;
}

export function tryOpenGacha(meta: MetaSave): GachaResult | null {
  if (meta.credits < GACHA.cost) return null;
  meta.credits -= GACHA.cost;

  const roll = Math.random();
  if (roll < GACHA.jackpotChance) {
    const owned = new Set(meta.unlockedShipSkins);
    const pool = (Object.keys(SHIP_SKINS) as ShipSkinId[]).filter((id) => !owned.has(id));
    if (pool.length > 0) {
      const id = pool[Math.floor(Math.random() * pool.length)];
      const def = SHIP_SKINS[id];
      meta.unlockedShipSkins.push(id);
      meta.equippedShipSkins[def.shipId] = id;
      saveMeta(meta);
      return { tier: 'jackpot', message: `대성공! ${def.name} 스킨 해금` };
    }
    meta.credits += GACHA.jackpotFallback;
    saveMeta(meta);
    return { tier: 'jackpot', message: `대성공! 스킨은 전부 갖고 계시네요. ${GACHA.jackpotFallback.toLocaleString()} 크레딧 지급` };
  }

  if (roll < GACHA.jackpotChance + GACHA.winChance) {
    const owned = new Set(meta.unlockedProjSkins);
    const pool = (Object.keys(PROJ_SKINS) as ProjSkinId[]).filter((id) => !owned.has(id));
    if (pool.length > 0) {
      const id = pool[Math.floor(Math.random() * pool.length)];
      const def = PROJ_SKINS[id];
      meta.unlockedProjSkins.push(id);
      meta.equippedProjSkins[def.weaponId] = id;
      saveMeta(meta);
      return { tier: 'win', message: `성공! ${def.name} 투사체 스킨 장착` };
    }
    meta.credits += GACHA.winFallback;
    saveMeta(meta);
    return { tier: 'win', message: `성공! 투사체 스킨은 전부 보유. ${GACHA.winFallback.toLocaleString()} 크레딧 지급` };
  }

  meta.credits += GACHA.dudRefund;
  saveMeta(meta);
  const line = DUD_LINES[Math.floor(Math.random() * DUD_LINES.length)];
  return { tier: 'dud', message: `${line} (+${GACHA.dudRefund} 환급)` };
}
