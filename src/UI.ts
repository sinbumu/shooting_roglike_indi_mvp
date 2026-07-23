import type { LevelUpChoice } from './types';
import { WEAPONS, PLAYER, LEVELING } from './GameConfig';
import { kindLabel } from './LevelUpSystem';
import type { GameState } from './GameState';

const BEST_KEY = 'stellar-best-score';

/**
 * DOM Overlay UI 전담 (HUD, 레벨업 카드, 배너, 일시정지, 게임오버/승리, 툴팁)
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

  private bossBar = document.getElementById('boss-bar') as HTMLDivElement;
  private bossFill = document.getElementById('boss-fill') as HTMLDivElement;
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

  private lastSlotsKey = '';
  private lastCombo = 0;
  private lastState: GameState | null = null;
  private bannerTimeout: number | null = null;
  private tooltipTimeout: number | null = null;

  constructor() {
    // 무기 슬롯 탭 → 상세 툴팁
    this.slotsEl.addEventListener('click', (e) => {
      const slotEl = (e.target as HTMLElement).closest('.weapon-slot');
      if (!slotEl || !this.lastState) return;
      const idx = Array.from(this.slotsEl.children).indexOf(slotEl);
      this.showTooltip(idx);
    });
  }

  // ---------- HUD ----------

  updateHUD(state: GameState): void {
    this.lastState = state;

    this.expFill.style.width = `${Math.min(100, (state.exp / state.expToNext) * 100)}%`;
    this.expLabel.textContent = `Lv.${state.level}`;
    this.hpFill.style.width = `${(state.hp / PLAYER.maxHp) * 100}%`;
    this.hpLabel.textContent = `${Math.ceil(state.hp)} / ${PLAYER.maxHp}`;
    this.hpFill.style.background =
      state.hp / PLAYER.maxHp < 0.3
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
  }

  private updateBossBar(state: GameState): void {
    const boss = state.bossId !== null
      ? state.enemies.find((e) => e.id === state.bossId)
      : undefined;
    if (boss) {
      this.bossBar.classList.remove('hidden');
      this.bossFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
    } else {
      this.bossBar.classList.add('hidden');
    }
  }

  private updateCombo(state: GameState): void {
    if (state.comboCount >= 5 && state.status === 'playing') {
      this.comboEl.textContent = `${state.comboCount} COMBO`;
      this.comboEl.classList.remove('hidden');
      if (state.comboCount !== this.lastCombo) {
        // 숫자가 바뀔 때마다 팝 애니메이션 재생
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

  // ---------- 무기 상세 툴팁 ----------

  private showTooltip(slotIdx: number): void {
    const slot = this.lastState?.weapons[slotIdx];
    if (!slot) {
      this.tooltipEl.classList.add('hidden');
      return;
    }
    const def = WEAPONS[slot.weaponId];
    const p = def.projectile;
    const dmg = (p.damage * (1 + (slot.level - 1) * LEVELING.damagePerLevel)).toFixed(1);
    const cd = (def.cooldownMs * (1 - Math.min(0.45, (slot.level - 1) * LEVELING.cooldownPerLevel)) / 1000).toFixed(2);
    this.tooltipEl.innerHTML = `
      <b>${def.icon} ${def.name}</b> <span class="tt-tier">T${def.tier} · Lv.${slot.level}</span><br/>
      <span class="tt-desc">${def.desc}</span><br/>
      데미지 <b>${dmg}</b> × ${p.count}발 · 쿨타임 <b>${cd}s</b>${p.pierce > 0 ? ` · 관통 ${p.pierce}` : ''}${p.homingTurnRate > 0 ? ' · 유도' : ''}
    `;
    this.tooltipEl.classList.remove('hidden');
    if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
    this.tooltipTimeout = window.setTimeout(() => this.tooltipEl.classList.add('hidden'), 3000);
  }

  // ---------- 배너 ----------

  showBanner(text: string): void {
    this.bannerEl.textContent = text;
    this.bannerEl.classList.remove('hidden', 'banner-anim');
    void this.bannerEl.offsetWidth; // 애니메이션 재트리거
    this.bannerEl.classList.add('banner-anim');
    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    this.bannerTimeout = window.setTimeout(() => this.bannerEl.classList.add('hidden'), 2200);
  }

  // ---------- 레벨업 카드 ----------

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

  // ---------- 결과 화면 (최고 기록 포함) ----------

  private applyBest(score: number): { best: number; isNew: boolean } {
    const prev = Number(localStorage.getItem(BEST_KEY) ?? '0');
    const isNew = score > prev;
    if (isNew) localStorage.setItem(BEST_KEY, String(score));
    return { best: Math.max(prev, score), isNew };
  }

  private resultHtml(state: GameState): string {
    const m = Math.floor(state.time / 60).toString().padStart(2, '0');
    const s = Math.floor(state.time % 60).toString().padStart(2, '0');
    const { best, isNew } = this.applyBest(state.score);
    return `
      점수 <b>${state.score.toLocaleString()}</b>${isNew ? ' <span class="new-record">🎉 신기록!</span>' : ''}<br/>
      최고 기록 <b>${best.toLocaleString()}</b><br/>
      생존 시간 <b>${m}:${s}</b> · 처치 <b>${state.kills}</b> · 도달 레벨 <b>Lv.${state.level}</b>
    `;
  }

  showGameOver(state: GameState): void {
    this.gameoverStats.innerHTML = this.resultHtml(state);
    this.gameoverOverlay.classList.remove('hidden');
  }

  hideGameOver(): void {
    this.gameoverOverlay.classList.add('hidden');
  }

  showVictory(state: GameState): void {
    this.victoryStats.innerHTML = this.resultHtml(state);
    this.victoryOverlay.classList.remove('hidden');
  }

  hideVictory(): void {
    this.victoryOverlay.classList.add('hidden');
  }

  // ---------- 일시정지 / 시작 ----------

  showPause(): void {
    this.pauseOverlay.classList.remove('hidden');
  }

  hidePause(): void {
    this.pauseOverlay.classList.add('hidden');
  }

  hideStart(): void {
    this.startOverlay.classList.add('hidden');
  }

  setMuted(muted: boolean): void {
    this.muteBtn.textContent = muted ? '🔇' : '🔊';
  }

  // ---------- 버튼 이벤트 ----------

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
