// Generative ambient "soundtracks" for the blog audiobook player.
// Everything is synthesized live with the Web Audio API — no audio files,
// royalty-free, ~zero CPU. Each preset is a distinct mood (warm drone, smooth
// trance, lo-fi, crystalline, deep night, focus) so different posts can feel
// different, Spotify-style, and the listener can switch live.

export interface AmbientVoice {
  ratio: number; // frequency = rootHz * ratio
  type: OscillatorType;
  gain: number;
  detune?: number; // cents
}

export interface AmbientPreset {
  id: string;
  name: string;
  emoji: string;
  rootHz: number;
  master: number; // 0–1 base level (scaled by the user's ambience volume)
  voices: AmbientVoice[];
  filterHz: number;
  filterLfoHz?: number;
  filterLfoDepth?: number;
  // Slow amplitude pulse — the gentle "pump" that reads as trance/heartbeat.
  pulseHz?: number;
  pulseDepth?: number; // 0–1
  // Melodic color tone that steps through a scale.
  colorRatios?: number[];
  colorStepMs?: number;
  colorType?: OscillatorType;
  colorGain?: number;
  // Texture layer.
  noise?: { kind: 'air' | 'rain' | 'vinyl'; level: number; filterHz: number };
  // Slow pitch wobble for lo-fi warble.
  warbleDepth?: number; // cents
}

// Ratios are over the root. Minor/pentatonic sets keep everything consonant.
export const AMBIENT_PRESETS: AmbientPreset[] = [
  {
    id: 'warm',
    name: 'Warm Drone',
    emoji: '🟠',
    rootHz: 110,
    master: 1,
    voices: [
      { ratio: 1, type: 'sine', gain: 0.42 },
      { ratio: 1, type: 'sine', gain: 0.18, detune: 6 },
      { ratio: 1.5, type: 'sine', gain: 0.22 }, // fifth
    ],
    filterHz: 900,
    filterLfoHz: 0.025,
    filterLfoDepth: 220,
    colorRatios: [2.5, 2.25, 3, 2], // C#–B–E–A-ish over A
    colorStepMs: 20000,
    colorType: 'sine',
    colorGain: 0.1,
    noise: { kind: 'air', level: 0.05, filterHz: 320 },
  },
  {
    id: 'trance',
    name: 'Smooth Trance',
    emoji: '🟣',
    rootHz: 98, // G
    master: 0.95,
    voices: [
      { ratio: 1, type: 'sine', gain: 0.34 },
      { ratio: 2, type: 'triangle', gain: 0.14 },
      { ratio: 1.5, type: 'sine', gain: 0.18 },
    ],
    filterHz: 750,
    filterLfoHz: 0.12,
    filterLfoDepth: 380,
    pulseHz: 1.1, // ~66 bpm gentle pulse
    pulseDepth: 0.55,
    colorRatios: [3, 3.6, 4, 4.5, 4, 3.6], // arpeggio motion
    colorStepMs: 1818, // synced to the pulse
    colorType: 'triangle',
    colorGain: 0.085,
    noise: { kind: 'air', level: 0.03, filterHz: 500 },
  },
  {
    id: 'lofi',
    name: 'Lo-Fi Haze',
    emoji: '🟤',
    rootHz: 130.81, // C3
    master: 0.9,
    voices: [
      { ratio: 1, type: 'triangle', gain: 0.3 },
      { ratio: 1.5, type: 'sine', gain: 0.16 },
      { ratio: 1.875, type: 'sine', gain: 0.12 }, // major-ish 7th color
    ],
    filterHz: 560,
    filterLfoHz: 0.04,
    filterLfoDepth: 120,
    colorRatios: [2, 2.5, 3, 2.5],
    colorStepMs: 6000,
    colorType: 'triangle',
    colorGain: 0.08,
    noise: { kind: 'vinyl', level: 0.06, filterHz: 4000 },
    warbleDepth: 9,
  },
  {
    id: 'crystal',
    name: 'Crystalline',
    emoji: '🔵',
    rootHz: 146.83, // D3
    master: 0.85,
    voices: [
      { ratio: 1, type: 'sine', gain: 0.28 },
      { ratio: 2, type: 'sine', gain: 0.16 },
      { ratio: 3, type: 'sine', gain: 0.08 },
    ],
    filterHz: 1600,
    filterLfoHz: 0.08,
    filterLfoDepth: 500,
    colorRatios: [4, 4.5, 5, 6, 5, 4.5], // bright pentatonic shimmer
    colorStepMs: 3000,
    colorType: 'sine',
    colorGain: 0.07,
    noise: { kind: 'air', level: 0.02, filterHz: 900 },
  },
  {
    id: 'night',
    name: 'Deep Night',
    emoji: '🌙',
    rootHz: 73.42, // D2
    master: 1,
    voices: [
      { ratio: 1, type: 'sine', gain: 0.5 },
      { ratio: 1.5, type: 'sine', gain: 0.16 },
    ],
    filterHz: 380,
    filterLfoHz: 0.018,
    filterLfoDepth: 90,
    colorRatios: [3, 4, 3.5, 2],
    colorStepMs: 14000,
    colorType: 'sine',
    colorGain: 0.06,
    noise: { kind: 'rain', level: 0.12, filterHz: 1500 },
  },
  {
    id: 'focus',
    name: 'Focus',
    emoji: '⚪',
    rootHz: 110,
    master: 0.8,
    voices: [
      { ratio: 1, type: 'sine', gain: 0.36 },
      { ratio: 1.5, type: 'sine', gain: 0.2 },
    ],
    filterHz: 700,
    filterLfoHz: 0.02,
    filterLfoDepth: 60,
    noise: { kind: 'air', level: 0.025, filterHz: 400 },
  },
];

