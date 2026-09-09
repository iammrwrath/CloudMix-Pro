export type DeckId = 'A' | 'B' | 'C' | 'D';

export interface HotCue {
  id: number; // 0 to 7 (8 hot cues)
  position: number; // in seconds
  color: string;
  label?: string;
  active: boolean;
}

export interface SavedLoop {
  id: number;
  start: number;
  end: number;
  lengthBeats: number;
  active: boolean;
}

export interface BeatGrid {
  bpm: number;
  firstBeatOffset: number; // in seconds
  meter: number; // e.g. 4 for 4/4
}

export interface WaveformData {
  overviewPeaks: Float32Array; // Subsampled full track amplitude for overview
  lowPeaks: Float32Array; // Bass (<250Hz)
  midPeaks: Float32Array; // Mid (250Hz - 2500Hz)
  highPeaks: Float32Array; // High (>2500Hz)
  duration: number;
  samplesPerPixel: number;
}

export interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // seconds
  bpm: number;
  key: string; // e.g. '8A', '11B' (Camelot) or 'Am'
  camelotKey?: string;
  fileUrl: string;
  fileSource: 'drive' | 'local' | 'stream' | 'djay_import' | 'youtube';
  driveFileId?: string;
  sizeBytes?: number;
  coverArtUrl?: string;
  dateAdded: string;
  rating?: number;
  playCount?: number;
  isOfflineCached?: boolean;
  hotCues: HotCue[];
  savedLoops: SavedLoop[];
  beatGrid: BeatGrid;
  lyricsUrl?: string;
  lyricsLrc?: string;
}

export interface StemState {
  vocals: number; // 0.0 to 1.5 (1.0 default)
  harmonics: number;
  drums: number;
  vocalsMuted: boolean;
  harmonicsMuted: boolean;
  drumsMuted: boolean;
  vocalsSolo: boolean;
  harmonicsSolo: boolean;
  drumsSolo: boolean;
}

export type NeuralTransitionMode = 'standard' | 'bass_swap' | 'vocal_swap' | 'harmonic_swap';
export type EQMode = 'isolator' | 'stems';

export interface DeckState {
  deckId: DeckId;
  track: TrackMetadata | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number; // 1.0 is normal speed
  tempoRange: number; // 0.08, 0.16, 0.50
  keyLock: boolean; // Master tempo
  musicalKey: string;
  pitchSemitones: number;
  isSync: boolean;
  isMaster: boolean;
  volume: number; // 0.0 to 1.0
  trimGain: number; // 0.0 to 2.0 (1.0 default)
  eqMode: EQMode;
  eqHigh: number; // -1.0 to 1.0 (0 default)
  eqMid: number;
  eqLow: number;
  eqHighKill: boolean;
  eqMidKill: boolean;
  eqLowKill: boolean;
  stems: StemState;
  filter: number; // -1.0 (LPF) to 0.0 (Bypass) to +1.0 (HPF)
  activeLoop: { start: number; end: number; beats: number } | null;
  slipMode: boolean;
  shadowPlayheadTime: number; // Time tracking during scratch or slip
  isScratching: boolean;
  selectedPadMode: 'hotcue' | 'loop' | 'beatjump' | 'stems';
  meterLevelL: number; // 0.0 to 1.0 for VU meter
  meterLevelR: number;
}

export interface MixerState {
  crossfader: number; // -1.0 (Deck A) to 0.0 (Center) to 1.0 (Deck B)
  crossfaderCurve: 'smooth' | 'linear' | 'scratch';
  neuralTransitionMode: NeuralTransitionMode;
  masterVolume: number; // 0.0 to 1.0
  boothVolume: number;
  headphoneVolume: number;
  headphoneCueA: boolean;
  headphoneCueB: boolean;
  headphoneMix: number; // 0.0 (Cue) to 1.0 (Master)
  masterMeterL: number;
  masterMeterR: number;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  dateCreated: string;
  dateUpdated: string;
  isCloudSynced: boolean;
  isPinnedOffline: boolean;
}

export interface MidiMappingRule {
  controlName: string; // e.g. "DeckA_Play", "DeckB_EQ_High", "Crossfader"
  statusByte: number; // e.g. 0x90 (Note On), 0xB0 (CC)
  data1: number; // Note number or CC number
  channel: number;
  type: 'button' | 'toggle' | 'slider' | 'knob' | 'jog';
}

export interface LyricsLine {
  timestampMs: number;
  text: string;
  translation?: string;
}
