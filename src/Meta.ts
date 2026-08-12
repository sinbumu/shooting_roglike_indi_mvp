import type {
  AchievementId, MetaUpgradeId, ShipId, StageId, ChallengeId,
} from './types';
import {
  ACHIEVEMENTS, META, META_UPGRADES, SHIPS, DEFAULT_SHIP,
  STAGES, DEFAULT_STAGE, DEFAULT_CHALLENGE,
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
}

function defaultSave(): MetaSave {
  return {
    credits: 0,
    upgrades: { hull: 0, firepower: 0, thruster: 0, magnet: 0, fortune: 0 },
    unlockedShips: ['scout'],
    unlockedStages: ['orbit'],
    clearedStages: [],
    achievements: [],
    selectedShip: DEFAULT_SHIP,
    selectedStage: DEFAULT_STAGE,
    selectedChallenge: DEFAULT_CHALLENGE,
    bestScore: 0,
    stats: { runs: 0, clears: 0, kills: 0, playTimeSec: 0 },
  };
}

export function loadMeta(): MetaSave {
  try {
    // v1 → v2 마이그레이션
    const raw = localStorage.getItem(META.storageKey)
      ?? localStorage.getItem('stellar-meta-v1');
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<MetaSave>;
    const base = defaultSave();
    const unlockedStages = parsed.unlockedStages?.length
      ? parsed.unlockedStages
      : base.unlockedStages;
    return {
      ...base,
      ...parsed,
      upgrades: { ...base.upgrades, ...parsed.upgrades },
      unlockedShips: parsed.unlockedShips?.length ? parsed.unlockedShips : base.unlockedShips,
      unlockedStages,
      clearedStages: parsed.clearedStages ?? [],
      achievements: parsed.achievements ?? [],
      selectedShip: parsed.selectedShip && (parsed.unlockedShips ?? base.unlockedShips).includes(parsed.selectedShip)
        ? parsed.selectedShip
        : DEFAULT_SHIP,
      selectedStage: parsed.selectedStage && unlockedStages.includes(parsed.selectedStage)
        ? parsed.selectedStage
        : DEFAULT_STAGE,
      selectedChallenge: parsed.selectedChallenge ?? DEFAULT_CHALLENGE,
      stats: { ...base.stats, ...parsed.stats },
    };
  } catch {
    return defaultSave();
  }
}

export function saveMeta(meta: MetaSave): void {
  localStorage.setItem(META.storageKey, JSON.stringify(meta));
}

export function upgradeCost(id: MetaUpgradeId, currentLevel: number): number {
  return META_UPGRADES[id].baseCost * (currentLevel + 1);
}

export function tryBuyUpgrade(meta: MetaSave, id: MetaUpgradeId): boolean {
  const def = META_UPGRADES[id];
  const lv = meta.upgrades[id];
  if (lv >= def.maxLevel) return false;
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

function unlockNextStages(meta: MetaSave, cleared: StageId): void {
  for (const stage of Object.values(STAGES)) {
    if (stage.unlockAfter === cleared && !meta.unlockedStages.includes(stage.id)) {
      meta.unlockedStages.push(stage.id);
    }
  }
  if (!meta.clearedStages.includes(cleared)) meta.clearedStages.push(cleared);
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
  tryUnlock('nebula_clear', cleared && state.stageId === 'nebula');
  tryUnlock('rift_clear', cleared && state.stageId === 'rift');
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
    hpMul: 1 + u.hull * META_UPGRADES.hull.perLevel,
    damageMul: 1 + u.firepower * META_UPGRADES.firepower.perLevel,
    speedMul: 1 + u.thruster * META_UPGRADES.thruster.perLevel,
    magnetAdd: u.magnet * META_UPGRADES.magnet.perLevel,
    dropChanceAdd: u.fortune * META_UPGRADES.fortune.perLevel,
  };
}
