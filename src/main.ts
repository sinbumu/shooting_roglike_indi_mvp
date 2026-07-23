import { CANVAS, JOYSTICK } from './GameConfig';
import { GameState, type GameStatus } from './GameState';
import { Renderer } from './Renderer';
import { UI } from './UI';
import { AudioManager } from './Audio';
import { generateChoices, applyChoice } from './LevelUpSystem';
import './style.css';

// ============================================================
// 부트스트랩 & 게임 루프 (State / Renderer / UI / Audio 오케스트레이션)
// ============================================================

const wrap = document.getElementById('game-wrap') as HTMLDivElement;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

let state = new GameState();
const renderer = new Renderer();
const ui = new UI();
const audio = new AudioManager();

/** 큰 적 처치/폭탄 시 잠깐 게임을 멈추는 히트스톱(초) */
let hitstop = 0;

const vibrate = (ms: number): void => {
  navigator.vibrate?.(ms);
};

// ---------- 캔버스 사이징 ----------
// 논리 해상도(480x800)는 PixiJS가 관리하고, 여기서는 CSS 스케일만 맞춘다.

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

// ---------- 입력 1: 가상 조이스틱 (터치/마우스 공용) ----------
// 화면 아무 곳이나 누르면 그 자리에 조이스틱이 나타나고,
// 드래그 방향/거리에 비례해 기체가 움직인다.

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
  joyVecX = dx / JOYSTICK.radius;
  joyVecY = dy / JOYSTICK.radius;
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

// ---------- 입력 2: 키보드 (WASD / 방향키, ESC 일시정지) ----------
// e.key 대신 e.code(물리 키 위치)를 사용 — 한/영 전환이나 자판 배열과 무관하게 동작

const pressedKeys = new Set<string>();
const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

window.addEventListener('keydown', (e) => {
  if (SCROLL_KEYS.includes(e.code)) e.preventDefault(); // 스크롤 방지
  if (e.code === 'Escape') togglePause();
  pressedKeys.add(e.code);
});
window.addEventListener('keyup', (e) => pressedKeys.delete(e.code));
window.addEventListener('blur', () => pressedKeys.clear()); // 탭 전환 시 키 고착 방지

/** 매 프레임 조이스틱/키보드 입력을 합산해 GameState에 방향 벡터로 전달 */
function pollInput(): void {
  if (joyActive) {
    state.moveX = joyVecX;
    state.moveY = joyVecY;
    return;
  }
  let x = 0;
  let y = 0;
  if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) x -= 1;
  if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) x += 1;
  if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) y -= 1;
  if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) y += 1;
  state.moveX = x;
  state.moveY = y; // 대각선 정규화는 GameState에서 처리
}

// ---------- 일시정지 ----------

function togglePause(): void {
  if (state.status === 'playing') {
    state.status = 'paused';
    ui.showPause();
    audio.suspend();
  } else if (state.status === 'paused') {
    state.status = 'playing';
    ui.hidePause();
    audio.resume();
  }
}

// ---------- 레벨업 처리 (Pause → 카드 선택 → Resume) ----------

function openLevelUpUI(): void {
  const choices = generateChoices(state);
  ui.showLevelUp(choices, (choice) => {
    applyChoice(state, choice);
    ui.hideLevelUp();
    state.pendingLevelUps--;

    if (state.pendingLevelUps > 0) {
      // 연속 레벨업: 다음 선택지를 바로 표시
      openLevelUpUI();
    } else {
      state.status = 'playing'; // Resume
    }
  });
}

// ---------- 게임 이벤트 → 사운드/진동/배너/히트스톱 ----------
// (렌더러가 같은 큐를 소비해 파티클을 재생하고 큐를 비운다)

function processEvents(): void {
  for (const ev of state.events) {
    audio.handleEvent(ev);
    switch (ev.type) {
      case 'banner':
        ui.showBanner(ev.text);
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
      case 'bomb':
        hitstop = Math.max(hitstop, 0.08);
        vibrate(150);
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

// ---------- 메인 루프 ----------

let lastTime = performance.now();

function loop(now: number): void {
  // 탭 비활성화 등으로 인한 폭주 방지
  const dt = Math.min((now - lastTime) / 1000, 1 / 20);
  lastTime = now;

  if (state.status === 'playing') {
    pollInput();
    if (hitstop > 0) {
      hitstop -= dt; // 히트스톱: 렌더링은 계속, 시뮬레이션만 정지
    } else {
      // update 도중 상태 전환 감지
      const status: GameStatus = state.update(dt);
      if (status === 'levelup') {
        openLevelUpUI();
      } else if (status === 'gameover') {
        ui.showGameOver(state);
      } else if (status === 'victory') {
        ui.showVictory(state);
      }
    }
  }

  processEvents();
  // 이펙트(파티클/흔들림)는 일시정지 중에도 자연스럽게 이어지도록 실제 dt를 넘긴다
  renderer.render(state, dt);
  ui.updateHUD(state);

  requestAnimationFrame(loop);
}

// ---------- 시작 / 재시작 ----------

function restart(): void {
  state = new GameState();
  state.start();
  hitstop = 0;
  ui.hideGameOver();
  ui.hideVictory();
  ui.hidePause();
  audio.init(); // 사용자 제스처 안이므로 안전
  audio.resume();
}

ui.onStartClick(() => {
  ui.hideStart();
  state.start();
  audio.init();
});

ui.onRestartClick(restart);
ui.onPauseClick(togglePause);
ui.onMuteClick(() => ui.setMuted(audio.toggleMute()));

// PixiJS 초기화(비동기) 완료 후 루프 시작
void (async () => {
  await renderer.init(canvas);
  lastTime = performance.now();
  requestAnimationFrame(loop);
})();
