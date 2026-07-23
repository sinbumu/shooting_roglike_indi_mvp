import { CANVAS, PLAYER } from './GameConfig';
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

// ---------- 입력: 마우스/터치 드래그로 기체 이동 ----------

let dragging = false;

function toGameCoords(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * CANVAS.width,
    y: ((clientY - rect.top) / rect.height) * CANVAS.height,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  canvas.setPointerCapture(e.pointerId);
  const p = toGameCoords(e.clientX, e.clientY);
  const offsetY = e.pointerType === 'touch' ? PLAYER.touchOffsetY : 0;
  state.targetX = p.x;
  state.targetY = p.y + offsetY;
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = toGameCoords(e.clientX, e.clientY);
  const offsetY = e.pointerType === 'touch' ? PLAYER.touchOffsetY : 0;
  state.targetX = p.x;
  state.targetY = p.y + offsetY;
});

canvas.addEventListener('pointerup', () => (dragging = false));
canvas.addEventListener('pointercancel', () => (dragging = false));

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
