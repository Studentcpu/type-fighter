/**
 * Sound synthesis engine using Web Audio API.
 * 100% self-contained, no external audio files required.
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    // Sound will initialize on first user interaction to comply with browser autoplay policies
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  // Crisp keystroke tick
  public playKeyType() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600 + Math.random() * 200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  // Typo buzz / error feedback
  public playTypo() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.setValueAtTime(110, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Punch whoosh & hit
  public playPunch() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Low punch thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Noise snap
    this.playNoiseSnap(0.08, 0.18);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // Heavy kick / combo finisher
  public playKick() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.18);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    this.playNoiseSnap(0.12, 0.25);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  // Super / Dragon fist hit
  public playDragonHit() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Sub rumble
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(280, t);
    sub.frequency.exponentialRampToValueAtTime(30, t + 0.35);

    subGain.gain.setValueAtTime(0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    sub.connect(subGain);
    subGain.connect(this.ctx.destination);

    // Harmonic chime sweep
    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(440, t);
    chime.frequency.exponentialRampToValueAtTime(880, t + 0.2);

    chimeGain.gain.setValueAtTime(0.2, t);
    chimeGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    chime.connect(chimeGain);
    chimeGain.connect(this.ctx.destination);

    this.playNoiseSnap(0.2, 0.35);

    sub.start(t);
    sub.stop(t + 0.35);
    chime.start(t);
    chime.stop(t + 0.25);
  }

  // Enemy defeated shatter / burst
  public playEnemyDefeat() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    this.playNoiseSnap(0.18, 0.3);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Player gets hit by enemy
  public playPlayerHurt() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Combo ascending chime (scale steps: C5, D5, E5, G5, A5, C6)
  public playComboChime(comboCount: number) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66];
    const freq = pentatonic[Math.min(comboCount % pentatonic.length, pentatonic.length - 1)];

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Game over solemn descending chord
  public playGameOver() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [330, 293, 261, 196]; // E4, D4, C4, G3
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + idx * 0.16;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  // Dragon Fury / Ultimate Super Roar
  public playDragonFury() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Rising energy power sweep
    const sweep = this.ctx.createOscillator();
    const sweepGain = this.ctx.createGain();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(110, t);
    sweep.frequency.exponentialRampToValueAtTime(880, t + 0.35);

    sweepGain.gain.setValueAtTime(0.25, t);
    sweepGain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

    sweep.connect(sweepGain);
    sweepGain.connect(this.ctx.destination);
    sweep.start(t);
    sweep.stop(t + 0.45);

    // Deep sub blast
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(220, t + 0.2);
    sub.frequency.exponentialRampToValueAtTime(35, t + 0.7);

    subGain.gain.setValueAtTime(0.4, t + 0.2);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    sub.connect(subGain);
    subGain.connect(this.ctx.destination);
    sub.start(t + 0.2);
    sub.stop(t + 0.7);

    this.playNoiseSnap(0.3, 0.35);
  }

  // Boss Alert Siren / War Horn
  public playBossAlert() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.setValueAtTime(146.83, t + 0.2); // D3
    osc.frequency.setValueAtTime(110, t + 0.4);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.65);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.7);
  }

  // Procedural Synth Battle BGM
  public bgmEnabled: boolean = false;
  private bgmTimer: number | null = null;
  private bgmStep: number = 0;

  public setBgmEnabled(enabled: boolean) {
    this.bgmEnabled = enabled;
    if (enabled) {
      this.startBgmLoop();
    } else {
      this.stopBgmLoop();
    }
  }

  public startBgmLoop() {
    if (!this.bgmEnabled || this.bgmTimer !== null) return;
    this.initContext();
    // 130 BPM = 16th note every ~115ms
    this.bgmTimer = window.setInterval(() => {
      this.tickBgmBeat();
    }, 115);
  }

  public stopBgmLoop() {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private tickBgmBeat() {
    if (!this.bgmEnabled || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const step = this.bgmStep % 16;
    this.bgmStep++;

    // Kick on steps 0, 4, 8, 12 (four on the floor)
    if (step % 4 === 0) {
      const kick = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(140, t);
      kick.frequency.exponentialRampToValueAtTime(38, t + 0.08);
      kickGain.gain.setValueAtTime(0.18, t);
      kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      kick.connect(kickGain);
      kickGain.connect(this.ctx.destination);
      kick.start(t);
      kick.stop(t + 0.08);
    }

    // Hi-hat tick on off-beats
    if (step % 2 === 1) {
      this.playNoiseSnap(0.025, 0.04);
    }

    // Synth Bass arpeggio note (pentatonic Cyber-dojo progression: D, F, G, A)
    const scale = [73.42, 87.31, 98.0, 110.0]; // D2, F2, G2, A2
    const noteFreq = scale[(Math.floor(step / 2)) % scale.length];
    if (step % 2 === 0) {
      const bass = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(noteFreq, t);
      bassGain.gain.setValueAtTime(0.04, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      bass.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bass.start(t);
      bass.stop(t + 0.09);
    }
  }

  // White noise generator for punch impact crunch
  private playNoiseSnap(duration: number, volume: number) {
    if (!this.ctx) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch {
      // Audio buffer creation safe fallback
    }
  }
}

export const sounds = new SoundSystem();
