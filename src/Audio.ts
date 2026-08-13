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
  /** 하이패스(킥/하이햇 구분) */
  highpass?: number;
}

/** CSS hex → 대략적 피치 바이어스 (발사음 색 변화) */
function colorPitchBias(color: string): number {
  const n = parseInt(color.replace('#', '').slice(0, 6), 16);
  if (Number.isNaN(n)) return 0;
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  // 차가운 색(청/녹) ↑, 따뜻한 색(적/주황) ↓
  return ((b + g * 0.5 - r) / 255) * 180;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmBus: GainNode | null = null;
  private muted = false;

  private noiseBuffer: AudioBuffer | null = null;
  private lastShotAt = 0;
  private lastGemAt = 0;
  private lastHitAt = 0;
  private lastShieldAt = 0;

  // BGM 스케줄러
  private bgmStep = 0;
  private nextNoteTime = 0;
  private bgmInterval: number | null = null;

  /** 0 = 평시, 1 = 보스전 (BGM 덕킹) */
  private combatIntensity = 0;

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

    this.bgmBus = this.ctx.createGain();
    this.bgmBus.gain.value = 1;
    this.bgmBus.connect(this.master);

    // 화이트 노이즈 버퍼 (폭발·퍼커션용)
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

  /**
   * 전투 강도 (보스 중이면 1). BGM을 살짝 덕킹하고 킥을 강조한다.
   * main에서 bossId 유무로 매 프레임/상태 변화 시 호출.
   */
  setCombatIntensity(v: number): void {
    this.combatIntensity = Math.max(0, Math.min(1, v));
    if (!this.ctx || !this.bgmBus) return;
    const target = 1 - this.combatIntensity * 0.35;
    this.bgmBus.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
  }

  // ==========================================================
  // 이벤트 → 효과음 매핑
  // ==========================================================

  handleEvent(ev: FxEvent): void {
    if (!this.ctx) return;
    const now = performance.now();

    switch (ev.type) {
      case 'fired': {
        const minGap = ev.weaponId === 'gatling' ? 38 : 80;
        if (now - this.lastShotAt < minGap) return;
        this.lastShotAt = now;
        const bias = colorPitchBias(ev.color);
        if (ev.weaponId === 'gatling') {
          this.noise(0.028, { gain: 0.045, freq: 1900, highpass: 1000 });
          this.tone(900 + bias * 0.4, 0.032, { type: 'sawtooth', slideTo: 220, gain: 0.016 });
          break;
        }
        if (ev.weaponId === 'nova') {
          this.noise(0.09, { gain: 0.07, freq: 720, highpass: 280 });
          this.tone(480 + bias, 0.07, { type: 'square', slideTo: 160, gain: 0.028 });
          this.tone(720, 0.05, { type: 'triangle', slideTo: 90, gain: 0.018, delay: 0.012 });
          break;
        }
        if (ev.weaponId === 'mothership') {
          this.noise(0.14, { gain: 0.08, freq: 160 });
          this.tone(88, 0.2, { type: 'sawtooth', slideTo: 36, gain: 0.055 });
          this.tone(176, 0.12, { type: 'triangle', slideTo: 70, gain: 0.03, delay: 0.02 });
          break;
        }
        const base = 620 + bias;
        const wave: OscillatorType = bias > 40 ? 'triangle' : bias < -40 ? 'sawtooth' : 'square';
        this.tone(base, 0.055, { type: wave, slideTo: 140 + bias * 0.2, gain: 0.02 });
        this.tone(base * 1.5, 0.035, { type: 'sine', slideTo: base * 0.4, gain: 0.01, delay: 0.008 });
        break;
      }

      case 'enemyHit':
        if (now - this.lastHitAt < 70) return;
        this.lastHitAt = now;
        this.tone(340, 0.028, { type: 'square', slideTo: 220, gain: 0.012 });
        this.noise(0.04, { gain: 0.035, freq: 900, highpass: 600 });
        break;

      case 'enemyDied': {
        const big = ev.radius >= 22;
        const huge = ev.radius >= 36;
        const dur = huge ? 0.55 : big ? 0.35 : 0.2;
        const low = huge ? 70 : big ? 110 : 160;
        this.noise(dur, { gain: huge ? 0.2 : big ? 0.14 : 0.1, freq: huge ? 220 : 480 });
        this.noise(dur * 0.6, { gain: 0.06, freq: 1200, highpass: 800, delay: 0.02 });
        this.tone(low, dur * 0.95, { type: 'sawtooth', slideTo: 28, gain: huge ? 0.12 : 0.08 });
        if (big) {
          this.tone(low * 1.8, dur * 0.5, { type: 'triangle', slideTo: 50, gain: 0.04, delay: 0.04 });
        }
        break;
      }

      case 'gemPickup':
        if (now - this.lastGemAt < 50) return;
        this.lastGemAt = now;
        {
          const root = 740 + Math.random() * 180;
          this.tone(root, 0.06, { type: 'sine', gain: 0.04 });
          this.tone(root * 1.25, 0.07, { type: 'sine', gain: 0.03, delay: 0.035 });
          this.tone(root * 1.5, 0.08, { type: 'triangle', gain: 0.025, delay: 0.07 });
        }
        break;

      case 'playerHit':
        this.noise(0.32, { gain: 0.22, freq: 200 });
        this.noise(0.18, { gain: 0.08, freq: 700, highpass: 400, delay: 0.02 });
        this.tone(110, 0.3, { type: 'sawtooth', slideTo: 40, gain: 0.14 });
        break;

      case 'levelUp':
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
          this.tone(f, 0.12, { type: 'triangle', gain: 0.085, delay: i * 0.055 }),
        );
        this.tone(523.25 * 2, 0.2, { type: 'sine', gain: 0.04, delay: 0.28 });
        break;

      case 'bossWarn':
        // 사이렌 교대
        for (let i = 0; i < 5; i++) {
          const hi = i % 2 === 0;
          this.tone(hi ? 680 : 420, 0.15, {
            type: 'square',
            slideTo: hi ? 520 : 560,
            gain: 0.065,
            delay: i * 0.16,
          });
        }
        this.noise(0.4, { gain: 0.06, freq: 180, delay: 0.05 });
        break;

      case 'bossSpawned':
        this.noise(0.55, { gain: 0.2, freq: 120 });
        this.tone(55, 0.65, { type: 'sawtooth', slideTo: 32, gain: 0.15 });
        this.tone(110, 0.4, { type: 'triangle', slideTo: 55, gain: 0.06, delay: 0.08 });
        break;

      case 'bossDied':
        this.noise(0.75, { gain: 0.28, freq: 260 });
        this.noise(0.5, { gain: 0.1, freq: 900, highpass: 500, delay: 0.05 });
        this.tone(180, 0.7, { type: 'sawtooth', slideTo: 24, gain: 0.14 });
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(f, 0.18, { type: 'triangle', gain: 0.075, delay: 0.32 + i * 0.08 }),
        );
        break;

      case 'bossPhase':
        this.noise(0.35, { gain: 0.16, freq: 200 });
        this.tone(90, 0.4, { type: 'sawtooth', slideTo: 50, gain: 0.1 });
        [440, 554, 659].forEach((f, i) =>
          this.tone(f, 0.12, { type: 'square', gain: 0.05, delay: i * 0.06 }),
        );
        break;

      case 'jackpot':
        // 슬롯머신식 피치 급상승
        [392, 523, 659, 784, 988, 1319, 1568].forEach((f, i) =>
          this.tone(f, 0.09, { type: 'square', gain: 0.07, delay: i * 0.04 }),
        );
        this.tone(2093, 0.35, { type: 'triangle', gain: 0.09, delay: 0.32 });
        this.noise(0.2, { gain: 0.08, freq: 2000, highpass: 1200, delay: 0.1 });
        break;

      case 'riftWarn':
        for (let i = 0; i < 4; i++) {
          this.tone(i % 2 === 0 ? 180 : 320, 0.14, {
            type: 'sawtooth',
            slideTo: i % 2 === 0 ? 90 : 200,
            gain: 0.08,
            delay: i * 0.14,
          });
        }
        this.noise(0.45, { gain: 0.12, freq: 140 });
        break;

      case 'riftReward':
        [523, 784, 1047].forEach((f, i) =>
          this.tone(f, 0.14, { type: 'triangle', gain: 0.08, delay: i * 0.07 }),
        );
        break;

      case 'pickup':
        if (ev.kind === 'heal') {
          [660, 880, 1100].forEach((f, i) =>
            this.tone(f, 0.09, { type: 'sine', gain: 0.055, delay: i * 0.05 }),
          );
        } else if (ev.kind === 'magnet') {
          this.tone(280, 0.32, { type: 'sine', slideTo: 1500, gain: 0.055 });
          this.tone(420, 0.2, { type: 'triangle', slideTo: 900, gain: 0.03, delay: 0.06 });
        } else if (ev.kind === 'cube') {
          [784, 988, 1175, 1568].forEach((f, i) =>
            this.tone(f, 0.1, { type: 'sine', gain: 0.05, delay: i * 0.045 }),
          );
          this.tone(2093, 0.22, { type: 'triangle', gain: 0.04, delay: 0.2 });
        }
        break;

      case 'skill':
        if (ev.id === 'phaseDash') {
          this.noise(0.08, { gain: 0.07, freq: 1400, highpass: 800 });
          this.tone(920, 0.12, { type: 'sine', slideTo: 1480, gain: 0.06 });
          this.tone(480, 0.1, { type: 'triangle', slideTo: 200, gain: 0.03, delay: 0.02 });
        } else if (ev.id === 'aegis') {
          this.tone(180, 0.24, { type: 'triangle', slideTo: 90, gain: 0.08 });
          this.tone(360, 0.18, { type: 'sine', gain: 0.05 });
          this.noise(0.12, { gain: 0.06, freq: 400 });
        } else if (ev.id === 'timeDilation') {
          this.tone(440, 0.38, { type: 'sine', slideTo: 150, gain: 0.07 });
          this.tone(220, 0.42, { type: 'triangle', slideTo: 70, gain: 0.05, delay: 0.04 });
          this.noise(0.22, { gain: 0.05, freq: 180 });
        }
        break;

      case 'teleport':
        this.tone(640, 0.1, { type: 'sine', slideTo: 170, gain: 0.05 });
        this.tone(980, 0.08, { type: 'triangle', slideTo: 400, gain: 0.03, delay: 0.02 });
        this.noise(0.07, { gain: 0.05, freq: 900, highpass: 500 });
        break;

      case 'shieldBlock':
        if (now - this.lastShieldAt < 70) return;
        this.lastShieldAt = now;
        this.tone(980, 0.04, { type: 'square', slideTo: 400, gain: 0.018 });
        this.noise(0.03, { gain: 0.04, freq: 1600, highpass: 1000 });
        break;

      case 'bomb':
        this.noise(0.65, { gain: 0.28, freq: 160 });
        this.noise(0.35, { gain: 0.1, freq: 1100, highpass: 700, delay: 0.03 });
        this.tone(85, 0.58, { type: 'sawtooth', slideTo: 28, gain: 0.16 });
        break;

      case 'victory':
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
          this.tone(f, 0.2, { type: 'triangle', gain: 0.095, delay: i * 0.12 }),
        );
        this.tone(1568, 0.35, { type: 'sine', gain: 0.05, delay: 0.65 });
        break;

      case 'gameover':
        [392, 330, 262, 196].forEach((f, i) =>
          this.tone(f, 0.32, { type: 'triangle', gain: 0.085, delay: i * 0.2 }),
        );
        this.noise(0.4, { gain: 0.08, freq: 140, delay: 0.1 });
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

  /** BGM 전용 톤 (덕킹 버스 경유) */
  private bgmTone(freq: number, dur: number, opts: ToneOpts = {}): void {
    if (!this.ctx || !this.bgmBus) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t0 + dur);
    }
    const vol = opts.gain ?? 0.05;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(this.bgmBus);
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
    filter.type = opts.highpass ? 'highpass' : 'bandpass';
    filter.frequency.value = opts.highpass ?? opts.freq ?? 400;
    filter.Q.value = opts.highpass ? 0.5 : 0.8;
    if (opts.highpass && opts.freq) {
      // 하이패스 뒤 밴드 느낌은 gain만으로 충분
    }
    const g = this.ctx.createGain();
    const vol = opts.gain ?? 0.15;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  private bgmNoise(dur: number, opts: NoiseOpts = {}): void {
    if (!this.ctx || !this.bgmBus || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = opts.highpass ? 'highpass' : 'bandpass';
    filter.frequency.value = opts.highpass ?? opts.freq ?? 400;
    filter.Q.value = 0.7;
    const g = this.ctx.createGain();
    const vol = opts.gain ?? 0.04;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(g).connect(this.bgmBus);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // ==========================================================
  // BGM — Am → F → C → G + 킥/하이햇 펄스·옥타브 변주
  // ==========================================================

  private startBgm(): void {
    if (!this.ctx || this.bgmInterval !== null) return;
    this.bgmStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.bgmInterval = window.setInterval(() => this.scheduleBgm(), 30);
  }

  private scheduleBgm(): void {
    if (!this.ctx || !this.bgmBus) return;
    const eighth = 60 / 132 / 2; // 132 BPM, 8분음표
    const kickBoost = 1 + this.combatIntensity * 0.45;

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
      const barStep = step % 16;
      const octaveUp = Math.floor(this.bgmStep / 64) % 2 === 1;

      // 킥식 노이즈 펄스 (4분음표 on 1·3)
      if (barStep % 4 === 0) {
        this.bgmNoise(0.08, { gain: 0.045 * kickBoost, freq: 80, delay });
        this.bgmTone(bassRoots[chord] * 0.5, eighth * 1.2, {
          type: 'triangle',
          slideTo: bassRoots[chord] * 0.35,
          gain: 0.035 * kickBoost,
          delay,
        });
      }
      // 하이햇식 펄스 (오프비트)
      if (barStep % 2 === 1) {
        this.bgmNoise(0.035, { gain: 0.018 + this.combatIntensity * 0.012, highpass: 4500, delay });
      }

      // 베이스 (4분음표)
      if (step % 2 === 0) {
        this.bgmTone(bassRoots[chord], eighth * 1.8, { type: 'triangle', gain: 0.048, delay });
      }
      // 아르페지오 (8분음표) — 격 마디마다 옥타브 업
      const tone = chordTones[chord][arpOrder[step % 4]] * (octaveUp ? 2 : 1);
      this.bgmTone(tone, eighth * 0.85, { type: 'sine', gain: octaveUp ? 0.022 : 0.028, delay });

      this.bgmStep++;
      this.nextNoteTime += eighth;
    }
  }
}
