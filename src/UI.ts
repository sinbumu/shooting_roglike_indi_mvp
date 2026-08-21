import type { LevelUpChoice, ShipId, MetaUpgradeId, AchievementId, StageId, ChallengeId, WeaponId, DroneId, PilotTraitId, ModifierId } from './types';
import {
  WEAPONS, LEVELING, SHIPS, PASSIVES, META_UPGRADES, ACHIEVEMENTS,
  STAGES, CHALLENGES, AFFIXES, ARSENAL, GACHA, SHIP_SKINS, PROJ_SKINS,
  COMBAT, RECIPES, DRONES, DRONE_FX, PILOT_TRAITS, ampCooldownMul, isTickWeapon,
  MODIFIERS, MODIFIER_FX, rollModifiers, modifierRewardMul,
} from './GameConfig';
import { kindLabel } from './LevelUpSystem';
import type { GameState } from './GameState';
import type { MetaSave } from './Meta';
import { upgradeCost, droneUpgradeCost, applyDebugUnlock } from './Meta';
import { SPRITE_PATHS } from './assets';
import { PATCH_NOTES, LATEST_VERSION } from './PatchNotes';
import { ConstellationBoard } from './ConstellationBoard';
import type { AudioManager } from './Audio';

function droneStatLine(id: DroneId, lv: number): string {
  if (id === 'retriever') {
    const t = (DRONE_FX.retrieverInterval - DRONE_FX.retrieverPerLv * (lv - 1)).toFixed(1);
    return `${t}초마다 기체 반경 ${DRONE_FX.retrieverRadius}px 내의 경험치와 드롭 아이템을 즉시 수집.`;
  }
  if (id === 'defender') {
    return `5초마다 날아오는 투사체 최대 ${DRONE_FX.defenderBase + (lv - 1)}개 요격.`;
  }
  return `15초마다 반경 ${DRONE_FX.amplifierRadius}px 오라. 안에 있으면 최종 쿨타임 ${Math.round((1 - ampCooldownMul(lv)) * 100)}% 감소.`;
}

function fmtDamage(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return Math.round(n).toLocaleString();
}

