import type {
  AchievementId, MetaUpgradeId, ShipId,
} from './types';
import {
  ACHIEVEMENTS, META, META_UPGRADES, SHIPS, DEFAULT_SHIP,
} from './GameConfig';
import type { GameState } from './GameState';
import { WEAPONS } from './GameConfig';

// ============================================================
// 런 간 영구 진행 (localStorage)
// ============================================================

export interface MetaSave {
  credits: number;
  upgrades: Record<MetaUpgradeId, number>;
  unlockedShips: ShipId[];
  achievements: AchievementId[];
  selectedShip: ShipId;
  bestScore: number;
}

function defaultSave(): MetaSave {
  return {
    credits: 0,
    upgrades: { hull: 0, firepower: 0, thruster: 0, magnet: 0, fortune: 0 },
    unlockedShips: ['scout'],
    achievements: [],
    selectedShip: DEFAULT_SHIP,
    bestScore: 0,
  };
}

export function loadMeta(): MetaSave {
  try {
    const raw = localStorage.getItem(META.storageKey);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<MetaSave>;
    const base = defaultSave();
    return {
      ...base,
      ...parsed,
      upgrades: { ...base.upgrades, ...parsed.upgrades },
      unlockedShips: parsed.unlockedShips?.length ? parsed.unlockedShips : base.unlockedShips,
      achievements: parsed.achievements ?? [],
      selectedShip: parsed.selectedShip && (parsed.unlockedShips ?? base.unlockedShips).includes(parsed.selectedShip)
        ? parsed.selectedShip
        : DEFAULT_SHIP,
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

/** 런 종료 시 크레딧·업적·최고점 반영 */
export function settleRun(
  meta: MetaSave,
  state: GameState,
  cleared: boolean,
): { newly: AchievementId[]; creditsGained: number } {
  const bossKills = state.bossKills;
  const baseGain = Math.floor(state.score * META.creditsPerScore)
    + (cleared ? META.clearBonus : 0)
    + bossKills * META.bossKillBonus;

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
  tryUnlock('clear_mission', cleared);
  tryUnlock('boss_slayer', state.bossKills >= 1);
  tryUnlock('combo_20', state.maxCombo >= 20);
  tryUnlock('score_10k', state.score >= 10000);
  tryUnlock('elite_hunter', state.eliteKills >= 1);

  const tiers = state.weapons.map((w) => WEAPONS[w.weaponId].tier);
  tryUnlock('tier2', tiers.some((t) => t >= 2));
  tryUnlock('tier3', tiers.some((t) => t >= 3));

  return unlocked;
}

/** 메타 레벨을 반영한 런 시작 배율 */
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
