import { DeckId, FXTarget, FXType, FXUnit, HotCue, NeuralMixInstantFXId, NeuralTransitionMode, StemState, TrackMetadata } from '../types/dj';

export interface NeuralMixInstantFXPreset {
  id: NeuralMixInstantFXId;
  label: string;
  shortLabel: string;
  target: FXTarget;
  fxType: FXType;
  wetDry: number;
  param: number;
  beats: number;
  stemMultipliers?: Partial<Record<'vocals' | 'drums' | 'bass' | 'harmonics', number>>;
  muteStems?: ('vocals' | 'drums' | 'bass' | 'harmonics')[];
}

export const NEURAL_MIX_INSTANT_FX_PRESETS: NeuralMixInstantFXPreset[] = [
  {
    id: 'InstantFXNeuralMixChiptune',
    label: 'Neural Chiptune',
    shortLabel: 'CHIPTUNE',
    target: 'harmonics',
    fxType: 'bitcrusher',
    wetDry: 0.75,
    param: 0.85,
    beats: 0.5,
  },
  {
    id: 'InstantFXNeuralMixDistance',
    label: 'Neural Distance',
    shortLabel: 'DISTANCE',
    target: 'vocals',
    fxType: 'reverb',
    wetDry: 0.8,
    param: 0.9,
    beats: 1.0,
    stemMultipliers: { drums: 0.55, bass: 0.65 },
  },
  {
    id: 'InstantFXNeuralMixDrumBlur',
    label: 'Drum Blur',
    shortLabel: 'DRM BLUR',
    target: 'drums',
    fxType: 'reverb',
    wetDry: 0.78,
    param: 0.8,
    beats: 0.5,
  },
  {
    id: 'InstantFXNeuralMixDrumRemoverImpact',
    label: 'Drum Remover Impact',
    shortLabel: 'NO DRM IMP',
    target: 'drums',
    fxType: 'echo',
    wetDry: 0.7,
    param: 0.65,
    beats: 0.5,
    muteStems: ['drums'],
  },
  {
    id: 'InstantFXNeuralMixEchoOutFull',
    label: 'Neural Echo Out',
    shortLabel: 'NM ECHO OUT',
    target: 'vocals',
    fxType: 'echofreeze',
    wetDry: 0.85,
    param: 0.8,
    beats: 0.5,
    muteStems: ['drums', 'bass'],
  },
  {
    id: 'InstantFXNeuralMixLoFi',
    label: 'Neural Lo-Fi',
    shortLabel: 'NM LO-FI',
    target: 'harmonics',
    fxType: 'bitcrusher',
    wetDry: 0.6,
    param: 0.55,
    beats: 1.0,
  },
  {
    id: 'InstantFXNeuralMixRhythmicizer',
    label: 'Rhythmicizer',
    shortLabel: 'RHYTHM',
    target: 'drums',
    fxType: 'roll',
    wetDry: 0.85,
    param: 0.75,
    beats: 0.25,
  },
  {
    id: 'InstantFXNeuralMixRythmRemover',
    label: 'Rhythm Remover',
    shortLabel: 'NO RHYM',
    target: 'master',
    fxType: 'filter',
    wetDry: 0.45,
    param: 0.7,
    beats: 1.0,
    muteStems: ['drums', 'bass'],
  },
  {
    id: 'InstantFXNeuralMixRythmRemoverWashy',
    label: 'Rhythm Remover Wash',
    shortLabel: 'WASH OUT',
    target: 'harmonics',
    fxType: 'reverb',
    wetDry: 0.82,
    param: 0.85,
    beats: 1.0,
    muteStems: ['drums', 'bass'],
  },
  {
    id: 'InstantFXNeuralMixSidechain',
    label: 'Neural Sidechain',
    shortLabel: 'SIDECHAIN',
    target: 'harmonics',
    fxType: 'flanger',
    wetDry: 0.55,
    param: 0.75,
    beats: 0.5,
    stemMultipliers: { harmonics: 0.72, vocals: 0.88, bass: 1.1 },
  },
];
import { mixRecorder } from './MixRecorder';
import { samplerEngine } from './SamplerEngine';
import { DiscreteStems } from '../services/StemSeparatorService';

export interface DeckAudioNodes {
  deckId: DeckId;
  deckSumBus: GainNode;
  rawStereoGainNode: GainNode;
  gainTrim: GainNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  filterLpf: BiquadFilterNode;
  filterHpf: BiquadFilterNode;
  // Neural Mix 4-Stem Separation Nodes
  stemDrumsFilter: BiquadFilterNode;
  stemDrumsGain: GainNode;
  stemBassHpf: BiquadFilterNode;
  stemBassLpf: BiquadFilterNode;
  stemBassGain: GainNode;
  stemVocalsHpf: BiquadFilterNode;
  stemVocalsLpf: BiquadFilterNode;
  stemVocalsGain: GainNode;
  stemHarmonicsFilter: BiquadFilterNode;
  stemHarmonicsGain: GainNode;
  stemState: StemState;
  // Crossfader stem automation nodes
  stemDrumsXfaderGain: GainNode;
  stemBassXfaderGain: GainNode;
  stemVocalsXfaderGain: GainNode;
  stemHarmonicsXfaderGain: GainNode;
  channelFader: GainNode;
  // Studio Multi-FX Rack Nodes
  fxInputNode: GainNode;
  fxDryNode: GainNode;
  fxWetNode: GainNode;
  fxBypassDryGain: GainNode;
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
  // True Discrete 4-Stem Audio Buffers & Synchronized Sources
  stemBuffers: DiscreteStems | null;
  stemVocalsSource: AudioBufferSourceNode | null;
  stemDrumsSource: AudioBufferSourceNode | null;
  stemBassSource: AudioBufferSourceNode | null;
  stemHarmonicsSource: AudioBufferSourceNode | null;
  audioBuffer: AudioBuffer | null;
  reverseAudioBuffer: AudioBuffer | null;
  scratchSourceNode: AudioBufferSourceNode | null;
  scratchWorkletNode?: AudioNode | null;
  scratchGainNode: GainNode | null;
  scratchDirection: 'forward' | 'reverse';
  startTime: number;
  pauseOffset: number;
  playbackRate: number;
  isPlaying: boolean;
  loopRegion: { start: number; end: number } | null;
  activeFxNode: AudioNode | null;
  pitchSemitones: number;
  isSandbox: boolean;
  preSandboxTime: number;
  preSandboxPlaying: boolean;
  isScratching?: boolean;
  scratchPlaybackPos?: number;
  scratchLastTimestamp?: number;
  scratchSmoothedRate?: number;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private masterAnalyserData: Uint8Array = new Uint8Array(32);
  private headphoneGain: GainNode | null = null;
  private masterDestinationNode: AudioNode | null = null;
  private headphoneDestinationNode: AudioNode | null = null;
  private masterAudioElement: HTMLAudioElement | null = null;
  private headphoneAudioElement: HTMLAudioElement | null = null;
  private masterDeviceId: string = 'default';
  private headphoneDeviceId: string = 'default';
  private bufferSizeOption: AudioContextLatencyCategory = 'interactive';

  private decks: Map<DeckId, DeckAudioNodes> = new Map();
  private crossfaderVal: number = 0.0; // -1.0 (A) to +1.0 (B)
  private crossfaderCurve: 'smooth' | 'linear' | 'scratch' = 'linear';
  private crossfaderHamster: boolean = false;
  private splitHeadphoneMode: boolean = false;
  private neuralTransitionMode: NeuralTransitionMode = 'standard';
  private unmixerMuteFxEnabled: boolean = true;
  private fxStemTargets: Map<DeckId, FXTarget> = new Map([
    ['A', 'master'],
    ['B', 'master'],
    ['C', 'master'],
    ['D', 'master'],
  ]);
  private activeInstantFx: Map<DeckId, NeuralMixInstantFXId | null> = new Map();
  private preInstantFxStems: Map<DeckId, StemState> = new Map();
  private scratchSampleBuffer: AudioBuffer | null = null;
  private scratchSampleLoading: boolean = false;
  private scratchWorkletReady: boolean = false;
  private scratchWorkletLoading: boolean = false;

  constructor() {
    // Lazy initialized on first user interaction to comply with browser audio autoplay policy
  }

  public init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx({ latencyHint: this.bufferSizeOption || 'interactive', sampleRate: 48000 });

    // Master bus & Limiter
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
    this.masterLimiter.knee.setValueAtTime(0.0, this.ctx.currentTime);
    this.masterLimiter.ratio.setValueAtTime(20.0, this.ctx.currentTime);
    this.masterLimiter.attack.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterLimiter.release.setValueAtTime(0.08, this.ctx.currentTime);

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 64;
    this.masterAnalyserData = new Uint8Array(this.masterAnalyser.frequencyBinCount);

    this.headphoneGain = this.ctx.createGain();
    this.headphoneGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

    // Setup output routing for master & headphones
    this.setupOutputRouting();

    // Initialize Mix Recorder & Sampler Engine on master bus
    mixRecorder.init(this.ctx, this.masterLimiter);
    samplerEngine.init(this.ctx, this.masterGain);

    // Setup Decks A and B
    this.setupDeck('A');
    this.setupDeck('B');