function fmtCredits(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * DOM Overlay UI (HUD, 격납고, 메타 상점, 업적, 레벨업, 결과)
 */
export class UI {
  private expFill = document.getElementById('exp-fill') as HTMLDivElement;
  private expLabel = document.getElementById('exp-label') as HTMLSpanElement;
  private hpFill = document.getElementById('hp-fill') as HTMLDivElement;
  private hpLabel = document.getElementById('hp-label') as HTMLSpanElement;
  private statTime = document.getElementById('stat-time') as HTMLSpanElement;
  private statKills = document.getElementById('stat-kills') as HTMLSpanElement;
  private statScore = document.getElementById('stat-score') as HTMLSpanElement;
  private pendingLv = document.getElementById('pending-lv') as HTMLSpanElement;
  private slotsEl = document.getElementById('weapon-slots') as HTMLDivElement;
  private passiveSlotsEl = document.getElementById('passive-slots') as HTMLDivElement;

  private bossBar = document.getElementById('boss-bar') as HTMLDivElement;
  private bossFill = document.getElementById('boss-fill') as HTMLDivElement;
  private bossLabel = document.getElementById('boss-label') as HTMLSpanElement;
  private bannerEl = document.getElementById('banner') as HTMLDivElement;
  private storyEl = document.getElementById('story-line') as HTMLDivElement;
  private comboEl = document.getElementById('combo') as HTMLDivElement;
  private tooltipEl = document.getElementById('slot-tooltip') as HTMLDivElement;
  private muteBtn = document.getElementById('mute-btn') as HTMLButtonElement;

  private levelupOverlay = document.getElementById('levelup-overlay') as HTMLDivElement;
  private levelupTitle = document.getElementById('levelup-title') as HTMLHeadingElement;
  private levelupSub = document.getElementById('levelup-sub') as HTMLParagraphElement;
  private levelupPreview = document.getElementById('levelup-preview') as HTMLDivElement;
  private cardContainer = document.getElementById('card-container') as HTMLDivElement;
  private gameoverOverlay = document.getElementById('gameover-overlay') as HTMLDivElement;
  private gameoverStats = document.getElementById('gameover-stats') as HTMLDivElement;
  private victoryOverlay = document.getElementById('victory-overlay') as HTMLDivElement;
  private victoryStats = document.getElementById('victory-stats') as HTMLDivElement;
  private pauseOverlay = document.getElementById('pause-overlay') as HTMLDivElement;
  private startOverlay = document.getElementById('start-overlay') as HTMLDivElement;
  private metaOverlay = document.getElementById('meta-overlay') as HTMLDivElement;
  private achvOverlay = document.getElementById('achv-overlay') as HTMLDivElement;
  private gachaOverlay = document.getElementById('gacha-overlay') as HTMLDivElement;
  private droneOverlay = document.getElementById('drone-overlay') as HTMLDivElement;
  private traitOverlay = document.getElementById('trait-overlay') as HTMLDivElement;
  private constellationOverlay = document.getElementById('constellation-overlay') as HTMLDivElement;
  private constellationSummary = document.getElementById('constellation-summary') as HTMLButtonElement;
  private patchOverlay = document.getElementById('patch-overlay') as HTMLDivElement;
  private codexOverlay = document.getElementById('codex-overlay') as HTMLDivElement;
  private patchList = document.getElementById('patch-list') as HTMLDivElement;
  private patchNotesBtn = document.getElementById('patch-notes-btn') as HTMLButtonElement;
  private pauseStats = document.getElementById('pause-stats') as HTMLParagraphElement;
  private codexList = document.getElementById('codex-list') as HTMLDivElement;

  private shipSelect = document.getElementById('ship-select') as HTMLDivElement;
  private droneSelect = document.getElementById('drone-select') as HTMLDivElement;
  private droneSummary = document.getElementById('drone-summary') as HTMLButtonElement;
  private traitSummary = document.getElementById('trait-summary') as HTMLButtonElement;
  private droneShopCredits = document.getElementById('drone-shop-credits') as HTMLSpanElement;
  private traitSelect = document.getElementById('trait-select') as HTMLDivElement;
  private traitShopCores = document.getElementById('trait-shop-cores') as HTMLSpanElement;
  private hudDrone = document.getElementById('hud-drone') as HTMLDivElement;
  private hudMods = document.getElementById('hud-mods') as HTMLDivElement;
  private modifierOverlay = document.getElementById('modifier-overlay') as HTMLDivElement;
  private modReward = document.getElementById('mod-reward') as HTMLDivElement;
  private modList = document.getElementById('mod-list') as HTMLDivElement;
  private modRerollBtn = document.getElementById('mod-reroll-btn') as HTMLButtonElement;
  private pendingMods: ModifierId[] = [];
  private stageSelect = document.getElementById('stage-select') as HTMLDivElement;
  private challengeSelect = document.getElementById('challenge-select') as HTMLDivElement;
  private metaCredits = document.getElementById('meta-credits') as HTMLSpanElement;
  private metaCores = document.getElementById('meta-cores') as HTMLSpanElement;
  private metaStats = document.getElementById('meta-stats') as HTMLSpanElement;
  private metaShopCredits = document.getElementById('meta-shop-credits') as HTMLSpanElement;
  private metaShop = document.getElementById('meta-shop') as HTMLDivElement;
  private achvList = document.getElementById('achv-list') as HTMLDivElement;
  private gachaCredits = document.getElementById('gacha-credits') as HTMLSpanElement;
  private gachaOwned = document.getElementById('gacha-owned') as HTMLDivElement;
  private gachaResult = document.getElementById('gacha-result') as HTMLDivElement;
  private gachaOdds = document.getElementById('gacha-odds') as HTMLDivElement;

  private lastSlotsKey = '';
  private lastPassiveKey = '';
  private lastCombo = 0;
  private lastState: GameState | null = null;
  private bannerTimeout: number | null = null;
  private storyTimeout: number | null = null;
  private tooltipTimeout: number | null = null;
  private meta: MetaSave | null = null;
  private onHangarChange: (() => void) | null = null;
  private lastShownCredits = 0;
  private creditAnim = 0;
  private focusEls: HTMLElement[] = [];
  private focusIdx = 0;
  private hangarGroups: HTMLElement[][] = [];
  private hangarGroupIdx = 0;
  private skillBtn = document.getElementById('skill-btn') as HTMLButtonElement;
  private skillIcon = document.getElementById('skill-icon') as HTMLSpanElement;
  private skillCd = document.getElementById('skill-cd') as HTMLSpanElement;
  private constellationBoard: ConstellationBoard | null = null;
  private audio: AudioManager | null = null;

  constructor() {
    this.slotsEl.addEventListener('click', (e) => {
      const slotEl = (e.target as HTMLElement).closest('.weapon-slot');
      if (!slotEl || !this.lastState) return;
      const idx = Array.from(this.slotsEl.children).indexOf(slotEl);
      this.showWeaponTooltip(idx);
    });
    this.passiveSlotsEl.addEventListener('click', (e) => {
      const slotEl = (e.target as HTMLElement).closest('.weapon-slot');
      if (!slotEl || !this.lastState) return;
      const idx = Array.from(this.passiveSlotsEl.children).indexOf(slotEl);
      this.showPassiveTooltip(idx);
    });
  }

  // ---------- 격납고 / 메타 ----------

  bindHangar(meta: MetaSave, onChange: () => void): void {
    this.meta = meta;
    this.onHangarChange = onChange;
    this.refreshHangar();

    (document.getElementById('meta-btn') as HTMLButtonElement).onclick = () => {
      this.refreshMetaShop();
      this.metaOverlay.classList.remove('hidden');
    };
    (document.getElementById('meta-close-btn') as HTMLButtonElement).onclick = () => {
      this.metaOverlay.classList.add('hidden');
      this.refreshHangar();
    };
    (document.getElementById('achv-btn') as HTMLButtonElement).onclick = () => {
      this.refreshAchievements();
      this.achvOverlay.classList.remove('hidden');
    };
    (document.getElementById('achv-close-btn') as HTMLButtonElement).onclick = () => {
      this.achvOverlay.classList.add('hidden');
    };
    (document.getElementById('codex-btn') as HTMLButtonElement).onclick = () => {
      this.showCodex();
    };
    (document.getElementById('codex-debug-btn') as HTMLButtonElement).onclick = () => {
      if (!this.meta) return;
      applyDebugUnlock(this.meta);
      this.onHangarChange?.();
      this.showCodex();
      this.showBanner('DEBUG: 전 컨텐츠 해금 · 재화 지급. 군단장 / 심연 강하로 출격하세요.');
    };
    (document.getElementById('codex-close-btn') as HTMLButtonElement).onclick = () => {
      this.codexOverlay.classList.add('hidden');
      if (!this.pauseOverlay.classList.contains('hidden')) this.showPause();
      else this.refreshHangar();
    };
    (document.getElementById('pause-codex-btn') as HTMLButtonElement).onclick = () => {
      this.showCodex(this.lastState ? [...this.lastState.seenThisRun] : undefined);
    };
    (document.getElementById('gacha-btn') as HTMLButtonElement).onclick = () => {
      this.refreshGacha();
      this.gachaOverlay.classList.remove('hidden');
      this.setFocusGroup([
        document.getElementById('gacha-open-btn') as HTMLButtonElement,
        document.getElementById('gacha-close-btn') as HTMLButtonElement,
      ]);
    };
    (document.getElementById('gacha-close-btn') as HTMLButtonElement).onclick = () => {
      this.gachaOverlay.classList.add('hidden');
      this.refreshHangar();
    };
    const openDroneBay = () => {
      this.renderDroneModal();
      this.droneOverlay.classList.remove('hidden');
    };
    this.droneSummary.onclick = openDroneBay;
    (document.getElementById('drone-bay-btn') as HTMLButtonElement).onclick = openDroneBay;
    (document.getElementById('drone-close-btn') as HTMLButtonElement).onclick = () => {
      this.droneOverlay.classList.add('hidden');
      this.refreshHangar();
    };
    const openTraits = () => {
      this.renderTraitModal();
      this.traitOverlay.classList.remove('hidden');
    };
    this.traitSummary.onclick = openTraits;
    (document.getElementById('trait-btn') as HTMLButtonElement).onclick = openTraits;
    (document.getElementById('trait-close-btn') as HTMLButtonElement).onclick = () => {
      this.traitOverlay.classList.add('hidden');
      this.refreshHangar();
    };
    const openConstellation = () => {
      this.ensureConstellationBoard();
      this.constellationBoard?.open();
    };
    this.constellationSummary.onclick = openConstellation;
    (document.getElementById('constellation-btn') as HTMLButtonElement).onclick = openConstellation;
    (document.getElementById('constellation-close-btn') as HTMLButtonElement).onclick = () => {
      this.constellationBoard?.close();
      this.refreshHangar();
    };
    const costEl = document.getElementById('gacha-cost');
    if (costEl) costEl.textContent = fmtCredits(GACHA.cost);

    this.patchNotesBtn.textContent = LATEST_VERSION;
    this.renderPatchNotes();
    for (const el of document.querySelectorAll('.result-version')) {
      el.textContent = LATEST_VERSION;
    }
    this.patchNotesBtn.onclick = () => {
      this.patchOverlay.classList.remove('hidden');
      this.setFocusGroup([document.getElementById('patch-close-btn') as HTMLButtonElement]);
    };
    (document.getElementById('patch-close-btn') as HTMLButtonElement).onclick = () => {
      this.patchOverlay.classList.add('hidden');
      this.refreshHangar();
    };
  }

  setMeta(meta: MetaSave): void {
    this.meta = meta;
  }

  setAudio(audio: AudioManager): void {
    this.audio = audio;
  }

  private ensureConstellationBoard(): void {
    if (this.constellationBoard) return;
    const canvas = document.getElementById('constellation-canvas') as HTMLCanvasElement;
    const tooltip = document.getElementById('constellation-tooltip') as HTMLDivElement;
    const points = document.getElementById('cst-points') as HTMLSpanElement;
    this.constellationBoard = new ConstellationBoard(
      this.constellationOverlay,
      canvas,
      tooltip,
      points,
      () => this.meta as MetaSave,
      () => this.onHangarChange?.(),
      () => this.audio?.playConstellationUnlock(),
    );
  }

  displayedCredits(): number {
    return this.lastShownCredits;
  }

  refreshHangar(opts?: { animateFrom?: number }): void {
    if (!this.meta) return;
    const to = this.meta.credits;
    if (opts?.animateFrom != null && opts.animateFrom !== to) {
      this.animateCredits(opts.animateFrom, to);
    } else {
      this.metaCredits.textContent = fmtCredits(to);
      this.lastShownCredits = to;
    }
    if (this.metaCores) this.metaCores.textContent = String(this.meta.bossCores);
    const st = this.meta.stats;
    this.metaStats.textContent = `런 ${st.runs} · 클리어 ${st.clears} · 처치 ${st.kills}`;

    this.stageSelect.innerHTML = '';
    for (const stage of Object.values(STAGES)) {
      const unlocked = this.meta.unlockedStages.includes(stage.id);
      const selected = this.meta.selectedStage === stage.id;
      const chip = document.createElement('button');
      chip.className = 'chip' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
      chip.style.setProperty('--chip-color', stage.color);
      chip.innerHTML = `${stage.icon} ${stage.name}${unlocked ? '' : ' 🔒'}`;
      chip.title = unlocked
        ? stage.desc
        : `${stage.desc} (이전 스테이지 클리어로 해금)`;
      chip.addEventListener('click', () => {
        chip.dispatchEvent(new CustomEvent('select-stage', { bubbles: true, detail: stage.id }));
      });
      this.stageSelect.appendChild(chip);
    }

    this.challengeSelect.innerHTML = '';
    for (const ch of Object.values(CHALLENGES)) {
      const selected = this.meta.selectedChallenge === ch.id;
      const chip = document.createElement('button');
      chip.className = 'chip' + (selected ? ' selected' : '');
      chip.innerHTML = `${ch.icon} ${ch.name}`;
      chip.title = ch.desc;
      chip.addEventListener('click', () => {
        chip.dispatchEvent(new CustomEvent('select-challenge', { bubbles: true, detail: ch.id }));
      });
      this.challengeSelect.appendChild(chip);
    }

    this.shipSelect.innerHTML = '';

    for (const ship of Object.values(SHIPS)) {
      const unlocked = this.meta.unlockedShips.includes(ship.id);
      const selected = this.meta.selectedShip === ship.id;
      const skinId = this.meta.equippedShipSkins[ship.id];
      const skin = skinId ? SHIP_SKINS[skinId] : null;
      const card = document.createElement('button');
      card.className = 'ship-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
      card.style.setProperty('--ship-color', skin?.tint ?? ship.color);
      card.innerHTML = `
        <div class="ship-icon${skin ? ' skinned' : ''}"${skin ? ` style="--skin:${skin.tint}"` : ''}>
          <img src="${SPRITE_PATHS.ships[ship.id]}" alt="" width="48" height="48" />
        </div>
        <div class="ship-name">${ship.name}</div>
        <div class="ship-desc">${ship.desc}</div>
        <div class="ship-meta">HP×${ship.hpMul} · SPD×${ship.speedMul} · CRIT ${Math.round(COMBAT.baseCritChance * 100)}%<br/>시작: ${WEAPONS[ship.startingWeapon].icon}${WEAPONS[ship.startingWeapon].name}<br/>스킬: ${ship.activeSkill.icon}${ship.activeSkill.name}</div>
        ${skin ? `<div class="ship-skin">${skin.name}</div>` : ''}
        ${unlocked
          ? (selected ? '<div class="ship-status">선택됨</div>' : '<div class="ship-status">선택</div>')
          : `<div class="ship-status">🔒 ${fmtCredits(ship.unlockCost)} 크레딧</div>`}
      `;
      card.addEventListener('click', () => {
        if (!this.meta || !this.onHangarChange) return;
        if (unlocked) {
          this.meta.selectedShip = ship.id;
          this.onHangarChange();
        } else {
          card.dispatchEvent(new CustomEvent('unlock-ship', { bubbles: true, detail: ship.id }));
        }
      });
      this.shipSelect.appendChild(card);
    }

    this.updateDroneSummary();
    this.updateTraitSummary();
    this.updateConstellationSummary();
    if (!this.droneOverlay.classList.contains('hidden')) this.renderDroneModal();
    if (!this.traitOverlay.classList.contains('hidden')) this.renderTraitModal();

    const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    const metaBtn = document.getElementById('meta-btn') as HTMLButtonElement;
    const gachaBtn = document.getElementById('gacha-btn') as HTMLButtonElement;
    const droneBayBtn = document.getElementById('drone-bay-btn') as HTMLButtonElement;
    const traitBtn = document.getElementById('trait-btn') as HTMLButtonElement;
    const cstBtn = document.getElementById('constellation-btn') as HTMLButtonElement;
    const achvBtn = document.getElementById('achv-btn') as HTMLButtonElement;
    const codexBtn = document.getElementById('codex-btn') as HTMLButtonElement;
    this.hangarGroups = [
      [...this.stageSelect.querySelectorAll('button')],
      [...this.challengeSelect.querySelectorAll('button')],
      [...this.shipSelect.querySelectorAll('button')],
      [this.droneSummary],
      [this.traitSummary],
      [this.constellationSummary],
      [this.patchNotesBtn, startBtn, metaBtn, gachaBtn, droneBayBtn, traitBtn, cstBtn, achvBtn, codexBtn],
    ];
    if (!this.startOverlay.classList.contains('hidden')
      && this.metaOverlay.classList.contains('hidden')
      && this.achvOverlay.classList.contains('hidden')
      && this.gachaOverlay.classList.contains('hidden')
      && this.patchOverlay.classList.contains('hidden')
      && this.codexOverlay.classList.contains('hidden')
      && this.droneOverlay.classList.contains('hidden')
      && this.traitOverlay.classList.contains('hidden')
      && this.constellationOverlay.classList.contains('hidden')) {
      this.hangarGroupIdx = 6;
      this.setFocusGroup(this.hangarGroups[6]);
    }
  }

  private updateDroneSummary(): void {
    if (!this.meta) return;
    const id = this.meta.selectedDrone;
    if (!id) {
      this.droneSummary.textContent = '장착된 드론 없음';
      return;
    }
    const d = DRONES[id];
    const lv = this.meta.droneLevels[id] ?? 1;
    this.droneSummary.textContent = `현재 드론: ${d.icon} ${d.name} Lv.${lv}`;
  }

  private updateTraitSummary(): void {
    if (!this.meta) return;
    const id = this.meta.selectedTrait;
    if (!id) {
      this.traitSummary.textContent = '장착된 특성 없음';
      return;
    }
    const t = PILOT_TRAITS[id];
    this.traitSummary.textContent = `현재 특성: ${t.icon} ${t.name}`;
  }

  private updateConstellationSummary(): void {
    if (!this.meta) return;
    const n = Object.values(this.meta.constellation).filter((lv) => lv > 0).length;
    this.constellationSummary.textContent = `성좌 ${n} · 판테온 ${this.meta.pantheonPoints}`;
  }

  private renderDroneModal(): void {
    if (!this.meta) return;
    this.droneShopCredits.textContent = fmtCredits(this.meta.credits);
    this.droneSelect.innerHTML = '';
    for (const drone of Object.values(DRONES)) {
      const unlocked = this.meta.unlockedDrones.includes(drone.id);
      const selected = this.meta.selectedDrone === drone.id;
      const lv = this.meta.droneLevels[drone.id] ?? 1;
      const upCost = droneUpgradeCost(drone.id, lv);
      const maxed = lv >= drone.maxLevel;
      const row = document.createElement('div');
      row.className = 'drone-row';
      const card = document.createElement('button');
      card.className = 'ship-card drone-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
      card.style.setProperty('--ship-color', drone.color);
      const detail = droneStatLine(drone.id, lv);
      card.innerHTML = `
        <div class="ship-name">${drone.icon} ${drone.name} <span class="drone-tag">${drone.tag}</span></div>
        <div class="ship-desc">${detail}</div>
        <div class="ship-meta">Lv.${lv}/${drone.maxLevel}</div>
        ${unlocked
          ? `<div class="ship-status">${selected ? '장착됨 · 다시 누르면 해제' : '선택'}</div>`
          : `<div class="ship-status">🔒 ${fmtCredits(drone.unlockCost)} 크레딧</div>`}
      `;
      card.addEventListener('click', () => {
        if (!this.meta) return;
        if (!unlocked) {
          card.dispatchEvent(new CustomEvent('unlock-drone', { bubbles: true, detail: drone.id }));
          return;
        }
        card.dispatchEvent(new CustomEvent('select-drone', { bubbles: true, detail: drone.id }));
      });
      row.appendChild(card);
      if (unlocked && !maxed) {
        const up = document.createElement('button');
        up.type = 'button';
        up.className = 'drone-up';
        up.textContent = `강화 💰${fmtCredits(upCost)}`;
        up.addEventListener('click', () => {
          card.dispatchEvent(new CustomEvent('upgrade-drone', { bubbles: true, detail: drone.id }));
        });
        row.appendChild(up);
      }
      this.droneSelect.appendChild(row);
    }
    const closeBtn = document.getElementById('drone-close-btn') as HTMLButtonElement;
    this.setFocusGroup([
      ...this.droneSelect.querySelectorAll('button'),
      closeBtn,
    ]);
  }

  private renderTraitModal(): void {
    if (!this.meta) return;
    this.traitShopCores.textContent = String(this.meta.bossCores);
    this.traitSelect.innerHTML = '';
    for (const trait of Object.values(PILOT_TRAITS)) {
      const unlocked = this.meta.unlockedTraits.includes(trait.id);
      const selected = this.meta.selectedTrait === trait.id;
      const row = document.createElement('div');
      row.className = 'drone-row';
      const card = document.createElement('button');
      card.className = 'ship-card drone-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
      card.style.setProperty('--ship-color', trait.color);
      card.innerHTML = `
        <div class="ship-name">${trait.icon} ${trait.name} <span class="drone-tag">${trait.tag}</span></div>
        <div class="ship-desc">${trait.desc}</div>
        ${unlocked
          ? `<div class="ship-status">${selected ? '장착됨 · 다시 누르면 해제' : '선택'}</div>`
          : `<div class="ship-status">🔒 보스 코어 ${trait.cost}개</div>`}
      `;
      card.addEventListener('click', () => {
        if (!this.meta) return;
        if (!unlocked) {
          card.dispatchEvent(new CustomEvent('unlock-trait', { bubbles: true, detail: trait.id }));
          return;
        }
        card.dispatchEvent(new CustomEvent('select-trait', { bubbles: true, detail: trait.id }));
      });
      row.appendChild(card);
      this.traitSelect.appendChild(row);
    }
    const closeBtn = document.getElementById('trait-close-btn') as HTMLButtonElement;
    this.setFocusGroup([
      ...this.traitSelect.querySelectorAll('button'),
      closeBtn,
    ]);
  }

  onSelectStage(fn: (id: StageId) => void): void {
    this.stageSelect.addEventListener('select-stage', ((e: CustomEvent<StageId>) => fn(e.detail)) as EventListener);
  }

  onSelectChallenge(fn: (id: ChallengeId) => void): void {
    this.challengeSelect.addEventListener('select-challenge', ((e: CustomEvent<ChallengeId>) => fn(e.detail)) as EventListener);
  }

  onUnlockShipRequest(fn: (id: ShipId) => void): void {
    this.shipSelect.addEventListener('unlock-ship', ((e: CustomEvent<ShipId>) => {
      fn(e.detail);
    }) as EventListener);
  }

  onUnlockDroneRequest(fn: (id: DroneId) => void): void {
    this.droneSelect.addEventListener('unlock-drone', ((e: CustomEvent<DroneId>) => fn(e.detail)) as EventListener);
  }

  onSelectDrone(fn: (id: DroneId) => void): void {
    this.droneSelect.addEventListener('select-drone', ((e: CustomEvent<DroneId>) => fn(e.detail)) as EventListener);
  }

  onUpgradeDrone(fn: (id: DroneId) => void): void {
    this.droneSelect.addEventListener('upgrade-drone', ((e: CustomEvent<DroneId>) => fn(e.detail)) as EventListener);
  }

  onUnlockTraitRequest(fn: (id: PilotTraitId) => void): void {
    this.traitSelect.addEventListener('unlock-trait', ((e: CustomEvent<PilotTraitId>) => fn(e.detail)) as EventListener);
  }

  onSelectTrait(fn: (id: PilotTraitId) => void): void {
    this.traitSelect.addEventListener('select-trait', ((e: CustomEvent<PilotTraitId>) => fn(e.detail)) as EventListener);
  }

  private refreshMetaShop(): void {
    if (!this.meta) return;
    this.metaShopCredits.textContent = fmtCredits(this.meta.credits);
    this.metaShop.innerHTML = '';
    let paragonHeader = false;
    for (const id of Object.keys(META_UPGRADES) as MetaUpgradeId[]) {
      const def = META_UPGRADES[id];
      if (!Number.isFinite(def.maxLevel) && !paragonHeader) {
        const h = document.createElement('div');
        h.className = 'shop-section';
        h.textContent = '극한 강화 · 상한 없음';
        this.metaShop.appendChild(h);
        paragonHeader = true;
      }
      const lv = this.meta.upgrades[id] ?? 0;
      const infinite = !Number.isFinite(def.maxLevel);
      const maxed = !infinite && lv >= def.maxLevel;
      const cost = upgradeCost(id, lv);
      const row = document.createElement('button');
      row.className = 'meta-row' + (infinite ? ' paragon' : '');
      row.disabled = maxed || this.meta.credits < cost;
      const lvLabel = infinite ? `Lv.${lv}` : `Lv.${lv}/${def.maxLevel}`;
      row.innerHTML = `
        <span class="meta-icon">${def.icon}</span>
        <span class="meta-body">
          <b>${def.name}</b> ${lvLabel}<br/>
          <span class="tt-desc">${def.desc}</span>
        </span>
        <span class="meta-cost">${maxed ? 'MAX' : `💰 ${fmtCredits(cost)}`}</span>
      `;
      row.addEventListener('click', () => {
        row.dispatchEvent(new CustomEvent('buy-upgrade', { bubbles: true, detail: id }));
      });
      this.metaShop.appendChild(row);
    }
  }

  private renderPatchNotes(): void {
    this.patchList.innerHTML = PATCH_NOTES.map((note) => `
      <article class="patch-block">
        <h3 class="patch-head">${note.version} <span>${note.date}</span></h3>
        <ul>${note.changes.map((c) => `<li>${c}</li>`).join('')}</ul>
      </article>
    `).join('');
  }

  onBuyUpgrade(fn: (id: MetaUpgradeId) => void): void {
    this.metaShop.addEventListener('buy-upgrade', ((e: CustomEvent<MetaUpgradeId>) => {
      fn(e.detail);
      this.refreshMetaShop();
      this.refreshHangar();
    }) as EventListener);
  }

  onOpenGacha(fn: () => void): void {
    (document.getElementById('gacha-open-btn') as HTMLButtonElement).addEventListener('click', fn);
  }

  showGachaResult(message: string, tier: 'jackpot' | 'win' | 'dud'): void {
    this.gachaResult.textContent = message;
    this.gachaResult.className = `gacha-result ${tier}`;
    this.gachaResult.classList.remove('hidden');
    this.refreshGacha();
    this.refreshHangar();
  }

  private refreshGacha(): void {
    if (!this.meta) return;
    this.gachaCredits.textContent = fmtCredits(this.meta.credits);
    const openBtn = document.getElementById('gacha-open-btn') as HTMLButtonElement;
    openBtn.disabled = this.meta.credits < GACHA.cost;
    this.gachaOdds.innerHTML = `
      <div>🎰 대성공 10% — 기체 스킨</div>
      <div>🔫 성공 30% — 투사체 스킨</div>
      <div>💨 꽝 60% — ${fmtCredits(GACHA.dudRefund)} 크레딧 환급</div>
    `;
    const ships = this.meta.unlockedShipSkins.map((id) => SHIP_SKINS[id].name);
    const projs = this.meta.unlockedProjSkins.map((id) => PROJ_SKINS[id].name);
    const owned = [...ships, ...projs];
    this.gachaOwned.textContent = owned.length
      ? `보유: ${owned.join(' · ')}`
      : '보유 스킨 없음';
  }

  private animateCredits(from: number, to: number): void {
    cancelAnimationFrame(this.creditAnim);
    const start = performance.now();
    const dur = 700;
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - t) ** 3;
      const val = Math.round(from + (to - from) * eased);
      this.metaCredits.textContent = fmtCredits(val);
      if (t < 1) this.creditAnim = requestAnimationFrame(tick);
      else this.lastShownCredits = to;
    };
    this.creditAnim = requestAnimationFrame(tick);
  }

  private refreshAchievements(): void {
    if (!this.meta) return;
    const have = new Set(this.meta.achievements);
    this.achvList.innerHTML = '';
    for (const def of Object.values(ACHIEVEMENTS)) {
      const done = have.has(def.id);
      const row = document.createElement('div');
      row.className = 'achv-row' + (done ? ' done' : '');
      row.innerHTML = `
        <span class="achv-icon">${def.icon}</span>
        <span class="achv-body">
          <b>${def.name}</b>${done ? ' ✅' : ''}<br/>
          <span class="tt-desc">${def.desc} · 보상 ${def.reward}💰</span>
        </span>
      `;
      this.achvList.appendChild(row);
    }
  }

  showCodex(seenOverride?: WeaponId[]): void {
    const seen = new Set(seenOverride ?? this.meta?.seenWeapons ?? []);
    const byTier: Record<1 | 2 | 3, typeof WEAPONS[WeaponId][]> = { 1: [], 2: [], 3: [] };
    for (const def of Object.values(WEAPONS)) byTier[def.tier].push(def);
    const recipeOf = (id: WeaponId) => RECIPES.find((r) => r.result === id);

    const block = (tier: 1 | 2 | 3): string => {
      const rows = byTier[tier].map((def) => {
        const unlocked = seen.has(def.id);
        const rec = recipeOf(def.id);
        const mats = rec
          ? [
            ...rec.materials.map((m) => (seen.has(m) ? `${WEAPONS[m].icon}${WEAPONS[m].name}` : '???')),
            ...(rec.requirePassive ? [`${PASSIVES[rec.requirePassive].icon}${PASSIVES[rec.requirePassive].name}`] : []),
          ].join(' + ')
          : '시작 무기 / 레벨업';
        return `
          <div class="codex-row${unlocked ? ' done' : ''}">
            <span class="achv-icon">${unlocked ? def.icon : '🔒'}</span>
            <span class="achv-body">
              <b>${unlocked ? def.name : '???'}</b> T${tier}<br/>
              <span class="tt-desc">${unlocked ? def.desc : '미해금'} · ${mats}</span>
            </span>
          </div>`;
      }).join('');
      return `<div class="codex-tier">Tier ${tier}</div>${rows}`;
    };

    this.codexList.innerHTML = block(1) + block(2) + block(3);
    this.codexOverlay.classList.remove('hidden');
    this.setFocusGroup([
      document.getElementById('codex-debug-btn') as HTMLButtonElement,
      document.getElementById('codex-close-btn') as HTMLButtonElement,
    ]);
  }

  showAchievementToast(ids: AchievementId[]): void {
    for (const id of ids) {
      const def = ACHIEVEMENTS[id];
      this.showBanner(`${def.icon} 업적: ${def.name} (+${def.reward}💰)`);
    }
  }

  // ---------- HUD ----------

  updateHUD(state: GameState): void {
    this.lastState = state;

    this.expFill.style.width = `${Math.min(100, (state.exp / state.expToNext) * 100)}%`;
    this.expLabel.textContent = `Lv.${state.level}`;
    this.hpFill.style.width = `${(state.hp / state.maxHp) * 100}%`;
    this.hpLabel.textContent = `${Math.ceil(state.hp)} / ${state.maxHp}`;
    this.hpFill.style.background =
      state.hp / state.maxHp < 0.3
        ? 'linear-gradient(90deg, #ef4444, #f87171)'
        : 'linear-gradient(90deg, #22c55e, #86efac)';

    if (state.droneId) {
      const d = DRONES[state.droneId];
      this.hudDrone.textContent = `${d.icon} ${d.name} Lv.${state.droneLevel}`;
      this.hudDrone.classList.remove('hidden');
      this.hudDrone.classList.toggle('emp-off', state.empLeft > 0);
    } else {
      this.hudDrone.textContent = '';
      this.hudDrone.classList.add('hidden');
      this.hudDrone.classList.remove('emp-off');
    }

    if (state.activeMods.length > 0) {
      this.hudMods.classList.remove('hidden');
      this.hudMods.innerHTML = state.activeMods.map((id) => {
        const def = MODIFIERS[id];
        const color = def.kind === 'prefix' ? '#f87171' : '#c084fc';
        return `<span style="color:${color}">${def.icon} ${def.name}</span>`;
      }).join('');
    } else {
      this.hudMods.innerHTML = '';
      this.hudMods.classList.add('hidden');
    }

    const m = Math.floor(state.time / 60).toString().padStart(2, '0');
    const s = Math.floor(state.time % 60).toString().padStart(2, '0');
    this.statTime.textContent = `${m}:${s}`;
    this.statKills.textContent = `☠ ${state.kills}`;
    this.statScore.textContent = `🏆 ${state.score.toLocaleString()}`;
    const modalOpen = !this.levelupOverlay.classList.contains('hidden');
    if (state.pendingLevelUps > 0 && !modalOpen && state.status === 'playing') {
      this.pendingLv.textContent = `선택 대기 ${state.pendingLevelUps}`;
      this.pendingLv.classList.remove('hidden');
    } else {
      this.pendingLv.classList.add('hidden');
    }
    this.updateSkillBtn(state);

    this.updateBossBar(state);
    this.updateCombo(state);
    this.renderSlots(state);
    this.renderPassives(state);
  }

  private updateBossBar(state: GameState): void {
    const boss = state.bossId !== null
      ? state.enemies.find((e) => e.id === state.bossId)
      : undefined;
    if (boss) {
      this.bossBar.classList.remove('hidden');
      this.bossFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
      this.bossLabel.textContent = `⚠ ${boss.def.name.toUpperCase()}`;
    } else {
      this.bossBar.classList.add('hidden');
    }
  }

  private updateCombo(state: GameState): void {
    if (state.comboCount >= 5 && state.status === 'playing') {
      this.comboEl.textContent = `${state.comboCount} COMBO`;
      this.comboEl.classList.remove('hidden');
      if (state.comboCount !== this.lastCombo) {
        this.comboEl.classList.remove('combo-pop');
        void this.comboEl.offsetWidth;
        this.comboEl.classList.add('combo-pop');
      }
    } else {
      this.comboEl.classList.add('hidden');
    }
    this.lastCombo = state.comboCount;
  }

  private updateSkillBtn(state: GameState): void {
    const skill = SHIPS[state.shipId].activeSkill;
    this.skillIcon.textContent = skill.icon;
    this.skillBtn.title = `${skill.name} (Space)`;
    const playing = state.status === 'playing';
    this.skillBtn.classList.toggle('hidden', state.status === 'ready');
    if (!playing) {
      this.skillBtn.classList.remove('ready', 'cooling');
      this.skillCd.classList.add('hidden');
      return;
    }
    if (state.coreAwakened && state.skillChargeMax > 0) {
      if (state.skillCharges > 0) {
        this.skillBtn.classList.add('ready');
        this.skillBtn.classList.remove('cooling');
        this.skillCd.textContent = String(state.skillCharges);
        this.skillCd.classList.remove('hidden');
      } else {
        this.skillBtn.classList.add('cooling');
        this.skillBtn.classList.remove('ready');
        this.skillCd.textContent = String(Math.ceil(state.skillRechargeLeft));
        this.skillCd.classList.remove('hidden');
      }
      return;
    }
    if (state.skillCdLeft > 0) {
      this.skillBtn.classList.add('cooling');
      this.skillBtn.classList.remove('ready');
      this.skillCd.textContent = String(Math.ceil(state.skillCdLeft));
      this.skillCd.classList.remove('hidden');
    } else {
      this.skillBtn.classList.add('ready');
      this.skillBtn.classList.remove('cooling');
      this.skillCd.classList.add('hidden');
    }
  }

  private renderSlots(state: GameState): void {
    const key = state.weapons.map((w) => `${w.weaponId}:${w.level}:${w.affix ?? ''}:${w.damageBonus ?? 0}:${w.speedBonus ?? 0}:${w.cooldownBonus ?? 0}:${w.radiusBonus ?? 0}`).join(',');
    if (key === this.lastSlotsKey) return;
    this.lastSlotsKey = key;

    this.slotsEl.innerHTML = '';
    for (let i = 0; i < state.maxWeaponSlots; i++) {
      const slot = state.weapons[i];
      const el = document.createElement('div');
      el.className = 'weapon-slot' + (slot ? ' filled' : '') + (slot?.affix ? ' affix' : '');
      if (slot) {
        const def = WEAPONS[slot.weaponId];
        el.style.borderColor = def.color;
        const affixMark = slot.affix ? '✦' : '';
        el.innerHTML = `
          <span class="slot-num">${i + 1}</span>
          <span class="slot-tier">T${def.tier}${affixMark}</span>
          <span class="slot-icon">${def.icon}</span>
          <span class="slot-level">Lv.${slot.level}</span>
        `;
      } else {
        el.innerHTML = `<span class="slot-num">${i + 1}</span>`;
      }
      this.slotsEl.appendChild(el);
    }
  }

  private renderPassives(state: GameState): void {
    const key = `${state.empLeft > 0 ? 1 : 0}:${state.passives.map((p) => `${p.passiveId}:${p.level}`).join(',')}`;
    if (key === this.lastPassiveKey) return;
    this.lastPassiveKey = key;

    this.passiveSlotsEl.innerHTML = '';
    for (let i = 0; i < state.maxPassiveSlots; i++) {
      const slot = state.passives[i];
      const el = document.createElement('div');
      el.className = 'weapon-slot passive-slot' + (slot ? ' filled' : '') + (state.empLeft > 0 ? ' emp-off' : '');
      if (slot) {
        const def = PASSIVES[slot.passiveId];
        el.style.borderColor = def.color;
        el.innerHTML = `
          <span class="slot-icon">${def.icon}</span>
          <span class="slot-level">Lv.${slot.level}</span>
        `;
      }
      this.passiveSlotsEl.appendChild(el);
    }
  }

  private showWeaponTooltip(slotIdx: number): void {
    const slot = this.lastState?.weapons[slotIdx];
    if (!slot) {
      this.tooltipEl.classList.add('hidden');
      return;
    }
    const def = WEAPONS[slot.weaponId];
    const p = def.projectile;
    const dmgMul = this.lastState?.damageMul ?? 1;
    const dmg = (p.damage * (1 + (slot.level - 1) * LEVELING.damagePerLevel) * dmgMul).toFixed(1);
    const cdScale = (1 - Math.min(0.45, (slot.level - 1) * LEVELING.cooldownPerLevel))
      * (this.lastState?.cooldownMul ?? 1)
      * (1 - Math.min(ARSENAL.cooldownBonusCap, slot.cooldownBonus ?? 0));
    const cdMs = Math.max(def.cooldownMs * ARSENAL.cooldownFloor, def.cooldownMs * cdScale);
    const cd = (cdMs / 1000).toFixed(2);
    const affixLine = slot.affix
      ? `<br/><span class="tt-affix">${AFFIXES[slot.affix].label} ${AFFIXES[slot.affix].desc}</span>`
      : '';
    const buffBits: string[] = [];
    if ((slot.damageBonus ?? 0) > 0) buffBits.push(`데미지 +${Math.round((slot.damageBonus ?? 0) * 100)}%`);
    if ((slot.speedBonus ?? 0) > 0) buffBits.push(`투속 +${Math.round((slot.speedBonus ?? 0) * 100)}%`);
    if ((slot.cooldownBonus ?? 0) > 0) {
      const pct = Math.round((slot.cooldownBonus ?? 0) * 100);
      buffBits.push(isTickWeapon(slot.weaponId) ? `빈도 +${pct}%` : `쿨 -${pct}%`);
    }
    if ((slot.radiusBonus ?? 0) > 0) buffBits.push(`크기 +${Math.round((slot.radiusBonus ?? 0) * 100)}%`);
    const buffLine = buffBits.length
      ? `<br/><span class="tt-affix">크래프트 ${buffBits.join(' · ')}</span>`
      : '';
    this.tooltipEl.innerHTML = `
      <b>${def.icon} ${def.name}</b> <span class="tt-tier">T${def.tier} · Lv.${slot.level}</span><br/>
      <span class="tt-desc">${def.desc}</span>${affixLine}${buffLine}<br/>
      데미지 <b>${dmg}</b> × ${p.count}발 · 쿨타임 <b>${cd}s</b>
    `;
    this.tooltipEl.classList.remove('hidden');
    if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
    this.tooltipTimeout = window.setTimeout(() => this.tooltipEl.classList.add('hidden'), 3000);
  }

  private showPassiveTooltip(slotIdx: number): void {
    const slot = this.lastState?.passives[slotIdx];
    if (!slot) {
      this.tooltipEl.classList.add('hidden');
      return;
    }
    const def = PASSIVES[slot.passiveId];
    this.tooltipEl.innerHTML = `
      <b>${def.icon} ${def.name}</b> <span class="tt-tier">Lv.${slot.level}/${def.maxLevel}</span><br/>
      <span class="tt-desc">${def.desc}</span>
    `;
    this.tooltipEl.classList.remove('hidden');
    if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
    this.tooltipTimeout = window.setTimeout(() => this.tooltipEl.classList.add('hidden'), 3000);
  }

  showBanner(text: string, duration = 2200): void {
    this.bannerEl.textContent = text;
    this.bannerEl.classList.remove('hidden', 'banner-anim');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('banner-anim');
    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    this.bannerTimeout = window.setTimeout(() => this.bannerEl.classList.add('hidden'), duration);
  }

  showStory(text: string): void {
    this.storyEl.textContent = text;
    this.storyEl.classList.remove('hidden');
    if (this.storyTimeout) clearTimeout(this.storyTimeout);
    this.storyTimeout = window.setTimeout(() => this.storyEl.classList.add('hidden'), 4500);
  }

  showLevelUp(
    choices: LevelUpChoice[],
    onPick: (choice: LevelUpChoice) => void,
    labels?: { title: string; sub: string; previewHtml?: string },
  ): void {
    this.levelupTitle.textContent = labels?.title ?? 'LEVEL UP!';
    this.levelupSub.textContent = labels?.sub ?? '강화를 선택하세요';
    if (labels?.previewHtml) {
      this.levelupPreview.innerHTML = labels.previewHtml;
      this.levelupPreview.classList.remove('hidden');
      this.levelupOverlay.classList.add('has-preview');
    } else {
      this.levelupPreview.innerHTML = '';
      this.levelupPreview.classList.add('hidden');
      this.levelupOverlay.classList.remove('has-preview');
    }
    this.cardContainer.innerHTML = '';
    for (const choice of choices) {
      const card = document.createElement('button');
      const hints = [
        choice.canEvolve ? 'hint-evolve' : '',
        !choice.canEvolve && choice.isSynergy ? 'hint-synergy' : '',
      ].filter(Boolean).join(' ');
      card.className = 'choice-card'
        + (choice.kind === 'jackpot' ? ' jackpot' : '')
        + (choice.kind === 'tactical' || choice.kind === 'statBoost' || choice.kind === 'affix' || choice.kind === 'craft' || choice.kind === 'evolve' || choice.kind === 'awakening' || choice.kind === 'altarReward' ? ' endgame' : '')
        + (hints ? ` ${hints}` : '');
      card.style.setProperty('--card-color', choice.color);
      if (choice.synergyColor) card.style.setProperty('--synergy-color', choice.synergyColor);
      card.innerHTML = `
        ${choice.hasCombo ? '<span class="puzzle-badge" title="보유 무장과 조합 가능">🧩</span>' : ''}
        <span class="card-icon">${choice.icon}</span>
        <span class="card-body">
          <div class="card-kind">${kindLabel(choice.kind)}</div>
          <div class="card-title">${choice.title}</div>
          <div class="card-desc">${choice.desc}</div>
        </span>
      `;
      card.addEventListener('click', () => onPick(choice), { once: true });
      this.cardContainer.appendChild(card);
    }
    this.levelupOverlay.classList.remove('hidden');
    this.setFocusGroup([...this.cardContainer.querySelectorAll('button')], -1);
  }

  hideLevelUp(): void {
    this.levelupOverlay.classList.add('hidden');
    this.levelupOverlay.classList.remove('has-preview');
    this.levelupPreview.innerHTML = '';
    this.levelupPreview.classList.add('hidden');
    this.clearFocus();
  }

  private resultHtml(
    state: GameState,
    creditsGained: number,
    newAchv: AchievementId[],
    pantheonGained = 0,
  ): string {
    const m = Math.floor(state.time / 60).toString().padStart(2, '0');
    const s = Math.floor(state.time % 60).toString().padStart(2, '0');
    const best = this.meta?.bestScore ?? state.score;
    const isNew = state.score >= best && state.score > 0;
    const achvLine = newAchv.length
      ? `<br/>업적 ${newAchv.map((id) => ACHIEVEMENTS[id].icon + ACHIEVEMENTS[id].name).join(', ')}`
      : '';
    const dealt = Object.entries(state.damageDealt)
      .map(([id, dmg]) => ({ id: id as WeaponId, dmg: dmg ?? 0 }))
      .filter((e) => e.dmg > 0)
      .sort((a, b) => b.dmg - a.dmg);
    const total = dealt.reduce((sum, e) => sum + e.dmg, 0);
    const meter = dealt.length === 0 || total <= 0
      ? ''
      : `<div class="dps-meter"><div class="dps-title">딜 기여도</div>${dealt.map((e) => {
        const pct = (e.dmg / total) * 100;
        const def = WEAPONS[e.id];
        return `<div class="dps-row">
          <span class="dps-name">${def.icon} ${def.name}</span>
          <span class="dps-bar"><i style="width:${pct.toFixed(1)}%;background:${def.color}"></i></span>
          <span class="dps-pct">${pct.toFixed(0)}% · ${fmtDamage(e.dmg)}</span>
        </div>`;
      }).join('')}</div>`;
    return `
      점수 <b>${state.score.toLocaleString()}</b>${isNew ? ' <span class="new-record">🎉 신기록!</span>' : ''}<br/>
      최고 기록 <b>${best.toLocaleString()}</b> · 획득 크레딧 <b>+${creditsGained}</b> · 판테온 <b>+${pantheonGained}</b><br/>
      생존 <b>${m}:${s}</b> · 처치 <b>${state.kills}</b> · Lv.<b>${state.level}</b><br/>
      ${STAGES[state.stageId].icon}${STAGES[state.stageId].name} · ${CHALLENGES[state.challengeId].icon}${CHALLENGES[state.challengeId].name}${achvLine}
      ${meter}
    `;
  }

  showGameOver(
    state: GameState,
    creditsGained: number,
    newAchv: AchievementId[],
    pantheonGained = 0,
  ): void {
    this.gameoverStats.innerHTML = this.resultHtml(state, creditsGained, newAchv, pantheonGained);
    this.gameoverOverlay.classList.remove('hidden');
    this.setFocusGroup([document.getElementById('restart-btn') as HTMLButtonElement]);
  }

  hideGameOver(): void {
    this.gameoverOverlay.classList.add('hidden');
    this.clearFocus();
  }

  showVictory(
    state: GameState,
    creditsGained: number,
    newAchv: AchievementId[],
    pantheonGained = 0,
  ): void {
    this.victoryStats.innerHTML = this.resultHtml(state, creditsGained, newAchv, pantheonGained);
    this.victoryOverlay.classList.remove('hidden');
    this.setFocusGroup([document.getElementById('victory-restart-btn') as HTMLButtonElement]);
  }

  hideVictory(): void {
    this.victoryOverlay.classList.add('hidden');
    this.clearFocus();
  }

  showPause(): void {
    const critPct = Math.round(COMBAT.baseCritChance * 100);
    const critMul = this.lastState?.runStats.critMul ?? COMBAT.baseCritMul;
    this.pauseStats.textContent = `치명타 확률 ${critPct}% · 배율 ×${critMul.toFixed(2)}`;
    this.pauseOverlay.classList.remove('hidden');
    this.hideRetreatConfirm();
    this.setFocusGroup([
      document.getElementById('resume-btn') as HTMLButtonElement,
      document.getElementById('pause-codex-btn') as HTMLButtonElement,
      document.getElementById('pause-restart-btn') as HTMLButtonElement,
      document.getElementById('pause-retreat-btn') as HTMLButtonElement,
    ]);
  }

  hidePause(): void {
    this.pauseOverlay.classList.add('hidden');
    this.codexOverlay.classList.add('hidden');
    this.hideRetreatConfirm();
    this.clearFocus();
  }

  showRetreatConfirm(): void {
    (document.getElementById('pause-actions') as HTMLDivElement).classList.add('hidden');
    (document.getElementById('retreat-confirm') as HTMLDivElement).classList.remove('hidden');
    this.setFocusGroup([
      document.getElementById('retreat-yes-btn') as HTMLButtonElement,
      document.getElementById('retreat-no-btn') as HTMLButtonElement,
    ]);
  }

  hideRetreatConfirm(): void {
    (document.getElementById('pause-actions') as HTMLDivElement).classList.remove('hidden');
    (document.getElementById('retreat-confirm') as HTMLDivElement).classList.add('hidden');
    if (!this.pauseOverlay.classList.contains('hidden')) {
      this.setFocusGroup([
        document.getElementById('resume-btn') as HTMLButtonElement,
        document.getElementById('pause-codex-btn') as HTMLButtonElement,
        document.getElementById('pause-restart-btn') as HTMLButtonElement,
        document.getElementById('pause-retreat-btn') as HTMLButtonElement,
      ]);
    }
  }

  hideStart(): void {
    this.startOverlay.classList.add('hidden');
    this.droneOverlay.classList.add('hidden');
    this.traitOverlay.classList.add('hidden');
    this.hideModifierModal();
    this.clearFocus();
  }

  showStart(opts?: { animateCreditsFrom?: number }): void {
    this.startOverlay.classList.remove('hidden');
    this.refreshHangar({ animateFrom: opts?.animateCreditsFrom });
  }

  setMuted(muted: boolean): void {
    this.muteBtn.textContent = muted ? '🔇' : '🔊';
  }

  onStartClick(fn: () => void): void {
    (document.getElementById('start-btn') as HTMLButtonElement).addEventListener('click', fn);
  }

  getPendingMods(): ModifierId[] {
    return [...this.pendingMods];
  }

  showModifierModal(): void {
    this.pendingMods = rollModifiers();
    this.renderModifierModal();
    this.modifierOverlay.classList.remove('hidden');
    this.setFocusGroup([
      this.modRerollBtn,
      document.getElementById('mod-launch-btn') as HTMLButtonElement,
      document.getElementById('mod-close-btn') as HTMLButtonElement,
    ]);
  }

  hideModifierModal(): void {
    this.modifierOverlay.classList.add('hidden');
    this.clearFocus();
  }

  rerollModifiers(): void {
    this.pendingMods = rollModifiers();
    this.modList.classList.add('spinning');
    for (const el of this.modList.querySelectorAll('.mod-chip')) el.classList.add('spinning');
    window.setTimeout(() => {
      this.renderModifierModal();
    }, 160);
  }

  private renderModifierModal(): void {
    const mul = modifierRewardMul(this.pendingMods);
    const pct = Math.round((mul - 1) * 100);
    this.modReward.textContent = `현재 보상 배율 +${pct}%`;
    this.modList.className = 'mod-list';
    this.modList.innerHTML = this.pendingMods.map((id) => {
      const def = MODIFIERS[id];
      return `<div class="mod-chip ${def.kind}">
        <div class="mod-name">${def.icon} ${def.name}</div>
        <div class="mod-desc">${def.desc} · +${Math.round(def.rewardMul * 100)}%</div>
      </div>`;
    }).join('');
    const canReroll = (this.meta?.credits ?? 0) >= MODIFIER_FX.rerollCost;
    this.modRerollBtn.disabled = !canReroll;
    this.modRerollBtn.textContent = canReroll
      ? `변이 굴림 (${MODIFIER_FX.rerollCost.toLocaleString()}c)`
      : `크레딧 부족 (${MODIFIER_FX.rerollCost.toLocaleString()}c)`;
  }

  onModifierReroll(fn: () => void): void {
    this.modRerollBtn.addEventListener('click', fn);
  }

  onModifierLaunch(fn: () => void): void {
    (document.getElementById('mod-launch-btn') as HTMLButtonElement).addEventListener('click', fn);
  }

  onModifierClose(fn: () => void): void {
    (document.getElementById('mod-close-btn') as HTMLButtonElement).addEventListener('click', fn);
  }

  onRestartClick(fn: () => void): void {
    (document.getElementById('restart-btn') as HTMLButtonElement).addEventListener('click', fn);
    (document.getElementById('victory-restart-btn') as HTMLButtonElement).addEventListener('click', fn);
    (document.getElementById('pause-restart-btn') as HTMLButtonElement).addEventListener('click', fn);
  }

  onPauseClick(fn: () => void): void {
    (document.getElementById('pause-btn') as HTMLButtonElement).addEventListener('click', fn);
    (document.getElementById('resume-btn') as HTMLButtonElement).addEventListener('click', fn);
  }

  onRetreatClick(fn: () => void): void {
    (document.getElementById('pause-retreat-btn') as HTMLButtonElement).addEventListener('click', fn);
  }

  onRetreatConfirm(fn: () => void): void {
    (document.getElementById('retreat-yes-btn') as HTMLButtonElement).addEventListener('click', fn);
    (document.getElementById('retreat-no-btn') as HTMLButtonElement).addEventListener('click', () => {
      this.hideRetreatConfirm();
    });
  }

  onMuteClick(fn: () => void): void {
    this.muteBtn.addEventListener('click', fn);
  }

  onSkillClick(fn: () => void): void {
    this.skillBtn.addEventListener('click', (e) => {
      e.preventDefault();
      fn();
    });
  }

  handleKey(e: KeyboardEvent): boolean {
    if (e.repeat && (e.code === 'Space' || e.code === 'Enter')) return true;
    const left = e.code === 'ArrowLeft' || e.code === 'KeyA';
    const right = e.code === 'ArrowRight' || e.code === 'KeyD';
    const up = e.code === 'ArrowUp' || e.code === 'KeyW';
    const down = e.code === 'ArrowDown' || e.code === 'KeyS';
    const confirm = e.code === 'Enter' || e.code === 'Space';

    if (!this.levelupOverlay.classList.contains('hidden')
      || !this.pauseOverlay.classList.contains('hidden')
      || !this.gameoverOverlay.classList.contains('hidden')
      || !this.victoryOverlay.classList.contains('hidden')) {
      if (left || up) { this.moveFocus(-1); return true; }
      if (right || down) { this.moveFocus(1); return true; }
      if (confirm) { this.activateFocus(); return true; }
      return false;
    }

    if (!this.droneOverlay.classList.contains('hidden')
      || !this.traitOverlay.classList.contains('hidden')) {
      if (e.code === 'Escape') return false;
      if (left || up) { this.moveFocus(-1); return true; }
      if (right || down) { this.moveFocus(1); return true; }
      if (confirm) { this.activateFocus(); return true; }
      return false;
    }

    if (!this.metaOverlay.classList.contains('hidden')
      || !this.achvOverlay.classList.contains('hidden')
      || !this.gachaOverlay.classList.contains('hidden')
      || !this.patchOverlay.classList.contains('hidden')) {
      if (e.code === 'Escape') return false;
      if (confirm) {
        const closeId = !this.metaOverlay.classList.contains('hidden')
          ? 'meta-close-btn'
          : !this.gachaOverlay.classList.contains('hidden')
            ? 'gacha-close-btn'
            : !this.patchOverlay.classList.contains('hidden')
              ? 'patch-close-btn'
              : 'achv-close-btn';
        (document.getElementById(closeId) as HTMLButtonElement)?.click();
        return true;
      }
      if (!this.gachaOverlay.classList.contains('hidden')) {
        if (left || up) { this.moveFocus(-1); return true; }
        if (right || down) { this.moveFocus(1); return true; }
      }
      return false;
    }

    if (!this.startOverlay.classList.contains('hidden')) {
      if (up) { this.moveHangarGroup(-1); return true; }
      if (down) { this.moveHangarGroup(1); return true; }
      if (left) { this.moveFocus(-1); return true; }
      if (right) { this.moveFocus(1); return true; }
      if (confirm) { this.activateFocus(); return true; }
    }
    return false;
  }

  private setFocusGroup(els: HTMLElement[], startIdx = 0): void {
    this.clearFocus();
    this.focusEls = els.filter(Boolean);
    this.focusIdx = startIdx;
    if (this.focusIdx >= 0) this.applyFocus();
  }

  private clearFocus(): void {
    for (const el of this.focusEls) el.classList.remove('focused');
    this.focusEls = [];
    this.focusIdx = 0;
  }

  private moveFocus(delta: number): void {
    if (this.focusEls.length === 0) return;
    if (this.focusIdx < 0) {
      this.focusIdx = 0;
      this.applyFocus();
      return;
    }
    this.focusEls[this.focusIdx]?.classList.remove('focused');
    this.focusIdx = (this.focusIdx + delta + this.focusEls.length) % this.focusEls.length;
    this.applyFocus();
  }

  private applyFocus(): void {
    const el = this.focusEls[this.focusIdx];
    if (!el) return;
    el.classList.add('focused');
  }

  private activateFocus(): boolean {
    if (this.focusIdx < 0) return true;
    const el = this.focusEls[this.focusIdx];
    if (!el) return false;
    el.click();
    return true;
  }

  private moveHangarGroup(delta: number): void {
    if (this.hangarGroups.length === 0) return;
    this.hangarGroupIdx = (this.hangarGroupIdx + delta + this.hangarGroups.length) % this.hangarGroups.length;
    this.setFocusGroup(this.hangarGroups[this.hangarGroupIdx]);
  }
}

