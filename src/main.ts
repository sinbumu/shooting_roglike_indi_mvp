import { CANVAS, JOYSTICK } from './GameConfig';
import { GameState, type GameStatus } from './GameState';
import { Renderer } from './Renderer';
import { UI } from './UI';
import { generateChoices, applyChoice } from './LevelUpSystem';
import './style.css';

// ============================================================
// 부트스트랩 & 게임 루프 (State / Renderer / UI 오케스트레이션)
// ============================================================

const wrap = document.getElementById('game-wrap') as HTMLDivElement;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

let state = new GameState();
const renderer = new Renderer();
const ui = new UI();

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

// ---------- 입력 2: 키보드 (WASD / 방향키) ----------

const pressedKeys = new Set<string>();
const ARROW_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'];

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (ARROW_KEYS.includes(key) || key === ' ') e.preventDefault(); // 스크롤 방지
  pressedKeys.add(key);
});
window.addEventListener('keyup', (e) => pressedKeys.delete(e.key.toLowerCase()));
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
  if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) x -= 1;
  if (pressedKeys.has('d') || pressedKeys.has('arrowright')) x += 1;
  if (pressedKeys.has('w') || pressedKeys.has('arrowup')) y -= 1;
  if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) y += 1;
  state.moveX = x;
  state.moveY = y; // 대각선 정규화는 GameState에서 처리
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

// ---------- 메인 루프 ----------

let lastTime = performance.now();

function loop(now: number): void {
  // 탭 비활성화 등으로 인한 폭주 방지
  const dt = Math.min((now - lastTime) / 1000, 1 / 20);
  lastTime = now;

  if (state.status === 'playing') {
    pollInput();
    // update 도중 상태 전환 감지
    const status: GameStatus = state.update(dt);
    if (status === 'levelup') {
      openLevelUpUI();
    } else if (status === 'gameover') {
      ui.showGameOver(state);
    }
  }

  // 이펙트(파티클/흔들림)는 일시정지 중에도 자연스럽게 이어지도록 실제 dt를 넘긴다
  renderer.render(state, dt);
  ui.updateHUD(state);

  requestAnimationFrame(loop);
}

// ---------- 시작 / 재시작 ----------

ui.onStartClick(() => {
  ui.hideStart();
  state.start();
});

ui.onRestartClick(() => {
  state = new GameState();
  state.start();
  ui.hideGameOver();
});

// PixiJS 초기화(비동기) 완료 후 루프 시작
void (async () => {
  await renderer.init(canvas);
  lastTime = performance.now();
  requestAnimationFrame(loop);
})();
