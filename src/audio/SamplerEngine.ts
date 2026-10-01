/**
 * Pro 8-Slot DJ Sampler & Soundboard Engine (VirtualDJ & Mixxx Architecture)
 * - Authentic studio-grade audio samples (Kingston Airhorn, Dub Siren, 808 Boom, Vinyl Scratch, Rewind, Lil Jon Yeah, Gunshot, Damn Son)
 * - Multiple Sound Banks (Reggae Soundclash, Hip-Hop Trap, Custom User Bank)
 * - VirtualDJ-style Trigger Modes: One-Shot (Stutter), Hold (Gate), Toggle (On/Off), Loop
 * - Mixxx-style Quantize / Beat-Sync to Master Deck
 * - Per-pad volume, pitch tuning (-12 to +12 semitones), and master sampler fader
 * - Instant drag & drop sample loading with persistence
 */

import { SamplerSlot, SamplerTriggerMode, SamplerBankPreset } from '../types/dj';
import { storageCache } from '../services/StorageCacheService';

export interface BankDefinition {
  id: SamplerBankPreset;
  title: string;
  slots: Omit<SamplerSlot, 'isPlaying'>[];
}

export const SAMPLER_BANKS: Record<SamplerBankPreset, BankDefinition> = {
  reggae_soundclash: {
    id: 'reggae_soundclash',
    title: 'Soundclash & Reggae (Kingston Drops)',
    slots: [
      { id: 0, name: 'AIRHORN', color: '#ff2e88', volume: 0.95, sampleUrl: '/samples/airhorn.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
      { id: 1, name: 'DUB SIREN', color: '#00f0ff', volume: 0.90, sampleUrl: '/samples/siren.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
      { id: 2, name: '808 BOOM', color: '#a855f7', volume: 1.0, sampleUrl: '/samples/boom.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
      { id: 3, name: 'VINYL SCRATCH', color: '#f59e0b', volume: 0.85, sampleUrl: '/samples/scratch.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
      { id: 4, name: 'DJ REWIND', color: '#ef4444', volume: 0.90, sampleUrl: '/samples/rewind.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
      { id: 5, name: 'LASER SHOT', color: '#10b981', volume: 0.85, sampleUrl: '/samples/laser.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
      { id: 6, name: 'GUNSHOT', color: '#3b82f6', volume: 0.90, sampleUrl: '/samples/gunshot.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
      { id: 7, name: 'DAMN SON', color: '#eab308', volume: 0.95, sampleUrl: '/samples/damn_son.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
    ],
  },
  hiphop_trap: {
    id: 'hiphop_trap',
    title: 'Hip-Hop & Trap (Studio Anthems)',
    slots: [
      { id: 0, name: '808 SUB', color: '#a855f7', volume: 1.0, sampleUrl: '/samples/boom.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
      { id: 1, name: 'SCRATCH', color: '#f59e0b', volume: 0.85, sampleUrl: '/samples/scratch.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
      { id: 2, name: 'YEAH! VOX', color: '#06b6d4', volume: 0.95, sampleUrl: '/samples/yeah.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
      { id: 3, name: 'GUNSHOT', color: '#3b82f6', volume: 0.90, sampleUrl: '/samples/gunshot.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
      { id: 4, name: 'AIRHORN', color: '#ff2e88', volume: 0.95, sampleUrl: '/samples/airhorn.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
      { id: 5, name: 'DAMN SON', color: '#eab308', volume: 0.95, sampleUrl: '/samples/damn_son.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
      { id: 6, name: 'SPINBACK', color: '#ef4444', volume: 0.90, sampleUrl: '/samples/rewind.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
      { id: 7, name: 'LASER FX', color: '#10b981', volume: 0.85, sampleUrl: '/samples/laser.mp3', triggerMode: 'one_shot', pitchSemitones: 0 },
    ],
  },
  custom: {
    id: 'custom',
    title: 'Custom User Bank (Drag & Drop)',
    slots: [
      { id: 0, name: 'SLOT 1', color: '#ff2e88', volume: 0.9, triggerMode: 'one_shot', pitchSemitones: 0, isCustom: true },
      { id: 1, name: 'SLOT 2', color: '#00f0ff', volume: 0.9, triggerMode: 'one_shot', pitchSemitones: 0, isCustom: true },
      { id: 2, name: 'SLOT 3', color: '#a855f7', volume: 0.9, triggerMode: 'one_shot', pitchSemitones: 0, isCustom: true },
      { id: 3, name: 'SLOT 4', color: '#f59e0b', volume: 0.9, triggerMode: 'one_shot', pitchSemitones: 0, isCustom: true },
      { id: 4, name: 'SLOT 5', color: '#ef4444', volume: 0.9, triggerMode: 'one_shot', pitchSemitones: 0, isCustom: true },
      { id: 5, name: 'SLOT 6', color: '#10b981', volume: 0.9, triggerMode: 'one_shot', pitchSemitones: 0, isCustom: true },
      { id: 6, name: 'SLOT 7', color: '#3b82f6', volume: 0.9, triggerMode: 'one_shot', pitchSemitones: 0, isCustom: true },
      { id: 7, name: 'SLOT 8', color: '#eab308', volume: 0.9, triggerMode: 'one_shot', pitchSemitones: 0, isCustom: true },
    ],
  },
};

export class SamplerEngine {
  private ctx: AudioContext | null = null;
  private outputNode: GainNode | null = null;
  private sampleBuffers: Map<number, AudioBuffer> = new Map();
  private activeSources: Map<number, AudioBufferSourceNode> = new Map();
  private currentBank: SamplerBankPreset = 'reggae_soundclash';
  private quantizeEnabled: boolean = false;
  private masterBpm: number = 126.0;
  private slots: SamplerSlot[] = [];
  private listeners: Set<(slots: SamplerSlot[]) => void> = new Set();
  private bankListeners: Set<(bank: SamplerBankPreset) => void> = new Set();
  private quantizeListeners: Set<(quantize: boolean) => void> = new Set();

  constructor() {
    this.slots = SAMPLER_BANKS.reggae_soundclash.slots.map((s) => ({
      ...s,
      isPlaying: false,
    }));
  }

  public init(ctx: AudioContext, masterNode: AudioNode) {
    if (this.ctx) return;
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.outputNode.gain.setValueAtTime(0.9, ctx.currentTime);
    this.outputNode.connect(masterNode);

    // Restore saved bank preset
    storageCache.getSetting<SamplerBankPreset>('dj_sampler_bank', 'reggae_soundclash').then((savedBank) => {
      if (savedBank && SAMPLER_BANKS[savedBank]) {
        this.setBank(savedBank);
      } else {
        this.loadCurrentBankSamples();
      }
    });
  }

  public subscribe(cb: (slots: SamplerSlot[]) => void): () => void {
    this.listeners.add(cb);
    cb([...this.slots]);
    return () => this.listeners.delete(cb);
  }

  public onBankChange(cb: (bank: SamplerBankPreset) => void): () => void {
    this.bankListeners.add(cb);
    cb(this.currentBank);
    return () => this.bankListeners.delete(cb);
  }

  public onQuantizeChange(cb: (quantize: boolean) => void): () => void {
    this.quantizeListeners.add(cb);
    cb(this.quantizeEnabled);
    return () => this.quantizeListeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb([...this.slots]));
  }

  public getCurrentBank(): SamplerBankPreset {
    return this.currentBank;
  }

  public setBank(bankId: SamplerBankPreset) {
    if (!SAMPLER_BANKS[bankId]) return;
    this.stopAll();
    this.currentBank = bankId;
    storageCache.setSetting('dj_sampler_bank', bankId);
    this.slots = SAMPLER_BANKS[bankId].slots.map((s) => ({
      ...s,
      isPlaying: false,
    }));
    this.bankListeners.forEach((cb) => cb(this.currentBank));
    this.loadCurrentBankSamples();
    this.notify();
  }

  public setQuantize(enabled: boolean) {
    this.quantizeEnabled = enabled;
    this.quantizeListeners.forEach((cb) => cb(this.quantizeEnabled));
  }

  public isQuantizeEnabled(): boolean {
    return this.quantizeEnabled;
  }

  public setMasterBpm(bpm: number) {
    if (bpm > 0) this.masterBpm = bpm;
  }

  public setMasterVolume(vol: number) {
    if (this.outputNode && this.ctx) {
      const v = Math.max(0, Math.min(1.5, vol));
      this.outputNode.gain.setValueAtTime(v, this.ctx.currentTime);
    }
  }

  /**
   * Load real MP3 audio buffers for the current sound bank.
   * If network/fetch fails, transparently synthesizes fallback audio so sound never drops.
   */
  private async loadCurrentBankSamples() {
    if (!this.ctx) return;
    this.sampleBuffers.clear();

    const baseUrl = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
      ? window.location.origin
      : 'http://127.0.0.1:8088';

    for (const slot of this.slots) {
      if (slot.sampleUrl) {
        try {
          const fetchUrl = slot.sampleUrl.startsWith('http') || slot.sampleUrl.startsWith('data:') || slot.sampleUrl.startsWith('blob:')
            ? slot.sampleUrl
            : `${baseUrl}${slot.sampleUrl.startsWith('/') ? '' : '/'}${slot.sampleUrl}`;
          const res = await fetch(fetchUrl);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const decoded = await this.ctx.decodeAudioData(arrayBuffer);
            this.sampleBuffers.set(slot.id, decoded);
            slot.duration = decoded.duration;
            continue;
          }
        } catch (err) {
          console.warn(`[SamplerEngine] Could not fetch ${slot.sampleUrl}, generating synthetic fallback:`, err);
        }
      }
      // If no sampleUrl or fetch failed, synthesize fallback
      const fallback = this.synthesizeFallbackSample(slot.id);
      if (fallback) {
        this.sampleBuffers.set(slot.id, fallback);
        slot.duration = fallback.duration;
      }
    }
    this.notify();
  }

  /**
   * Trigger slot with VirtualDJ trigger modes:
   * 'one_shot' (stutter): restart every press
   * 'hold' (gate): plays on down, stops on up
   * 'toggle': tap to start, tap to stop
   * 'loop': continuous beatloop until pressed again
   */
  public triggerSlot(id: number, action: 'down' | 'up' | 'toggle' = 'down') {
    if (!this.ctx || !this.outputNode) return;
    const slot = this.slots[id];
    if (!slot) return;

    const buffer = this.sampleBuffers.get(id);
    if (!buffer) {
      // Lazy load/synthesize if buffer not yet present
      const fb = this.synthesizeFallbackSample(id);
      if (fb) this.sampleBuffers.set(id, fb);
    }

    const currentBuffer = this.sampleBuffers.get(id);
    if (!currentBuffer) return;

    const mode: SamplerTriggerMode = slot.triggerMode || 'one_shot';

    // Handle button release for HOLD (gate) mode
    if (action === 'up') {
      if (mode === 'hold') {
        this.stopSlot(id);
      }
      return;
    }

    // Handle TOGGLE / LOOP stopping if already playing
    if ((mode === 'toggle' || mode === 'loop') && slot.isPlaying) {
      this.stopSlot(id);
      return;
    }

    // Stop active source if already playing (stutter restart)
    const existing = this.activeSources.get(id);
    if (existing) {
      try { existing.stop(); } catch {}
      this.activeSources.delete(id);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = currentBuffer;

    // Apply pitch semitones (time/speed multiplier)
    const semitones = slot.pitchSemitones || 0;
    source.playbackRate.value = Math.pow(2, semitones / 12);

    if (mode === 'loop') {
      source.loop = true;
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(slot.volume, this.ctx.currentTime);

    source.connect(gain);
    gain.connect(this.outputNode);

    source.onended = () => {
      if (this.activeSources.get(id) === source) {
        this.slots[id].isPlaying = false;
        this.activeSources.delete(id);
        this.notify();
      }
    };

    // Calculate Quantize start time (snap to next 1/4 beat of master BPM)
    let startTime = this.ctx.currentTime;
    if (this.quantizeEnabled && this.masterBpm > 0) {
      const beatSec = 60.0 / this.masterBpm;
      const subBeat = beatSec / 4; // 1/16th quantize grid
      const rem = startTime % subBeat;
      startTime = startTime + (subBeat - rem);
    }

    try {
      source.start(startTime);
      this.activeSources.set(id, source);
      this.slots[id].isPlaying = true;
      this.notify();
    } catch (e) {
      console.warn(`[SamplerEngine] Error starting slot ${id}:`, e);
    }
  }

  public stopSlot(id: number) {
    const source = this.activeSources.get(id);
    if (source) {
      try { source.stop(); } catch {}
      this.activeSources.delete(id);
      if (this.slots[id]) {
        this.slots[id].isPlaying = false;
      }
      this.notify();
    }
  }

  public stopAll() {
    this.activeSources.forEach((source) => {
      try { source.stop(); } catch {}
    });
    this.activeSources.clear();
    this.slots.forEach((s) => (s.isPlaying = false));
    this.notify();
  }

  public setSlotVolume(id: number, volume: number) {
    if (this.slots[id]) {
      this.slots[id].volume = Math.max(0, Math.min(1.5, volume));
      this.notify();
    }
  }

  public setSlotPitch(id: number, semitones: number) {
    if (this.slots[id]) {
      this.slots[id].pitchSemitones = Math.max(-12, Math.min(12, semitones));
      const source = this.activeSources.get(id);
      if (source) {
        source.playbackRate.value = Math.pow(2, this.slots[id].pitchSemitones / 12);
      }
      this.notify();
    }
  }

  public setSlotTriggerMode(id: number, mode: SamplerTriggerMode) {
    if (this.slots[id]) {
      this.slots[id].triggerMode = mode;
      this.notify();
    }
  }

  public async loadCustomSample(id: number, arrayBuffer: ArrayBuffer, name: string): Promise<boolean> {
    if (!this.ctx) return false;
    try {
      const audioBuf = await this.ctx.decodeAudioData(arrayBuffer);
      this.sampleBuffers.set(id, audioBuf);
      this.slots[id].name = name.toUpperCase().slice(0, 14);
      this.slots[id].isCustom = true;
      this.slots[id].duration = audioBuf.duration;
      this.notify();
      return true;
    } catch (err) {
      console.error('[SamplerEngine] Failed to decode custom sample:', err);
      return false;
    }
  }

  public getSlots(): SamplerSlot[] {
    return [...this.slots];
  }

  // Pure Web Audio mathematical synthesis fallback
  private synthesizeFallbackSample(id: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const sr = this.ctx.sampleRate;

    // Default: punchy club drop
    const dur = id === 0 ? 1.4 : id === 2 ? 1.6 : 0.8;
    const buf = this.ctx.createBuffer(2, Math.floor(sr * dur), sr);

    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        if (id === 0) {
          // Airhorn multi-tone
          const f0 = 466.16 * (1.0 - (t / dur) * 0.05);
          const wave = Math.sin(2 * Math.PI * f0 * t) + 0.6 * Math.sin(2 * Math.PI * f0 * 1.5 * t);
          data[i] = Math.tanh(wave * 2.0) * Math.min(1.0, (dur - t) / 0.1) * 0.9;
        } else if (id === 2) {
          // 808 Boom
          const freq = 135 * Math.exp(-t * 5.0) + 34;
          data[i] = Math.tanh(Math.sin(2 * Math.PI * freq * t) * 1.8) * Math.exp(-t * 1.6) * 0.95;
        } else {
          // Synth chirp / drop
          const freq = 800 * Math.exp(-t * 8.0) + 120;
          data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 4.0) * 0.85;
        }
      }
    }
    return buf;
  }
}

export const samplerEngine = new SamplerEngine();
