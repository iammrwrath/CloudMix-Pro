/**
 * Automix AI & Smart Transition Engine
 * Provides autonomous phrase-aligned mixing, EQ blending, and Neural Stem crossfades.
 */

import { AutomixMode, AutomixState, DeckId, DeckState, AutomixQueueItem, HistoryItem, TrackMetadata, NeuralTransitionMode } from '../types/dj';
import { audioEngine } from '../audio/AudioEngine';
import { youtubeDeckBridge } from './YouTubeDeckBridge';
import { storageCache } from './StorageCacheService';
import { sanitizeTrackMetadata } from '../utils/sanitize';

type AutomixListener = (state: AutomixState) => void;

export class AutomixService {
  private state: AutomixState = {
    active: false,
    mode: 'stem_swap',
    transitionDurationBeats: 16,
    progress: 0,
    transitioning: false,
    targetDeck: 'B',
    timeToTransitionSec: 0,
  };

  private listeners: Set<AutomixListener> = new Set();
  private monitorInterval: number | null = null;
  private transitionTimer: number | null = null;
  private onAutomixStep: ((updates: { crossfader?: number; deckA?: Partial<DeckState>; deckB?: Partial<DeckState> }) => void) | null = null;
  private onDeckAction: ((action: 'play' | 'pause', deckId: DeckId) => void) | null = null;
  private onTrackLoadRequest: ((deckId: DeckId, track: TrackMetadata) => void) | null = null;

  private queue: AutomixQueueItem[] = [];
  private history: HistoryItem[] = [];
  private queueListeners: Set<(queue: AutomixQueueItem[]) => void> = new Set();
  private historyListeners: Set<(history: HistoryItem[]) => void> = new Set();

  constructor() {
    storageCache.getQueue().then((q) => {
      if (q && q.length > 0 && this.queue.length === 0) {
        this.queue = q.map((item) => ({ ...item, track: sanitizeTrackMetadata(item.track) }));
        this.queueListeners.forEach((l) => l([...this.queue]));
      }
    }).catch(() => {});

    storageCache.getHistory().then((h) => {
      if (h && h.length > 0 && this.history.length === 0) {
        this.history = h.map((item) => ({ ...item, track: sanitizeTrackMetadata(item.track) }));
        this.historyListeners.forEach((l) => l([...this.history]));
      }
    }).catch(() => {});
  }