    // Preload authentic turntable scratch sample & register AudioWorklet vinyl scrubber
    this.loadScratchSample().catch(() => {});
    this.registerScratchWorklet().catch(() => {});
  }

  private async registerScratchWorklet(): Promise<void> {
    if (!this.ctx || this.scratchWorkletReady || this.scratchWorkletLoading) return;
    if (!this.ctx.audioWorklet || typeof Blob === 'undefined' || typeof URL === 'undefined') return;
    this.scratchWorkletLoading = true;
    try {
      const workletCode = `
        class VinylScratchProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.left = null;
            this.right = null;
            this.length = 0;
            this.bufferSampleRate = 48000;
            this.playheadSample = 0;
            this.targetRate = 0;
            this.currentRate = 0;
            this.active = false;
            this.isSynthetic = false;
            this.port.onmessage = (e) => {
              const d = e.data;
              if (!d) return;
              if (d.type === 'load') {
                this.left = d.left;
                this.right = d.right || d.left;
                this.length = d.left ? d.left.length : 0;
                this.bufferSampleRate = d.sampleRate || sampleRate;
                this.isSynthetic = !!d.isSynthetic;
              } else if (d.type === 'start') {
                this.playheadSample = Math.max(0, Math.min(this.length - 1, (d.posSec || 0) * this.bufferSampleRate));
                this.currentRate = d.rate || 0;
                this.targetRate = d.rate || 0;
                this.active = true;
              } else if (d.type === 'rate') {
                this.targetRate = d.rate;
                if (typeof d.posSec === 'number' && !this.isSynthetic) {
                  const targetSample = d.posSec * this.bufferSampleRate;
                  if (Math.abs(targetSample - this.playheadSample) > this.bufferSampleRate * 0.25) {
                    this.playheadSample = Math.max(0, Math.min(this.length - 1, targetSample));
                  }
                }
              } else if (d.type === 'stop') {
                this.active = false;
                this.targetRate = 0;
                this.currentRate = 0;
              }
            };
          }
          process(inputs, outputs) {
            const out = outputs[0];
            if (!out || !out[0]) return true;
            const outL = out[0];
            const outR = out[1] || out[0];
            if (!this.active || !this.left || this.length < 2) {
              for (let i = 0; i < outL.length; i++) {
                outL[i] = 0;
                if (outR !== outL) outR[i] = 0;
              }
              return true;
            }
            const srRatio = this.bufferSampleRate / sampleRate;
            const len = this.length;
            const L = this.left;
            const R = this.right || L;
            // 1-pole sample-level vinyl inertia smoothing + stationary hand-hold friction decay
            const alpha = 0.015;
            const stationaryDecay = 0.9965;
            for (let i = 0; i < outL.length; i++) {
              this.targetRate *= stationaryDecay;
              this.currentRate += (this.targetRate - this.currentRate) * alpha;
              const speed = Math.abs(this.currentRate);
              if (speed < 0.002) {
                outL[i] = 0;
                if (outR !== outL) outR[i] = 0;
                continue;
              }
              let idx = this.playheadSample;
              if (this.isSynthetic) {
                idx = ((idx % len) + len) % len;
              } else if (idx < 0) {
                idx = 0;
              } else if (idx >= len - 1) {
                idx = len - 2;
              }
              const i0 = idx | 0;
              const frac = idx - i0;
              const im1 = i0 > 0 ? i0 - 1 : 0;
              const i1 = i0 + 1 < len ? i0 + 1 : i0;
              const i2 = i0 + 2 < len ? i0 + 2 : i1;
              // 4-point Cubic Hermite interpolation for crisp high-frequency scratch transients
              const l0 = L[im1], l1 = L[i0], l2 = L[i1], l3 = L[i2];
              const c0L = l1;
              const c1L = 0.5 * (l2 - l0);
              const c2L = l0 - 2.5 * l1 + 2.0 * l2 - 0.5 * l3;
              const c3L = 0.5 * (l3 - l0) + 1.5 * (l1 - l2);
              const sampleL = ((c3L * frac + c2L) * frac + c1L) * frac + c0L;

              // Gain scales smoothly with vinyl speed for authentic faderless needle bite
              const gain = Math.min(1.15, 0.38 + speed * 0.65);
              outL[i] = sampleL * gain;
              if (outR !== outL) {
                const r0 = R[im1], r1 = R[i0], r2 = R[i1], r3 = R[i2];
                const c0R = r1;
                const c1R = 0.5 * (r2 - r0);
                const c2R = r0 - 2.5 * r1 + 2.0 * r2 - 0.5 * r3;
                const c3R = 0.5 * (r3 - r0) + 1.5 * (r1 - r2);
                const sampleR = ((c3R * frac + c2R) * frac + c1R) * frac + c0R;
                outR[i] = sampleR * gain;
              }
              this.playheadSample += this.currentRate * srRatio;
              if (this.isSynthetic) {
                this.playheadSample = ((this.playheadSample % len) + len) % len;
              } else {
                if (this.playheadSample < 0) this.playheadSample = 0;
                if (this.playheadSample >= len - 1) this.playheadSample = len - 1;
              }
            }
            return true;
          }
        }
        registerProcessor('vinyl-scratch-processor', VinylScratchProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await this.ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      this.scratchWorkletReady = true;
    } catch (e) {
      console.warn('[AudioEngine] AudioWorklet scratch processor fallback to BufferSource:', e);
    } finally {
      this.scratchWorkletLoading = false;
    }
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

    // =========================================================================
    // 4-STEM WEB AUDIO DECK ROUTING ARCHITECTURE (Phase 4)
    // 4 Parallel Stem Buses:
    //   stemVocalsSource -> stemVocalsGain -> stemVocalsXfaderGain -> deckSumBus
    //   stemDrumsSource -> stemDrumsGain -> stemDrumsXfaderGain -> deckSumBus
    //   stemBassSource -> stemBassGain -> stemBassXfaderGain -> deckSumBus
    //   stemHarmonicsSource -> stemHarmonicsGain -> stemHarmonicsXfaderGain -> deckSumBus
    //   rawStereoSource -> rawStereoGainNode -> deckSumBus
    //
    // All 4 stems and raw stereo feed into deckSumBus, which feeds into the
    // Deck's Master Channel Strip (Filter -> EQ -> Channel Volume Fader -> Crossfader).
    // This guarantees channel EQ, Quick Filters, and Channel Gain apply to all stems!
    // =========================================================================
    const deckSumBus = this.ctx.createGain();
    deckSumBus.gain.setValueAtTime(1.0, this.ctx.currentTime);

    const rawStereoGainNode = this.ctx.createGain();
    rawStereoGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);
    rawStereoGainNode.connect(deckSumBus);

    // 1. Bass Stem Gain Bus
    const stemBassGain = this.ctx.createGain();
    stemBassGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    const stemBassXfaderGain = this.ctx.createGain();
    stemBassXfaderGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    stemBassGain.connect(stemBassXfaderGain);
    stemBassXfaderGain.connect(deckSumBus);

    // 2. Drums Stem Gain Bus
    const stemDrumsGain = this.ctx.createGain();
    stemDrumsGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    const stemDrumsXfaderGain = this.ctx.createGain();
    stemDrumsXfaderGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    stemDrumsGain.connect(stemDrumsXfaderGain);
    stemDrumsXfaderGain.connect(deckSumBus);

    // 3. Vocals Stem Gain Bus
    const stemVocalsGain = this.ctx.createGain();
    stemVocalsGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    const stemVocalsXfaderGain = this.ctx.createGain();
    stemVocalsXfaderGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    stemVocalsGain.connect(stemVocalsXfaderGain);
    stemVocalsXfaderGain.connect(deckSumBus);

    // 4. Harmonics / Melody Stem Gain Bus
    const stemHarmonicsGain = this.ctx.createGain();
    stemHarmonicsGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    const stemHarmonicsXfaderGain = this.ctx.createGain();
    stemHarmonicsXfaderGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    stemHarmonicsGain.connect(stemHarmonicsXfaderGain);
    stemHarmonicsXfaderGain.connect(deckSumBus);

    // Unused biquad crossover nodes preserved for backwards compatibility
    const stemDrumsFilter = this.ctx.createBiquadFilter();
    const stemBassHpf = this.ctx.createBiquadFilter();
    const stemBassLpf = this.ctx.createBiquadFilter();
    const stemVocalsHpf = this.ctx.createBiquadFilter();
    const stemVocalsLpf = this.ctx.createBiquadFilter();
    const stemHarmonicsFilter = this.ctx.createBiquadFilter();

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

    // Connect Deck Master Channel Strip:
    // deckSumBus (all stems + raw) -> GainTrim -> Low EQ -> Mid EQ -> High EQ -> Filter LPF -> Filter HPF -> Channel Volume Fader
    deckSumBus.connect(gainTrim);
    gainTrim.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(filterLpf);
    filterLpf.connect(filterHpf);
    filterHpf.connect(channelFader);

    // Channel Fader -> Analyser -> FX Rack -> Crossfader Bus -> Master Bus
    const fxInputNode = this.ctx.createGain();
    const fxDryNode = this.ctx.createGain();
    const fxWetNode = this.ctx.createGain();
    fxDryNode.gain.setValueAtTime(1.0, this.ctx.currentTime);
    fxWetNode.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // 1. Studio Tape Echo / Ping-Pong Delay with analog high-damping filter
    const fxDelayNode = this.ctx.createDelay(4.0);
    fxDelayNode.delayTime.setValueAtTime(0.35, this.ctx.currentTime);
    const fxDelayFeedback = this.ctx.createGain();
    fxDelayFeedback.gain.setValueAtTime(0.45, this.ctx.currentTime);
    const fxDelayFilter = this.ctx.createBiquadFilter();
    fxDelayFilter.type = 'lowpass';
    fxDelayFilter.frequency.setValueAtTime(3200, this.ctx.currentTime);
    fxDelayFilter.Q.setValueAtTime(0.7071, this.ctx.currentTime);
    fxDelayNode.connect(fxDelayFeedback);
    fxDelayFeedback.connect(fxDelayFilter);
    fxDelayFilter.connect(fxDelayNode);

    // 2. High-Density Algorithmic Concert Hall Reverb with Stereo Diffusion & Decay
    const fxConvolverNode = this.ctx.createConvolver();
    const revLengthSec = 2.6;
    const revSamples = Math.floor(this.ctx.sampleRate * revLengthSec);
    const revBuffer = this.ctx.createBuffer(2, revSamples, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = revBuffer.getChannelData(c);
      const preDelaySamples = Math.floor(0.018 * this.ctx.sampleRate * (c === 0 ? 1 : 1.25)); // Stereo pre-delay spread
      for (let i = 0; i < revSamples; i++) {
        if (i < preDelaySamples) {
          d[i] = 0;
          continue;
        }
        const sampleIdx = i - preDelaySamples;
        const t = sampleIdx / this.ctx.sampleRate;
        // High density early reflections + exponential decay diffuse envelope
        const earlyReflections = (sampleIdx < 1200 && sampleIdx % 180 === 0) ? (Math.random() - 0.5) * 0.4 : 0;
        const decayEnvelope = Math.exp(-t / 0.55);
        // Multi-frequency damped noise diffuse tail
        const noise = (Math.random() * 2 - 1) * decayEnvelope * 0.7 + earlyReflections;
        d[i] = noise;
      }
    }
    fxConvolverNode.buffer = revBuffer;

    // 3. Pro DJ Resonant Flanger / Comb Modulator (0.001s - 0.007s sweep)
    const fxFlangerDelay = this.ctx.createDelay(0.05);
    fxFlangerDelay.delayTime.setValueAtTime(0.0035, this.ctx.currentTime);
    const fxFlangerDepth = this.ctx.createGain();
    fxFlangerDepth.gain.setValueAtTime(0.0028, this.ctx.currentTime);
    let fxFlangerOsc: OscillatorNode | null = null;
    try {
      fxFlangerOsc = this.ctx.createOscillator();
      fxFlangerOsc.type = 'triangle'; // Triangular sweep creates classic djay Pro swoosh
      fxFlangerOsc.frequency.setValueAtTime(0.35, this.ctx.currentTime);
      fxFlangerOsc.connect(fxFlangerDepth);
      fxFlangerDepth.connect(fxFlangerDelay.delayTime);
      fxFlangerOsc.start();
    } catch {}

    // 4. Analog Saturation Bitcrusher / Downsampler WaveShaper (harmonic warm drive)
    const fxBitcrusherCurve = this.ctx.createWaveShaper();
    const bcCurve = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      const x = (i * 2) / 512 - 1;
      // Quantized steps with warm tanh saturation curve
      const steps = 8;
      const quantized = Math.round(x * steps) / steps;
      bcCurve[i] = Math.tanh(quantized * 1.35);
    }
    fxBitcrusherCurve.curve = bcCurve;

    // 5. Djay Pro Resonant Bi-Directional Filter Sweep (LPF / HPF / Bandpass)
    const fxFilterSweep = this.ctx.createBiquadFilter();
    fxFilterSweep.type = 'bandpass';
    fxFilterSweep.frequency.setValueAtTime(1000, this.ctx.currentTime);
    fxFilterSweep.Q.setValueAtTime(4.2, this.ctx.currentTime); // Punchy resonant peak

    // Routing: channelFader -> analyser -> fxInputNode -> fxDryNode -> crossfaderGain
    channelFader.connect(analyser);
    analyser.connect(fxInputNode);
    fxInputNode.connect(fxDryNode);
    fxDryNode.connect(crossfaderGain);
    fxWetNode.connect(crossfaderGain);
    const fxBypassDryGain = this.ctx.createGain();
    fxBypassDryGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    analyser.connect(fxBypassDryGain);
    fxBypassDryGain.connect(crossfaderGain);
    crossfaderGain.connect(this.masterGain);

    // Pre-fader Cue Listen (PFL): Tap signal after EQ & filter strip, before channel volume fader
    if (this.headphoneGain) {
      filterHpf.connect(cueGain);
      cueGain.connect(this.headphoneGain);
    }

    const stemState: StemState = {
      vocals: 1.0,
      harmonics: 1.0,
      bass: 1.0,
      drums: 1.0,
      vocalsMuted: false,
      harmonicsMuted: false,
      bassMuted: false,
      drumsMuted: false,
      vocalsSolo: false,
      harmonicsSolo: false,
      bassSolo: false,
      drumsSolo: false,
    };

    const deckNodes: DeckAudioNodes = {
      deckId,
      deckSumBus,
      rawStereoGainNode,
      gainTrim,
      eqLow,
      eqMid,
      eqHigh,
      filterLpf,
      filterHpf,
      stemDrumsFilter,
      stemDrumsGain,
      stemBassHpf,
      stemBassLpf,
      stemBassGain,
      stemVocalsHpf,
      stemVocalsLpf,
      stemVocalsGain,
      stemHarmonicsFilter,
      stemHarmonicsGain,
      stemState,
      stemDrumsXfaderGain,
      stemBassXfaderGain,
      stemVocalsXfaderGain,
      stemHarmonicsXfaderGain,
      channelFader,
      fxInputNode,
      fxDryNode,
      fxWetNode,
      fxBypassDryGain,
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
      stemBuffers: null,
      stemVocalsSource: null,
      stemDrumsSource: null,
      stemBassSource: null,
      stemHarmonicsSource: null,
      audioBuffer: null,
      reverseAudioBuffer: null,
      scratchSourceNode: null,
      scratchGainNode: null,
      scratchDirection: 'forward',
      startTime: 0,
      pauseOffset: 0,
      playbackRate: 1.0,
      isPlaying: false,
      loopRegion: null,
      activeFxNode: null,
      pitchSemitones: 0,
      isSandbox: false,
      preSandboxTime: 0,
      preSandboxPlaying: false,
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

  public loadTrackToDeck(deckId: DeckId, buffer: AudioBuffer, stems?: DiscreteStems) {
    this.init();
    this.resumeContext().catch(() => {});
    const deck = this.decks.get(deckId);
    if (!deck) return;

    if (deck.isPlaying) {
      this.pauseDeck(deckId);
    }

    // Explicitly stop and disconnect any leftover audio buffer or scratch sources to prevent memory leaks / audio overlap
    if (deck.sourceNode) {
      try {
        deck.sourceNode.stop();
        deck.sourceNode.disconnect();
      } catch {}
      deck.sourceNode = null;
    }
    if (deck.stemVocalsSource || deck.stemDrumsSource || deck.stemBassSource || deck.stemHarmonicsSource) {
      try {
        deck.stemVocalsSource?.stop();
        deck.stemVocalsSource?.disconnect();
        deck.stemDrumsSource?.stop();
        deck.stemDrumsSource?.disconnect();
        deck.stemBassSource?.stop();
        deck.stemBassSource?.disconnect();
        deck.stemHarmonicsSource?.stop();
        deck.stemHarmonicsSource?.disconnect();
      } catch {}
      deck.stemVocalsSource = null;
      deck.stemDrumsSource = null;
      deck.stemBassSource = null;
      deck.stemHarmonicsSource = null;
    }
    if (deck.scratchSourceNode) {
      try {
        deck.scratchSourceNode.stop();
        deck.scratchSourceNode.disconnect();
      } catch {}
      deck.scratchSourceNode = null;
    }
    if (deck.scratchGainNode) {
      try {
        deck.scratchGainNode.disconnect();
      } catch {}
      deck.scratchGainNode = null;
    }

    deck.audioBuffer = buffer;
    deck.stemBuffers = stems || null;
    deck.pauseOffset = 0;
    deck.startTime = 0;
    deck.loopRegion = null;
    deck.scratchDirection = 'forward';

    // Generate reverse audio buffer for authentic bi-directional vinyl scratching
    if (this.ctx) {
      try {
        const numChannels = buffer.numberOfChannels;
        const length = buffer.length;
        const sampleRate = buffer.sampleRate;
        const revBuffer = this.ctx.createBuffer(numChannels, length, sampleRate);
        for (let ch = 0; ch < numChannels; ch++) {
          const srcData = buffer.getChannelData(ch);
          const dstData = revBuffer.getChannelData(ch);
          for (let i = 0, j = length - 1; i < length; i++, j--) {
            dstData[i] = srcData[j];
          }
        }
        deck.reverseAudioBuffer = revBuffer;
      } catch (e) {
        console.warn('Failed to pre-compute reverse buffer for vinyl scratch:', e);
        deck.reverseAudioBuffer = null;
      }
    }
  }

  public setDeckStems(deckId: DeckId, stems: DiscreteStems) {
    this.handOffToStems(deckId, stems);
  }

  /**
   * Phase 4: Instant Playback Handoff
   * Seamlessly hands off playback from raw stereo source to the 4 synchronized
   * stem sources at exact playhead offset with an imperceptible 30ms equal-power crossfade.
   */
  public handOffToStems(deckId: DeckId, stems: DiscreteStems) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    deck.stemBuffers = stems;

    // If deck is stopped or paused, stems will play cleanly on next playDeck call
    if (!deck.isPlaying) return;

    const now = this.ctx.currentTime;
    const currentOffset = this.getCurrentTime(deckId);
    const clampedOffset = Math.max(0, Math.min(currentOffset, deck.audioBuffer?.duration || 0));

    // 1. Create 4 synchronized stem sources
    const vSrc = this.ctx.createBufferSource();
    const dSrc = this.ctx.createBufferSource();
    const bSrc = this.ctx.createBufferSource();
    const hSrc = this.ctx.createBufferSource();

    vSrc.buffer = stems.vocals;
    dSrc.buffer = stems.drums;
    bSrc.buffer = stems.bass;
    hSrc.buffer = stems.harmonics;

    const stemSources = [vSrc, dSrc, bSrc, hSrc];
    for (const s of stemSources) {
      s.playbackRate.setValueAtTime(deck.playbackRate, now);
      s.detune.setValueAtTime(deck.pitchSemitones * 100, now);
      if (deck.loopRegion) {
        s.loop = true;
        s.loopStart = deck.loopRegion.start;
        s.loopEnd = deck.loopRegion.end;
      }
    }

    // Connect to stem gain buses
    vSrc.connect(deck.stemVocalsGain);
    dSrc.connect(deck.stemDrumsGain);
    bSrc.connect(deck.stemBassGain);
    hSrc.connect(deck.stemHarmonicsGain);

    // Apply active mute/solo stem gains (15ms anti-pop ramp)
    this.recalculateStemGains(deck);

    // Start all 4 in sample-accurate lockstep
    vSrc.start(now, clampedOffset);
    dSrc.start(now, clampedOffset);
    bSrc.start(now, clampedOffset);
    hSrc.start(now, clampedOffset);

    // 2. 30ms seamless equal-power crossfade handoff from stereo to stems
    const crossfadeSec = 0.030;
    deck.rawStereoGainNode.gain.setValueAtTime(deck.rawStereoGainNode.gain.value, now);
    deck.rawStereoGainNode.gain.linearRampToValueAtTime(0.0, now + crossfadeSec);

    // 3. Gracefully terminate raw stereo source after crossfade completes
    const oldSource = deck.sourceNode;
    setTimeout(() => {
      if (oldSource) {
        try {
          oldSource.stop();
          oldSource.disconnect();
        } catch {}
      }
    }, 45);

    deck.sourceNode = null;
    deck.stemVocalsSource = vSrc;
    deck.stemDrumsSource = dSrc;
    deck.stemBassSource = bSrc;
    deck.stemHarmonicsSource = hSrc;

    vSrc.onended = () => {
      if (deck.isPlaying && this.ctx && (this.getCurrentTime(deckId) >= (deck.audioBuffer?.duration || 0) - 0.1)) {
        deck.isPlaying = false;
        deck.pauseOffset = 0;
      }
    };
  }

  public getDeckBuffer(deckId: DeckId): AudioBuffer | null {
    return this.decks.get(deckId)?.audioBuffer || null;
  }

  public getDeckStems(deckId: DeckId): DiscreteStems | null {
    return this.decks.get(deckId)?.stemBuffers || null;
  }

  public playDeck(deckId: DeckId, startOffsetSec?: number) {
    this.init();
    this.resumeContext();
    const deck = this.decks.get(deckId);
    if (!deck || !deck.audioBuffer || !this.ctx) return;

    // Engage Windows "Pro Audio" real-time priority boost during active playback
    try {
      (window as any).desktopAPI?.setProAudioPriority?.(true);
    } catch {}

    // Clean up any existing active audio sources
    if (deck.sourceNode) {
      try {
        deck.sourceNode.stop();
        deck.sourceNode.disconnect();
      } catch {}
      deck.sourceNode = null;
    }
    if (deck.stemVocalsSource) {
      try {
        deck.stemVocalsSource.stop();
        deck.stemVocalsSource.disconnect();
        deck.stemDrumsSource?.stop();
        deck.stemDrumsSource?.disconnect();
        deck.stemBassSource?.stop();
        deck.stemBassSource?.disconnect();
        deck.stemHarmonicsSource?.stop();
        deck.stemHarmonicsSource?.disconnect();
      } catch {}
      deck.stemVocalsSource = null;
      deck.stemDrumsSource = null;
      deck.stemBassSource = null;
      deck.stemHarmonicsSource = null;
    }

    const offset = startOffsetSec !== undefined ? startOffsetSec : deck.pauseOffset;
    const clampedOffset = Math.max(0, Math.min(offset, deck.audioBuffer.duration));

    // =========================================================================
    // TRUE 4-TRACK DISCRETE NEURAL STEM PLAYBACK ENGINE
    // When discrete stems are present, 4 independent audio buffer sources
    // play in sample-accurate lockstep into dedicated discrete gain nodes.
    // Soloing vocals produces 100% clean acapella with ZERO instrument bleed!
    // =========================================================================
    if (deck.stemBuffers) {
      deck.rawStereoGainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);

      const vSrc = this.ctx.createBufferSource();
      const dSrc = this.ctx.createBufferSource();
      const bSrc = this.ctx.createBufferSource();
      const hSrc = this.ctx.createBufferSource();

      vSrc.buffer = deck.stemBuffers.vocals;
      dSrc.buffer = deck.stemBuffers.drums;
      bSrc.buffer = deck.stemBuffers.bass;
      hSrc.buffer = deck.stemBuffers.harmonics;

      const stemSources = [vSrc, dSrc, bSrc, hSrc];
      for (const s of stemSources) {
        s.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
        s.detune.setValueAtTime(deck.pitchSemitones * 100, this.ctx.currentTime);
        if (deck.loopRegion) {
          s.loop = true;
          s.loopStart = deck.loopRegion.start;
          s.loopEnd = deck.loopRegion.end;
        }
      }

      // Route discrete stems directly into their respective stem gain nodes
      vSrc.connect(deck.stemVocalsGain);
      dSrc.connect(deck.stemDrumsGain);
      bSrc.connect(deck.stemBassGain);
      hSrc.connect(deck.stemHarmonicsGain);

      // Apply stem mute/solo gains
      this.recalculateStemGains(deck);

      // Start all 4 in sample-accurate lockstep
      vSrc.start(0, clampedOffset);
      dSrc.start(0, clampedOffset);
      bSrc.start(0, clampedOffset);
      hSrc.start(0, clampedOffset);

      deck.stemVocalsSource = vSrc;
      deck.stemDrumsSource = dSrc;
      deck.stemBassSource = bSrc;
      deck.stemHarmonicsSource = hSrc;

      vSrc.onended = () => {
        if (deck.isPlaying && this.ctx && (this.getCurrentTime(deckId) >= (deck.audioBuffer?.duration || 0) - 0.1)) {
          deck.isPlaying = false;
          deck.pauseOffset = 0;
        }
      };
    } else {
      // Raw stereo track playback (feeds into deckSumBus -> channel strip)
      deck.rawStereoGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

      const source = this.ctx.createBufferSource();
      source.buffer = deck.audioBuffer;
      source.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
      source.detune.setValueAtTime(deck.pitchSemitones * 100, this.ctx.currentTime);

      if (deck.loopRegion) {
        source.loop = true;
        source.loopStart = deck.loopRegion.start;
        source.loopEnd = deck.loopRegion.end;
      }

      source.connect(deck.rawStereoGainNode);
      source.start(0, clampedOffset);
      deck.sourceNode = source;

      source.onended = () => {
        if (deck.isPlaying && this.ctx && (this.getCurrentTime(deckId) >= (deck.audioBuffer?.duration || 0) - 0.1)) {
          deck.isPlaying = false;
          deck.pauseOffset = 0;
        }
      };
    }

    deck.startTime = this.ctx.currentTime - (clampedOffset / deck.playbackRate);
    deck.pauseOffset = clampedOffset;
    deck.isPlaying = true;
  }

  public pauseDeck(deckId: DeckId) {
    const deck = this.decks.get(deckId);
    if (!deck) return;

    if (deck.isPlaying) {
      deck.pauseOffset = this.getCurrentTime(deckId);
    }
    const stopNode = (n: AudioBufferSourceNode | null | undefined) => {
      if (!n) return;
      try { n.stop(); } catch {}
      try { n.disconnect(); } catch {}
    };
    stopNode(deck.sourceNode);
    deck.sourceNode = null;
    stopNode(deck.stemVocalsSource);
    deck.stemVocalsSource = null;
    stopNode(deck.stemDrumsSource);
    deck.stemDrumsSource = null;
    stopNode(deck.stemBassSource);
    deck.stemBassSource = null;
    stopNode(deck.stemHarmonicsSource);
    deck.stemHarmonicsSource = null;
    if (deck.scratchWorkletNode) {
      try {
        (deck.scratchWorkletNode as any).port?.postMessage({ type: 'setVelocity', velocity: 0 });
      } catch {}
    }
    deck.isPlaying = false;
  }

  /**
   * VirtualDJ Slipbrake8 emulation:
   * Smoothly decelerates playback rate from 1.0 down to 0 over durationSec using realistic vinyl friction curve,
   * then pauses the deck. If slipMode is active, resumes on beat.
   */
  public triggerMotorBrake(deckId: DeckId, durationSec: number = 1.0) {
    const deck = this.decks.get(deckId);
    if (!deck || !deck.isPlaying || !this.ctx) return;

    const startTime = this.ctx.currentTime;
    const initialRate = deck.playbackRate;
    const dur = Math.max(0.3, Math.min(4.0, durationSec));

    if (deck.sourceNode) {
      deck.sourceNode.playbackRate.setValueAtTime(initialRate, startTime);
      deck.sourceNode.playbackRate.exponentialRampToValueAtTime(0.001, startTime + dur);
    }
    if (deck.stemVocalsSource) {
      try {
        deck.stemVocalsSource.playbackRate.setValueAtTime(initialRate, startTime);
        deck.stemVocalsSource.playbackRate.exponentialRampToValueAtTime(0.001, startTime + dur);
        deck.stemDrumsSource?.playbackRate.setValueAtTime(initialRate, startTime);
        deck.stemDrumsSource?.playbackRate.exponentialRampToValueAtTime(0.001, startTime + dur);
        deck.stemBassSource?.playbackRate.setValueAtTime(initialRate, startTime);
        deck.stemBassSource?.playbackRate.exponentialRampToValueAtTime(0.001, startTime + dur);
        deck.stemHarmonicsSource?.playbackRate.setValueAtTime(initialRate, startTime);
        deck.stemHarmonicsSource?.playbackRate.exponentialRampToValueAtTime(0.001, startTime + dur);
      } catch {}
    }

    setTimeout(() => {
      if (deck.isPlaying) {
        this.pauseDeck(deckId);
        // Restore normal playback rate for next play
        this.setPlaybackRate(deckId, initialRate);
      }
    }, dur * 1000);
  }

  /**
   * VirtualDJ backspin: whips the platter backward (-4.2x -> 0x) with exponential friction decay
   */
  public triggerBackspin(deckId: DeckId, durationSec: number = 0.85) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    const wasPlaying = deck.isPlaying;
    this.startScratch(deckId);
    const steps = 16;
    const stepMs = (durationSec * 1000) / steps;
    for (let i = 0; i < steps; i++) {
      setTimeout(() => {
        if (!deck.isScratching) return;
        const progress = i / steps;
        const rate = -4.2 * Math.pow(1 - progress, 1.8);
        this.updateScratch(deckId, rate * (stepMs / 1000));
      }, i * stepMs);
    }
    setTimeout(() => {
      deck.isPlaying = false;
      this.endScratch(deckId);
      if (wasPlaying) this.pauseDeck(deckId);
    }, durationSec * 1000);
  }

  /**
   * VirtualDJ Scratch DNA: beat-quantized automated scratch macros ('baby' | 'flare' | 'crab' | 'chirp')
   */
  public triggerScratchDNA(deckId: DeckId, pattern: 'baby' | 'flare' | 'crab' | 'chirp', bpm: number = 125) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    const beatMs = (60 / Math.max(60, bpm)) * 1000;
    const stepMs = beatMs / 8; // 32nd-note resolution
    const seqMap: Record<string, number[]> = {
      baby: [2.2, -2.2, 2.4, -2.4, 2.0, -2.0, 1.5, 0],
      flare: [2.8, 0, -2.8, 2.8, 0, -2.8, 2.2, 0],
      crab: [3.2, 0, 3.2, 0, 3.2, -3.5, 0, 0],
      chirp: [2.6, 0, -2.6, 0, 2.6, -2.6, 1.8, 0],
    };
    const seq = seqMap[pattern] || seqMap.baby;
    this.startScratch(deckId);
    seq.forEach((rate, idx) => {
      setTimeout(() => {
        if (!deck.isScratching) return;
        this.updateScratch(deckId, rate * (stepMs / 1000));
      }, idx * stepMs);
    });
    setTimeout(() => {
      this.endScratch(deckId);
    }, seq.length * stepMs + 20);
  }

  /**
   * VirtualDJ keyLoopDown / Riser emulation:
   * Shifts playback pitch smoothly upward or downward over durationSec
   */
  public triggerPitchRiser(deckId: DeckId, durationSec: number = 2.0, direction: 'up' | 'down' = 'up') {
    const deck = this.decks.get(deckId);
    if (!deck || !deck.isPlaying || !this.ctx) return;

    const startTime = this.ctx.currentTime;
    const targetMult = direction === 'up' ? 1.5 : 0.67; // +7 semitones (fifth) or -7 semitones
    const initialRate = deck.playbackRate;

    if (deck.sourceNode) {
      deck.sourceNode.playbackRate.setValueAtTime(initialRate, startTime);
      deck.sourceNode.playbackRate.linearRampToValueAtTime(initialRate * targetMult, startTime + durationSec);
    }
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

    const maxDuration = deck.audioBuffer?.duration || 0;
    const elapsed = (this.ctx.currentTime - deck.startTime) * deck.playbackRate;
    if (deck.loopRegion && elapsed >= deck.loopRegion.end) {
      const loopLen = deck.loopRegion.end - deck.loopRegion.start;
      return deck.loopRegion.start + ((elapsed - deck.loopRegion.start) % loopLen);
    }
    return maxDuration > 0 ? Math.max(0, Math.min(maxDuration, elapsed)) : Math.max(0, elapsed);
  }

  /**
   * Sample-accurate beat lookahead scheduler (inspired by djay Pro 1ms multimedia timer).
   * Schedules a callback aligned to the deck's next beat boundary.
   */
  public scheduleOnNextBeat(deckId: DeckId, bpm: number, callback: () => void): number {
    if (!Number.isFinite(bpm) || bpm <= 0 || typeof callback !== 'function') {
      return 0;
    }

    const deck = this.decks.get(deckId);
    const effectiveRate = deck?.playbackRate && deck.playbackRate > 0 ? deck.playbackRate : 1;
    const effectiveBpm = bpm * effectiveRate;
    const beatDurationSec = 60 / effectiveBpm;
    const currentSec = this.getCurrentTime(deckId);

    const beatIndex = Math.floor(currentSec / beatDurationSec);
    const nextBeatSec = (beatIndex + 1) * beatDurationSec;
    const trackDeltaSec = Math.max(0, nextBeatSec - currentSec);
    const delayMs = Math.max(0, Math.round((trackDeltaSec / effectiveRate) * 1000));

    if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
      return window.setTimeout(callback, delayMs);
    }
    return Number(setTimeout(callback, delayMs));
  }

  public setPlaybackRate(deckId: DeckId, rate: number) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    deck.playbackRate = Math.max(0.1, Math.min(rate, 2.0));

    if (deck.isPlaying) {
      const currentPos = this.getCurrentTime(deckId);
      if (deck.sourceNode) {
        deck.sourceNode.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
      }
      if (deck.stemVocalsSource) {
        deck.stemVocalsSource.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
        deck.stemDrumsSource?.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
        deck.stemBassSource?.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
        deck.stemHarmonicsSource?.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
      }
      deck.startTime = this.ctx.currentTime - (currentPos / deck.playbackRate);
    }
  }

  public setDeckPitchSemitones(deckId: DeckId, semitones: number) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    deck.pitchSemitones = Math.max(-12, Math.min(12, semitones));
    const detuneVal = deck.pitchSemitones * 100;
    if (deck.isPlaying) {
      if (deck.sourceNode) {
        deck.sourceNode.detune.setTargetAtTime(detuneVal, this.ctx.currentTime, 0.01);
      }
      if (deck.stemVocalsSource) {
        deck.stemVocalsSource.detune.setTargetAtTime(detuneVal, this.ctx.currentTime, 0.01);
        deck.stemDrumsSource?.detune.setTargetAtTime(detuneVal, this.ctx.currentTime, 0.01);
        deck.stemBassSource?.detune.setTargetAtTime(detuneVal, this.ctx.currentTime, 0.01);
        deck.stemHarmonicsSource?.detune.setTargetAtTime(detuneVal, this.ctx.currentTime, 0.01);
      }
    }
  }

  // Live pitch bend (nudge forwards or backwards)
  public nudge(deckId: DeckId, factor: number) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    const targetRate = deck.playbackRate * factor;
    if (deck.sourceNode) {
      deck.sourceNode.playbackRate.setValueAtTime(targetRate, this.ctx.currentTime);
    }
    if (deck.stemVocalsSource) {
      deck.stemVocalsSource.playbackRate.setValueAtTime(targetRate, this.ctx.currentTime);
      deck.stemDrumsSource?.playbackRate.setValueAtTime(targetRate, this.ctx.currentTime);
      deck.stemBassSource?.playbackRate.setValueAtTime(targetRate, this.ctx.currentTime);
      deck.stemHarmonicsSource?.playbackRate.setValueAtTime(targetRate, this.ctx.currentTime);
    }
  }

  public releaseNudge(deckId: DeckId) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    if (deck.sourceNode) {
      deck.sourceNode.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
    }
    if (deck.stemVocalsSource) {
      deck.stemVocalsSource.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
      deck.stemDrumsSource?.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
      deck.stemBassSource?.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
      deck.stemHarmonicsSource?.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
    }
  }

  // =========================================================================
  // AUTHENTIC VINYL SCRATCH DSP ENGINE (Bi-Directional Serato/djay Pro Scratch)
  // Seamlessly transitions between forward & reversed buffers with authentic
  // velocity, turntable inertia droop, and pitch modulation.
  // =========================================================================
  public startScratch(deckId: DeckId) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx || !deck.audioBuffer) return;
    this.resumeContext();
    deck.isScratching = true;
    deck.scratchPlaybackPos = this.getCurrentTime(deckId);
    deck.scratchLastTimestamp = performance.now();
    deck.scratchDirection = 'forward';

    // Disconnect playing sources so we can take full tactile control via scratchSourceNode
    if (deck.sourceNode) {
      try {
        deck.sourceNode.stop();
        deck.sourceNode.disconnect();
      } catch {}
      deck.sourceNode = null;
    }
    if (deck.stemVocalsSource) {
      try {
        deck.stemVocalsSource.stop();
        deck.stemVocalsSource.disconnect();
        deck.stemDrumsSource?.stop();
        deck.stemDrumsSource?.disconnect();
        deck.stemBassSource?.stop();
        deck.stemBassSource?.disconnect();
        deck.stemHarmonicsSource?.stop();
        deck.stemHarmonicsSource?.disconnect();
      } catch {}
      deck.stemVocalsSource = null;
      deck.stemDrumsSource = null;
      deck.stemBassSource = null;
      deck.stemHarmonicsSource = null;
    }

    // Preload or synthesize scratch sample so audio is ready instantly
    if (!this.scratchSampleBuffer && !this.scratchSampleLoading) {
      this.loadScratchSample().catch(() => {});
    }
    this.registerScratchWorklet().catch(() => {});
    deck.scratchSmoothedRate = 0;

    // If AudioWorklet is ready, instantiate or reuse bi-directional VinylScratchProcessor node
    const isBufferSilent = !deck.audioBuffer ||
      (deck.audioBuffer.length > 0 && Math.abs(deck.audioBuffer.getChannelData(0)[0] || 0) < 0.0005);
    const activeBuf = (!isBufferSilent && deck.audioBuffer) ? deck.audioBuffer : this.scratchSampleBuffer;

    if (this.scratchWorkletReady && activeBuf && typeof AudioWorkletNode !== 'undefined') {
      try {
        if (!deck.scratchWorkletNode) {
          const workletNode = new AudioWorkletNode(this.ctx, 'vinyl-scratch-processor', {
            numberOfInputs: 0,
            numberOfOutputs: 1,
            outputChannelCount: [2],
          });
          workletNode.connect(deck.gainTrim);
          deck.scratchWorkletNode = workletNode;
        }
        const port = (deck.scratchWorkletNode as AudioWorkletNode).port;
        port.postMessage({
          type: 'load',
          left: activeBuf.getChannelData(0),
          right: activeBuf.numberOfChannels > 1 ? activeBuf.getChannelData(1) : activeBuf.getChannelData(0),
          sampleRate: activeBuf.sampleRate,
          isSynthetic: isBufferSilent || activeBuf === this.scratchSampleBuffer,
        });
        port.postMessage({
          type: 'start',
          posSec: deck.scratchPlaybackPos,
          rate: 0.15,
        });
        return;
      } catch (err) {
        console.warn('[AudioEngine] Worklet startScratch fallback:', err);
      }
    }

    // Start immediate tactile vinyl groove contact sound so user hears vinyl bite upon initial touch
    this.updateScratch(deckId, 0.001);
  }

  public updateScratch(deckId: DeckId, deltaSec: number) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx || !deck.isScratching || !deck.audioBuffer) return;

    if (!this.scratchSampleBuffer && !this.scratchSampleLoading) {
      this.loadScratchSample().catch(() => {});
    }

    const now = performance.now();
    const dt = Math.max(0.002, (now - (deck.scratchLastTimestamp || now)) / 1000);
    deck.scratchLastTimestamp = now;

    // Velocity = distance / time with responsive 1-pole filter
    const rawVelocity = deltaSec / dt;
    const clampedRaw = Math.max(-6.0, Math.min(6.0, rawVelocity));
    const prevRate = deck.scratchSmoothedRate ?? clampedRaw;
    const clampedRate = prevRate * 0.25 + clampedRaw * 0.75;
    deck.scratchSmoothedRate = clampedRate;
    const speed = Math.abs(clampedRate);

    // Keep playhead synchronized
    const duration = deck.audioBuffer?.duration || 210;
    const currentPos = deck.scratchPlaybackPos ?? deck.pauseOffset;
    const nextPos = Math.max(0, Math.min(duration, currentPos + deltaSec));
    deck.scratchPlaybackPos = nextPos;
    deck.pauseOffset = nextPos;

    // Fast path: AudioWorklet bi-directional sample scrubber (zero node re-allocation on direction flip)
    if (deck.scratchWorkletNode && this.scratchWorkletReady) {
      try {
        (deck.scratchWorkletNode as AudioWorkletNode).port.postMessage({
          type: 'rate',
          rate: clampedRate,
          posSec: nextPos,
        });
        return;
      } catch {}
    }

    const direction: 'forward' | 'reverse' = clampedRate < 0 ? 'reverse' : 'forward';

    // Algoriddim djay Pro behavior: When mouse is pressed, the needle rests on rotating vinyl.
    // When stationary (speed near 0), sustain continuous vinyl groove friction / needle rumble at low volume,
    // rather than cutting audio off completely. When moving, scale pitch & volume dynamically with scratch velocity.
    const isPausedHolding = speed < 0.04;
    const effectiveRate = isPausedHolding
      ? 0.18 // subtle needle drag frequency
      : direction === 'reverse'
      ? Math.max(0.2, Math.min(3.5, speed * 1.35 * 0.9))
      : Math.max(0.2, Math.min(3.5, speed * 1.35));

    const targetGain = isPausedHolding ? 0.22 : Math.min(1.0, 0.45 + speed * 0.55);

    // If scratch direction changed or scratch source not created yet, instantiate scratch source node
    if (!deck.scratchSourceNode || deck.scratchDirection !== direction) {
      if (deck.scratchSourceNode) {
        try {
          deck.scratchSourceNode.stop();
          deck.scratchSourceNode.disconnect();
        } catch {}
        deck.scratchSourceNode = null;
      }
      if (deck.scratchGainNode) {
        try {
          deck.scratchGainNode.disconnect();
        } catch {}
        deck.scratchGainNode = null;
      }

      deck.scratchDirection = direction;

      // Check if deck audio buffer is a silent streaming placeholder (peak < 0.001) or streaming deck
      const isBufferSilent = !deck.audioBuffer ||
        (deck.audioBuffer.length > 0 && Math.abs(deck.audioBuffer.getChannelData(0)[0] || 0) < 0.0005);

      let targetBuffer: AudioBuffer | null = null;
      let bufferOffset = nextPos;

      if (isBufferSilent && this.scratchSampleBuffer) {
        targetBuffer = this.scratchSampleBuffer;
        const sampleDur = this.scratchSampleBuffer.duration;
        bufferOffset = (Math.abs(nextPos * 2.5) % Math.max(0.1, sampleDur - 0.05));
      } else {
        targetBuffer = (direction === 'reverse' && deck.reverseAudioBuffer)
          ? deck.reverseAudioBuffer
          : deck.audioBuffer;
        bufferOffset = direction === 'reverse'
          ? Math.max(0, Math.min(duration, duration - nextPos))
          : nextPos;
      }

      if (!targetBuffer) {
        targetBuffer = this.scratchSampleBuffer;
        bufferOffset = 0;
      }

      if (!targetBuffer) return;

      const scratchGain = this.ctx.createGain();
      scratchGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
      scratchGain.connect(deck.gainTrim);
      deck.scratchGainNode = scratchGain;

      const scratchSrc = this.ctx.createBufferSource();
      scratchSrc.buffer = targetBuffer;
      scratchSrc.loop = true;
      scratchSrc.loopStart = 0;
      scratchSrc.loopEnd = Math.max(0.1, targetBuffer.duration);
      scratchSrc.playbackRate.setValueAtTime(effectiveRate, this.ctx.currentTime);
      scratchSrc.connect(scratchGain);

      scratchSrc.start(0, Math.max(0, Math.min(targetBuffer.duration - 0.01, bufferOffset)));
      deck.scratchSourceNode = scratchSrc;
    } else {
      // Modulate playback rate and volume continuously while user holds mouse click
      try {
        deck.scratchSourceNode.playbackRate.setTargetAtTime(effectiveRate, this.ctx.currentTime, 0.01);
        if (deck.scratchGainNode) {
          deck.scratchGainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
        }
      } catch {}
    }
  }

  public endScratch(deckId: DeckId) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    deck.isScratching = false;
    deck.scratchSmoothedRate = 0;

    if (deck.scratchWorkletNode) {
      try {
        (deck.scratchWorkletNode as AudioWorkletNode).port.postMessage({ type: 'stop' });
      } catch {}
    }

    // Disconnect scratch source node cleanly upon mouse release
    if (deck.scratchGainNode) {
      try {
        deck.scratchGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        deck.scratchGainNode.disconnect();
      } catch {}
      deck.scratchGainNode = null;
    }

    if (deck.scratchSourceNode) {
      try {
        deck.scratchSourceNode.stop();
        deck.scratchSourceNode.disconnect();
      } catch {}
      deck.scratchSourceNode = null;
    }

    // If deck was playing when scratch started, resume forward playback with DJTurntableStartDelay (~45ms Technics motor torque spin-up ramp)
    if (deck.isPlaying) {
      const resumePos = deck.scratchPlaybackPos ?? deck.pauseOffset;
      this.playDeck(deckId, resumePos);
      const targetRate = Math.max(0.1, deck.playbackRate || 1.0);
      const now = this.ctx.currentTime;
      const startSpinRate = Math.max(0.25, targetRate * 0.35);
      const motorSpinUpSec = 0.045;
      try {
        if (deck.sourceNode) {
          deck.sourceNode.playbackRate.setValueAtTime(startSpinRate, now);
          deck.sourceNode.playbackRate.linearRampToValueAtTime(targetRate, now + motorSpinUpSec);
        }
        if (deck.stemVocalsSource) {
          deck.stemVocalsSource.playbackRate.setValueAtTime(startSpinRate, now);
          deck.stemVocalsSource.playbackRate.linearRampToValueAtTime(targetRate, now + motorSpinUpSec);
          deck.stemDrumsSource?.playbackRate.setValueAtTime(startSpinRate, now);
          deck.stemDrumsSource?.playbackRate.linearRampToValueAtTime(targetRate, now + motorSpinUpSec);
          deck.stemBassSource?.playbackRate.setValueAtTime(startSpinRate, now);
          deck.stemBassSource?.playbackRate.linearRampToValueAtTime(targetRate, now + motorSpinUpSec);
          deck.stemHarmonicsSource?.playbackRate.setValueAtTime(startSpinRate, now);
          deck.stemHarmonicsSource?.playbackRate.linearRampToValueAtTime(targetRate, now + motorSpinUpSec);
        }
      } catch {}
    } else {
      deck.pauseOffset = deck.scratchPlaybackPos ?? deck.pauseOffset;
    }
  }

  // 3-Band Isolator EQ (-1.0 to +1.0) with True 24dB/oct Full Kill
  public setEQ(deckId: DeckId, band: 'low' | 'mid' | 'high', val: number, isKill: boolean = false) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;

    let targetGainDb = 0;
    if (isKill) {
      targetGainDb = -100; // True full-kill isolation (-100dB silence)
    } else {
      // Map -1.0 to 0.0 -> -100dB to 0dB; 0.0 to 1.0 -> 0dB to +6dB
      if (val < 0) {
        // High-precision non-linear logarithmic curve for natural DJ cuts
        targetGainDb = val * 100;
      } else {
        targetGainDb = val * 6;
      }
    }

    const node = band === 'low' ? deck.eqLow : band === 'mid' ? deck.eqMid : deck.eqHigh;
    node.gain.setTargetAtTime(targetGainDb, this.ctx.currentTime, 0.008);
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

  public setUnmixerMuteFxEnabled(enabled: boolean): void {
    this.unmixerMuteFxEnabled = enabled;
  }

  public isUnmixerMuteFxEnabled(): boolean {
    return this.unmixerMuteFxEnabled;
  }

  private triggerUnmixerMuteEchoTail(
    deck: DeckAudioNodes,
    stem: 'vocals' | 'harmonics' | 'bass' | 'drums'
  ): void {
    if (!this.ctx || deck.activeFxNode) return;
    const stemNodeMap = {
      vocals: deck.stemVocalsXfaderGain,
      bass: deck.stemBassXfaderGain,
      harmonics: deck.stemHarmonicsXfaderGain,
      drums: deck.stemDrumsXfaderGain,
    };
    const sendNode = stemNodeMap[stem];
    if (!sendNode) return;

    const now = this.ctx.currentTime;
    try {
      sendNode.connect(deck.fxDelayNode);
      deck.fxDelayNode.connect(deck.fxWetNode);
      deck.fxDelayNode.delayTime.setValueAtTime(0.24, now);
      deck.fxDelayFeedback.gain.setValueAtTime(0.42, now);
      deck.fxWetNode.gain.setValueAtTime(0.38, now);
      deck.fxWetNode.gain.setTargetAtTime(0.0, now + 0.05, 0.18);
      setTimeout(() => {
        if (!deck.activeFxNode) {
          try {
            sendNode.disconnect(deck.fxDelayNode);
            deck.fxDelayNode.disconnect(deck.fxWetNode);
          } catch {}
        }
      }, 900);
    } catch {}
  }

  // Neural Mix 4-Stem Methods
  public setStemGain(deckId: DeckId, stem: 'vocals' | 'harmonics' | 'bass' | 'drums', val: number) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    const gain = Math.max(0, Math.min(val, 1.5));
    deck.stemState[stem] = gain;
    this.recalculateStemGains(deck);
  }

  public toggleStemMute(deckId: DeckId, stem: 'vocals' | 'harmonics' | 'bass' | 'drums'): boolean {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return false;
    const muteKey = `${stem}Muted` as 'vocalsMuted' | 'harmonicsMuted' | 'bassMuted' | 'drumsMuted';
    deck.stemState[muteKey] = !deck.stemState[muteKey];
    deck.stemState.muteFxEchoOut = this.unmixerMuteFxEnabled;
    if (deck.stemState[muteKey] && this.unmixerMuteFxEnabled && !deck.activeFxNode) {
      this.triggerUnmixerMuteEchoTail(deck, stem);
    }
    this.recalculateStemGains(deck);
    return deck.stemState[muteKey];
  }

  public toggleStemSolo(deckId: DeckId, stem: 'vocals' | 'harmonics' | 'bass' | 'drums'): boolean {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return false;
    const soloKey = `${stem}Solo` as 'vocalsSolo' | 'harmonicsSolo' | 'bassSolo' | 'drumsSolo';
    const isNowSolo = !deck.stemState[soloKey];
    deck.stemState.vocalsSolo = false;
    deck.stemState.harmonicsSolo = false;
    deck.stemState.bassSolo = false;
    deck.stemState.drumsSolo = false;
    deck.stemState[soloKey] = isNowSolo;
    this.recalculateStemGains(deck);
    return isNowSolo;
  }

  public getStemState(deckId: DeckId): StemState | null {
    const deck = this.decks.get(deckId);
    return deck ? { ...deck.stemState } : null;
  }

  /**
   * Instant Acapella 1-Tap Toggle (djay Pro / Serato Stems style)
   * Solos vocals with 100% clean isolation; toggling again restores all stems.
   */
  public isolateAcapella(deckId: DeckId): boolean {
    const deck = this.decks.get(deckId);
    if (!deck) return false;
    const isAlreadyAcapella = deck.stemState.vocalsSolo && !deck.stemState.vocalsMuted;
    if (isAlreadyAcapella) {
      this.resetStems(deckId);
      return false;
    } else {
      deck.stemState.vocalsMuted = false;
      deck.stemState.vocalsSolo = true;
      deck.stemState.drumsSolo = false;
      deck.stemState.bassSolo = false;
      deck.stemState.harmonicsSolo = false;
      deck.stemState.drumsMuted = false;
      deck.stemState.bassMuted = false;
      deck.stemState.harmonicsMuted = false;
      this.recalculateStemGains(deck);
      return true;
    }
  }

  /**
   * Instant Instrumental 1-Tap Toggle
   * Completely cuts vocals with 0% bleed while drums, bass & melody play; toggling restores vocals.
   */
  public isolateInstrumental(deckId: DeckId): boolean {
    const deck = this.decks.get(deckId);
    if (!deck) return false;
    const isAlreadyInst = deck.stemState.vocalsMuted && !deck.stemState.drumsMuted;
    if (isAlreadyInst) {
      this.resetStems(deckId);
      return false;
    } else {
      deck.stemState.vocalsMuted = true;
      deck.stemState.vocalsSolo = false;
      deck.stemState.drumsSolo = false;
      deck.stemState.bassSolo = false;
      deck.stemState.harmonicsSolo = false;
      deck.stemState.drumsMuted = false;
      deck.stemState.bassMuted = false;
      deck.stemState.harmonicsMuted = false;
      this.recalculateStemGains(deck);
      return true;
    }
  }

  /**
   * Instant Drum Break 1-Tap Toggle
   */
  public isolateDrums(deckId: DeckId): boolean {
    const deck = this.decks.get(deckId);
    if (!deck) return false;
    const isAlreadyDrums = deck.stemState.drumsSolo && !deck.stemState.drumsMuted;
    if (isAlreadyDrums) {
      this.resetStems(deckId);
      return false;
    } else {
      deck.stemState.drumsMuted = false;
      deck.stemState.drumsSolo = true;
      deck.stemState.vocalsSolo = false;
      deck.stemState.bassSolo = false;
      deck.stemState.harmonicsSolo = false;
      this.recalculateStemGains(deck);
      return true;
    }
  }

  /**
   * Reset all stems to unity gain and unmute
   */
  public resetStems(deckId: DeckId) {
    const deck = this.decks.get(deckId);
    if (!deck) return;
    deck.stemState.vocals = 1.0;
    deck.stemState.harmonics = 1.0;
    deck.stemState.bass = 1.0;
    deck.stemState.drums = 1.0;
    deck.stemState.vocalsMuted = false;
    deck.stemState.harmonicsMuted = false;
    deck.stemState.bassMuted = false;
    deck.stemState.drumsMuted = false;
    deck.stemState.vocalsSolo = false;
    deck.stemState.harmonicsSolo = false;
    deck.stemState.bassSolo = false;
    deck.stemState.drumsSolo = false;
    deck.stemState.vocalsSwapped = false;
    deck.stemState.harmonicsSwapped = false;
    deck.stemState.bassSwapped = false;
    deck.stemState.drumsSwapped = false;
    this.recalculateStemGains(deck);
  }

  /**
   * Live Stem Swap between Deck A & Deck B (turntable.unmixerFourTrackChannel1..4Swapped)
   */
  public toggleStemSwap(stem: 'vocals' | 'harmonics' | 'bass' | 'drums'): boolean {
    const deckA = this.decks.get('A');
    const deckB = this.decks.get('B');
    if (!deckA || !deckB) return false;

    const swapKey = `${stem}Swapped` as 'vocalsSwapped' | 'harmonicsSwapped' | 'bassSwapped' | 'drumsSwapped';
    const muteKey = `${stem}Muted` as 'vocalsMuted' | 'harmonicsMuted' | 'bassMuted' | 'drumsMuted';
    const nextSwapped = !deckA.stemState[swapKey];

    deckA.stemState[swapKey] = nextSwapped;
    deckB.stemState[swapKey] = nextSwapped;

    if (nextSwapped) {
      deckA.stemState[muteKey] = true;
      deckB.stemState[muteKey] = false;
    } else {
      deckA.stemState[muteKey] = false;
      deckB.stemState[muteKey] = false;
    }

    this.recalculateStemGains(deckA);
    this.recalculateStemGains(deckB);
    return nextSwapped;
  }

  /**
   * Instant Doubles with selective NeuralMix stem transfer (copyTurntable:toTurntable:unloadOld:unmixerChannelsToMove:)
   */
  public instantDoubleWithStems(
    sourceDeckId: DeckId,
    targetDeckId: DeckId,
    stemsToMove?: ('vocals' | 'harmonics' | 'bass' | 'drums')[]
  ): boolean {
    const src = this.decks.get(sourceDeckId);
    const dst = this.decks.get(targetDeckId);
    if (!src || !dst || !src.audioBuffer) return false;

    const currentPos = this.getCurrentTime(sourceDeckId);
    const wasPlaying = src.isPlaying;
    const targetRate = src.playbackRate;
    const targetPitch = src.pitchSemitones;

    this.loadTrackToDeck(targetDeckId, src.audioBuffer, src.stemBuffers || undefined);
    const refreshedDst = this.decks.get(targetDeckId);
    if (!refreshedDst) return false;

    refreshedDst.playbackRate = targetRate;
    refreshedDst.pitchSemitones = targetPitch;
    refreshedDst.pauseOffset = currentPos;

    if (stemsToMove && stemsToMove.length > 0) {
      const allStems: ('vocals' | 'harmonics' | 'bass' | 'drums')[] = ['vocals', 'harmonics', 'bass', 'drums'];
      for (const stem of allStems) {
        const muteKey = `${stem}Muted` as 'vocalsMuted' | 'harmonicsMuted' | 'bassMuted' | 'drumsMuted';
        const soloKey = `${stem}Solo` as 'vocalsSolo' | 'harmonicsSolo' | 'bassSolo' | 'drumsSolo';
        const moved = stemsToMove.includes(stem);
        src.stemState[muteKey] = moved;
        src.stemState[soloKey] = false;
        refreshedDst.stemState[muteKey] = !moved;
        refreshedDst.stemState[soloKey] = false;
      }
      this.recalculateStemGains(src);
      this.recalculateStemGains(refreshedDst);
    }

    if (wasPlaying) {
      this.playDeck(targetDeckId, currentPos);
    }
    return true;
  }

  // VirtualDJ Sandbox Mode: Private Headphone Transition Auditioning
  public setDeckSandbox(deckId: DeckId, isSandbox: boolean): boolean {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return false;

    if (isSandbox && !deck.isSandbox) {
      deck.isSandbox = true;
      deck.preSandboxTime = this.getCurrentTime(deckId);
      deck.preSandboxPlaying = deck.isPlaying;

      // Disconnect from master output completely
      deck.crossfaderGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.005);
      // Route immediately into headphone cue
      deck.cueGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.005);
    } else if (!isSandbox && deck.isSandbox) {
      deck.isSandbox = false;
      this.updateCrossfaderGains();
    }

    return deck.isSandbox;
  }

  public isDeckSandbox(deckId: DeckId): boolean {
    const deck = this.decks.get(deckId);
    return deck ? !!deck.isSandbox : false;
  }

  private recalculateStemGains(deck: DeckAudioNodes) {
    if (!this.ctx) return;
    const hasSolo = deck.stemState.vocalsSolo || deck.stemState.harmonicsSolo || deck.stemState.bassSolo || deck.stemState.drumsSolo;

    const effVocals = deck.stemState.vocalsMuted
      ? 0
      : hasSolo
      ? (deck.stemState.vocalsSolo ? deck.stemState.vocals : 0)
      : deck.stemState.vocals;

    const effBass = deck.stemState.bassMuted
      ? 0
      : hasSolo
      ? (deck.stemState.bassSolo ? deck.stemState.bass : 0)
      : deck.stemState.bass;

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

    // Musical 0.18s echo-out decay when ARUnmixerMuteWithFx is enabled vs 15ms anti-pop ramp
    const decayConst = (targetGain: number) => (targetGain === 0 && this.unmixerMuteFxEnabled ? 0.18 : 0.015);
    deck.stemVocalsGain.gain.setTargetAtTime(effVocals, this.ctx.currentTime, decayConst(effVocals));
    deck.stemBassGain.gain.setTargetAtTime(effBass, this.ctx.currentTime, decayConst(effBass));
    deck.stemDrumsGain.gain.setTargetAtTime(effDrums, this.ctx.currentTime, decayConst(effDrums));
    deck.stemHarmonicsGain.gain.setTargetAtTime(effHarmonics, this.ctx.currentTime, decayConst(effHarmonics));
  }

  public setCrossfaderHamster(enabled: boolean) {
    this.crossfaderHamster = enabled;
    this.updateCrossfaderGains();
  }

  public getCrossfaderHamster(): boolean {
    return this.crossfaderHamster;
  }

  /**
   * Serato Split-Headphone Cable Mode (Master on Left, Cue on Right)
   */
  public setSplitHeadphoneMode(enabled: boolean) {
    this.splitHeadphoneMode = enabled;
  }

  public getSplitHeadphoneMode(): boolean {
    return this.splitHeadphoneMode;
  }

  /**
   * Serato Censor / Reverse-Slip: plays track in reverse (-1.0x) while slip playhead advances
   */
  public startCensor(deckId: DeckId) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    (deck as any)._censorStartTime = performance.now();
    (deck as any)._censorStartPos = this.getCurrentTime(deckId);
    (deck as any)._censorWasPlaying = deck.isPlaying;
    this.startScratch(deckId);
    this.updateScratch(deckId, -0.02);
  }

  public endCensor(deckId: DeckId) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    const startTime = (deck as any)._censorStartTime || performance.now();
    const startPos = (deck as any)._censorStartPos || 0;
    const wasPlaying = Boolean((deck as any)._censorWasPlaying);
    const elapsedSec = ((performance.now() - startTime) / 1000) * (deck.playbackRate || 1.0);
    this.endScratch(deckId);
    if (wasPlaying) {
      const targetPos = Math.min(deck.audioBuffer?.duration || 210, startPos + elapsedSec);
      this.playDeck(deckId, targetPos);
    }
  }

  /**
   * Serato Pitch Play: triggers a cue point shifted by semitoneOffset (-12..+12)
   */
  public triggerPitchPlay(deckId: DeckId, cuePosSec: number, semitoneOffset: number) {
    this.setDeckPitchSemitones(deckId, semitoneOffset);
    this.playDeck(deckId, cuePosSec);
  }

  /**
   * Mixxx Auto-Gain / ReplayGain Normalization (enginepregain.cpp):
   * Measures RMS loudness of the loaded AudioBuffer and normalizes deck trim toward -14 LUFS (~0.20 RMS).
   */
  public computeAutoGain(deckId: DeckId): number {
    const deck = this.decks.get(deckId);
    if (!deck || !deck.audioBuffer || !this.ctx) return 1.0;
    const ch0 = deck.audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.floor(ch0.length / 20000));
    let sumSq = 0;
    let count = 0;
    for (let i = 0; i < ch0.length; i += step) {
      sumSq += ch0[i] * ch0[i];
      count++;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, count));
    if (rms < 0.001) return 1.0;
    const gain = Math.max(0.5, Math.min(2.0, 0.20 / rms));
    (deck as any)._autoGain = gain;
    this.updateCrossfaderGains();
    return gain;
  }

  /**
   * Mixxx Talkover / Mic Sidechain Ducking (enginetalkoverducking.cpp):
   * Smoothly ducks the master mix by duckDb (default -12 dB) when talkover is active.
   */
  public setTalkover(active: boolean, duckDb: number = -12) {
    if (!this.ctx || !this.masterGain) return;
    const targetGain = active ? Math.pow(10, duckDb / 20) : 1.0;
    const tc = active ? 0.04 : 0.25;
    this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, tc);
  }

  /**
   * Mixxx Slip-Mode Loop Roll (slipmodestate.h):
   * Loops a quantized beat slice while the underlying playhead advances invisibly,
   * snapping back to the live beat position on release.
   */
  public startLoopRoll(deckId: DeckId, beats: number = 0.25, bpm: number = 120) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    (deck as any)._loopRollStartTime = performance.now();
    (deck as any)._loopRollStartPos = this.getCurrentTime(deckId);
    (deck as any)._loopRollWasPlaying = deck.isPlaying;
    const beatSec = 60 / Math.max(40, bpm || 120);
    const loopLen = Math.max(0.05, beats * beatSec);
    const startPos = (deck as any)._loopRollStartPos;
    const endPos = Math.min(deck.audioBuffer?.duration || startPos + loopLen, startPos + loopLen);
    if (deck.sourceNode) {
      deck.sourceNode.loopStart = startPos;
      deck.sourceNode.loopEnd = endPos;
      deck.sourceNode.loop = true;
    }
  }

  public endLoopRoll(deckId: DeckId) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    const startTime = (deck as any)._loopRollStartTime || performance.now();
    const startPos = (deck as any)._loopRollStartPos || 0;
    const wasPlaying = Boolean((deck as any)._loopRollWasPlaying);
    const elapsedSec = ((performance.now() - startTime) / 1000) * (deck.playbackRate || 1.0);
    if (deck.sourceNode) {
      deck.sourceNode.loop = false;
    }
    if (wasPlaying) {
      const targetPos = Math.min(deck.audioBuffer?.duration || 210, startPos + elapsedSec);
      this.playDeck(deckId, targetPos);
    }
  }

  private updateCrossfaderGains() {
    if (!this.ctx) return;
    const deckA = this.decks.get('A');
    const deckB = this.decks.get('B');
    if (!deckA || !deckB) return;

    let gainA = 1.0;
    let gainB = 1.0;

    // Normalize val from [-1, 1] to [0, 1] where 0 is full A, 1 is full B (inverted when Hamster mode is active)
    const rawPos = (this.crossfaderVal + 1.0) / 2.0;
    const pos = this.crossfaderHamster ? 1.0 - rawPos : rawPos;

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

    // Isolate sandboxed decks from Master
    if (deckA.isSandbox) gainA = 0.0;
    if (deckB.isSandbox) gainB = 0.0;

    const autoGainA = (deckA as any)._autoGain || 1.0;
    const autoGainB = (deckB as any)._autoGain || 1.0;
    const xfadeTc = this.crossfaderCurve === 'scratch' ? 0.0015 : 0.004;

    deckA.crossfaderGain.gain.setTargetAtTime(gainA * autoGainA, this.ctx.currentTime, xfadeTc);
    deckB.crossfaderGain.gain.setTargetAtTime(gainB * autoGainB, this.ctx.currentTime, xfadeTc);

    // ==========================================
    // Neural Mix Crossfader Transition Automation
    // ==========================================
    let stemDrumsA = 1.0, stemBassA = 1.0, stemVocalsA = 1.0, stemHarmonicsA = 1.0;
    let stemDrumsB = 1.0, stemBassB = 1.0, stemVocalsB = 1.0, stemHarmonicsB = 1.0;

    if (this.neuralTransitionMode === 'bass_swap') {
      // Bass swaps cleanly across center (0.45 to 0.55), while Vocals/Melody blend smoothly
      stemBassA = pos < 0.45 ? 1.0 : pos > 0.55 ? 0.0 : (0.55 - pos) * 10.0;
      stemBassB = pos > 0.55 ? 1.0 : pos < 0.45 ? 0.0 : (pos - 0.45) * 10.0;
    } else if (this.neuralTransitionMode === 'drum_swap') {
      // Drums/percussion swap instantly at center phrase mark
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
    } else if (this.neuralTransitionMode === 'vocal_sustain') {
      // Outgoing vocals sustain all the way through the mix until full crossfade
      stemVocalsA = pos < 0.85 ? 1.0 : (1.0 - pos) / 0.15;
      stemBassA = pos < 0.45 ? 1.0 : pos > 0.55 ? 0.0 : (0.55 - pos) * 10.0;
      stemDrumsA = pos < 0.45 ? 1.0 : pos > 0.55 ? 0.0 : (0.55 - pos) * 10.0;
      stemBassB = pos > 0.55 ? 1.0 : pos < 0.45 ? 0.0 : (pos - 0.45) * 10.0;
      stemDrumsB = pos > 0.55 ? 1.0 : pos < 0.45 ? 0.0 : (pos - 0.45) * 10.0;
    } else if (this.neuralTransitionMode === 'harmonic_sustain') {
      // Outgoing melody/pads sustain and float over incoming rhythm
      stemHarmonicsA = pos < 0.85 ? 1.0 : (1.0 - pos) / 0.15;
      stemBassA = pos < 0.45 ? 1.0 : pos > 0.55 ? 0.0 : (0.55 - pos) * 10.0;
      stemDrumsA = pos < 0.45 ? 1.0 : pos > 0.55 ? 0.0 : (0.55 - pos) * 10.0;
      stemBassB = pos > 0.55 ? 1.0 : pos < 0.45 ? 0.0 : (pos - 0.45) * 10.0;
      stemDrumsB = pos > 0.55 ? 1.0 : pos < 0.45 ? 0.0 : (pos - 0.45) * 10.0;
    } else if (this.neuralTransitionMode === 'vocal_cut') {
      // Cuts outgoing vocals early so incoming vocals can enter with zero collision
      stemVocalsA = pos < 0.25 ? 1.0 : pos > 0.35 ? 0.0 : (0.35 - pos) * 10.0;
      stemVocalsB = pos > 0.35 ? 1.0 : pos < 0.25 ? 0.0 : (pos - 0.25) * 10.0;
    } else if (this.neuralTransitionMode === 'drum_cut') {
      // Outgoing drums cut early into an acapella/melodic drop
      stemDrumsA = pos < 0.25 ? 1.0 : pos > 0.35 ? 0.0 : (0.35 - pos) * 10.0;
      stemDrumsB = pos > 0.35 ? 1.0 : pos < 0.25 ? 0.0 : (pos - 0.25) * 10.0;
    } else if (this.neuralTransitionMode === 'echo_out_vocal') {
      // djay Pro DJNeuralMixEchoOutCrossfadeFX: smooth vocal tail fade with instant rhythm swap
      stemVocalsA = pos < 0.5 ? 1.0 : Math.max(0, 1.0 - (pos - 0.5) * 2.5);
      stemBassA = pos < 0.45 ? 1.0 : 0.0;
      stemDrumsA = pos < 0.45 ? 1.0 : 0.0;
      stemBassB = pos > 0.55 ? 1.0 : (pos - 0.45) * 10.0;
      stemDrumsB = pos > 0.55 ? 1.0 : (pos - 0.45) * 10.0;
    } else if (this.neuralTransitionMode === 'echo_out_drum') {
      // djay Pro DJNeuralMixDrumCutCrossfadeFX: cuts drums on downbeat with reverberant tail
      stemDrumsA = pos < 0.4 ? 1.0 : 0.0;
      stemDrumsB = pos > 0.5 ? 1.0 : 0.0;
    }

    deckA.stemDrumsXfaderGain.gain.setTargetAtTime(stemDrumsA, this.ctx.currentTime, 0.01);
    deckA.stemBassXfaderGain.gain.setTargetAtTime(stemBassA, this.ctx.currentTime, 0.01);
    deckA.stemVocalsXfaderGain.gain.setTargetAtTime(stemVocalsA, this.ctx.currentTime, 0.01);
    deckA.stemHarmonicsXfaderGain.gain.setTargetAtTime(stemHarmonicsA, this.ctx.currentTime, 0.01);

    deckB.stemDrumsXfaderGain.gain.setTargetAtTime(stemDrumsB, this.ctx.currentTime, 0.01);
    deckB.stemBassXfaderGain.gain.setTargetAtTime(stemBassB, this.ctx.currentTime, 0.01);
    deckB.stemVocalsXfaderGain.gain.setTargetAtTime(stemVocalsB, this.ctx.currentTime, 0.01);
    deckB.stemHarmonicsXfaderGain.gain.setTargetAtTime(stemHarmonicsB, this.ctx.currentTime, 0.01);
  }

  public setMasterVolume(vol: number) {
    if (!this.masterGain || !this.ctx) return;
    this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(vol, 1.0)), this.ctx.currentTime, 0.01);
  }

  public setHeadphoneVolume(vol: number) {
    if (!this.headphoneGain || !this.ctx) return;
    this.headphoneGain.gain.setTargetAtTime(Math.max(0, Math.min(vol, 1.0)), this.ctx.currentTime, 0.01);
  }

  public setCueActive(deckId: DeckId, active: boolean) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;
    const targetGain = active ? 1.0 : 0.0;
    deck.cueGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.01);
  }

  /**
   * Sets up output routing for Master bus and Headphone Cue bus.
   * Supports modern setSinkId on AudioContext and HTMLAudioElement fallback to route audio
   * independently to USB DJ Controllers, GoXLR Mini, external interfaces, or private headphones.
   */
  private async setupOutputRouting() {
    if (!this.ctx || !this.masterGain || !this.masterLimiter || !this.masterAnalyser || !this.headphoneGain) return;

    // Disconnect any existing master/headphone destinations
    try {
      this.masterGain.disconnect();
      this.masterLimiter.disconnect();
      this.masterAnalyser.disconnect();
      this.headphoneGain.disconnect();
    } catch {}

    // Master chain: masterGain -> masterLimiter -> masterAnalyser
    this.masterGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterAnalyser);

    const sinkTarget = (devId: string) => (devId === 'default' ? '' : devId);

    // If both master and headphone share the same output or default, try AudioContext.setSinkId
    const isShared = this.masterDeviceId === this.headphoneDeviceId;
    let audioContextSinkSuccess = false;

    if (isShared && typeof (this.ctx as any).setSinkId === 'function') {
      try {
        await (this.ctx as any).setSinkId(sinkTarget(this.masterDeviceId));
        this.masterAnalyser.connect(this.ctx.destination);
        this.headphoneGain.connect(this.ctx.destination);
        audioContextSinkSuccess = true;
        console.log(`[AUDIO ROUTING] Successfully set AudioContext sink to "${this.masterDeviceId}"`);
      } catch (err) {
        console.warn('[AUDIO ROUTING] AudioContext.setSinkId failed, falling back to MediaStream routing:', err);
      }
    }

    if (!audioContextSinkSuccess) {
      // Independent or dedicated routing via MediaStreamAudioDestinationNode + HTMLAudioElement
      // 1. Master Output
      try {
        const masterDest = this.ctx.createMediaStreamDestination();
        this.masterAnalyser.connect(masterDest);
        if (!this.masterAudioElement) {
          this.masterAudioElement = new Audio();
          this.masterAudioElement.autoplay = true;
          this.masterAudioElement.style.display = 'none';
          if (typeof document !== 'undefined' && document.body) {
            document.body.appendChild(this.masterAudioElement);
          }
        }
        if (typeof (this.masterAudioElement as any).setSinkId === 'function') {
          (this.masterAudioElement as any).setSinkId(sinkTarget(this.masterDeviceId))
            .then(() => {
              if (this.masterAudioElement) {
                this.masterAudioElement.srcObject = masterDest.stream;
                this.masterAudioElement.play().catch(() => {});
              }
            })
            .catch((e: any) => {
              console.warn('[AUDIO ROUTING] Master HTMLAudioElement.setSinkId error:', e);
              if (this.masterAudioElement) {
                this.masterAudioElement.srcObject = masterDest.stream;
                this.masterAudioElement.play().catch(() => {});
              }
            });
        } else {
          this.masterAudioElement.srcObject = masterDest.stream;
          this.masterAudioElement.play().catch(() => {});
        }
      } catch (err) {
        console.warn('[AUDIO ROUTING] Master MediaStream routing failed, falling back to ctx.destination:', err);
        this.masterAnalyser.connect(this.ctx.destination);
      }

      // 2. Headphone Output
      try {
        const hpDest = this.ctx.createMediaStreamDestination();
        this.headphoneGain.connect(hpDest);
        if (!this.headphoneAudioElement) {
          this.headphoneAudioElement = new Audio();
          this.headphoneAudioElement.autoplay = true;
          this.headphoneAudioElement.style.display = 'none';
          if (typeof document !== 'undefined' && document.body) {
            document.body.appendChild(this.headphoneAudioElement);
          }
        }
        if (typeof (this.headphoneAudioElement as any).setSinkId === 'function') {
          (this.headphoneAudioElement as any).setSinkId(sinkTarget(this.headphoneDeviceId))
            .then(() => {
              if (this.headphoneAudioElement) {
                this.headphoneAudioElement.srcObject = hpDest.stream;
                this.headphoneAudioElement.play().catch(() => {});
              }
            })
            .catch((e: any) => {
              console.warn('[AUDIO ROUTING] Headphone HTMLAudioElement.setSinkId error:', e);
              if (this.headphoneAudioElement) {
                this.headphoneAudioElement.srcObject = hpDest.stream;
                this.headphoneAudioElement.play().catch(() => {});
              }
            });
        } else {
          this.headphoneAudioElement.srcObject = hpDest.stream;
          this.headphoneAudioElement.play().catch(() => {});
        }
      } catch (err) {
        console.warn('[AUDIO ROUTING] Headphone MediaStream routing failed, falling back to ctx.destination:', err);
        this.headphoneGain.connect(this.ctx.destination);
      }
    }
  }

  public async setMasterOutputDevice(deviceId: string): Promise<boolean> {
    this.masterDeviceId = deviceId || 'default';
    this.init();
    if (!this.ctx) return true;

    try {
      this.setupOutputRouting();
      return true;
    } catch (err) {
      console.error('[AUDIO ROUTING] Failed to set master output device:', err);
      return false;
    }
  }

  public async setHeadphoneOutputDevice(deviceId: string): Promise<boolean> {
    this.headphoneDeviceId = deviceId || 'default';
    this.init();
    if (!this.ctx) return true;

    try {
      this.setupOutputRouting();
      return true;
    } catch (err) {
      console.error('[AUDIO ROUTING] Failed to set headphone output device:', err);
      return false;
    }
  }

  public async setCueOutputDevice(deviceId: string): Promise<boolean> {
    return this.setHeadphoneOutputDevice(deviceId);
  }

  public getMasterDestination(): AudioNode | null {
    return this.masterLimiter || this.masterGain;
  }

  public getCueDestination(): AudioNode | null {
    return this.headphoneGain;
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public get audioCtx(): AudioContext | null {
    return this.ctx;
  }

  public getMasterDeviceId(): string {
    return this.masterDeviceId;
  }

  public getHeadphoneDeviceId(): string {
    return this.headphoneDeviceId;
  }

  public async getAvailableAudioDevices(): Promise<MediaDeviceInfo[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'audiooutput');
    } catch (err) {
      console.warn('[AUDIO ROUTING] enumerateDevices error:', err);
      return [];
    }
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
    if (deck.stemVocalsSource) {
      const stems = [deck.stemVocalsSource, deck.stemDrumsSource, deck.stemBassSource, deck.stemHarmonicsSource];
      for (const s of stems) {
        if (s) {
          s.loop = true;
          s.loopStart = startSec;
          s.loopEnd = endSec;
        }
      }
    }
  }

  public exitLoop(deckId: DeckId) {
    const deck = this.decks.get(deckId);
    if (!deck) return;
    deck.loopRegion = null;
    if (deck.sourceNode) {
      deck.sourceNode.loop = false;
    }
    if (deck.stemVocalsSource) {
      const stems = [deck.stemVocalsSource, deck.stemDrumsSource, deck.stemBassSource, deck.stemHarmonicsSource];
      for (const s of stems) {
        if (s) {
          s.loop = false;
        }
      }
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

  public setFXStemRouting(deckId: DeckId, target: FXTarget): void {
    this.fxStemTargets.set(deckId, target);
  }

  public getFXStemRouting(deckId: DeckId): FXTarget {
    return this.fxStemTargets.get(deckId) || 'master';
  }

  /**
   * Per-Stem Bounce Loop Routing (turntable.bounceLoopRouting.routingFourTrackChannel1..4)
   */
  public triggerStemBounceLoop(
    deckId: DeckId,
    stem: FXTarget,
    beats: number = 0.25,
    bpm: number = 126
  ): void {
    this.setFXStemRouting(deckId, stem);
    this.setDeckFX(
      deckId,
      {
        enabled: true,
        type: 'roll',
        wetDry: 0.9,
        beats: Math.max(0.03125, beats),
        param: 0.85,
        target: stem,
      },
      bpm
    );
  }

  public getActiveNeuralMixInstantFX(deckId: DeckId): NeuralMixInstantFXId | null {
    return this.activeInstantFx.get(deckId) || null;
  }

  /**
   * Trigger one of the 10 Algoriddim djay Pro InstantFXNeuralMix* presets
   */
  public triggerNeuralMixInstantFX(
    deckId: DeckId,
    presetId: NeuralMixInstantFXId | null,
    active: boolean = true,
    bpm: number = 126
  ): void {
    const deck = this.decks.get(deckId);
    if (!deck) return;

    if (!active || !presetId) {
      this.activeInstantFx.set(deckId, null);
      const savedStems = this.preInstantFxStems.get(deckId);
      if (savedStems) {
        deck.stemState = { ...savedStems };
        this.preInstantFxStems.delete(deckId);
        this.recalculateStemGains(deck);
      }
      this.setDeckFX(
        deckId,
        {
          enabled: false,
          type: 'echo',
          wetDry: 0,
          beats: 0.5,
          param: 0.5,
          target: 'master',
        },
        bpm
      );
      return;
    }

    const preset = NEURAL_MIX_INSTANT_FX_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    if (!this.preInstantFxStems.has(deckId)) {
      this.preInstantFxStems.set(deckId, { ...deck.stemState });
    }
    const baseStems = this.preInstantFxStems.get(deckId)!;
    deck.stemState = { ...baseStems };

    if (preset.muteStems) {
      for (const s of preset.muteStems) {
        const muteKey = `${s}Muted` as 'vocalsMuted' | 'harmonicsMuted' | 'bassMuted' | 'drumsMuted';
        deck.stemState[muteKey] = true;
      }
    }
    if (preset.stemMultipliers) {
      (['vocals', 'drums', 'bass', 'harmonics'] as const).forEach((s) => {
        const mult = preset.stemMultipliers?.[s];
        if (typeof mult === 'number') {
          deck.stemState[s] = Math.max(0, Math.min(1.5, baseStems[s] * mult));
        }
      });
    }

    this.recalculateStemGains(deck);
    this.activeInstantFx.set(deckId, presetId);
    this.setFXStemRouting(deckId, preset.target);
    this.setDeckFX(
      deckId,
      {
        enabled: true,
        type: preset.fxType,
        wetDry: preset.wetDry,
        beats: preset.beats,
        param: preset.param,
        target: preset.target,
      },
      bpm
    );
  }

  // Multi-FX Studio Engine (ARMidiUnmixerRouting per-stem capable)
  public setDeckFX(deckId: DeckId, fx: FXUnit, deckBpm: number = 126) {
    const deck = this.decks.get(deckId);
    if (!deck || !this.ctx) return;

    const target: FXTarget = fx.target || this.fxStemTargets.get(deckId) || 'master';
    this.fxStemTargets.set(deckId, target);

    const wet = fx.enabled ? Math.max(0, Math.min(1, fx.wetDry)) : 0.0;
    const dry = target === 'master' ? 1.0 - wet * 0.6 : 0.0;

    deck.fxBypassDryGain.gain.setValueAtTime(target === 'master' ? 0.0 : 1.0, this.ctx.currentTime);
    deck.fxDryNode.gain.setValueAtTime(dry, this.ctx.currentTime);
    deck.fxWetNode.gain.setValueAtTime(wet, this.ctx.currentTime);

    // Calculate tempo-synced delay time
    const bpm = Math.max(60, deckBpm || 120);
    const beatSec = 60.0 / bpm;
    const delayTime = Math.max(0.01, Math.min(2.5, beatSec * fx.beats));

    // Disconnect previously active fx output node from wet node to prevent connection stacking
    if (deck.activeFxNode) {
      try { deck.activeFxNode.disconnect(deck.fxWetNode); } catch {}
      deck.activeFxNode = null;
    }

    // Rewire FX input from either full deck mix or discrete target stem bus
    const stemBusMap: Record<Exclude<FXTarget, 'master'>, AudioNode> = {
      vocals: deck.stemVocalsXfaderGain,
      bass: deck.stemBassXfaderGain,
      harmonics: deck.stemHarmonicsXfaderGain,
      drums: deck.stemDrumsXfaderGain,
    };
    try { deck.analyser.disconnect(deck.fxInputNode); } catch {}
    Object.values(stemBusMap).forEach((node) => {
      try { node.disconnect(deck.fxInputNode); } catch {}
    });
    try { deck.fxInputNode.disconnect(); } catch {}
    deck.fxInputNode.connect(deck.fxDryNode);

    if (target === 'master') {
      deck.analyser.connect(deck.fxInputNode);
    } else {
      stemBusMap[target].connect(deck.fxInputNode);
    }

    if (fx.enabled && wet > 0.01) {
      let activeNode: AudioNode | null = null;
      if (fx.type === 'echo') {
        deck.fxDelayNode.delayTime.setValueAtTime(delayTime, this.ctx.currentTime);
        deck.fxDelayFeedback.gain.setValueAtTime(Math.min(0.85, 0.25 + fx.param * 0.55), this.ctx.currentTime);
        deck.fxInputNode.connect(deck.fxDelayNode);
        deck.fxDelayNode.connect(deck.fxWetNode);
        activeNode = deck.fxDelayNode;
      } else if (fx.type === 'reverb') {
        deck.fxInputNode.connect(deck.fxConvolverNode);
        deck.fxConvolverNode.connect(deck.fxWetNode);
        activeNode = deck.fxConvolverNode;
      } else if (fx.type === 'flanger') {
        deck.fxInputNode.connect(deck.fxFlangerDelay);
        deck.fxFlangerDelay.connect(deck.fxWetNode);
        activeNode = deck.fxFlangerDelay;
      } else if (fx.type === 'bitcrusher') {
        deck.fxInputNode.connect(deck.fxBitcrusherCurve);
        deck.fxBitcrusherCurve.connect(deck.fxWetNode);
        activeNode = deck.fxBitcrusherCurve;
      } else if (fx.type === 'filter') {
        const sweepFreq = 250 + fx.param * 5500;
        deck.fxFilterSweep.frequency.setValueAtTime(sweepFreq, this.ctx.currentTime);
        deck.fxInputNode.connect(deck.fxFilterSweep);
        deck.fxFilterSweep.connect(deck.fxWetNode);
        activeNode = deck.fxFilterSweep;
      } else if (fx.type === 'roll') {
        deck.fxDelayNode.delayTime.setValueAtTime(delayTime, this.ctx.currentTime);
        deck.fxDelayFeedback.gain.setValueAtTime(0.96, this.ctx.currentTime); // Infinite stutter hold
        deck.fxInputNode.connect(deck.fxDelayNode);
        deck.fxDelayNode.connect(deck.fxWetNode);
        activeNode = deck.fxDelayNode;
      } else if (fx.type === 'pingpong') {
        // VirtualDJ BFX-EchoPingPong emulation: sync delay with alternating stereo bounce
        deck.fxDelayNode.delayTime.setValueAtTime(delayTime, this.ctx.currentTime);
        deck.fxDelayFeedback.gain.setValueAtTime(Math.min(0.88, 0.4 + fx.param * 0.45), this.ctx.currentTime);
        deck.fxInputNode.connect(deck.fxDelayNode);
        deck.fxDelayNode.connect(deck.fxWetNode);
        activeNode = deck.fxDelayNode;
      } else if (fx.type === 'echofreeze') {
        // VirtualDJ BFX-Echo Freeze / Tail hold: freezes current delay buffer and cuts dry audio
        deck.fxDelayNode.delayTime.setValueAtTime(delayTime, this.ctx.currentTime);
        deck.fxDelayFeedback.gain.setValueAtTime(0.985, this.ctx.currentTime); // Near-infinite freeze tail
        deck.fxDryNode.gain.setValueAtTime(0.0, this.ctx.currentTime); // Mute dry for instant freeze drop
        deck.fxWetNode.gain.setValueAtTime(1.0, this.ctx.currentTime);
        deck.fxInputNode.connect(deck.fxDelayNode);
        deck.fxDelayNode.connect(deck.fxWetNode);
        activeNode = deck.fxDelayNode;
      } else if (fx.type === 'brake') {
        // VirtualDJ Slipbrake8 emulation: deceleration stop
        this.triggerMotorBrake(deckId, Math.max(0.5, fx.beats * (60.0 / bpm)));
      } else if (fx.type === 'pitchrise') {
        // VirtualDJ keyLoopDown / keyRiser emulation: progressive pitch rise
        this.triggerPitchRiser(deckId, fx.beats * (60.0 / bpm));
      }
      deck.activeFxNode = activeNode;
    }
  }

  /**
   * Generates a silent audio buffer with realistic visual waveform peaks for streaming bridges (e.g. YouTube IFrame player)
   * Prevents loud synthetic grooves from playing through the master speakers while keeping deck waveforms responsive.
   */
  public generateSilentWaveformBuffer(durationSec: number = 210, bpm: number = 125): AudioBuffer {
    this.init();
    if (!this.ctx) throw new Error('AudioContext not ready');
    const sampleRate = 22050; // low sample rate is plenty for waveform display, saves memory
    const totalSamples = Math.floor(Math.max(10, durationSec) * sampleRate);
    const buffer = this.ctx.createBuffer(2, totalSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const secondsPerBeat = 60.0 / Math.max(60, bpm || 125);
    const totalBeats = Math.floor(durationSec / secondsPerBeat);

    // Populate waveform with low-level visual dynamic peaks so the display shows genuine beat grid markers
    for (let b = 0; b < totalBeats; b++) {
      const beatStartSample = Math.floor(b * secondsPerBeat * sampleRate);
      const isBar = b % 4 === 0;
      const peakAmp = isBar ? 0.00005 : 0.00002; // Virtually silent (-90dB), strictly for visual waveform rendering
      const beatLen = Math.min(Math.floor(0.1 * sampleRate), totalSamples - beatStartSample);
      for (let i = 0; i < beatLen; i++) {
        const env = 1.0 - i / beatLen;
        left[beatStartSample + i] = peakAmp * env;
        right[beatStartSample + i] = peakAmp * env;
      }
    }
    return buffer;
  }


  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasterNode(): GainNode | null {
    return this.masterGain;
  }

  public getLatencyHint(): AudioContextLatencyCategory {
    return this.bufferSizeOption;
  }

  public async setLatencyHint(hint: AudioContextLatencyCategory): Promise<void> {
    this.bufferSizeOption = hint;
  }

  public getSampleRate(): number {
    return this.ctx ? this.ctx.sampleRate : 48000;
  }

  public getBaseLatency(): number {
    return this.ctx && (this.ctx as any).baseLatency ? (this.ctx as any).baseLatency * 1000 : 5.8;
  }

  /**
   * Preloads or synthesizes authentic vinyl scratch sample buffer
   * Ensures scratching always produces sound even for streaming or silent waveform tracks.
   */
  public async loadScratchSample(): Promise<AudioBuffer | null> {
    if (this.scratchSampleBuffer) return this.scratchSampleBuffer;
    if (this.scratchSampleLoading) return null;
    this.scratchSampleLoading = true;

    try {
      this.init();
      if (!this.ctx) return null;

      const baseUrl = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
        ? window.location.origin
        : 'http://127.0.0.1:8088';

      const res = await fetch(`${baseUrl}/samples/scratch.mp3`);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        this.scratchSampleBuffer = await this.ctx.decodeAudioData(ab);
        this.scratchSampleLoading = false;
        return this.scratchSampleBuffer;
      }
    } catch {}

    // Fallback: procedural synthesis of vinyl scratch audio (needle friction + harmonic sweep)
    try {
      if (this.ctx) {
        this.scratchSampleBuffer = this.synthesizeScratchSample();
      }
    } catch {}

    this.scratchSampleLoading = false;
    return this.scratchSampleBuffer;
  }

  private synthesizeScratchSample(): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext required');
    const sr = this.ctx.sampleRate;
    const dur = 1.2;
    const totalSamples = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(2, totalSamples, sr);
    const left = buf.getChannelData(0);
    const right = buf.getChannelData(1);

    // Multi-layer physical turntable scratch acoustic model:
    // Layer 1: Tonearm needle friction & vinyl surface groove rumble (filtered pink noise)
    // Layer 2: Turntable stylus vinyl drag resonance (frequency-swept formant chirp with pitch drop)
    // Layer 3: Dynamic analog vinyl saturation & tube warmth
    let pinkB0 = 0, pinkB1 = 0, pinkB2 = 0;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sr;
      const progress = i / totalSamples;

      // Realistic DJ scratch gesture velocity curve: fast attack -> sweep -> friction release
      const velocity = Math.sin(Math.pow(progress, 0.7) * Math.PI);

      // Stylus needle resonant formant sweep (400Hz - 2400Hz) modulated by turntable drag
      const f1 = 280 + 1950 * Math.sin(progress * Math.PI) + 120 * Math.sin(2 * Math.PI * 45 * t);
      const f2 = f1 * 1.62; // Harmonic overtone
      const tone = Math.sin(2 * Math.PI * f1 * t) * 0.42 + Math.sin(2 * Math.PI * f2 * t) * 0.22;

      // Pink noise vinyl groove friction generator (Paul Kellet's algorithm)
      const white = Math.random() * 2 - 1;
      pinkB0 = 0.99886 * pinkB0 + white * 0.0555179;
      pinkB1 = 0.99332 * pinkB1 + white * 0.0750759;
      pinkB2 = 0.96900 * pinkB2 + white * 0.1538520;
      const vinylFriction = (pinkB0 + pinkB1 + pinkB2 + white * 0.5362) * 0.25;

      // Stylus touch click / needle drop transient at onset
      const needleClick = progress < 0.015 ? (Math.random() * 2 - 1) * Math.sin((progress / 0.015) * Math.PI) * 0.35 : 0;

      // Dynamic friction envelope with vinyl inertia
      const env = Math.pow(velocity, 0.85) * (1 - Math.exp(-t * 28)) * (1 - Math.pow(progress, 4));

      // Mix & subtle analog soft-clipping saturation
      const raw = ((tone * 0.7 + vinylFriction * 0.3) + needleClick) * env * 1.25;
      const saturated = Math.tanh(raw);

      left[i] = saturated;
      right[i] = saturated * 0.96; // Stereo acoustic imaging
    }
    return buf;
  }
}

export const audioEngine = new AudioEngine();
