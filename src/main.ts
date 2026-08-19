import { CANVAS, JOYSTICK, WEAPONS } from './GameConfig';
import { GameState, type GameStatus } from './GameState';
import { Renderer } from './Renderer';
import { UI, craftLockedPreviewHtml, craftArsenalPreviewHtml } from './UI';
import { AudioManager } from './Audio';
import { generateChoices, generateCraftChoices, generateAltarRewards, applyChoice } from './LevelUpSystem';
import {
  loadMeta, saveMeta, settleRun, tryBuyUpgrade, tryUnlockShip, selectShip,
  selectStage, selectChallenge, tryOpenGacha,
  tryUnlockDrone, selectDrone, tryUpgradeDrone,
  tryUnlockTrait, selectTrait,
} from './Meta';
import type { ShipId, MetaUpgradeId, DroneId, PilotTraitId } from './types';
import './style.css';

const wrap = document.getElementById('game-wrap') as HTMLDivElement;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

let meta = loadMeta();
let state = new GameState();
const renderer = new Renderer();
const ui = new UI();
const audio = new AudioManager();

let hitstop = 0;
let runSettled = false;

const vibrate = (ms: number): void => {
  navigator.vibrate?.(ms);
};

function resize(): void {
  const scale = Math.min(
    window.innerWidth / CANVAS.width,
    window.innerHeight / CANVAS.height,
  );
  wrap.style.width = `${Math.floor(CANVAS.width * scale)}px`;
  wrap.style.height = `${Math.floor(CANVAS.height * scale)}px`;
}
window.addEventListener('resize', resize);
resize();

const joyEl = document.getElementById('joystick') as HTMLDivElement;
const knobEl = document.getElementById('joystick-knob') as HTMLDivElement;

let joyActive = false;
let joyPointerId = -1;
let joyOriginX = 0;
let joyOriginY = 0;
let joyVecX = 0;
let joyVecY = 0;

canvas.addEventListener('pointerdown', (e) => {
  joyActive = true;
  joyPointerId = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  joyOriginX = e.clientX;
  joyOriginY = e.clientY;
  joyVecX = 0;
  joyVecY = 0;

  const rect = wrap.getBoundingClientRect();
  joyEl.style.left = `${e.clientX - rect.left}px`;
  joyEl.style.top = `${e.clientY - rect.top}px`;
  knobEl.style.transform = 'translate(-50%, -50%)';
  joyEl.classList.remove('hidden');
});

canvas.addEventListener('pointermove', (e) => {
  if (!joyActive || e.pointerId !== joyPointerId) return;
  let dx = e.clientX - joyOriginX;
  let dy = e.clientY - joyOriginY;
  const dist = Math.hypot(dx, dy);
  if (dist > JOYSTICK.radius) {
    dx = (dx / dist) * JOYSTICK.radius;
    dy = (dy / dist) * JOYSTICK.radius;
  }
  const mag = dist > JOYSTICK.radius ? 1 : dist / JOYSTICK.radius;
  const dz = JOYSTICK.deadzone;
  if (mag < dz) {
    joyVecX = 0;
    joyVecY = 0;
  } else {
    const scaled = (mag - dz) / (1 - dz);
    const inv = dist > 0.0001 ? 1 / dist : 0;
    joyVecX = dx * inv * scaled;
    joyVecY = dy * inv * scaled;
  }
  knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
});

function releaseJoystick(e: PointerEvent): void {
  if (e.pointerId !== joyPointerId) return;
  joyActive = false;
  joyVecX = 0;
  joyVecY = 0;
  joyEl.classList.add('hidden');
}
canvas.addEventListener('pointerup', releaseJoystick);
canvas.addEventListener('pointercancel', releaseJoystick);

const pressedKeys = new Set<string>();
const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

window.addEventListener('keydown', (e) => {
  if (SCROLL_KEYS.includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') {
    togglePause();
    return;
  }
  if (ui.handleKey(e)) return;
  if (!e.repeat && e.code === 'Space') {
    if (state.status === 'playing') state.tryUseSkill();
  }
  pressedKeys.add(e.code);
});
window.addEventListener('keyup', (e) => pressedKeys.delete(e.code));
window.addEventListener('blur', () => pressedKeys.clear());

