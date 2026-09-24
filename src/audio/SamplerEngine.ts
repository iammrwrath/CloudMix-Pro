/**
 * Pro 8-Slot DJ Sampler & Soundboard Engine
 * Provides synthesized club drops and custom sample loading.
 */

import { SamplerSlot } from '../types/dj';

export class SamplerEngine {
  private ctx: AudioContext | null = null;
  private outputNode: GainNode | null = null;
  private sampleBuffers: Map<number, AudioBuffer> = new Map();
  private activeSources: Map<number, AudioBufferSourceNode> = new Map();
  private slots: SamplerSlot[] = [
    { id: 0, name: 'AIRHORN', color: '#ff2e88', volume: 0.9, isPlaying: false },
    { id: 1, name: 'LASER SIREN', color: '#00f0ff', volume: 0.85, isPlaying: false },
    { id: 2, name: '808 BOOM', color: '#a855f7', volume: 0.95, isPlaying: false },
    { id: 3, name: 'VINYL SCRATCH', color: '#f59e0b', volume: 0.8, isPlaying: false },
    { id: 4, name: 'DROP BASS', color: '#ef4444', volume: 0.9, isPlaying: false },
    { id: 5, name: 'CLUB KICK', color: '#10b981', volume: 0.85, isPlaying: false },
    { id: 6, name: 'SNARE CLAP', color: '#3b82f6', volume: 0.85, isPlaying: false },
    { id: 7, name: 'HAT ROLL', color: '#eab308', volume: 0.8, isPlaying: false },
  ];
  private listeners: Set<(slots: SamplerSlot[]) => void> = new Set();

  constructor() {}

  public init(ctx: AudioContext, masterNode: AudioNode) {
    if (this.ctx) return;
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.outputNode.gain.setValueAtTime(0.85, ctx.currentTime);
    this.outputNode.connect(masterNode);

    // Pre-synthesize default sound drops
    this.synthesizeDefaultSamples();
  }

