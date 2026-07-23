import type { LevelUpChoice, WeaponId } from './types';
import { WEAPONS, RECIPES, PLAYER, LEVELING, HEAL_CARD_RATIO } from './GameConfig';
import type { GameState, WeaponSlot } from './GameState';

// ============================================================
// 레벨업 3선택지 추출 & 적용 (가중치 기반 필터링)
// ============================================================

const KIND_LABEL: Record<LevelUpChoice['kind'], string> = {
  merge: 'MERGE — 조합',
  new: 'NEW — 신규 무기',
  upgrade: 'UPGRADE — 강화',
  jackpot: 'JACKPOT — 대성공!',
  heal: 'REPAIR — 수리',
};

export function kindLabel(kind: LevelUpChoice['kind']): string {
  return KIND_LABEL[kind];
}

/**
 * 후보 풀 구성:
 *  1. 조합(Merge)   — 슬롯에 레시피 재료 2개가 모두 있으면 최우선 가중치
 *  2. 신규(New)     — 슬롯 여유가 있을 때 미보유 Tier1 무기
 *  3. 강화(Upgrade) — 보유 무기 레벨업
 *  4. 대성공(Jackpot) — 낮은 확률(4%)로 등장, 모든 무기 일괄 강화
 *  후보 부족 시 회복 카드로 채움
 */
export function generateChoices(state: GameState): LevelUpChoice[] {
  const pool: LevelUpChoice[] = [];
  const owned = state.weapons.map((w) => w.weaponId);

  // 1. 조합 후보 (최우선 가중치 100)
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

  // 2. 신규 후보 (가중치 25) — 슬롯 5개 미만일 때 미보유 하급(Tier1) 무기
  if (state.weapons.length < PLAYER.maxWeaponSlots) {
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

  // 3. 강화 후보 (가중치 40)
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

  // 가중치 기반 3장 추첨 (중복 없음)
  const choices: LevelUpChoice[] = [];

  // 4. 대성공: 4% 확률로 카드 한 장을 잭팟으로 대체
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

  // 후보 부족 시 회복 카드로 채움
  while (choices.length < 3) {
    choices.push({
      kind: 'heal',
      weight: 0,
      title: '긴급 수리',
      desc: `최대 체력의 ${Math.round(HEAL_CARD_RATIO * 100)}%를 회복합니다.`,
      icon: '🔧',
      color: '#4ade80',
    });
    break; // 회복 카드는 1장만
  }

  return choices;
}

/** 선택 결과를 GameState에 반영한다 */
export function applyChoice(state: GameState, choice: LevelUpChoice): void {
  switch (choice.kind) {
    case 'merge': {
      const [a, b] = choice.weaponIds as [WeaponId, WeaponId];
      // 재료 2개의 레벨 중 낮은 쪽을 계승
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
      state.hp = Math.min(PLAYER.maxHp, state.hp + PLAYER.maxHp * HEAL_CARD_RATIO);
      break;
    }
  }
}