function pollInput(): void {
  if (joyActive) {
    state.moveX = joyVecX;
    state.moveY = joyVecY;
    state.isFocusing = false;
    return;
  }
  let x = 0;
  let y = 0;
  if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) x -= 1;
  if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) x += 1;
  if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) y -= 1;
  if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) y += 1;
  state.moveX = x;
  state.moveY = y;
  state.isFocusing = pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight');
}

function togglePause(): void {
  if (state.status === 'playing') {
    state.status = 'paused';
    ui.showPause();
    audio.setPaused(true);
  } else if (state.status === 'paused') {
    state.status = 'playing';
    ui.hidePause();
    audio.setPaused(false);
  }
}

function openLevelUpUI(): void {
  const choices = generateChoices(state);
  ui.showLevelUp(choices, (choice) => {
    applyChoice(state, choice);
    ui.hideLevelUp();
    state.pendingLevelUps--;
    continueAfterChoice();
  });
}

function openCraftUI(): void {
  const choices = generateCraftChoices(state);
  const hasT3 = state.weapons.some((s) => WEAPONS[s.weaponId].tier === 3);
  ui.showLevelUp(choices, (choice) => {
    applyChoice(state, choice);
    ui.hideLevelUp();
    state.pendingCrafts--;
    continueAfterChoice();
  }, hasT3
    ? { title: 'CRAFTING', sub: '종결 무기를 깎으세요', previewHtml: craftArsenalPreviewHtml(state) }
    : {
      title: 'CRAFTING',
      sub: '[!] 퀀텀 큐브 크래프팅 비활성화',
      previewHtml: craftLockedPreviewHtml(),
    });
}

function continueAfterChoice(): void {
  if (state.pendingAltarRewards > 0) openAltarRewardUI();
  else if (state.pendingCrafts > 0) openCraftUI();
  else if (state.pendingLevelUps > 0) openLevelUpUI();
  else state.status = 'playing';
}

function openAltarRewardUI(): void {
  const choices = generateAltarRewards();
  ui.showLevelUp(choices, (choice) => {
    applyChoice(state, choice);
    ui.hideLevelUp();
    state.pendingAltarRewards--;
    continueAfterChoice();
  }, { title: 'VOID CACHE', sub: '시련의 대가를 고르세요' });
}

function endRun(cleared: boolean): void {
  if (runSettled) return;
  runSettled = true;
  const { newly, creditsGained } = settleRun(meta, state, cleared);
  meta = loadMeta();
  ui.setMeta(meta);
  if (newly.length) ui.showAchievementToast(newly);
  if (cleared) ui.showVictory(state, creditsGained, newly);
  else ui.showGameOver(state, creditsGained, newly);
}

function processEvents(): void {
  for (const ev of state.events) {
    audio.handleEvent(ev);
    switch (ev.type) {
      case 'banner':
        ui.showBanner(ev.text, ev.text.startsWith('[안내]') ? 5000 : 2200);
        break;
      case 'story':
        ui.showStory(ev.text);
        break;
      case 'bossWarn':
        vibrate(200);
        break;
      case 'enemyDied':
        if (ev.radius >= 20) hitstop = Math.max(hitstop, 0.06);
        break;
      case 'bossDied':
        hitstop = Math.max(hitstop, 0.15);
        vibrate(300);
        break;
      case 'bossPhase':
        hitstop = Math.max(hitstop, 0.12);
        vibrate(180);
        break;
      case 'jackpot':
        hitstop = Math.max(hitstop, 0.5);
        vibrate(220);
        break;
      case 'altarHint':
        meta.seenAltarHint = true;
        saveMeta(meta);
        break;
      case 'altarActivate':
        vibrate(180);
        break;
      case 'riftWarn':
        vibrate(200);
        break;
      case 'riftReward':
        hitstop = Math.max(hitstop, 0.1);
        vibrate(120);
        break;
      case 'bomb':
        hitstop = Math.max(hitstop, 0.08);
        vibrate(150);
        break;
      case 'coreBurst':
        hitstop = Math.max(hitstop, 0.1);
        vibrate(180);
        break;
      case 'derelictBreak':
        hitstop = Math.max(hitstop, 0.08);
        vibrate(140);
        break;
      case 'playerHit':
        vibrate(120);
        break;
      case 'levelUp':
        vibrate(60);
        break;
      default:
        break;
    }
  }
}

