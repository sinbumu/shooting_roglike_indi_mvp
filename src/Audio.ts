import type { FxEvent } from './GameState';

// ============================================================
// Web Audio 기반 사운드 — 외부 애셋 없이 전부 합성한다.
// 반드시 사용자 제스처(클릭) 이후 init()을 호출해야 재생된다.
// ============================================================

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  delay?: number;
}

interface NoiseOpts {
  gain?: number;
  /** 밴드패스 중심 주파수 */
  freq?: number;
  delay?: number;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  private noiseBuffer: AudioBuffer | null = null;
  private lastShotAt = 0;
  private lastGemAt = 0;
  private lastHitAt = 0;

  // BGM 스케줄러
  private bgmStep = 0;
  private nextNoteTime = 0;
  private bgmInterval: number | null = null;

  /** 사용자 제스처 안에서 호출 (여러 번 호출해도 안전) */
  init(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);

    // 화이트 노이즈 버퍼 (폭발음용)
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.startBgm();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.01);
    }
    return this.muted;
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    void this.ctx?.resume();
  }

  // ==========================================================
  // 이벤트 → 효과음 매핑
  // ==========================================================

  handleEvent(ev: FxEvent): void {
    if (!this.ctx) return;
    const now = performance.now();

    switch (ev.type) {
      case 'fired':
        if (now - this.lastShotAt < 80) return; // 연사 스팸 방지
        this.lastShotAt = now;
        this.tone(700, 0.06, { type: 'square', slideTo: 180, gain: 0.022 });
        break;

      case 'enemyHit':
        if (now - this.lastHitAt < 70) return;
        this.lastHitAt = now;
        this.tone(320, 0.03, { type: 'square', slideTo: 240, gain: 0.015 });
        break;

      case 'enemyDied':
        this.noise(0.22, { gain: 0.11, freq: 500 });
        this.tone(150, 0.2, { type: 'sawtooth', slideTo: 40, gain: 0.08 });
        break;

      case 'gemPickup':
        if (now - this.lastGemAt < 50) return;
        this.lastGemAt = now;
        this.tone(700 + Math.random() * 250, 0.08, { type: 'sine', slideTo: 1500, gain: 0.045 });
        break;

      case 'playerHit':
        this.noise(0.3, { gain: 0.22, freq: 220 });
        this.tone(120, 0.28, { type: 'sawtooth', slideTo: 45, gain: 0.14 });
        break;

      case 'levelUp':
        [523, 659, 784, 1047].forEach((f, i) =>
          this.tone(f, 0.14, { type: 'triangle', gain: 0.09, delay: i * 0.07 }),
        );
        break;

      case 'bossWarn':
        for (let i = 0; i < 4; i++) {
          this.tone(i % 2 === 0 ? 620 : 440, 0.16, { type: 'square', gain: 0.07, delay: i * 0.18 });
        }
        break;

      case 'bossSpawned':
        this.noise(0.5, { gain: 0.18, freq: 150 });
        this.tone(80, 0.5, { type: 'sawtooth', slideTo: 40, gain: 0.12 });
        break;

      case 'bossDied':
        this.noise(0.7, { gain: 0.3, freq: 300 });
        this.tone(200, 0.65, { type: 'sawtooth', slideTo: 28, gain: 0.14 });
        [523, 659, 784].forEach((f, i) =>
          this.tone(f, 0.16, { type: 'triangle', gain: 0.08, delay: 0.35 + i * 0.09 }),
        );
        break;

      case 'pickup':
        if (ev.kind === 'heal') {
          this.tone(880, 0.1, { type: 'sine', slideTo: 1320, gain: 0.07 });
        } else if (ev.kind === 'magnet') {
          this.tone(300, 0.28, { type: 'sine', slideTo: 1400, gain: 0.06 });
        }
        // bomb은 별도 'bomb' 이벤트에서 폭발음 재생
        break;

      case 'bomb':
        this.noise(0.6, { gain: 0.28, freq: 180 });
        this.tone(90, 0.55, { type: 'sawtooth', slideTo: 30, gain: 0.16 });
        break;

      case 'victory':
        [523, 659, 784, 1047, 1319].forEach((f, i) =>
          this.tone(f, 0.22, { type: 'triangle', gain: 0.1, delay: i * 0.13 }),
        );
        break;

      case 'gameover':
        [392, 330, 262, 196].forEach((f, i) =>
          this.tone(f, 0.3, { type: 'triangle', gain: 0.09, delay: i * 0.22 }),
        );
        break;

      default:
        break;
    }
  }

  // ==========================================================
  // 신스 프리미티브
  // ==========================================================

  private tone(freq: number, dur: number, opts: ToneOpts = {}): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opts.type ?? 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t0 + dur);
    }
    const vol = opts.gain ?? 0.08;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, opts: NoiseOpts = {}): void {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = opts.freq ?? 400;
    filter.Q.value = 0.8;
    const g = this.ctx.createGain();
    const vol = opts.gain ?? 0.15;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // ==========================================================
  // BGM — Am → F → C → G 진행의 심플한 신스 루프
  // ==========================================================

  private startBgm(): void {
    if (!this.ctx || this.bgmInterval !== null) return;
    this.bgmStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.bgmInterval = window.setInterval(() => this.scheduleBgm(), 30);
  }

  private scheduleBgm(): void {
    if (!this.ctx || !this.master) return;
    const eighth = 60 / 132 / 2; // 132 BPM, 8분음표

    // 코드 진행 (각 코드 16스텝 = 2마디)
    const bassRoots = [110, 87.31, 130.81, 98]; // A2, F2, C3, G2
    const chordTones = [
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
      [261.63, 329.63, 392], // C
      [196, 246.94, 293.66], // G
    ];
    const arpOrder = [0, 1, 2, 1];

    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      const step = this.bgmStep % 64;
      const chord = Math.floor(step / 16);
      const delay = this.nextNoteTime - this.ctx.currentTime;

      // 베이스 (4분음표)
      if (step % 2 === 0) {
        this.tone(bassRoots[chord], eighth * 1.8, { type: 'triangle', gain: 0.05, delay });
      }
      // 아르페지오 (8분음표)
      const tone = chordTones[chord][arpOrder[step % 4]];
      this.tone(tone, eighth * 0.85, { type: 'sine', gain: 0.028, delay });

      this.bgmStep++;
      this.nextNoteTime += eighth;
    }
  }
}
