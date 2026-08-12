import type { LevelUpChoice, WeaponId, PassiveId } from './types';
import {
  WEAPONS, RECIPES, LEVELING, HEAL_CARD_RATIO, PASSIVES,
} from './GameConfig';
import type { GameState, WeaponSlot } from './GameState';

const KIND_LABEL: Record<LevelUpChoice['kind'], string> = {
  merge: 'MERGE — 조합',
  new: 'NEW — 신규 무기',
  upgrade: 'UPGRADE — 강화',
  jackpot: 'JACKPOT — 대성공!',
  heal: 'REPAIR — 수리',
  passive: 'PASSIVE — 신규 패시브',
  passiveUp: 'PASSIVE — 패시브 강화',
};

export function kindLabel(kind: LevelUpChoice['kind']): string {
  return KIND_LABEL[kind];
}

export function generateChoices(state: GameState): LevelUpChoice[] {
  const pool: LevelUpChoice[] = [];
  const owned = state.weapons.map((w) => w.weaponId);
  const ownedPassives = new Set(state.passives.map((p) => p.passiveId));

  // 1. 조합
  for (const recipe of RECIPES) {
    const [a, b] = recipe.materials;
    if (owned.includes(a) && owned.includes(b)) {
      const result = WEAPONS[recipe.result];
      pool.push({
        kind: 'merge',
        weight: 100,
        title: result.name,
        desc: `${WEAPONS[a].icon}${WEAPONS[a].name} + ${WEAPONS[b].icon}${WEAPONS[b].name} → ${result.desc}`,
        icon: result.icon,
        color: result.color,
        weaponIds: [a, b],
        resultId: recipe.result,
      });
    }
  }

  // 2. 신규 무기
  if (state.weapons.length < state.maxWeaponSlots) {
    for (const def of Object.values(WEAPONS)) {
      if (def.tier !== 1 || owned.includes(def.id)) continue;
      pool.push({
        kind: 'new',
        weight: 25,
        title: def.name,
        desc: def.desc,
        icon: def.icon,
        color: def.color,
        weaponIds: [def.id],
      });
    }
  }

  // 3. 무기 강화
  for (const slot of state.weapons) {
    if (slot.level >= LEVELING.maxWeaponLevel) continue;
    const def = WEAPONS[slot.weaponId];
    pool.push({
      kind: 'upgrade',
      weight: 40,
      title: `${def.name} Lv.${slot.level} → ${slot.level + 1}`,
      desc: `데미지 +${Math.round(LEVELING.damagePerLevel * 100)}%, 쿨타임 -${Math.round(LEVELING.cooldownPerLevel * 100)}%`,
      icon: def.icon,
      color: def.color,
      weaponIds: [def.id],
    });
  }

  // 4. 신규 패시브
  if (state.passives.length < state.maxPassiveSlots) {
    for (const def of Object.values(PASSIVES)) {
      if (ownedPassives.has(def.id)) continue;
      pool.push({
        kind: 'passive',
        weight: 28,
        title: def.name,
        desc: def.desc,
        icon: def.icon,
        color: def.color,
        passiveId: def.id,
      });
    }
  }

  // 5. 패시브 강화
  for (const slot of state.passives) {
    const def = PASSIVES[slot.passiveId];
    if (slot.level >= def.maxLevel) continue;
    pool.push({
      kind: 'passiveUp',
      weight: 32,
      title: `${def.name} Lv.${slot.level} → ${slot.level + 1}`,
      desc: def.desc,
      icon: def.icon,
      color: def.color,
      passiveId: def.id,
    });
  }

  const choices: LevelUpChoice[] = [];

  if (Math.random() < LEVELING.jackpotChance && state.weapons.length > 0) {
    choices.push({
      kind: 'jackpot',
      weight: 0,
      title: '대성공!',
      desc: '보유한 모든 무기의 레벨이 1씩 상승합니다!',
      icon: '🎰',
      color: '#fbbf24',
    });
  }

  while (choices.length < 3 && pool.length > 0) {
    const total = pool.reduce((s, c) => s + c.weight, 0);
    let roll = Math.random() * total;
    let picked = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      roll -= pool[i].weight;
      if (roll <= 0) {
        picked = i;
        break;
      }
    }
    choices.push(pool[picked]);
    pool.splice(picked, 1);
  }

  while (choices.length < 3) {
    choices.push({
      kind: 'heal',
      weight: 0,
      title: '긴급 수리',
      desc: `최대 체력의 ${Math.round(HEAL_CARD_RATIO * 100)}%를 회복합니다.`,
      icon: '🔧',
      color: '#4ade80',
    });
    break;
  }

  return choices;
}

export function applyChoice(state: GameState, choice: LevelUpChoice): void {
  switch (choice.kind) {
    case 'merge': {
      const [a, b] = choice.weaponIds as [WeaponId, WeaponId];
      const slotA = state.weapons.find((w) => w.weaponId === a) as WeaponSlot;
      const slotB = state.weapons.find((w) => w.weaponId === b) as WeaponSlot;
      const inheritLevel = Math.min(slotA.level, slotB.level);
      state.weapons = state.weapons.filter((w) => w !== slotA && w !== slotB);
      state.weapons.push({
        weaponId: choice.resultId as WeaponId,
        level: inheritLevel,
        cooldownLeft: 200,
      });
      break;
    }
    case 'new': {
      const id = (choice.weaponIds as WeaponId[])[0];
      state.weapons.push({ weaponId: id, level: 1, cooldownLeft: 200 });
      break;
    }
    case 'upgrade': {
      const id = (choice.weaponIds as WeaponId[])[0];
      const slot = state.weapons.find((w) => w.weaponId === id);
      if (slot) slot.level = Math.min(LEVELING.maxWeaponLevel, slot.level + 1);
      break;
    }
    case 'jackpot': {
      for (const slot of state.weapons) {
        slot.level = Math.min(LEVELING.maxWeaponLevel, slot.level + 1);
      }
      break;
    }
    case 'heal': {
      state.hp = Math.min(state.maxHp, state.hp + state.maxHp * HEAL_CARD_RATIO);
      break;
    }
    case 'passive': {
      const id = choice.passiveId as PassiveId;
      state.passives.push({ passiveId: id, level: 1 });
      state.applyPassiveEffects();
      break;
    }
    case 'passiveUp': {
      const id = choice.passiveId as PassiveId;
      const slot = state.passives.find((p) => p.passiveId === id);
      if (slot) {
        slot.level = Math.min(PASSIVES[id].maxLevel, slot.level + 1);
        state.applyPassiveEffects();
      }
      break;
    }
  }
}