export function getPreset(id: string | undefined): AmbientPreset {
  return AMBIENT_PRESETS.find((p) => p.id === id) || AMBIENT_PRESETS[0];
}

// Deterministic default preset per post, so each article has a stable "vibe"
// but the set as a whole feels varied.
export function presetForSlug(slug: string): AmbientPreset {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return AMBIENT_PRESETS[h % AMBIENT_PRESETS.length];
}

type Win = Window & { webkitAudioContext?: typeof AudioContext };

export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private bus: GainNode | null = null; // voices+color feed here -> filter
  private stoppables: { stop(): void }[] = [];
  private colorOsc: OscillatorNode | null = null;
  private colorTimer: ReturnType<typeof setInterval> | null = null;
  private colorIdx = 0;
  private preset: AmbientPreset;
  private volume = 0.07;

  constructor(preset: AmbientPreset) {
    this.preset = preset;
  }

  start(volume: number) {
    this.volume = volume;
    if (this.ctx) {
      this.resume();
      return;
    }
    // Background music is best-effort; any Web Audio failure must degrade to
    // silence, never bubble up and interrupt narration.
    try {
      const Ctx = window.AudioContext || (window as Win).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      this.ctx = ctx;
      const now = ctx.currentTime;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(this.level(), now + 4);
      master.connect(ctx.destination);
      this.master = master;

      // breathing swell on the master
      const swellLfo = ctx.createOscillator();
      swellLfo.frequency.setValueAtTime(0.025, now);
      const swellDepth = ctx.createGain();
      swellDepth.gain.setValueAtTime(0.16, now);
      swellLfo.connect(swellDepth);
      swellDepth.connect(master.gain);
      swellLfo.start();
      this.stoppables.push(swellLfo);

      this.buildPresetGraph();
    } catch {
      this.stop();
    }
  }

  private level() {
    return this.volume * this.preset.master;
  }

  // Builds filter + voices + color + noise for the current preset onto a fresh
  // bus, so switchPreset can tear just this down and rebuild.
  private buildPresetGraph(fadeIn = 3) {
    const ctx = this.ctx!;
    const master = this.master!;
    const now = ctx.currentTime;
    const p = this.preset;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(p.filterHz, now);
    filter.Q.setValueAtTime(0.5, now);
    filter.connect(master);
    this.filter = filter;

    if (p.filterLfoHz && p.filterLfoDepth) {
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(p.filterLfoHz, now);
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(p.filterLfoDepth, now);
      lfo.connect(depth);
      depth.connect(filter.frequency);
      lfo.start();
      this.stoppables.push(lfo);
    }

    // bus carries the tonal layers; an optional pulse modulates its gain
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(1, now);
    bus.connect(filter);
    this.bus = bus;

    if (p.pulseHz && p.pulseDepth) {
      const pulse = ctx.createOscillator();
      pulse.type = 'sine';
      pulse.frequency.setValueAtTime(p.pulseHz, now);
      const pulseDepth = ctx.createGain();
      pulseDepth.gain.setValueAtTime(p.pulseDepth / 2, now);
      bus.gain.setValueAtTime(1 - p.pulseDepth / 2, now);
      pulse.connect(pulseDepth);
      pulseDepth.connect(bus.gain);
      pulse.start();
      this.stoppables.push(pulse);
    }

    // drone voices
    for (const v of p.voices) {
      const osc = ctx.createOscillator();
      osc.type = v.type;
      osc.frequency.setValueAtTime(p.rootHz * v.ratio, now);
      if (v.detune) osc.detune.setValueAtTime(v.detune, now);
      if (p.warbleDepth) {
        const warble = ctx.createOscillator();
        warble.frequency.setValueAtTime(0.18, now);
        const wd = ctx.createGain();
        wd.gain.setValueAtTime(p.warbleDepth, now);
        warble.connect(wd);
        wd.connect(osc.detune);
        warble.start();
        this.stoppables.push(warble);
      }
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(v.gain, now + fadeIn);
      osc.connect(g);
      g.connect(bus);
      osc.start();
      this.stoppables.push(osc);
    }

    // melodic color tone stepping through the scale
    if (p.colorRatios && p.colorRatios.length && p.colorGain) {
      const osc = ctx.createOscillator();
      osc.type = p.colorType || 'sine';
      this.colorIdx = 0;
      osc.frequency.setValueAtTime(p.rootHz * p.colorRatios[0], now);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(p.colorGain, now + fadeIn + 2);
      osc.connect(g);
      g.connect(bus);
      osc.start();
      this.colorOsc = osc;
      this.stoppables.push(osc);

      const stepMs = p.colorStepMs || 6000;
      this.colorTimer = setInterval(() => {
        if (!this.ctx || !this.colorOsc || !p.colorRatios) return;
        this.colorIdx = (this.colorIdx + 1) % p.colorRatios.length;
        this.colorOsc.frequency.setTargetAtTime(
          p.rootHz * p.colorRatios[this.colorIdx],
          this.ctx.currentTime,
          Math.min(4, stepMs / 2000)
        );
      }, stepMs);
    }

    if (p.noise) this.buildNoise(p.noise, bus, fadeIn);
  }

  private buildNoise(
    noise: NonNullable<AmbientPreset['noise']>,
    dest: AudioNode,
    fadeIn: number
  ) {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const len = 2 * ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);

    if (noise.kind === 'vinyl') {
      // soft hiss + occasional crackle
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15;
        if (Math.random() < 0.0006) data[i] += (Math.random() * 2 - 1) * 0.9;
      }
    } else if (noise.kind === 'rain') {
      // dense fine droplets
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.5 ? 0.6 : 0.2);
      }
    } else {
      // air: brown noise (integrated white) for a soft spectrum
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + (Math.random() * 2 - 1) * 0.02) * 0.998;
        data[i] = last * 3.5;
      }
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = noise.kind === 'rain' || noise.kind === 'vinyl' ? 'bandpass' : 'lowpass';
    nf.frequency.setValueAtTime(noise.filterHz, now);
    nf.Q.setValueAtTime(noise.kind === 'rain' ? 0.7 : 0.4, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(noise.level, now + fadeIn + 3);
    src.connect(nf);
    nf.connect(g);
    g.connect(dest);
    src.start();
    this.stoppables.push(src);
  }

  // Crossfade to a new preset without dropping the audio context.
  switchPreset(preset: AmbientPreset) {
    if (!this.ctx || !this.master) {
      this.preset = preset;
      return;
    }
    const ctx = this.ctx;
    const old = this.stoppables.filter((s) => s instanceof OscillatorNode || s instanceof AudioBufferSourceNode);
    // duck, tear down tonal/noise/color nodes, rebuild
    if (this.colorTimer) clearInterval(this.colorTimer);
    this.master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
    const toStop = [...this.stoppables];
    this.stoppables = [];
    this.colorOsc = null;
    setTimeout(() => {
      toStop.forEach((s) => { try { s.stop(); } catch { /* */ } });
    }, 700);
    void old;
    this.preset = preset;
    // small delay so the duck is audible, then build + ramp back
    setTimeout(() => {
      if (!this.ctx || !this.master) return;
      // re-add the breathing swell (was torn down)
      const swellLfo = ctx.createOscillator();
      swellLfo.frequency.setValueAtTime(0.025, ctx.currentTime);
      const swellDepth = ctx.createGain();
      swellDepth.gain.setValueAtTime(0.16, ctx.currentTime);
      swellLfo.connect(swellDepth);
      swellDepth.connect(this.master.gain);
      swellLfo.start();
      this.stoppables.push(swellLfo);
      this.buildPresetGraph(2.5);
      this.master.gain.setTargetAtTime(this.level(), ctx.currentTime, 1.2);
    }, 350);
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.3);
    }
  }

  suspend() {
    this.ctx?.suspend();
  }

  resume() {
    this.ctx?.resume();
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.5);
    }
  }

  stop() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    this.master?.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
    if (this.colorTimer) clearInterval(this.colorTimer);
    const toStop = [...this.stoppables];
    setTimeout(() => {
      toStop.forEach((s) => { try { s.stop(); } catch { /* */ } });
      ctx.close().catch(() => {});
    }, 1800);
    this.ctx = null;
    this.master = null;
    this.filter = null;
    this.bus = null;
    this.stoppables = [];
    this.colorOsc = null;
    this.colorTimer = null;
    this.colorIdx = 0;
  }
}
