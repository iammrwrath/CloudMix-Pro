import { DeckId, FXType, FXUnit, HotCue, NeuralTransitionMode, StemState, TrackMetadata } from '../types/dj';
import { mixRecorder } from './MixRecorder';
import { samplerEngine } from './SamplerEngine';

export interface DeckAudioNodes {
  deckId: DeckId;
  gainTrim: GainNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  filterLpf: BiquadFilterNode;
  filterHpf: BiquadFilterNode;
  // Neural Mix Stem Separation Nodes
  stemDrumsFilter: BiquadFilterNode;
  stemDrumsGain: GainNode;
  stemVocalsHpf: BiquadFilterNode;
  stemVocalsLpf: BiquadFilterNode;
  stemVocalsGain: GainNode;
  stemHarmonicsFilter: BiquadFilterNode;
  stemHarmonicsGain: GainNode;
  stemState: StemState;
  // Crossfader stem automation nodes
  stemDrumsXfaderGain: GainNode;
  stemVocalsXfaderGain: GainNode;
  stemHarmonicsXfaderGain: GainNode;
  channelFader: GainNode;
  // Studio Multi-FX Rack Nodes
  fxInputNode: GainNode;
  fxDryNode: GainNode;
  fxWetNode: GainNode;
  fxDelayNode: DelayNode;
  fxDelayFeedback: GainNode;
  fxDelayFilter: BiquadFilterNode;
  fxConvolverNode: ConvolverNode;
  fxFlangerDelay: DelayNode;
  fxFlangerDepth: GainNode;
  fxFlangerOsc: OscillatorNode | null;
  fxBitcrusherCurve: WaveShaperNode;
  fxFilterSweep: BiquadFilterNode;
  crossfaderGain: GainNode;
  cueGain: GainNode;
  analyser: AnalyserNode;
  analyserData: Uint8Array;
  sourceNode: AudioBufferSourceNode | null;
  audioBuffer: AudioBuffer | null;
  startTime: number;
  pauseOffset: number;
  playbackRate: number;
  isPlaying: boolean;
  loopRegion: { start: number; end: number } | null;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private masterAnalyserData: Uint8Array = new Uint8Array(32);
  private headphoneGain: GainNode | null = null;

  private decks: Map<DeckId, DeckAudioNodes> = new Map();
  private crossfaderVal: number = 0.0; // -1.0 (A) to +1.0 (B)
  private crossfaderCurve: 'smooth' | 'linear' | 'scratch' = 'linear';
  private neuralTransitionMode: NeuralTransitionMode = 'standard';

  constructor() {
    // Lazy initialized on first user interaction to comply with browser audio autoplay policy
  }

  public init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx({ latencyHint: 'interactive' });

    // Master bus & Limiter
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
    this.masterLimiter.knee.setValueAtTime(3.0, this.ctx.currentTime);
    this.masterLimiter.ratio.setValueAtTime(20.0, this.ctx.currentTime);
    this.masterLimiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.masterLimiter.release.setValueAtTime(0.05, this.ctx.currentTime);

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 64;
    this.masterAnalyserData = new Uint8Array(this.masterAnalyser.frequencyBinCount);

    this.headphoneGain = this.ctx.createGain();
    this.headphoneGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

