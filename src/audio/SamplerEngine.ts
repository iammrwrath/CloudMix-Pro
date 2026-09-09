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

    // 1. AIRHORN (Layered brass blip with vibrato)
    const hornSec = 0.8;
    const hornBuf = this.ctx.createBuffer(2, Math.floor(sr * hornSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = hornBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const env = Math.exp(-t * 2.2);
        const f1 = 440 + Math.sin(t * 30) * 8;
        const f2 = 554.37 + Math.sin(t * 30) * 8;
        const f3 = 659.25 + Math.sin(t * 30) * 8;
        // Sawtooth-like brass synthesis
        const wave = (Math.sin(2 * Math.PI * f1 * t) * 0.4 +
                      Math.sin(2 * Math.PI * f2 * t) * 0.35 +
                      Math.sin(2 * Math.PI * f3 * t) * 0.35 +
                      (Math.random() - 0.5) * 0.05);
        data[i] = wave * env * 0.8;
      }
    }
    this.sampleBuffers.set(0, hornBuf);

    // 2. LASER SIREN (Fast downward frequency sweep)
    const laserSec = 0.6;
    const laserBuf = this.ctx.createBuffer(2, Math.floor(sr * laserSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = laserBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const freq = 1800 * Math.exp(-t * 8) + 100;
        const env = Math.exp(-t * 4);
        data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.85;
      }
    }
    this.sampleBuffers.set(1, laserBuf);

    // 3. 808 BOOM (Deep sine drop with pitch glide)
    const boomSec = 1.2;
    const boomBuf = this.ctx.createBuffer(2, Math.floor(sr * boomSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = boomBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const freq = 140 * Math.exp(-t * 4.5) + 38;
        const env = Math.exp(-t * 2.5);
        data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.9;
      }
    }
    this.sampleBuffers.set(2, boomBuf);

    // 4. VINYL SCRATCH (Modulated noise chirp)
    const scratchSec = 0.35;
    const scratchBuf = this.ctx.createBuffer(2, Math.floor(sr * scratchSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = scratchBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const mod = Math.sin(2 * Math.PI * 18 * t);
        const env = Math.sin((i / data.length) * Math.PI);
        data[i] = ((Math.random() * 2 - 1) * 0.4 + Math.sin(2 * Math.PI * (600 + mod * 400) * t) * 0.6) * env * 0.8;
      }
    }
    this.sampleBuffers.set(3, scratchBuf);

    // 5. DROP BASS / VOX ACCENT
    const dropSec = 0.5;
    const dropBuf = this.ctx.createBuffer(2, Math.floor(sr * dropSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = dropBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const freq = 220 * Math.exp(-t * 3.5) + 45;
        const env = Math.exp(-t * 4.0);
        data[i] = Math.tanh(Math.sin(2 * Math.PI * freq * t) * 1.5) * env * 0.85;
      }
    }
    this.sampleBuffers.set(4, dropBuf);

    // 6. CLUB KICK (Tight punchy 909 kick)
    const kickSec = 0.4;
    const kickBuf = this.ctx.createBuffer(2, Math.floor(sr * kickSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = kickBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const freq = 160 * Math.exp(-t * 22) + 50;
        const env = Math.exp(-t * 9);
        const click = i < 80 ? (Math.random() - 0.5) * 0.5 : 0;
        data[i] = (Math.sin(2 * Math.PI * freq * t) + click) * env * 0.9;
      }
    }
    this.sampleBuffers.set(5, kickBuf);

    // 7. SNARE CLAP (Noise burst with 200Hz body)
    const snareSec = 0.3;
    const snareBuf = this.ctx.createBuffer(2, Math.floor(sr * snareSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = snareBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const body = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 20);
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 12);
        data[i] = (body * 0.5 + noise * 0.6) * 0.85;
      }
    }
    this.sampleBuffers.set(6, snareBuf);

    // 8. HAT ROLL (Crisp metallic hi-hat)
    const hatSec = 0.2;
    const hatBuf = this.ctx.createBuffer(2, Math.floor(sr * hatSec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = hatBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const noise = Math.random() * 2 - 1;
        const env = Math.exp(-t * 30);
        data[i] = noise * env * 0.7;
      }
    }
    this.sampleBuffers.set(7, hatBuf);
  }
}

export const samplerEngine = new SamplerEngine();
