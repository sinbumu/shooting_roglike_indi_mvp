import type { LevelUpChoice } from './types';
import { WEAPONS, PLAYER } from './GameConfig';
import { kindLabel } from './LevelUpSystem';
import type { GameState } from './GameState';

/**
 * DOM Overlay UI 전담 (HUD, 레벨업 카드, 게임오버, 시작 화면)
 */
export class UI {
  private expFill = document.getElementById('exp-fill') as HTMLDivElement;
  private expLabel = document.getElementById('exp-label') as HTMLSpanElement;
  private hpFill = document.getElementById('hp-fill') as HTMLDivElement;
  private hpLabel = document.getElementById('hp-label') as HTMLSpanElement;
  private statTime = document.getElementById('stat-time') as HTMLSpanElement;
  private statKills = document.getElementById('stat-kills') as HTMLSpanElement;
  private slotsEl = document.getElementById('weapon-slots') as HTMLDivElement;

  private levelupOverlay = document.getElementById('levelup-overlay') as HTMLDivElement;
  private cardContainer = document.getElementById('card-container') as HTMLDivElement;
  private gameoverOverlay = document.getElementById('gameover-overlay') as HTMLDivElement;
  private gameoverStats = document.getElementById('gameover-stats') as HTMLDivElement;
  private startOverlay = document.getElementById('start-overlay') as HTMLDivElement;

  // ---------- HUD ----------

  updateHUD(state: GameState): void {
    this.expFill.style.width = `${Math.min(100, (state.exp / state.expToNext) * 100)}%`;
    this.expLabel.textContent = `Lv.${state.level}`;
    this.hpFill.style.width = `${(state.hp / PLAYER.maxHp) * 100}%`;
    this.hpLabel.textContent = `${Math.ceil(state.hp)} / ${PLAYER.maxHp}`;
    // 체력 낮으면 색 변경
    this.hpFill.style.background =
      state.hp / PLAYER.maxHp < 0.3
        ? 'linear-gradient(90deg, #ef4444, #f87171)'
        : 'linear-gradient(90deg, #22c55e, #86efac)';

    const m = Math.floor(state.time / 60).toString().padStart(2, '0');
    const s = Math.floor(state.time % 60).toString().padStart(2, '0');
    this.statTime.textContent = `${m}:${s}`;
    this.statKills.textContent = `☠ ${state.kills}`;

    this.renderSlots(state);
  }

  private lastSlotsKey = '';

  private renderSlots(state: GameState): void {
    // 변경이 있을 때만 DOM 재구성
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

  // ---------- 게임오버 / 시작 ----------

  showGameOver(state: GameState): void {
    const m = Math.floor(state.time / 60).toString().padStart(2, '0');
    const s = Math.floor(state.time % 60).toString().padStart(2, '0');
    this.gameoverStats.innerHTML = `
      생존 시간 <b>${m}:${s}</b><br/>
      처치 수 <b>${state.kills}</b><br/>
      도달 레벨 <b>Lv.${state.level}</b>
    `;
    this.gameoverOverlay.classList.remove('hidden');
  }

  hideGameOver(): void {
    this.gameoverOverlay.classList.add('hidden');
  }

  hideStart(): void {
    this.startOverlay.classList.add('hidden');
  }

  onStartClick(fn: () => void): void {
    (document.getElementById('start-btn') as HTMLButtonElement).addEventListener('click', fn);
  }

  onRestartClick(fn: () => void): void {
    (document.getElementById('restart-btn') as HTMLButtonElement).addEventListener('click', fn);
  }
}