    // Wire master chain
    this.masterGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);

    // Initialize Mix Recorder & Sampler Engine on master bus
    mixRecorder.init(this.ctx, this.masterLimiter);
    samplerEngine.init(this.ctx, this.masterGain);

    // Setup Decks A and B
    this.setupDeck('A');
    this.setupDeck('B');
  }

  private setupDeck(deckId: DeckId) {
    if (!this.ctx || !this.masterGain) return;

    const gainTrim = this.ctx.createGain();
    gainTrim.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // 3-Band Isolator EQ (with kill capabilities down to -70dB)
    const eqLow = this.ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.setValueAtTime(250, this.ctx.currentTime);
    eqLow.gain.setValueAtTime(0, this.ctx.currentTime);

    const eqMid = this.ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.setValueAtTime(1000, this.ctx.currentTime);
    eqMid.Q.setValueAtTime(0.9, this.ctx.currentTime);
    eqMid.gain.setValueAtTime(0, this.ctx.currentTime);

    const eqHigh = this.ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.setValueAtTime(2500, this.ctx.currentTime);
    eqHigh.gain.setValueAtTime(0, this.ctx.currentTime);

    // Dual resonant filter (HPF / LPF Quick Color Filter)
    const filterLpf = this.ctx.createBiquadFilter();
    filterLpf.type = 'lowpass';
    filterLpf.frequency.setValueAtTime(20000, this.ctx.currentTime);
    filterLpf.Q.setValueAtTime(1.0, this.ctx.currentTime);

    const filterHpf = this.ctx.createBiquadFilter();
    filterHpf.type = 'highpass';
    filterHpf.frequency.setValueAtTime(20, this.ctx.currentTime);
    filterHpf.Q.setValueAtTime(1.0, this.ctx.currentTime);

    // ==========================================
    // Real-Time Neural Mix 3-Way Crossover DSP
    // ==========================================
    // 1. Rhythm Stem (Drums & Sub-bass: < 280Hz)
    const stemDrumsFilter = this.ctx.createBiquadFilter();
    stemDrumsFilter.type = 'lowpass';
    stemDrumsFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
    stemDrumsFilter.Q.setValueAtTime(0.707, this.ctx.currentTime);
    const stemDrumsGain = this.ctx.createGain();
    stemDrumsGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    const stemDrumsXfaderGain = this.ctx.createGain();
    stemDrumsXfaderGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // 2. Vocal Stem (Formant Crossover Bandpass: 280Hz - 2800Hz)
    const stemVocalsHpf = this.ctx.createBiquadFilter();
    stemVocalsHpf.type = 'highpass';
    stemVocalsHpf.frequency.setValueAtTime(280, this.ctx.currentTime);
    stemVocalsHpf.Q.setValueAtTime(0.707, this.ctx.currentTime);
    const stemVocalsLpf = this.ctx.createBiquadFilter();
    stemVocalsLpf.type = 'lowpass';
    stemVocalsLpf.frequency.setValueAtTime(2800, this.ctx.currentTime);
    stemVocalsLpf.Q.setValueAtTime(0.707, this.ctx.currentTime);
    const stemVocalsGain = this.ctx.createGain();
    stemVocalsGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    const stemVocalsXfaderGain = this.ctx.createGain();
    stemVocalsXfaderGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // 3. Melodic / Harmonics Stem (Synths, Keys, Strings: > 2800Hz)
    const stemHarmonicsFilter = this.ctx.createBiquadFilter();
    stemHarmonicsFilter.type = 'highpass';
    stemHarmonicsFilter.frequency.setValueAtTime(2800, this.ctx.currentTime);
    stemHarmonicsFilter.Q.setValueAtTime(0.707, this.ctx.currentTime);
    const stemHarmonicsGain = this.ctx.createGain();
    stemHarmonicsGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    const stemHarmonicsXfaderGain = this.ctx.createGain();
    stemHarmonicsXfaderGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // Channel Volume Fader
    const channelFader = this.ctx.createGain();
    channelFader.gain.setValueAtTime(0.9, this.ctx.currentTime);

    // Crossfader Bus Gain
    const crossfaderGain = this.ctx.createGain();
    crossfaderGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // Headphone Cue PFL Gain
    const cueGain = this.ctx.createGain();
    cueGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Analyser for metering
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 64;
    const analyserData = new Uint8Array(analyser.frequencyBinCount);

    // Connect Primary EQ Chain:
    // Source -> Trim -> Low EQ -> Mid EQ -> High EQ -> LPF -> HPF
    gainTrim.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(filterLpf);
    filterLpf.connect(filterHpf);

    // Split filterHpf into 3 Parallel Neural Stems:
    // Stem 1: Drums / Bass
    filterHpf.connect(stemDrumsFilter);
    stemDrumsFilter.connect(stemDrumsGain);
    stemDrumsGain.connect(stemDrumsXfaderGain);
    stemDrumsXfaderGain.connect(channelFader);

    // Stem 2: Vocals
    filterHpf.connect(stemVocalsHpf);
    stemVocalsHpf.connect(stemVocalsLpf);
    stemVocalsLpf.connect(stemVocalsGain);
    stemVocalsGain.connect(stemVocalsXfaderGain);
    stemVocalsXfaderGain.connect(channelFader);

    // Stem 3: Harmonics / Melody
    filterHpf.connect(stemHarmonicsFilter);
    stemHarmonicsFilter.connect(stemHarmonicsGain);
    stemHarmonicsGain.connect(stemHarmonicsXfaderGain);
    stemHarmonicsXfaderGain.connect(channelFader);

    // Channel Fader -> Analyser -> FX Rack -> Crossfader Bus -> Master Bus
    const fxInputNode = this.ctx.createGain();
    const fxDryNode = this.ctx.createGain();
    const fxWetNode = this.ctx.createGain();
    fxDryNode.gain.setValueAtTime(1.0, this.ctx.currentTime);
    fxWetNode.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // 1. Echo / Delay
    const fxDelayNode = this.ctx.createDelay(4.0);
    fxDelayNode.delayTime.setValueAtTime(0.35, this.ctx.currentTime);
    const fxDelayFeedback = this.ctx.createGain();
    fxDelayFeedback.gain.setValueAtTime(0.4, this.ctx.currentTime);
    const fxDelayFilter = this.ctx.createBiquadFilter();
    fxDelayFilter.type = 'lowpass';
    fxDelayFilter.frequency.setValueAtTime(2500, this.ctx.currentTime);
    fxDelayNode.connect(fxDelayFeedback);
    fxDelayFeedback.connect(fxDelayFilter);
    fxDelayFilter.connect(fxDelayNode);

    // 2. Reverb (Synthesized algorithmic impulse response)
    const fxConvolverNode = this.ctx.createConvolver();
    const revSamples = Math.floor(this.ctx.sampleRate * 2.0);
    const revBuffer = this.ctx.createBuffer(2, revSamples, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = revBuffer.getChannelData(c);
      for (let i = 0; i < revSamples; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.45));
      }
    }
    fxConvolverNode.buffer = revBuffer;

    // 3. Flanger
    const fxFlangerDelay = this.ctx.createDelay(0.05);
    fxFlangerDelay.delayTime.setValueAtTime(0.003, this.ctx.currentTime);
    const fxFlangerDepth = this.ctx.createGain();
    fxFlangerDepth.gain.setValueAtTime(0.002, this.ctx.currentTime);
    let fxFlangerOsc: OscillatorNode | null = null;
    try {
      fxFlangerOsc = this.ctx.createOscillator();
      fxFlangerOsc.type = 'sine';
      fxFlangerOsc.frequency.setValueAtTime(0.4, this.ctx.currentTime);
      fxFlangerOsc.connect(fxFlangerDepth);
      fxFlangerDepth.connect(fxFlangerDelay.delayTime);
      fxFlangerOsc.start();
    } catch {}

    // 4. Bitcrusher
    const fxBitcrusherCurve = this.ctx.createWaveShaper();
    const bcCurve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      bcCurve[i] = Math.round(x * 6) / 6;
    }
    fxBitcrusherCurve.curve = bcCurve;

    // 5. Filter Sweep
    const fxFilterSweep = this.ctx.createBiquadFilter();
    fxFilterSweep.type = 'bandpass';
    fxFilterSweep.frequency.setValueAtTime(1000, this.ctx.currentTime);
    fxFilterSweep.Q.setValueAtTime(3.5, this.ctx.currentTime);

    // Routing: channelFader -> analyser -> fxInputNode -> fxDryNode -> crossfaderGain
    channelFader.connect(analyser);
    analyser.connect(fxInputNode);
    fxInputNode.connect(fxDryNode);
    fxDryNode.connect(crossfaderGain);
    fxWetNode.connect(crossfaderGain);
    crossfaderGain.connect(this.masterGain);

    if (this.headphoneGain) {
      channelFader.connect(cueGain);
      cueGain.connect(this.headphoneGain);
    }

    const stemState: StemState = {
      vocals: 1.0,
      harmonics: 1.0,
      drums: 1.0,
      vocalsMuted: false,
      harmonicsMuted: false,
      drumsMuted: false,
      vocalsSolo: false,
      harmonicsSolo: false,
      drumsSolo: false,
    };

    const deckNodes: DeckAudioNodes = {
      deckId,
      gainTrim,
      eqLow,
      eqMid,
      eqHigh,
      filterLpf,
      filterHpf,
      stemDrumsFilter,
      stemDrumsGain,
      stemVocalsHpf,
      stemVocalsLpf,
      stemVocalsGain,
      stemHarmonicsFilter,
      stemHarmonicsGain,
      stemState,
      stemDrumsXfaderGain,
      stemVocalsXfaderGain,
      stemHarmonicsXfaderGain,
      channelFader,
      fxInputNode,
      fxDryNode,
      fxWetNode,
      fxDelayNode,
      fxDelayFeedback,
      fxDelayFilter,
      fxConvolverNode,
      fxFlangerDelay,
      fxFlangerDepth,
      fxFlangerOsc,
      fxBitcrusherCurve,
      fxFilterSweep,
      crossfaderGain,
      cueGain,
      analyser,
      analyserData,
      sourceNode: null,
      audioBuffer: null,
      startTime: 0,
      pauseOffset: 0,
      playbackRate: 1.0,
      isPlaying: false,
      loopRegion: null,
    };

    this.decks.set(deckId, deckNodes);
    this.updateCrossfaderGains();
  }

  public async resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    this.init();
    if (!this.ctx) throw new Error("AudioContext not initialized");
    return await this.ctx.decodeAudioData(arrayBuffer);
  }

  public loadTrackToDeck(deckId: DeckId, buffer: AudioBuffer) {
    this.init();
    const deck = this.decks.get(deckId);
    if (!deck) return;

    if (deck.isPlaying) {
      this.pauseDeck(deckId);
    }

    deck.audioBuffer = buffer;
    deck.pauseOffset = 0;
    deck.startTime = 0;
    deck.loopRegion = null;
  }

  public playDeck(deckId: DeckId, startOffsetSec?: number) {
    this.init();
    this.resumeContext();
    const deck = this.decks.get(deckId);
    if (!deck || !deck.audioBuffer || !this.ctx) return;

    if (deck.isPlaying && deck.sourceNode) {
      try { deck.sourceNode.stop(); } catch {}
    }

    const offset = startOffsetSec !== undefined ? startOffsetSec : deck.pauseOffset;
    const clampedOffset = Math.max(0, Math.min(offset, deck.audioBuffer.duration));

    const source = this.ctx.createBufferSource();
    source.buffer = deck.audioBuffer;
    source.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);

    // Looping if active
    if (deck.loopRegion) {
      source.loop = true;
      source.loopStart = deck.loopRegion.start;
      source.loopEnd = deck.loopRegion.end;
    }

    source.connect(deck.gainTrim);
    source.start(0, clampedOffset);

    deck.sourceNode = source;
    deck.startTime = this.ctx.currentTime - (clampedOffset / deck.playbackRate);
    deck.pauseOffset = clampedOffset;
    deck.isPlaying = true;

    source.onended = () => {
      // If stopped naturally at track end
      if (deck.isPlaying && this.ctx && (this.getCurrentTime(deckId) >= (deck.audioBuffer?.duration || 0) - 0.1)) {
        deck.isPlaying = false;
        deck.pauseOffset = 0;
      }
    };
  }

  public pauseDeck(deckId: DeckId) {
    const deck = this.decks.get(deckId);
    if (!deck || !deck.isPlaying) return;

    deck.pauseOffset = this.getCurrentTime(deckId);
    if (deck.sourceNode) {
      try {
        deck.sourceNode.stop();
        deck.sourceNode.disconnect();
      } catch {}
      deck.sourceNode = null;
    }
    deck.isPlaying = false;
  }

  public togglePlayPause(deckId: DeckId): boolean {
    const deck = this.decks.get(deckId);
    if (!deck) return false;
    if (deck.isPlaying) {
      this.pauseDeck(deckId);
      return false;
    } else {
      this.playDeck(deckId);
      return true;
    }
  }

  public seekDeck(deckId: DeckId, targetSec: number) {
    const deck = this.decks.get(deckId);
    if (!deck || !deck.audioBuffer) return;

    const clampedSec = Math.max(0, Math.min(targetSec, deck.audioBuffer.duration));
    if (deck.isPlaying) {
      this.playDeck(deckId, clampedSec);
    } else {
      deck.pauseOffset = clampedSec;
    }
  }

  public getCurrentTime(deckId: DeckId): number {
    const deck = this.decks.get(deckId);
    if (!deck) return 0;
    if (!deck.isPlaying || !this.ctx) return deck.pauseOffset;

    const elapsed = (this.ctx.currentTime - deck.startTime) * deck.playbackRate;
    if (deck.loopRegion && elapsed >= deck.loopRegion.end) {
      const loopLen = deck.loopRegion.end - deck.loopRegion.start;
      return deck.loopRegion.start + ((elapsed - deck.loopRegion.start) % loopLen);
    }
    return Math.max(0, elapsed);
  }

  public setPlaybackRate(deckId: DeckId, rate: number) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    deck.playbackRate = Math.max(0.1, Math.min(rate, 2.0));

    if (deck.isPlaying && deck.sourceNode) {
      // Adjust start time to maintain current playback position smoothly
      const currentPos = this.getCurrentTime(deckId);
      deck.sourceNode.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
      deck.startTime = this.ctx.currentTime - (currentPos / deck.playbackRate);
    }
  }

  // Live pitch bend (nudge forwards or backwards)
  public nudge(deckId: DeckId, factor: number) {
    const deck = this.decks.get(deckId);
    if (!deck || !deck.sourceNode || !this.ctx) return;
    deck.sourceNode.playbackRate.setValueAtTime(deck.playbackRate * factor, this.ctx.currentTime);
  }

  public releaseNudge(deckId: DeckId) {
    const deck = this.decks.get(deckId);
    if (!deck || !deck.sourceNode || !this.ctx) return;
    deck.sourceNode.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
  }

  // 3-Band Isolator EQ (-1.0 to +1.0)
  public setEQ(deckId: DeckId, band: 'low' | 'mid' | 'high', val: number, isKill: boolean = false) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;

    let targetGainDb = 0;
    if (isKill) {
      targetGainDb = -70; // Kill switch
    } else {
      // Map -1.0 to 0.0 -> -70dB to 0dB; 0.0 to 1.0 -> 0dB to +6dB
      if (val < 0) {
        targetGainDb = val * 70;
      } else {
        targetGainDb = val * 6;
      }
    }

    const node = band === 'low' ? deck.eqLow : band === 'mid' ? deck.eqMid : deck.eqHigh;
    node.gain.setTargetAtTime(targetGainDb, this.ctx.currentTime, 0.01);
  }

  // Color Filter (-1.0 LPF to +1.0 HPF)
  public setFilter(deckId: DeckId, filterVal: number) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;

    if (filterVal < 0) {
      // LPF active: sweep from 20000Hz down to 80Hz
      const minFreq = 80;
      const maxFreq = 20000;
      const expVal = Math.pow(1 + filterVal, 2.5); // 0 to 1
      const freq = minFreq + expVal * (maxFreq - minFreq);
      deck.filterLpf.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.01);
      deck.filterLpf.Q.setTargetAtTime(1.0 + Math.abs(filterVal) * 3.5, this.ctx.currentTime, 0.01);
      deck.filterHpf.frequency.setTargetAtTime(20, this.ctx.currentTime, 0.01);
    } else if (filterVal > 0) {
      // HPF active: sweep from 20Hz up to 10000Hz
      const minFreq = 20;
      const maxFreq = 10000;
      const expVal = Math.pow(filterVal, 2.5);
      const freq = minFreq + expVal * (maxFreq - minFreq);
      deck.filterHpf.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.01);
      deck.filterHpf.Q.setTargetAtTime(1.0 + filterVal * 3.5, this.ctx.currentTime, 0.01);
      deck.filterLpf.frequency.setTargetAtTime(20000, this.ctx.currentTime, 0.01);
    } else {
      // Neutral bypass
      deck.filterLpf.frequency.setTargetAtTime(20000, this.ctx.currentTime, 0.01);
      deck.filterHpf.frequency.setTargetAtTime(20, this.ctx.currentTime, 0.01);
    }
  }

  public setChannelVolume(deckId: DeckId, volume: number) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    deck.channelFader.gain.setTargetAtTime(Math.max(0, Math.min(volume, 1.0)), this.ctx.currentTime, 0.01);
  }

  public setTrimGain(deckId: DeckId, trim: number) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    deck.gainTrim.gain.setTargetAtTime(Math.max(0, Math.min(trim, 2.0)), this.ctx.currentTime, 0.01);
  }

  // Crossfader logic (-1.0 to +1.0)
  public setCrossfader(val: number, curve?: 'smooth' | 'linear' | 'scratch') {
    this.crossfaderVal = Math.max(-1.0, Math.min(val, 1.0));
    if (curve) this.crossfaderCurve = curve;
    this.updateCrossfaderGains();
  }

  public setNeuralTransitionMode(mode: NeuralTransitionMode) {
    this.neuralTransitionMode = mode;
    this.updateCrossfaderGains();
  }

  public getNeuralTransitionMode(): NeuralTransitionMode {
    return this.neuralTransitionMode;
  }

  // Neural Mix Stem Methods
  public setStemGain(deckId: DeckId, stem: 'vocals' | 'harmonics' | 'drums', val: number) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    const gain = Math.max(0, Math.min(val, 1.5));
    deck.stemState[stem] = gain;
    this.recalculateStemGains(deck);
  }

  public toggleStemMute(deckId: DeckId, stem: 'vocals' | 'harmonics' | 'drums'): boolean {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return false;
    const muteKey = `${stem}Muted` as 'vocalsMuted' | 'harmonicsMuted' | 'drumsMuted';
    deck.stemState[muteKey] = !deck.stemState[muteKey];
    this.recalculateStemGains(deck);
    return deck.stemState[muteKey];
  }

  public toggleStemSolo(deckId: DeckId, stem: 'vocals' | 'harmonics' | 'drums'): boolean {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return false;
    const soloKey = `${stem}Solo` as 'vocalsSolo' | 'harmonicsSolo' | 'drumsSolo';
    const isNowSolo = !deck.stemState[soloKey];
    deck.stemState.vocalsSolo = false;
    deck.stemState.harmonicsSolo = false;
    deck.stemState.drumsSolo = false;
    deck.stemState[soloKey] = isNowSolo;
    this.recalculateStemGains(deck);
    return isNowSolo;
  }

  public getStemState(deckId: DeckId): StemState | null {
    const deck = this.decks.get(deckId);
    return deck ? { ...deck.stemState } : null;
  }

  private recalculateStemGains(deck: DeckAudioNodes) {
    if (!this.ctx) return;
    const hasSolo = deck.stemState.vocalsSolo || deck.stemState.harmonicsSolo || deck.stemState.drumsSolo;

    const effVocals = deck.stemState.vocalsMuted
      ? 0
      : hasSolo
      ? (deck.stemState.vocalsSolo ? deck.stemState.vocals : 0)
      : deck.stemState.vocals;

    const effDrums = deck.stemState.drumsMuted
      ? 0
      : hasSolo
      ? (deck.stemState.drumsSolo ? deck.stemState.drums : 0)
      : deck.stemState.drums;

    const effHarmonics = deck.stemState.harmonicsMuted
      ? 0
      : hasSolo
      ? (deck.stemState.harmonicsSolo ? deck.stemState.harmonics : 0)
      : deck.stemState.harmonics;

    deck.stemVocalsGain.gain.setTargetAtTime(effVocals, this.ctx.currentTime, 0.01);
    deck.stemDrumsGain.gain.setTargetAtTime(effDrums, this.ctx.currentTime, 0.01);
    deck.stemHarmonicsGain.gain.setTargetAtTime(effHarmonics, this.ctx.currentTime, 0.01);
  }

  private updateCrossfaderGains() {
    if (!this.ctx) return;
    const deckA = this.decks.get('A');
    const deckB = this.decks.get('B');
    if (!deckA || !deckB) return;

    let gainA = 1.0;
    let gainB = 1.0;

    // Normalize val from [-1, 1] to [0, 1] where 0 is full A, 1 is full B
    const pos = (this.crossfaderVal + 1.0) / 2.0;

    if (this.crossfaderCurve === 'smooth') {
      // Equal power constant-loudness sine/cosine curve
      gainA = Math.cos(pos * (Math.PI / 2));
      gainB = Math.sin(pos * (Math.PI / 2));
    } else if (this.crossfaderCurve === 'scratch') {
      // Sharp cut for scratching: full volume up to center, cuts sharply near extreme edges
      gainA = pos < 0.95 ? 1.0 : (1.0 - pos) * 20;
      gainB = pos > 0.05 ? 1.0 : pos * 20;
    } else {
      // Linear crossfade
      gainA = pos <= 0.5 ? 1.0 : (1.0 - pos) * 2.0;
      gainB = pos >= 0.5 ? 1.0 : pos * 2.0;
    }

    deckA.crossfaderGain.gain.setTargetAtTime(gainA, this.ctx.currentTime, 0.01);
    deckB.crossfaderGain.gain.setTargetAtTime(gainB, this.ctx.currentTime, 0.01);

    // ==========================================
    // Neural Mix Crossfader Transition Automation
    // ==========================================
    let stemDrumsA = 1.0, stemVocalsA = 1.0, stemHarmonicsA = 1.0;
    let stemDrumsB = 1.0, stemVocalsB = 1.0, stemHarmonicsB = 1.0;

    if (this.neuralTransitionMode === 'bass_swap') {
      // Bass/Drums swap sharply across center (0.45 to 0.55), while Vocals/Melody blend smoothly
      stemDrumsA = pos < 0.45 ? 1.0 : pos > 0.55 ? 0.0 : (0.55 - pos) * 10.0;
      stemDrumsB = pos > 0.55 ? 1.0 : pos < 0.45 ? 0.0 : (pos - 0.45) * 10.0;
    } else if (this.neuralTransitionMode === 'vocal_swap') {
      // Vocals swap cleanly on phrase at center, rhythm and harmony blend continuously
      stemVocalsA = pos < 0.45 ? 1.0 : pos > 0.55 ? 0.0 : (0.55 - pos) * 10.0;
      stemVocalsB = pos > 0.55 ? 1.0 : pos < 0.45 ? 0.0 : (pos - 0.45) * 10.0;
    } else if (this.neuralTransitionMode === 'harmonic_swap') {
      // Melodic elements swap sharply, keeping the bass groove locked
      stemHarmonicsA = pos < 0.45 ? 1.0 : pos > 0.55 ? 0.0 : (0.55 - pos) * 10.0;
      stemHarmonicsB = pos > 0.55 ? 1.0 : pos < 0.45 ? 0.0 : (pos - 0.45) * 10.0;
    }

    deckA.stemDrumsXfaderGain.gain.setTargetAtTime(stemDrumsA, this.ctx.currentTime, 0.01);
    deckA.stemVocalsXfaderGain.gain.setTargetAtTime(stemVocalsA, this.ctx.currentTime, 0.01);
    deckA.stemHarmonicsXfaderGain.gain.setTargetAtTime(stemHarmonicsA, this.ctx.currentTime, 0.01);

    deckB.stemDrumsXfaderGain.gain.setTargetAtTime(stemDrumsB, this.ctx.currentTime, 0.01);
    deckB.stemVocalsXfaderGain.gain.setTargetAtTime(stemVocalsB, this.ctx.currentTime, 0.01);
    deckB.stemHarmonicsXfaderGain.gain.setTargetAtTime(stemHarmonicsB, this.ctx.currentTime, 0.01);
  }

  public setMasterVolume(vol: number) {
    if (!this.masterGain || !this.ctx) return;
    this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(vol, 1.0)), this.ctx.currentTime, 0.01);
  }

  // Hot Cues & Loops
  public triggerHotCue(deckId: DeckId, cue: HotCue, autoPlay: boolean = true) {
    this.seekDeck(deckId, cue.position);
    if (autoPlay) {
      this.playDeck(deckId, cue.position);
    }
  }

  public setLoop(deckId: DeckId, startSec: number, endSec: number) {
    const deck = this.decks.get(deckId);
    if (!deck) return;
    deck.loopRegion = { start: startSec, end: endSec };
    if (deck.sourceNode) {
      deck.sourceNode.loop = true;
      deck.sourceNode.loopStart = startSec;
      deck.sourceNode.loopEnd = endSec;
    }
  }

  public exitLoop(deckId: DeckId) {
    const deck = this.decks.get(deckId);
    if (!deck) return;
    deck.loopRegion = null;
    if (deck.sourceNode) {
      deck.sourceNode.loop = false;
    }
  }

  public beatJump(deckId: DeckId, beats: number, bpm: number) {
    if (bpm <= 0) return;
    const secondsPerBeat = 60.0 / bpm;
    const offsetDelta = beats * secondsPerBeat;
    const current = this.getCurrentTime(deckId);
    this.seekDeck(deckId, current + offsetDelta);
  }

  // Level Metering (for VU meters)
  public getDeckLevel(deckId: DeckId): number {
    const deck = this.decks.get(deckId);
    if (!deck || !deck.isPlaying) return 0;

    deck.analyser.getByteFrequencyData(deck.analyserData as any);
    let sum = 0;
    for (let i = 0; i < deck.analyserData.length; i++) {
      sum += deck.analyserData[i];
    }
    const avg = sum / deck.analyserData.length;
    return Math.min(1.0, (avg / 255) * 1.6);
  }

  public getMasterLevel(): number {
    if (!this.masterAnalyser) return 0;
    this.masterAnalyser.getByteFrequencyData(this.masterAnalyserData as any);
    let sum = 0;
    for (let i = 0; i < this.masterAnalyserData.length; i++) {
      sum += this.masterAnalyserData[i];
    }
    const avg = sum / this.masterAnalyserData.length;
    return Math.min(1.0, (avg / 255) * 1.5);
  }

  public getDeck(deckId: DeckId): DeckAudioNodes | undefined {
    return this.decks.get(deckId);
  }

  // Multi-FX Studio Engine
  public setDeckFX(deckId: DeckId, fx: FXUnit, deckBpm: number = 126) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;

    const wet = fx.enabled ? Math.max(0, Math.min(1, fx.wetDry)) : 0.0;
    const dry = 1.0 - wet * 0.6; // Studio DJ send balance

    deck.fxDryNode.gain.setValueAtTime(dry, this.ctx.currentTime);
    deck.fxWetNode.gain.setValueAtTime(wet, this.ctx.currentTime);

    // Calculate tempo-synced delay time
    const bpm = Math.max(60, deckBpm || 120);
    const beatSec = 60.0 / bpm;
    const delayTime = Math.max(0.01, Math.min(2.5, beatSec * fx.beats));

    // Reset fx connection
    try { deck.fxInputNode.disconnect(); } catch {}
    deck.fxInputNode.connect(deck.fxDryNode);

    if (fx.enabled && wet > 0.01) {
      if (fx.type === 'echo') {
        deck.fxDelayNode.delayTime.setValueAtTime(delayTime, this.ctx.currentTime);
        deck.fxDelayFeedback.gain.setValueAtTime(Math.min(0.85, 0.25 + fx.param * 0.55), this.ctx.currentTime);
        deck.fxInputNode.connect(deck.fxDelayNode);
        deck.fxDelayNode.connect(deck.fxWetNode);
      } else if (fx.type === 'reverb') {
        deck.fxInputNode.connect(deck.fxConvolverNode);
        deck.fxConvolverNode.connect(deck.fxWetNode);
      } else if (fx.type === 'flanger') {
        deck.fxInputNode.connect(deck.fxFlangerDelay);
        deck.fxFlangerDelay.connect(deck.fxWetNode);
      } else if (fx.type === 'bitcrusher') {
        deck.fxInputNode.connect(deck.fxBitcrusherCurve);
        deck.fxBitcrusherCurve.connect(deck.fxWetNode);
      } else if (fx.type === 'filter') {
        const sweepFreq = 250 + fx.param * 5500;
        deck.fxFilterSweep.frequency.setValueAtTime(sweepFreq, this.ctx.currentTime);
        deck.fxInputNode.connect(deck.fxFilterSweep);
        deck.fxFilterSweep.connect(deck.fxWetNode);
      } else if (fx.type === 'roll') {
        deck.fxDelayNode.delayTime.setValueAtTime(delayTime, this.ctx.currentTime);
        deck.fxDelayFeedback.gain.setValueAtTime(0.96, this.ctx.currentTime); // Infinite stutter hold
        deck.fxInputNode.connect(deck.fxDelayNode);
        deck.fxDelayNode.connect(deck.fxWetNode);
      }
    }
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasterNode(): GainNode | null {
    return this.masterGain;
  }
}

export const audioEngine = new AudioEngine();
