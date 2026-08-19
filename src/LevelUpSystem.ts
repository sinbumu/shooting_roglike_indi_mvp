import type {
  LevelUpChoice, WeaponId, PassiveId, AffixId, StatBoostId, TacticalId, CraftOp,
} from './types';
import {
  WEAPONS, RECIPES, LEVELING, HEAL_CARD_RATIO, HEAL_CARD_WEIGHT, PASSIVES,
  ENDGAME, TACTICAL, AFFIXES, ARSENAL, T1_DUPLICATE_CAP,
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
  statBoost: 'BREAK — 한계 돌파',
  tactical: 'TACTICAL — 전술',
  affix: 'AFFIX — T0 접사',
  craft: 'CRAFT — 크래프팅',
  evolve: 'EVOLVE — 진화',
};

export function kindLabel(kind: LevelUpChoice['kind']): string {
  return KIND_LABEL[kind];
}

/** 같은 ID가 여러 슬롯이면 레벨이 가장 낮은 슬롯만 (강화·동형 조합용) */
function lowestSlots(weapons: WeaponSlot[]): WeaponSlot[] {
  const best = new Map<WeaponId, WeaponSlot>();
  for (const slot of weapons) {
    const cur = best.get(slot.weaponId);
    if (!cur || slot.level < cur.level) best.set(slot.weaponId, slot);
  }
  return [...best.values()];
}

function pickWeighted(pool: LevelUpChoice[]): LevelUpChoice | null {
  if (pool.length === 0) return null;
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
  return pool.splice(picked, 1)[0];
}

function buildEndgamePool(state: GameState): LevelUpChoice[] {
  const pool: LevelUpChoice[] = [];

  for (const s of Object.values(ENDGAME.stats)) {
    pool.push({
      kind: 'statBoost',
      weight: s.weight,
      title: s.title,
      desc: s.desc,
      icon: s.icon,
      color: s.color,
      statId: s.id,
    });
  }

  for (const t of Object.values(TACTICAL)) {
    pool.push({
      kind: 'tactical',
      weight: t.weight,
      title: t.title,
      desc: t.desc,
      icon: t.icon,
      color: t.color,
      tacticalId: t.id,
    });
  }

  pool.push({
    kind: 'heal',
    weight: HEAL_CARD_WEIGHT,
    title: '긴급 수리',
    desc: `최대 체력의 ${Math.round(HEAL_CARD_RATIO * 100)}%를 회복합니다.`,
    icon: '🔧',
    color: '#4ade80',
  });

  for (const slot of state.weapons) {
    if (slot.affix) continue;
    const def = WEAPONS[slot.weaponId];
    for (const ax of Object.values(AFFIXES)) {
      pool.push({
        kind: 'affix',
        weight: ax.weight,
        title: `${ax.label} ${def.name}`,
        desc: `${def.icon} ${ax.desc}`,
        icon: ax.icon,
        color: ax.color,
        weaponIds: [slot.weaponId],
        affixId: ax.id,
      });
    }
  }

  return pool;
}