/** T3 미보유 시 크래프팅 창에 띄우는 종결 보상 프리뷰 */
export function craftLockedPreviewHtml(): string {
  const dmgPct = Math.round(ARSENAL.buffDamage * 100);
  return `
    <p>현재 장착 중인 종결(Tier 3) 무기가 없습니다.</p>
    <p>💡 Tier 3 무기를 획득하면 퀀텀 큐브를 소모하여 아래의 특수 능력을 부여할 수 있습니다:</p>
    <ul>
      <li>${AFFIXES.split.icon} ${AFFIXES.split.label} 투사체 분열</li>
      <li>${AFFIXES.pierce.icon} ${AFFIXES.pierce.label} 관통 횟수 증가</li>
      <li>${AFFIXES.chain.icon} ${AFFIXES.chain.label} 명중 시 체인 전이</li>
      <li>${AFFIXES.afterimage.icon} ${AFFIXES.afterimage.label} 근접 잔상 타격</li>
      <li>${AFFIXES.echo.icon} ${AFFIXES.echo.label} 처치 시 폭발</li>
      <li>${AFFIXES.brilliance.icon} ${AFFIXES.brilliance.label} 타격 광역 파동</li>
      <li>💪 [강화] 무기 기본 데미지 이번 런 동안 +${dmgPct}% 증가</li>
      <li>💨 [강화] 투사체 속도 이번 런 동안 +${Math.round(ARSENAL.buffSpeed * 100)}%</li>
      <li>⏱️ [강화] 발사 쿨타임(근접·오라는 타격 주기) 이번 런 동안 -${Math.round(ARSENAL.buffCooldown * 100)}%</li>
      <li>🔘 [강화] 투사체·폭발 반경 이번 런 동안 +${Math.round(ARSENAL.buffRadius * 100)}%</li>
    </ul>
  `;
}

