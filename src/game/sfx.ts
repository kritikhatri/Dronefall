// All sounds are synthesised with the Web Audio API, so there are no audio files to load.
class Sfx {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  rotorOsc: OscillatorNode | null = null;
  rotorOsc2: OscillatorNode | null = null;
  rotorGain: GainNode | null = null;
  rotorFilter: BiquadFilterNode | null = null;
  muted = false;

  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(ctx.destination);

      this.rotorFilter = ctx.createBiquadFilter();
      this.rotorFilter.type = 'lowpass';
      this.rotorFilter.frequency.value = 600;
      this.rotorGain = ctx.createGain();
      this.rotorGain.gain.value = 0;
      this.rotorOsc = ctx.createOscillator();
      this.rotorOsc.type = 'sawtooth';
      this.rotorOsc.frequency.value = 90;
      this.rotorOsc2 = ctx.createOscillator();
      this.rotorOsc2.type = 'square';
      this.rotorOsc2.frequency.value = 93;
      this.rotorOsc.connect(this.rotorFilter);
      this.rotorOsc2.connect(this.rotorFilter);
      this.rotorFilter.connect(this.rotorGain);
      this.rotorGain.connect(this.master);
      this.rotorOsc.start();
      this.rotorOsc2.start();
    } catch {
      this.ctx = null;
    }
  }

  setRotor(throttle: number, active: boolean) {
    if (!this.ctx || !this.rotorOsc || !this.rotorOsc2 || !this.rotorGain || !this.rotorFilter) return;
    const t = this.ctx.currentTime;
    const f = 85 + throttle * 70;
    this.rotorOsc.frequency.setTargetAtTime(f, t, 0.08);
    this.rotorOsc2.frequency.setTargetAtTime(f * 1.03, t, 0.08);
    this.rotorFilter.frequency.setTargetAtTime(400 + throttle * 900, t, 0.1);
    this.rotorGain.gain.setTargetAtTime(active ? 0.05 + throttle * 0.05 : 0, t, 0.15);
  }

  private tone(freq: number, when: number, dur: number, type: OscillatorType = 'sine', vol = 0.25) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t = this.ctx.currentTime + when;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  pickup() {
    this.tone(660, 0, 0.15);
    this.tone(880, 0.08, 0.2);
  }

  deliver() {
    this.tone(523, 0, 0.15);
    this.tone(659, 0.09, 0.15);
    this.tone(784, 0.18, 0.15);
    this.tone(1047, 0.27, 0.35);
  }

  fail() {
    this.tone(300, 0, 0.25, 'triangle');
    this.tone(220, 0.15, 0.4, 'triangle');
  }

  warn() {
    this.tone(880, 0, 0.08, 'square', 0.08);
  }

  charge() {
    this.tone(1200, 0, 0.05, 'sine', 0.05);
  }

  crash(strength: number) {
    if (!this.ctx || !this.master) return;
    const len = Math.floor(this.ctx.sampleRate * 0.3);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.value = Math.min(0.9, 0.3 + strength * 0.05);
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }
}

export const sfx = new Sfx();