export function generateChoices(state: GameState): LevelUpChoice[] {
  const pool: LevelUpChoice[] = [];
  const owned = state.weapons.map((w) => w.weaponId);
  const ownedPassives = new Set(state.passives.map((p) => p.passiveId));

  for (const recipe of RECIPES) {
    const [a, b] = recipe.materials;
    const countA = owned.filter((id) => id === a).length;
    const countB = a === b ? countA : owned.filter((id) => id === b).length;
    const ready = a === b ? countA >= 2 : countA >= 1 && countB >= 1;
    if (!ready) continue;
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

  if (state.weapons.length < state.maxWeaponSlots) {
    for (const def of Object.values(WEAPONS)) {
      if (def.tier !== 1) continue;
      const count = owned.filter((id) => id === def.id).length;
      if (count === 0) {
        pool.push({
          kind: 'new',
          weight: 25,
          title: def.name,
          desc: def.desc,
          icon: def.icon,
          color: def.color,
          weaponIds: [def.id],
        });
      } else if (count < T1_DUPLICATE_CAP && RECIPES.some((r) => r.materials[0] === def.id && r.materials[1] === def.id)) {
        pool.push({
          kind: 'new',
          weight: 18,
          title: `${def.name} 복제`,
          desc: `같은 ${def.name}을 하나 더 장착합니다. 동형 조합에 사용.`,
          icon: def.icon,
          color: def.color,
          weaponIds: [def.id],
        });
      }
    }
  }

  for (const slot of lowestSlots(state.weapons)) {
    if (slot.level >= LEVELING.maxWeaponLevel) continue;
    const def = WEAPONS[slot.weaponId];
    pool.push({
      kind: 'upgrade',
      weight: 40,
      title: `${def.name} Lv.${slot.level} → ${slot.level + 1}`,
      desc: `데미지 +${Math.round(LEVELING.damagePerLevel * 100)}%, 쿨타임 -${Math.round(LEVELING.cooldownPerLevel * 100)}%`,
      icon: def.icon,
      color: def.color,
      weaponIds: [slot.weaponId],
    });
  }

  if (
    state.weapons.length >= state.maxWeaponSlots
    && state.weapons.length > 0
    && state.weapons.every((w) => w.level >= LEVELING.maxWeaponLevel)
  ) {
    const lastId = state.acquireOrder[state.acquireOrder.length - 1]
      ?? state.weapons[state.weapons.length - 1].weaponId;
    const from = WEAPONS[lastId];
    pool.push({
      kind: 'evolve',
      weight: 80,
      title: `${from.name} 진화`,
      desc: `마지막 획득 무기를 한 티어 위 무작위 무장 Lv.1로 교체합니다.`,
      icon: '🧬',
      color: '#f0abfc',
      weaponIds: [lastId],
    });
  }

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
  const useEndgame = pool.length === 0;
  const drawPool = useEndgame ? buildEndgamePool(state) : pool;

  /** 1·3·5번째 레벨업(Lv.2/4/6): 슬롯 여유 있으면 미보유 T1을 확정 등장 */
  const guaranteeNew =
    !useEndgame
    && state.weapons.length < state.maxWeaponSlots
    && (state.level === 2 || state.level === 4 || state.level === 6);
  if (guaranteeNew) {
    const idx = drawPool.findIndex((c) => c.kind === 'new' && !c.title.includes('복제'));
    if (idx >= 0) {
      const forced = drawPool.splice(idx, 1)[0];
      choices.push(forced);
    }
  }

  if (!useEndgame && Math.random() < LEVELING.jackpotChance && state.weapons.length > 0 && choices.length < 3) {
    choices.push({
      kind: 'jackpot',
      weight: 0,
      title: '대성공!',
      desc: '보유한 모든 무기의 레벨이 1씩 상승합니다!',
      icon: '🎰',
      color: '#fbbf24',
    });
  }

  while (choices.length < 3 && drawPool.length > 0) {
    const picked = pickWeighted(drawPool);
    if (!picked) break;
    // 동일 무기에 여러 어픽스 카드가 겹치지 않게 정리
    if (picked.kind === 'affix' && picked.weaponIds?.[0]) {
      const wid = picked.weaponIds[0];
      for (let i = drawPool.length - 1; i >= 0; i--) {
        if (drawPool[i].kind === 'affix' && drawPool[i].weaponIds?.[0] === wid) {
          drawPool.splice(i, 1);
        }
      }
    }
    choices.push(picked);
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
  }

  return choices.slice(0, 3);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickUniqueOps(count: number): Exclude<CraftOp, 'affix'>[] {
  const pool: Exclude<CraftOp, 'affix'>[] = ['damage', 'speed', 'cooldown', 'radius'];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function craftCard(slot: WeaponSlot, op: CraftOp): LevelUpChoice {
  const def = WEAPONS[slot.weaponId];
  if (op === 'affix') {
    const reroll = !!slot.affix;
    return {
      kind: 'craft',
      weight: 0,
      title: `${def.name} 어픽스 ${reroll ? '리롤' : '부여'}`,
      desc: reroll
        ? `현재 접사를 다른 무작위 어픽스로 바꿉니다.`
        : `무작위 T0 어픽스(분열/관통/연쇄)를 부여합니다.`,
      icon: def.icon,
      color: def.color,
      weaponIds: [slot.weaponId],
      craftOp: 'affix',
    };
  }
  if (op === 'damage') {
    const pct = Math.round(ARSENAL.buffDamage * 100);
    return {
      kind: 'craft',
      weight: 0,
      title: `${def.name} 데미지 +${pct}%`,
      desc: `이 무기의 기본 데미지가 이번 게임(런) 동안 ${pct}% 증가합니다.`,
      icon: def.icon,
      color: def.color,
      weaponIds: [slot.weaponId],
      craftOp: 'damage',
    };
  }
  if (op === 'speed') {
    const pct = Math.round(ARSENAL.buffSpeed * 100);
    return {
      kind: 'craft',
      weight: 0,
      title: `${def.name} 투속 +${pct}%`,
      desc: `이 무기의 투사체 속도가 이번 게임(런) 동안 ${pct}% 증가합니다.`,
      icon: def.icon,
      color: def.color,
      weaponIds: [slot.weaponId],
      craftOp: 'speed',
    };
  }
  if (op === 'cooldown') {
    const pct = Math.round(ARSENAL.buffCooldown * 100);
    return {
      kind: 'craft',
      weight: 0,
      title: `${def.name} 쿨타임 -${pct}%`,
      desc: `이 무기의 발사 쿨타임이 이번 게임(런) 동안 ${pct}% 감소합니다.`,
      icon: def.icon,
      color: def.color,
      weaponIds: [slot.weaponId],
      craftOp: 'cooldown',
    };
  }
  const pct = Math.round(ARSENAL.buffRadius * 100);
  return {
    kind: 'craft',
    weight: 0,
    title: `${def.name} 크기 +${pct}%`,
    desc: `이 무기의 투사체·폭발 반경이 이번 게임(런) 동안 ${pct}% 증가합니다.`,
    icon: def.icon,
    color: def.color,
    weaponIds: [slot.weaponId],
    craftOp: 'radius',
  };
}

export function generateCraftChoices(state: GameState): LevelUpChoice[] {
  const heal = (): LevelUpChoice => ({
    kind: 'heal',
    weight: 0,
    title: '긴급 수리',
    desc: `최대 체력의 ${Math.round(HEAL_CARD_RATIO * 100)}%를 회복합니다.`,
    icon: '🔧',
    color: '#4ade80',
  });

  if (state.weapons.length === 0) return [heal(), heal(), heal()];

  const t3 = state.weapons.filter((s) => WEAPONS[s.weaponId].tier === 3);
  const maxTier = Math.max(...state.weapons.map((s) => WEAPONS[s.weaponId].tier));
  const targets = t3.length > 0
    ? t3
    : state.weapons.filter((s) => WEAPONS[s.weaponId].tier === maxTier);

  const ops = pickUniqueOps(2);
  const cards: LevelUpChoice[] = [];
  if (t3.length > 0) {
    cards.push(craftCard(pickRandom(t3), 'affix'));
    for (const op of ops) cards.push(craftCard(pickRandom(t3), op));
  } else {
    for (const op of ops) cards.push(craftCard(pickRandom(targets), op));
    cards.push(heal());
  }

  while (cards.length < 3) cards.push(heal());
  return cards.slice(0, 3);
}

function randomAffix(): AffixId {
  const ids = Object.keys(AFFIXES) as AffixId[];
  return ids[Math.floor(Math.random() * ids.length)];
}

export function applyChoice(state: GameState, choice: LevelUpChoice): void {
  switch (choice.kind) {
    case 'merge': {
      const [a, b] = choice.weaponIds as [WeaponId, WeaponId];
      const slotA = state.weapons.find((w) => w.weaponId === a);
      const slotB = state.weapons.find((w) => w.weaponId === b && w !== slotA);
      if (!slotA || !slotB) break;
      const inheritLevel = Math.min(slotA.level, slotB.level);
      state.untrackAcquire(a);
      state.untrackAcquire(b);
      state.weapons = state.weapons.filter((w) => w !== slotA && w !== slotB);
      const resultId = choice.resultId as WeaponId;
      const result: WeaponSlot = {
        weaponId: resultId,
        level: inheritLevel,
        cooldownLeft: 200,
      };
      if (WEAPONS[resultId].tier === 3 && Math.random() < ENDGAME.tier3AffixChance) {
        result.affix = randomAffix();
        const ax = AFFIXES[result.affix];
        state.events.push({
          type: 'banner',
          text: `${ax.label} ${WEAPONS[resultId].name}!`,
        });
      }
      state.weapons.push(result);
      state.noteWeapon(resultId);
      break;
    }
    case 'new': {
      const id = (choice.weaponIds as WeaponId[])[0];
      state.weapons.push({ weaponId: id, level: 1, cooldownLeft: 200 });
      state.noteWeapon(id);
      break;
    }
    case 'upgrade': {
      const id = (choice.weaponIds as WeaponId[])[0];
      const slot = lowestSlots(state.weapons).find((w) => w.weaponId === id);
      if (slot) slot.level = Math.min(LEVELING.maxWeaponLevel, slot.level + 1);
      break;
    }
    case 'jackpot': {
      for (const slot of state.weapons) {
        slot.level = Math.min(LEVELING.maxWeaponLevel, slot.level + 1);
      }
      state.dropCube(state.playerX, state.playerY);
      state.events.push({ type: 'jackpot' });
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
    case 'statBoost': {
      state.applyStatBoost(choice.statId as StatBoostId);
      break;
    }
    case 'tactical': {
      state.applyTactical(choice.tacticalId as TacticalId);
      break;
    }
    case 'affix': {
      const wid = (choice.weaponIds as WeaponId[])[0];
      state.applyAffix(wid, choice.affixId as AffixId);
      break;
    }
    case 'craft': {
      const wid = (choice.weaponIds as WeaponId[])[0];
      const op = choice.craftOp as CraftOp;
      if (op === 'affix') {
        const slot = state.weapons.find((w) => w.weaponId === wid);
        if (slot?.affix) state.rerollAffix(wid);
        else state.grantAffix(wid);
      } else if (op === 'damage') {
        state.buffWeaponDamage(wid);
      } else if (op === 'speed') {
        state.buffWeaponSpeed(wid);
      } else if (op === 'cooldown') {
        state.buffWeaponCooldown(wid);
      } else if (op === 'radius') {
        state.buffWeaponRadius(wid);
      }
      break;
    }
    case 'evolve': {
      const fromId = (choice.weaponIds as WeaponId[])[0];
      const slot = [...state.weapons].reverse().find((w) => w.weaponId === fromId);
      if (!slot) break;
      const from = WEAPONS[fromId];
      const nextTier = Math.min(3, from.tier + 1) as 1 | 2 | 3;
      const owned = new Set(state.weapons.map((w) => w.weaponId));
      let pool = Object.values(WEAPONS).filter((w) => w.tier === nextTier && w.id !== fromId);
      const unused = pool.filter((w) => !owned.has(w.id));
      if (unused.length > 0) pool = unused;
      if (pool.length === 0) break;
      const next = pool[Math.floor(Math.random() * pool.length)];
      state.untrackAcquire(fromId);
      slot.weaponId = next.id;
      slot.level = 1;
      slot.cooldownLeft = 200;
      slot.affix = undefined;
      slot.damageBonus = undefined;
      slot.speedBonus = undefined;
      slot.cooldownBonus = undefined;
      slot.radiusBonus = undefined;
      state.noteWeapon(next.id);
      state.events.push({ type: 'banner', text: `🧬 ${from.name} → ${next.name}` });
      break;
    }
  }
}