  public subscribe(cb: (slots: SamplerSlot[]) => void): () => void {
    this.listeners.add(cb);
    cb([...this.slots]);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb([...this.slots]));
  }

  public triggerSlot(id: number) {
    if (!this.ctx || !this.outputNode) return;
    const buffer = this.sampleBuffers.get(id);
    if (!buffer) return;

    // Stop active source if already playing
    const existing = this.activeSources.get(id);
    if (existing) {
      try { existing.stop(); } catch {}
    }

    const slot = this.slots[id];
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(slot.volume, this.ctx.currentTime);

    source.connect(gain);
    gain.connect(this.outputNode);

    source.onended = () => {
      this.slots[id].isPlaying = false;
      this.activeSources.delete(id);
      this.notify();
    };

    source.start(0);
    this.activeSources.set(id, source);
    this.slots[id].isPlaying = true;
    this.notify();
  }

  public stopSlot(id: number) {
    const source = this.activeSources.get(id);
    if (source) {
      try { source.stop(); } catch {}
      this.activeSources.delete(id);
      this.slots[id].isPlaying = false;
      this.notify();
    }
  }

  public setSlotVolume(id: number, volume: number) {
    if (this.slots[id]) {
      this.slots[id].volume = Math.max(0, Math.min(1, volume));
      this.notify();
    }
  }

  public async loadCustomSample(id: number, arrayBuffer: ArrayBuffer, name: string): Promise<boolean> {
    if (!this.ctx) return false;
    try {
      const audioBuf = await this.ctx.decodeAudioData(arrayBuffer);
      this.sampleBuffers.set(id, audioBuf);
      this.slots[id].name = name.toUpperCase().slice(0, 12);
      this.slots[id].isCustom = true;
      this.notify();
      return true;
    } catch (err) {
      console.error('Failed to decode custom sample:', err);
      return false;
    }
  }

  public getSlots(): SamplerSlot[] {
    return [...this.slots];
  }

  // Synthesize rich, authentic DJ drops with pure Web Audio DSP
  private synthesizeDefaultSamples() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;

    // 1. AUTHENTIC REGGAE DANCEHALL DJ AIRHORN (Staccato multi-blast brass with pitch drop)
    const hornSec = 1.35;
    const hornBuf = this.ctx.createBuffer(2, Math.floor(sr * hornSec), sr);
    // Authentic stutter timing in seconds: blast 1, blast 2, blast 3, sustained tail
    const blasts = [
      { start: 0.00, end: 0.14, pitchOffset: 0 },
      { start: 0.18, end: 0.32, pitchOffset: 2 },
      { start: 0.36, end: 0.50, pitchOffset: 4 },
      { start: 0.54, end: 1.30, pitchOffset: 0 },
    ];
    for (let ch = 0; ch < 2; ch++) {
      const data = hornBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        let activeBlast = blasts.find(b => t >= b.start && t <= b.end);
        if (!activeBlast) {
          data[i] = 0;
          continue;
        }
        const blastT = t - activeBlast.start;
        const blastDur = activeBlast.end - activeBlast.start;
        // Pitch droop envelope typical of real airhorns
        const pitchBend = Math.max(0, 1.0 - Math.pow(blastT / blastDur, 3) * 0.12);
        const f1 = (466.16 + activeBlast.pitchOffset) * pitchBend; // Bb4 fundamental
        const f2 = (587.33 + activeBlast.pitchOffset) * pitchBend; // D5
        const f3 = (698.46 + activeBlast.pitchOffset) * pitchBend; // F5
        const f4 = (932.33 + activeBlast.pitchOffset) * pitchBend; // Bb5

        // Rich rich sawtooth brass with odd/even harmonics
        let brass = 0;
        for (let h = 1; h <= 6; h++) {
          brass += (Math.sin(2 * Math.PI * f1 * h * t) / h) * 0.35;
          brass += (Math.sin(2 * Math.PI * f2 * h * t) / (h * 1.2)) * 0.25;
          brass += (Math.sin(2 * Math.PI * f3 * h * t) / (h * 1.5)) * 0.2;
          brass += (Math.sin(2 * Math.PI * f4 * h * t) / (h * 2.0)) * 0.15;
        }

        // Fast attack, sustained body, quick decay
        let env = 1.0;
        if (blastT < 0.015) env = blastT / 0.015;
        else if (blastT > blastDur - 0.03) env = (blastDur - blastT) / 0.03;

        // Sub blast punch
        const sub = Math.sin(2 * Math.PI * (f1 * 0.5) * t) * 0.3;
        data[i] = Math.tanh((brass + sub) * 1.2) * env * 0.92;
      }
    }
    this.sampleBuffers.set(0, hornBuf);

    // 2. DUB LASER SIREN (Exponential sweep with LFO modulation)
    const laserSec = 0.9;
    const laserBuf = this.ctx.createBuffer(2, Math.floor(sr * laserSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = laserBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const lfo = Math.sin(2 * Math.PI * 14 * t);
        const baseFreq = 2600 * Math.exp(-t * 5.5) + 180 + lfo * 120;
        const env = Math.exp(-t * 2.8);
        const osc = Math.sin(2 * Math.PI * baseFreq * t) + 0.3 * Math.sin(4 * Math.PI * baseFreq * t);
        data[i] = Math.tanh(osc * 1.4) * env * 0.88;
      }
    }
    this.sampleBuffers.set(1, laserBuf);

    // 3. 808 SUB BOOM (Heavy distorted sub drop)
    const boomSec = 1.6;
    const boomBuf = this.ctx.createBuffer(2, Math.floor(sr * boomSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = boomBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const freq = 135 * Math.exp(-t * 5.0) + 34;
        const env = Math.exp(-t * 1.6);
        const sat = Math.tanh(Math.sin(2 * Math.PI * freq * t) * 1.8);
        data[i] = sat * env * 0.95;
      }
    }
    this.sampleBuffers.set(2, boomBuf);

    // 4. REAL VINYL SCRATCH CHIRP (Bi-directional forward-back slice)
    const scratchSec = 0.45;
    const scratchBuf = this.ctx.createBuffer(2, Math.floor(sr * scratchSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = scratchBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        // Two-stroke scratch: forward (0 - 0.22s) and backward (0.22 - 0.45s)
        const isBack = t > 0.22;
        const phase = isBack ? (0.45 - t) / 0.23 : t / 0.22;
        const scratchFreq = 350 + Math.sin(phase * Math.PI) * 1400;
        const noise = (Math.random() * 2 - 1) * 0.25;
        const env = Math.sin((t / scratchSec) * Math.PI);
        const tone = Math.sin(2 * Math.PI * scratchFreq * t);
        data[i] = Math.tanh((tone * 0.75 + noise) * 1.6) * env * 0.85;
      }
    }
    this.sampleBuffers.set(3, scratchBuf);

    // 5. DROP BASS / SUB GLIDE
    const dropSec = 0.8;
    const dropBuf = this.ctx.createBuffer(2, Math.floor(sr * dropSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = dropBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const freq = 240 * Math.exp(-t * 4.0) + 40;
        const env = Math.exp(-t * 2.5);
        data[i] = Math.tanh(Math.sin(2 * Math.PI * freq * t) * 2.2) * env * 0.9;
      }
    }
    this.sampleBuffers.set(4, dropBuf);

    // 6. CLUB KICK (909 Punch with 55Hz Thump)
    const kickSec = 0.45;
    const kickBuf = this.ctx.createBuffer(2, Math.floor(sr * kickSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = kickBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const freq = 180 * Math.exp(-t * 26) + 48;
        const env = Math.exp(-t * 7.5);
        const click = i < 120 ? (Math.random() - 0.5) * 0.6 : 0;
        data[i] = Math.tanh((Math.sin(2 * Math.PI * freq * t) + click) * 1.5) * env * 0.95;
      }
    }
    this.sampleBuffers.set(5, kickBuf);

    // 7. SNARE CLAP (Layered 808 Clap + Tight Snare Body)
    const snareSec = 0.38;
    const snareBuf = this.ctx.createBuffer(2, Math.floor(sr * snareSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = snareBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const body = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 18);
        // Pre-clap bursts at 0ms, 12ms, 24ms
        let clapBurst = 0;
        [0, 0.012, 0.024].forEach((burstTime) => {
          if (t >= burstTime) {
            clapBurst += (Math.random() * 2 - 1) * Math.exp(-(t - burstTime) * 80);
          }
        });
        const mainNoise = (Math.random() * 2 - 1) * Math.exp(-t * 11);
        data[i] = Math.tanh((body * 0.6 + clapBurst * 0.4 + mainNoise * 0.7) * 1.3) * 0.88;
      }
    }
    this.sampleBuffers.set(6, snareBuf);

    // 8. HAT ROLL (Crisp 909 Open/Closed Hat)
    const hatSec = 0.25;
    const hatBuf = this.ctx.createBuffer(2, Math.floor(sr * hatSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = hatBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        // 6-oscillator metallic inharmonic cluster
        const metal = (Math.sin(2 * Math.PI * 2800 * t) +
                       Math.sin(2 * Math.PI * 3420 * t) +
                       Math.sin(2 * Math.PI * 4100 * t) +
                       Math.sin(2 * Math.PI * 5200 * t) +
                       (Math.random() * 2 - 1) * 1.5);
        const env = Math.exp(-t * 22);
        data[i] = Math.tanh(metal * 0.5) * env * 0.75;
      }
    }
    this.sampleBuffers.set(7, hatBuf);
  }
}

export const samplerEngine = new SamplerEngine();