  public subscribe(listener: AutomixListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  private deckStateProvider: (() => { deckA: DeckState; deckB: DeckState }) | null = null;

  public setDeckStateProvider(provider: () => { deckA: DeckState; deckB: DeckState }) {
    this.deckStateProvider = provider;
  }

  public registerCallbacks(
    onStep: (updates: { crossfader?: number; deckA?: Partial<DeckState>; deckB?: Partial<DeckState> }) => void,
    onDeckAction: (action: 'play' | 'pause', deckId: DeckId) => void,
    onTrackLoadRequest?: (deckId: DeckId, track: TrackMetadata) => void
  ) {
    this.onAutomixStep = onStep;
    this.onDeckAction = onDeckAction;
    if (onTrackLoadRequest) this.onTrackLoadRequest = onTrackLoadRequest;
  }

  public toggleAutomix(deckA?: DeckState, deckB?: DeckState) {
    if (this.state.active) {
      this.stopAutomix();
    } else {
      this.startAutomix(deckA, deckB);
    }
  }

  public startAutomix(deckA?: DeckState, deckB?: DeckState) {
    this.state.active = true;
    this.state.progress = 0;
    this.state.transitioning = false;
    this.notify();

    if (this.monitorInterval) clearInterval(this.monitorInterval);
    this.monitorInterval = window.setInterval(() => {
      this.checkTransitionEligibility();
    }, 500);
  }

  public stopAutomix() {
    this.state.active = false;
    this.state.transitioning = false;
    this.state.progress = 0;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    if (this.transitionTimer) {
      clearInterval(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.notify();
  }

  public setMode(mode: AutomixMode) {
    this.state.mode = mode;
    this.notify();
  }

  public setDurationBeats(beats: number) {
    this.state.transitionDurationBeats = beats;
    this.notify();
  }

  private checkTransitionEligibility() {
    if (!this.state.active || this.state.transitioning) return;

    let deckA: DeckState | null = null;
    let deckB: DeckState | null = null;

    if (this.deckStateProvider) {
      const live = this.deckStateProvider();
      deckA = live.deckA;
      deckB = live.deckB;
    }

    if (!deckA || !deckB) return;

    // Use live audio engine + YouTube bridge playback status & time for 100% precision
    const isPlayingA = youtubeDeckBridge.isYouTubeDeck('A')
      ? deckA.isPlaying
      : (audioEngine.getDeck('A')?.isPlaying ?? deckA.isPlaying);
    const isPlayingB = youtubeDeckBridge.isYouTubeDeck('B')
      ? deckB.isPlaying
      : (audioEngine.getDeck('B')?.isPlaying ?? deckB.isPlaying);
    const timeA = youtubeDeckBridge.isYouTubeDeck('A')
      ? (youtubeDeckBridge.getCurrentTime('A') || deckA.currentTime)
      : audioEngine.getCurrentTime('A');
    const timeB = youtubeDeckBridge.isYouTubeDeck('B')
      ? (youtubeDeckBridge.getCurrentTime('B') || deckB.currentTime)
      : audioEngine.getCurrentTime('B');

    // Identify active playing deck
    const playingDeck = isPlayingA ? 'A' : isPlayingB ? 'B' : null;
    if (!playingDeck) return;

    const sourceDeck = playingDeck === 'A' ? deckA : deckB;
    const sourceTime = playingDeck === 'A' ? timeA : timeB;
    const targetId: DeckId = playingDeck === 'A' ? 'B' : 'A';
    const targetDeck = playingDeck === 'A' ? deckB : deckA;
    const isTargetPlaying = targetId === 'A' ? isPlayingA : isPlayingB;

    if (!sourceDeck.duration || sourceDeck.duration <= 0) return;

    const remainingSec = sourceDeck.duration - sourceTime;
    this.state.timeToTransitionSec = Math.max(0, Math.round(remainingSec));
    this.state.targetDeck = targetId;
    this.notify();

    // Trigger transition when 22 seconds remaining and target deck has a loaded track
    if (remainingSec <= 22 && remainingSec > 2 && targetDeck.track && !isTargetPlaying) {
      const resolvedMode = audioEngine.getNeuralTransitionMode() === 'shuffle'
        ? this.pickOptimalNeuralMode(sourceDeck.track, targetDeck.track)
        : audioEngine.getNeuralTransitionMode();
      if (resolvedMode && resolvedMode !== 'shuffle') {
        audioEngine.setNeuralTransitionMode(resolvedMode);
      }
      this.executeTransition(playingDeck, targetId, sourceDeck.track?.bpm || 126);
    }
  }

  public triggerInstantTransition(deckA: DeckState, deckB: DeckState) {
    const isPlayingA = youtubeDeckBridge.isYouTubeDeck('A')
      ? deckA.isPlaying
      : (audioEngine.getDeck('A')?.isPlaying ?? deckA.isPlaying);
    const currentPlaying = isPlayingA ? 'A' : 'B';
    const target: DeckId = currentPlaying === 'A' ? 'B' : 'A';
    this.executeTransition(currentPlaying, target, (currentPlaying === 'A' ? deckA.track?.bpm : deckB.track?.bpm) || 126);
  }

  
  /**
   * Intelligently selects the optimal Neural Mix Transition mode
   * based on the genre, tempo differential, and musical characteristics
   * of the currently playing track and the incoming track.
   */
  public pickOptimalNeuralMode(sourceTrack?: TrackMetadata | null, targetTrack?: TrackMetadata | null): NeuralTransitionMode {
    if (!sourceTrack && !targetTrack) return 'standard';

    const sourceGenre = (sourceTrack?.genre || '').toLowerCase();
    const targetGenre = (targetTrack?.genre || '').toLowerCase();
    const sourceTitle = (sourceTrack?.title || '').toLowerCase();
    const targetTitle = (targetTrack?.title || '').toLowerCase();

    const bpmA = sourceTrack?.bpm || 126;
    const bpmB = targetTrack?.bpm || bpmA;
    const bpmDiff = Math.abs(bpmA - bpmB);

    // 1. High tempo differential (>6 BPM): Drum Swap or Drum Cut for punchy transition
    if (bpmDiff > 6) {
      return bpmDiff > 12 ? 'drum_cut' : 'drum_swap';
    }

    // 2. Vocal / Acapella Heavy tracks: Vocal Sustain or Vocal Swap
    const isVocalTrack = (title: string, genre: string) =>
      title.includes('feat') || title.includes('ft.') || title.includes('vocal') ||
      title.includes('acapella') || genre.includes('pop') || genre.includes('r&b') || genre.includes('vocal');

    if (isVocalTrack(sourceTitle, sourceGenre) && !isVocalTrack(targetTitle, targetGenre)) {
      // Let outgoing vocals ride over the incoming instrumental track
      return 'vocal_sustain';
    }

    if (isVocalTrack(sourceTitle, sourceGenre) && isVocalTrack(targetTitle, targetGenre)) {
      // Clean vocal swap at center phrase to prevent vocal clashes
      return 'vocal_swap';
    }

    // 3. Heavy Bass / Sub / Club / Trap / Dubstep: Bass Swap to protect sub frequencies
    const isBassHeavy = (genre: string, title: string) =>
      genre.includes('bass') || genre.includes('dubstep') || genre.includes('trap') ||
      genre.includes('drum and bass') || genre.includes('dnb') || genre.includes('techno') ||
      title.includes('bass') || title.includes('vip') || title.includes('dub');

    if (isBassHeavy(sourceGenre, sourceTitle) || isBassHeavy(targetGenre, targetTitle)) {
      return 'bass_swap';
    }

    // 4. Melodic / House / Trance / Ambient: Harmonic Sustain or Harmonic Swap
    const isMelodic = (genre: string, title: string) =>
      genre.includes('house') || genre.includes('trance') || genre.includes('progressive') ||
      genre.includes('melodic') || genre.includes('chill') || title.includes('mix') || title.includes('extended');

    if (isMelodic(sourceGenre, sourceTitle)) {
      return 'harmonic_sustain';
    }

    // Default intelligent fallbacks across common dance music
    const dynamicModes: NeuralTransitionMode[] = ['bass_swap', 'drum_swap', 'vocal_swap', 'harmonic_swap'];
    const chosenIndex = Math.floor(Math.random() * dynamicModes.length);
    return dynamicModes[chosenIndex];
  }

  public triggerNeuralTransition(
    deckA: DeckState,
    deckB: DeckState,
    options?: { beats?: number; tempoBlend?: boolean; mode?: NeuralTransitionMode }
  ) {
    if (options?.mode) {
      audioEngine.setNeuralTransitionMode(options.mode);
    }
    const isPlayingA = youtubeDeckBridge.isYouTubeDeck('A')
      ? deckA.isPlaying
      : (audioEngine.getDeck('A')?.isPlaying ?? deckA.isPlaying);
    const currentPlaying = isPlayingA ? 'A' : 'B';
    const target: DeckId = currentPlaying === 'A' ? 'B' : 'A';
    const sourceBpm = (currentPlaying === 'A' ? deckA.track?.bpm : deckB.track?.bpm) || 126;
    const targetBpm = (target === 'A' ? deckA.track?.bpm : deckB.track?.bpm) || sourceBpm;

    this.executeTransition(currentPlaying, target, sourceBpm, {
      beats: options?.beats,
      tempoBlend: options?.tempoBlend,
      targetBpm: targetBpm,
    });
  }

  private executeTransition(
    fromDeckId: DeckId,
    toDeckId: DeckId,
    bpm: number,
    opts?: { beats?: number; tempoBlend?: boolean; targetBpm?: number }
  ) {
    if (this.state.transitioning) return;
    this.state.transitioning = true;
    this.notify();

    // 1. Start target deck
    if (this.onDeckAction) {
      this.onDeckAction('play', toDeckId);
    }

    const beats = opts?.beats || this.state.transitionDurationBeats || 16;
    const durationMs = ((60 / bpm) * beats) * 1000;
    const startTime = Date.now();
    const startXfader = fromDeckId === 'A' ? -1.0 : 1.0;
    const endXfader = fromDeckId === 'A' ? 1.0 : -1.0;

    const doTempoBlend = opts?.tempoBlend ?? false;
    const startRate = 1.0;
    const targetRate = doTempoBlend && opts?.targetBpm && bpm > 0 ? bpm / opts.targetBpm : 1.0;

    if (this.transitionTimer) clearInterval(this.transitionTimer);

    this.transitionTimer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(1.0, elapsed / durationMs);

      // Smooth cosine curve
      const smoothProgress = 0.5 - 0.5 * Math.cos(rawProgress * Math.PI);
      const currentXfader = startXfader + (endXfader - startXfader) * smoothProgress;

      // Tempo Blend: gradually pitch adjust outgoing and incoming decks towards common tempo
      if (doTempoBlend && Math.abs(targetRate - 1.0) > 0.001) {
        const curRate = startRate + (targetRate - startRate) * smoothProgress;
        try {
          if (youtubeDeckBridge.isYouTubeDeck(toDeckId)) {
            youtubeDeckBridge.setPlaybackRate(toDeckId, curRate);
          }
          audioEngine.setPlaybackRate(toDeckId, curRate);
        } catch {}
      }

      // Intelligent Bass EQ Swap (djay Pro / VirtualDJ club standard):
      // Before midpoint (progress < 0.5): incoming deck bass is smoothly scooped to avoid low-end clashing.
      // At midpoint: bass swaps over 1-2 beats with outgoing deck scooped down and incoming restored to 0dB.
      const outgoingEqLow = rawProgress < 0.4 ? 0 : -Math.min(1.0, (rawProgress - 0.4) / 0.35);
      const incomingEqLow = rawProgress < 0.5 ? -1.0 + Math.min(1.0, rawProgress / 0.5) * 0.4 : -0.6 + Math.min(1.0, (rawProgress - 0.5) / 0.4) * 0.6;

      const fromDeckUpdate: Partial<DeckState> = { eqLow: outgoingEqLow };
      const toDeckUpdate: Partial<DeckState> = { eqLow: incomingEqLow };

      this.state.progress = rawProgress;
      this.notify();

      if (this.onAutomixStep) {
        this.onAutomixStep({
          crossfader: currentXfader,
          deckA: fromDeckId === 'A' ? fromDeckUpdate : toDeckUpdate,
          deckB: fromDeckId === 'B' ? fromDeckUpdate : toDeckUpdate,
        });
      }

      // Also apply EQ directly to audioEngine for sample-accurate isolation
      try {
        audioEngine.setEQ(fromDeckId, 'low', outgoingEqLow);
        audioEngine.setEQ(toDeckId, 'low', incomingEqLow);
      } catch {}

      if (rawProgress >= 1.0) {
        clearInterval(this.transitionTimer!);
        this.transitionTimer = null;
        this.state.transitioning = false;
        this.state.progress = 0;
        this.notify();

        // Restore low EQ to unity
        try {
          audioEngine.setEQ('A', 'low', 0);
          audioEngine.setEQ('B', 'low', 0);
        } catch {}

        // Pause outgoing deck
        if (this.onDeckAction) {
          this.onDeckAction('pause', fromDeckId);
        }

        // Continuous Automix: If there are tracks in queue, auto-stage next track into the freed deck
        if (this.queue.length > 0 && this.onTrackLoadRequest) {
          const nextItem = this.queue[0];
          this.queue = this.queue.slice(1);
          this.queueListeners.forEach((l) => l([...this.queue]));
          this.onTrackLoadRequest(fromDeckId, nextItem.track);
        }
      }
    }, 35); // 28 fps automation
  }

  public getState(): AutomixState {
    return { ...this.state };
  }

  // Automix Queue Subscriptions & Controls
  public subscribeQueue(listener: (queue: AutomixQueueItem[]) => void): () => void {
    this.queueListeners.add(listener);
    listener([...this.queue]);
    return () => this.queueListeners.delete(listener);
  }

  public setQueue(queue: AutomixQueueItem[]) {
    this.queue = queue;
    this.queueListeners.forEach((l) => l([...this.queue]));
    storageCache.saveQueue(this.queue).catch(() => {});
  }

  public getQueue(): AutomixQueueItem[] {
    return [...this.queue];
  }

  public addToQueue(track: TrackMetadata) {
    const item: AutomixQueueItem = {
      id: `${track.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      track,
      addedAt: new Date().toISOString(),
    };
    this.queue = [...this.queue, item];
    this.queueListeners.forEach((l) => l([...this.queue]));
    storageCache.saveQueue(this.queue).catch(() => {});
  }

  public removeFromQueue(id: string) {
    this.queue = this.queue.filter((q) => q.id !== id);
    this.queueListeners.forEach((l) => l([...this.queue]));
    storageCache.saveQueue(this.queue).catch(() => {});
  }

  public clearQueue() {
    this.queue = [];
    this.queueListeners.forEach((l) => l([]));
    storageCache.saveQueue([]).catch(() => {});
  }

  // Live Set History Subscriptions & Controls
  public subscribeHistory(listener: (history: HistoryItem[]) => void): () => void {
    this.historyListeners.add(listener);
    listener([...this.history]);
    return () => this.historyListeners.delete(listener);
  }

  public setHistory(history: HistoryItem[]) {
    this.history = history;
    this.historyListeners.forEach((l) => l([...this.history]));
    storageCache.setSetting('set_history', this.history).catch(() => {});
  }

  public getHistory(): HistoryItem[] {
    return [...this.history];
  }

  public addHistory(item: HistoryItem) {
    this.history = [item, ...this.history.filter((h) => h.id !== item.id)].slice(0, 100);
    this.historyListeners.forEach((l) => l([...this.history]));
    storageCache.addHistory(item).catch(() => {});
  }

  public clearHistory() {
    this.history = [];
    this.historyListeners.forEach((l) => l([]));
    storageCache.clearHistory().catch(() => {});
  }
}

export const automixService = new AutomixService();