let lastTime = performance.now();

function loop(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 1 / 20);
  lastTime = now;

  if (state.status === 'playing') {
    pollInput();
    if (hitstop > 0) {
      hitstop -= dt;
    } else {
      const status: GameStatus = state.update(dt);
      if (status === 'levelup') {
        if (state.pendingAltarRewards > 0) openAltarRewardUI();
        else if (state.pendingCrafts > 0) openCraftUI();
        else openLevelUpUI();
      }
      else if (status === 'gameover') endRun(false);
      else if (status === 'victory') endRun(true);
    }
  }

  processEvents();
  audio.setCombatIntensity(state.bossId != null ? 1 : 0);
  audio.setStageMood(state.stageId);
  renderer.render(state, dt);
  ui.updateHUD(state);
  requestAnimationFrame(loop);
}

function beginRun(): void {
  meta = loadMeta();
  ui.setMeta(meta);
  state = new GameState();
  state.start(meta.selectedShip, meta, meta.selectedStage, meta.selectedChallenge);
  runSettled = false;
  hitstop = 0;
  ui.hideGameOver();
  ui.hideVictory();
  ui.hidePause();
  ui.hideStart();
  audio.init();
  audio.resume();
  audio.setPaused(false);
}

function backToHangar(): void {
  const from = ui.displayedCredits();
  meta = loadMeta();
  ui.setMeta(meta);
  state = new GameState();
  runSettled = false;
  hitstop = 0;
  ui.hideGameOver();
  ui.hideVictory();
  ui.hidePause();
  ui.showStart({ animateCreditsFrom: from });
  audio.setPaused(false);
}

ui.bindHangar(meta, () => {
  saveMeta(meta);
  ui.refreshHangar();
});

ui.onSelectStage((id) => {
  if (!selectStage(meta, id)) ui.showBanner('아직 해금되지 않은 스테이지입니다');
  else ui.refreshHangar();
});

ui.onSelectChallenge((id) => {
  selectChallenge(meta, id);
  ui.refreshHangar();
});

ui.onUnlockShipRequest((id: ShipId) => {
  if (tryUnlockShip(meta, id)) {
    selectShip(meta, id);
    ui.refreshHangar();
  } else {
    ui.showBanner('크레딧이 부족합니다');
  }
});

ui.onUnlockDroneRequest((id: DroneId) => {
  if (tryUnlockDrone(meta, id)) ui.refreshHangar();
  else ui.showBanner('크레딧이 부족합니다');
});

ui.onSelectDrone((id: DroneId) => {
  selectDrone(meta, id);
  ui.refreshHangar();
});

ui.onUpgradeDrone((id: DroneId) => {
  if (!tryUpgradeDrone(meta, id)) ui.showBanner('강화 불가');
  else ui.refreshHangar();
});

ui.onUnlockTraitRequest((id: PilotTraitId) => {
  if (tryUnlockTrait(meta, id)) ui.refreshHangar();
  else ui.showBanner('보스 코어가 부족합니다');
});

ui.onSelectTrait((id: PilotTraitId) => {
  selectTrait(meta, id);
  ui.refreshHangar();
});

ui.onBuyUpgrade((id: MetaUpgradeId) => {
  if (!tryBuyUpgrade(meta, id)) ui.showBanner('구매 불가');
});

ui.onOpenGacha(() => {
  audio.init();
  const result = tryOpenGacha(meta);
  if (!result) {
    ui.showBanner('크레딧이 부족합니다');
    return;
  }
  ui.showGachaResult(result.message, result.tier);
  if (result.tier === 'jackpot') audio.handleEvent({ type: 'jackpot' });
});

ui.onStartClick(beginRun);
ui.onRestartClick(backToHangar);
ui.onPauseClick(togglePause);
ui.onMuteClick(() => ui.setMuted(audio.toggleMute()));
ui.onSkillClick(() => { if (state.status === 'playing') state.tryUseSkill(); });

void (async () => {
  await renderer.init(canvas);
  lastTime = performance.now();
  requestAnimationFrame(loop);
})();
