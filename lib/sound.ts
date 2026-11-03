// Tiny Web Audio engine: tick, chime and ambient backgrounds. No audio files needed.
export type Ambient = "off" | "rain" | "brown" | "wind" | "pad";
export const AMBIENTS: { id: Ambient; label: string }[] = [
  { id: "off", label: "None" }, { id: "rain", label: "Rain" }, { id: "brown", label: "Brown noise" },
  { id: "wind", label: "Wind" }, { id: "pad", label: "Calm pad" },
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private ambientGain: GainNode | null = null;
  private ambientStop: (() => void) | null = null;
  private flip = false;
  private buffers: Record<string, AudioBuffer> = {};

  /** Must be called from a user gesture (e.g. the Start button). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  private noise(kind: "white" | "brown") {
    const ctx = this.ctx!;
    if (this.buffers[kind]) return this.buffers[kind];
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") d[i] = w;
      else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    }
    return (this.buffers[kind] = buf);
  }

  tick(volume: number) {
    if (!this.ctx || volume <= 0) return;
    const ctx = this.ctx, t = ctx.currentTime;
    this.flip = !this.flip;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = "square"; o.frequency.value = this.flip ? 1500 : 1150;
    f.type = "bandpass"; f.frequency.value = this.flip ? 2200 : 1700; f.Q.value = 2;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25 * volume, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    o.connect(f).connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.06);
  }

  chime(volume = 0.6) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    [659.25, 880, 1318.5].forEach((hz, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = hz;
      const s = t + i * 0.18;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.3 * volume, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 1.4);
      o.connect(g).connect(this.master);
      o.start(s); o.stop(s + 1.5);
    });
  }

  setAmbient(kind: Ambient, volume: number) {
    this.fadeOutAmbient();
    if (!this.ctx || kind === "off") return;
    const ctx = this.ctx, now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 1.5);
    gain.connect(this.master);
    const stops: (() => void)[] = [];
    const loop = (type: "white" | "brown") => {
      const s = ctx.createBufferSource(); s.buffer = this.noise(type); s.loop = true; s.start();
      stops.push(() => s.stop()); return s;
    };
    const filter = (type: BiquadFilterType, hz: number, q = 0.7) => {
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = hz; f.Q.value = q; return f;
    };
    if (kind === "brown") {
      loop("brown").connect(filter("lowpass", 500)).connect(gain);
    } else if (kind === "rain") {
      const hi = ctx.createGain(); hi.gain.value = 0.35;
      loop("white").connect(filter("highpass", 1200)).connect(filter("lowpass", 9000)).connect(hi).connect(gain);
      const lo = ctx.createGain(); lo.gain.value = 0.5;
      loop("brown").connect(filter("lowpass", 700)).connect(lo).connect(gain);
    } else if (kind === "wind") {
      const bp = filter("bandpass", 500, 0.8);
      loop("brown").connect(bp).connect(gain);
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 0.12; depth.gain.value = 300;
      lfo.connect(depth).connect(bp.frequency); lfo.start(); stops.push(() => lfo.stop());
    } else if (kind === "pad") {
      const lp = filter("lowpass", 900);
      const sum = ctx.createGain(); sum.gain.value = 0.22;
      [110, 130.81, 164.81, 196, 261.63].forEach((hz, i) => {
        [-6, 6].forEach((detune) => {
          const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = hz; o.detune.value = detune;
          const lfo = ctx.createOscillator(), d = ctx.createGain(), og = ctx.createGain();
          og.gain.value = 0.5; lfo.frequency.value = 0.05 + i * 0.013; d.gain.value = 0.3;
          lfo.connect(d).connect(og.gain);
          o.connect(og).connect(sum); o.start(); lfo.start();
          stops.push(() => { o.stop(); lfo.stop(); });
        });
      });
      sum.connect(lp).connect(gain);
    }
    this.ambientGain = gain;
    this.ambientStop = () => stops.forEach((s) => { try { s(); } catch {} });
  }

  setAmbientVolume(volume: number) {
    if (this.ctx && this.ambientGain) this.ambientGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
  }

  fadeOutAmbient() {
    if (!this.ctx || !this.ambientGain) return;
    const g = this.ambientGain, stop = this.ambientStop, t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0, t + 0.8);
    setTimeout(() => { stop?.(); g.disconnect(); }, 900);
    this.ambientGain = null; this.ambientStop = null;
  }
}

export const sound = new SoundEngine();
