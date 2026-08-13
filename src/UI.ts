import type { LevelUpChoice, ShipId, MetaUpgradeId, AchievementId, StageId, ChallengeId } from './types';
import {
  WEAPONS, LEVELING, SHIPS, PASSIVES, META_UPGRADES, ACHIEVEMENTS,
  STAGES, CHALLENGES, AFFIXES, ARSENAL, GACHA, SHIP_SKINS, PROJ_SKINS,
} from './GameConfig';
import { kindLabel } from './LevelUpSystem';
import type { GameState } from './GameState';
import type { MetaSave } from './Meta';
import { upgradeCost } from './Meta';
import { SPRITE_PATHS } from './assets';

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

  private shipSelect = document.getElementById('ship-select') as HTMLDivElement;
  private stageSelect = document.getElementById('stage-select') as HTMLDivElement;
  private challengeSelect = document.getElementById('challenge-select') as HTMLDivElement;
  private metaCredits = document.getElementById('meta-credits') as HTMLSpanElement;
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
    const costEl = document.getElementById('gacha-cost');
    if (costEl) costEl.textContent = fmtCredits(GACHA.cost);
  }

  setMeta(meta: MetaSave): void {
    this.meta = meta;
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
        <div class="ship-meta">HP×${ship.hpMul} · SPD×${ship.speedMul}<br/>시작: ${WEAPONS[ship.startingWeapon].icon}${WEAPONS[ship.startingWeapon].name}<br/>스킬: ${ship.activeSkill.icon}${ship.activeSkill.name}</div>
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

    const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    const metaBtn = document.getElementById('meta-btn') as HTMLButtonElement;
    const gachaBtn = document.getElementById('gacha-btn') as HTMLButtonElement;
    const achvBtn = document.getElementById('achv-btn') as HTMLButtonElement;
    this.hangarGroups = [
      [...this.stageSelect.querySelectorAll('button')],
      [...this.challengeSelect.querySelectorAll('button')],
      [...this.shipSelect.querySelectorAll('button')],
      [startBtn, metaBtn, gachaBtn, achvBtn],
    ];
    if (!this.startOverlay.classList.contains('hidden')
      && this.metaOverlay.classList.contains('hidden')
      && this.achvOverlay.classList.contains('hidden')
      && this.gachaOverlay.classList.contains('hidden')) {
      this.hangarGroupIdx = 3;
      this.setFocusGroup(this.hangarGroups[3]);
    }
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

    const m = Math.floor(state.time / 60).toString().padStart(2, '0');
    const s = Math.floor(state.time % 60).toString().padStart(2, '0');
    this.statTime.textContent = `${m}:${s}`;
    this.statKills.textContent = `☠ ${state.kills}`;
    this.statScore.textContent = `🏆 ${state.score.toLocaleString()}`;
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
    const key = state.weapons.map((w) => `${w.weaponId}:${w.level}:${w.affix ?? ''}:${w.damageBonus ?? 0}:${w.speedBonus ?? 0}`).join(',');
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
          <span class="slot-tier">T${def.tier}${affixMark}</span>
          <span class="slot-icon">${def.icon}</span>
          <span class="slot-level">Lv.${slot.level}</span>
        `;
      }
      this.slotsEl.appendChild(el);
    }
  }

  private renderPassives(state: GameState): void {
    const key = state.passives.map((p) => `${p.passiveId}:${p.level}`).join(',');
    if (key === this.lastPassiveKey) return;
    this.lastPassiveKey = key;

    this.passiveSlotsEl.innerHTML = '';
    for (let i = 0; i < state.maxPassiveSlots; i++) {
      const slot = state.passives[i];
      const el = document.createElement('div');
      el.className = 'weapon-slot passive-slot' + (slot ? ' filled' : '');
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
    const cd = (def.cooldownMs * (1 - Math.min(0.45, (slot.level - 1) * LEVELING.cooldownPerLevel)) / 1000).toFixed(2);
    const affixLine = slot.affix
      ? `<br/><span class="tt-affix">${AFFIXES[slot.affix].label} ${AFFIXES[slot.affix].desc}</span>`
      : '';
    const buffLine = (slot.damageBonus ?? 0) > 0 || (slot.speedBonus ?? 0) > 0
      ? `<br/><span class="tt-affix">크래프트 데미지 +${Math.round((slot.damageBonus ?? 0) * 100)}% · 투속 +${Math.round((slot.speedBonus ?? 0) * 100)}%</span>`
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

  showBanner(text: string): void {
    this.bannerEl.textContent = text;
    this.bannerEl.classList.remove('hidden', 'banner-anim');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('banner-anim');
    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    this.bannerTimeout = window.setTimeout(() => this.bannerEl.classList.add('hidden'), 2200);
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
      card.className = 'choice-card'
        + (choice.kind === 'jackpot' ? ' jackpot' : '')
        + (choice.kind === 'tactical' || choice.kind === 'statBoost' || choice.kind === 'affix' || choice.kind === 'craft' ? ' endgame' : '');
      card.style.setProperty('--card-color', choice.color);
      card.innerHTML = `
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
    this.setFocusGroup([...this.cardContainer.querySelectorAll('button')]);
  }

  hideLevelUp(): void {
    this.levelupOverlay.classList.add('hidden');
    this.levelupOverlay.classList.remove('has-preview');
    this.levelupPreview.innerHTML = '';
    this.levelupPreview.classList.add('hidden');
    this.clearFocus();
  }

  private resultHtml(state: GameState, creditsGained: number, newAchv: AchievementId[]): string {
    const m = Math.floor(state.time / 60).toString().padStart(2, '0');
    const s = Math.floor(state.time % 60).toString().padStart(2, '0');
    const best = this.meta?.bestScore ?? state.score;
    const isNew = state.score >= best && state.score > 0;
    const achvLine = newAchv.length
      ? `<br/>업적 ${newAchv.map((id) => ACHIEVEMENTS[id].icon + ACHIEVEMENTS[id].name).join(', ')}`
      : '';
    return `
      점수 <b>${state.score.toLocaleString()}</b>${isNew ? ' <span class="new-record">🎉 신기록!</span>' : ''}<br/>
      최고 기록 <b>${best.toLocaleString()}</b> · 획득 크레딧 <b>+${creditsGained}</b><br/>
      생존 <b>${m}:${s}</b> · 처치 <b>${state.kills}</b> · Lv.<b>${state.level}</b><br/>
      ${STAGES[state.stageId].icon}${STAGES[state.stageId].name} · ${CHALLENGES[state.challengeId].icon}${CHALLENGES[state.challengeId].name}${achvLine}
    `;
  }

  showGameOver(state: GameState, creditsGained: number, newAchv: AchievementId[]): void {
    this.gameoverStats.innerHTML = this.resultHtml(state, creditsGained, newAchv);
    this.gameoverOverlay.classList.remove('hidden');
    this.setFocusGroup([document.getElementById('restart-btn') as HTMLButtonElement]);
  }

  hideGameOver(): void {
    this.gameoverOverlay.classList.add('hidden');
    this.clearFocus();
  }

  showVictory(state: GameState, creditsGained: number, newAchv: AchievementId[]): void {
    this.victoryStats.innerHTML = this.resultHtml(state, creditsGained, newAchv);
    this.victoryOverlay.classList.remove('hidden');
    this.setFocusGroup([document.getElementById('victory-restart-btn') as HTMLButtonElement]);
  }

  hideVictory(): void {
    this.victoryOverlay.classList.add('hidden');
    this.clearFocus();
  }

  showPause(): void {
    this.pauseOverlay.classList.remove('hidden');
    this.setFocusGroup([
      document.getElementById('resume-btn') as HTMLButtonElement,
      document.getElementById('pause-restart-btn') as HTMLButtonElement,
    ]);
  }

  hidePause(): void {
    this.pauseOverlay.classList.add('hidden');
    this.clearFocus();
  }

  hideStart(): void {
    this.startOverlay.classList.add('hidden');
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

  onRestartClick(fn: () => void): void {
    (document.getElementById('restart-btn') as HTMLButtonElement).addEventListener('click', fn);
    (document.getElementById('victory-restart-btn') as HTMLButtonElement).addEventListener('click', fn);
    (document.getElementById('pause-restart-btn') as HTMLButtonElement).addEventListener('click', fn);
  }

  onPauseClick(fn: () => void): void {
    (document.getElementById('pause-btn') as HTMLButtonElement).addEventListener('click', fn);
    (document.getElementById('resume-btn') as HTMLButtonElement).addEventListener('click', fn);
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

    if (!this.metaOverlay.classList.contains('hidden')
      || !this.achvOverlay.classList.contains('hidden')
      || !this.gachaOverlay.classList.contains('hidden')) {
      if (e.code === 'Escape') return false;
      if (confirm) {
        const closeId = !this.metaOverlay.classList.contains('hidden')
          ? 'meta-close-btn'
          : !this.gachaOverlay.classList.contains('hidden')
            ? 'gacha-close-btn'
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

  private setFocusGroup(els: HTMLElement[]): void {
    this.clearFocus();
    this.focusEls = els.filter(Boolean);
    this.focusIdx = 0;
    this.applyFocus();
  }

  private clearFocus(): void {
    for (const el of this.focusEls) el.classList.remove('focused');
    this.focusEls = [];
    this.focusIdx = 0;
  }

  private moveFocus(delta: number): void {
    if (this.focusEls.length === 0) return;
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
      <li>${AFFIXES.chain.icon} ${AFFIXES.chain.label} 적중 시 전이</li>
      <li>💪 [강화] 무기 기본 데미지 영구 +${dmgPct}% 증가</li>
    </ul>
  `;
}
