import type { LevelUpChoice, ShipId, MetaUpgradeId, AchievementId } from './types';
import {
  WEAPONS, PLAYER, LEVELING, SHIPS, PASSIVES, META_UPGRADES, ACHIEVEMENTS,
} from './GameConfig';
import { kindLabel } from './LevelUpSystem';
import type { GameState } from './GameState';
import type { MetaSave } from './Meta';
import { upgradeCost } from './Meta';

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
  private comboEl = document.getElementById('combo') as HTMLDivElement;
  private tooltipEl = document.getElementById('slot-tooltip') as HTMLDivElement;
  private muteBtn = document.getElementById('mute-btn') as HTMLButtonElement;

  private levelupOverlay = document.getElementById('levelup-overlay') as HTMLDivElement;
  private cardContainer = document.getElementById('card-container') as HTMLDivElement;
  private gameoverOverlay = document.getElementById('gameover-overlay') as HTMLDivElement;
  private gameoverStats = document.getElementById('gameover-stats') as HTMLDivElement;
  private victoryOverlay = document.getElementById('victory-overlay') as HTMLDivElement;
  private victoryStats = document.getElementById('victory-stats') as HTMLDivElement;
  private pauseOverlay = document.getElementById('pause-overlay') as HTMLDivElement;
  private startOverlay = document.getElementById('start-overlay') as HTMLDivElement;
  private metaOverlay = document.getElementById('meta-overlay') as HTMLDivElement;
  private achvOverlay = document.getElementById('achv-overlay') as HTMLDivElement;

  private shipSelect = document.getElementById('ship-select') as HTMLDivElement;
  private metaCredits = document.getElementById('meta-credits') as HTMLSpanElement;
  private metaShopCredits = document.getElementById('meta-shop-credits') as HTMLSpanElement;
  private metaShop = document.getElementById('meta-shop') as HTMLDivElement;
  private achvList = document.getElementById('achv-list') as HTMLDivElement;

  private lastSlotsKey = '';
  private lastPassiveKey = '';
  private lastCombo = 0;
  private lastState: GameState | null = null;
  private bannerTimeout: number | null = null;
  private tooltipTimeout: number | null = null;
  private meta: MetaSave | null = null;
  private onHangarChange: (() => void) | null = null;

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
  }

  refreshHangar(): void {
    if (!this.meta) return;
    this.metaCredits.textContent = String(this.meta.credits);
    this.shipSelect.innerHTML = '';

    for (const ship of Object.values(SHIPS)) {
      const unlocked = this.meta.unlockedShips.includes(ship.id);
      const selected = this.meta.selectedShip === ship.id;
      const card = document.createElement('button');
      card.className = 'ship-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
      card.style.setProperty('--ship-color', ship.color);
      card.innerHTML = `
        <div class="ship-icon">${ship.icon}</div>
        <div class="ship-name">${ship.name}</div>
        <div class="ship-desc">${ship.desc}</div>
        <div class="ship-meta">HP×${ship.hpMul} · SPD×${ship.speedMul}<br/>시작: ${WEAPONS[ship.startingWeapon].icon}${WEAPONS[ship.startingWeapon].name}</div>
        ${unlocked
          ? (selected ? '<div class="ship-status">선택됨</div>' : '<div class="ship-status">선택</div>')
          : `<div class="ship-status">🔒 ${ship.unlockCost} 크레딧</div>`}
      `;
      card.addEventListener('click', () => {
        if (!this.meta || !this.onHangarChange) return;
        if (unlocked) {
          this.meta.selectedShip = ship.id;
          this.onHangarChange();
        } else {
          this.onHangarChange(); // parent handles unlock attempt via flag — use custom event
          card.dispatchEvent(new CustomEvent('unlock-ship', { bubbles: true, detail: ship.id }));
        }
      });
      this.shipSelect.appendChild(card);
    }
  }

  onUnlockShipRequest(fn: (id: ShipId) => void): void {
    this.shipSelect.addEventListener('unlock-ship', ((e: CustomEvent<ShipId>) => {
      fn(e.detail);
    }) as EventListener);
  }

  private refreshMetaShop(): void {
    if (!this.meta) return;
    this.metaShopCredits.textContent = String(this.meta.credits);
    this.metaShop.innerHTML = '';
    for (const id of Object.keys(META_UPGRADES) as MetaUpgradeId[]) {
      const def = META_UPGRADES[id];
      const lv = this.meta.upgrades[id];
      const maxed = lv >= def.maxLevel;
      const cost = upgradeCost(id, lv);
      const row = document.createElement('button');
      row.className = 'meta-row';
      row.disabled = maxed || this.meta.credits < cost;
      row.innerHTML = `
        <span class="meta-icon">${def.icon}</span>
        <span class="meta-body">
          <b>${def.name}</b> Lv.${lv}/${def.maxLevel}<br/>
          <span class="tt-desc">${def.desc}</span>
        </span>
        <span class="meta-cost">${maxed ? 'MAX' : `💰 ${cost}`}</span>
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

  private renderSlots(state: GameState): void {
    const key = state.weapons.map((w) => `${w.weaponId}:${w.level}`).join(',');
    if (key === this.lastSlotsKey) return;
    this.lastSlotsKey = key;

    this.slotsEl.innerHTML = '';
    for (let i = 0; i < PLAYER.maxWeaponSlots; i++) {
      const slot = state.weapons[i];
      const el = document.createElement('div');
      el.className = 'weapon-slot' + (slot ? ' filled' : '');
      if (slot) {
        const def = WEAPONS[slot.weaponId];
        el.style.borderColor = def.color;
        el.innerHTML = `
          <span class="slot-tier">T${def.tier}</span>
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
    for (let i = 0; i < PLAYER.maxPassiveSlots; i++) {
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
    this.tooltipEl.innerHTML = `
      <b>${def.icon} ${def.name}</b> <span class="tt-tier">T${def.tier} · Lv.${slot.level}</span><br/>
      <span class="tt-desc">${def.desc}</span><br/>
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

  showLevelUp(choices: LevelUpChoice[], onPick: (choice: LevelUpChoice) => void): void {
    this.cardContainer.innerHTML = '';
    for (const choice of choices) {
      const card = document.createElement('button');
      card.className = 'choice-card' + (choice.kind === 'jackpot' ? ' jackpot' : '');
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
  }

  hideLevelUp(): void {
    this.levelupOverlay.classList.add('hidden');
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
      생존 <b>${m}:${s}</b> · 처치 <b>${state.kills}</b> · Lv.<b>${state.level}</b>${achvLine}
    `;
  }

  showGameOver(state: GameState, creditsGained: number, newAchv: AchievementId[]): void {
    this.gameoverStats.innerHTML = this.resultHtml(state, creditsGained, newAchv);
    this.gameoverOverlay.classList.remove('hidden');
  }

  hideGameOver(): void {
    this.gameoverOverlay.classList.add('hidden');
  }

  showVictory(state: GameState, creditsGained: number, newAchv: AchievementId[]): void {
    this.victoryStats.innerHTML = this.resultHtml(state, creditsGained, newAchv);
    this.victoryOverlay.classList.remove('hidden');
  }

  hideVictory(): void {
    this.victoryOverlay.classList.add('hidden');
  }

  showPause(): void {
    this.pauseOverlay.classList.remove('hidden');
  }

  hidePause(): void {
    this.pauseOverlay.classList.add('hidden');
  }

  hideStart(): void {
    this.startOverlay.classList.add('hidden');
  }

  showStart(): void {
    this.refreshHangar();
    this.startOverlay.classList.remove('hidden');
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
}