/** T3 보유 시 크래프팅 창 상단에 장착 종결 무기 스펙 */
export function craftArsenalPreviewHtml(state: GameState): string {
  const slots = state.weapons.filter((s) => WEAPONS[s.weaponId].tier === 3);
  if (!slots.length) return craftLockedPreviewHtml();
  const dupIds = new Set<string>();
  {
    const counts = new Map<string, number>();
    for (const s of slots) counts.set(s.weaponId, (counts.get(s.weaponId) ?? 0) + 1);
    for (const [id, n] of counts) if (n >= 2) dupIds.add(id);
  }
  const rows = slots.map((slot) => {
    const def = WEAPONS[slot.weaponId];
    const p = def.projectile;
    const dmg = (
      p.damage
      * (1 + (slot.level - 1) * LEVELING.damagePerLevel)
      * state.damageMul
      * (1 + (slot.damageBonus ?? 0))
    ).toFixed(1);
    const craftCd = Math.min(ARSENAL.cooldownBonusCap, slot.cooldownBonus ?? 0);
    const cdMs = Math.max(
      def.cooldownMs * ARSENAL.cooldownFloor,
      def.cooldownMs
        * (1 - Math.min(0.45, (slot.level - 1) * LEVELING.cooldownPerLevel))
        * state.cooldownMul
        * (1 - craftCd),
    );
    const cd = (cdMs / 1000).toFixed(2);
    const affix = slot.affix ? AFFIXES[slot.affix].label : '없음';
    const dmgB = Math.round((slot.damageBonus ?? 0) * 100);
    const spdB = Math.round((slot.speedBonus ?? 0) * 100);
    const cdB = Math.round((slot.cooldownBonus ?? 0) * 100);
    const radB = Math.round((slot.radiusBonus ?? 0) * 100);
    const cdLabel = isTickWeapon(slot.weaponId) ? `빈도 +${cdB}%` : `쿨 -${cdB}%`;
    const slotIdx = state.weapons.indexOf(slot) + 1;
    const name = dupIds.has(slot.weaponId) ? `[${slotIdx}슬롯] ${def.name}` : def.name;
    return `<li>${def.icon} <b>${name}</b> Lv.${slot.level}<br/>
      데미지 ${dmg} × ${p.count} · 주기 ${cd}s<br/>
      어픽스 ${affix} · 데미지 +${dmgB}% · 투속 +${spdB}% · ${cdLabel} · 크기 +${radB}%</li>`;
  }).join('');
  return `<p>장착 중 종결 무기</p><ul>${rows}</ul>`;
}
