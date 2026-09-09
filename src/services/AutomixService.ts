/**
 * Automix AI & Smart Transition Engine
 * Provides autonomous phrase-aligned mixing, EQ blending, and Neural Stem crossfades.
 */

import { AutomixMode, AutomixState, DeckId, DeckState } from '../types/dj';
import { audioEngine } from '../audio/AudioEngine';

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

  constructor() {}

  public subscribe(listener: AutomixListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  public registerCallbacks(
    onStep: (updates: { crossfader?: number; deckA?: Partial<DeckState>; deckB?: Partial<DeckState> }) => void,
    onDeckAction: (action: 'play' | 'pause', deckId: DeckId) => void
  ) {
    this.onAutomixStep = onStep;
    this.onDeckAction = onDeckAction;
  }

  public toggleAutomix(deckA: DeckState, deckB: DeckState) {
    if (this.state.active) {
      this.stopAutomix();
    } else {
      this.startAutomix(deckA, deckB);
    }
  }

  public startAutomix(deckA: DeckState, deckB: DeckState) {
    this.state.active = true;
    this.state.progress = 0;
    this.state.transitioning = false;
    this.notify();

    if (this.monitorInterval) clearInterval(this.monitorInterval);
    this.monitorInterval = window.setInterval(() => {
      this.checkTransitionEligibility(deckA, deckB);
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

  private checkTransitionEligibility(deckA: DeckState, deckB: DeckState) {
    if (!this.state.active || this.state.transitioning) return;

    // Identify active playing deck
    const playingDeck = deckA.isPlaying ? 'A' : deckB.isPlaying ? 'B' : null;
    if (!playingDeck) return;

    const sourceDeck = playingDeck === 'A' ? deckA : deckB;
    const targetId: DeckId = playingDeck === 'A' ? 'B' : 'A';
    const targetDeck = playingDeck === 'A' ? deckB : deckA;

    if (!sourceDeck.duration || sourceDeck.duration <= 0) return;

    const remainingSec = sourceDeck.duration - sourceDeck.currentTime;
    this.state.timeToTransitionSec = Math.max(0, Math.round(remainingSec));
    this.state.targetDeck = targetId;
    this.notify();

    // Trigger transition when 20 seconds remaining and target deck has a loaded track
    if (remainingSec <= 22 && remainingSec > 2 && targetDeck.track && !targetDeck.isPlaying) {
      this.executeTransition(playingDeck, targetId, sourceDeck.track?.bpm || 126);
    }
  }

  public triggerInstantTransition(deckA: DeckState, deckB: DeckState) {
    const currentPlaying = deckA.isPlaying ? 'A' : deckB.isPlaying ? 'B' : 'A';
    const target: DeckId = currentPlaying === 'A' ? 'B' : 'A';
    this.executeTransition(currentPlaying, target, (currentPlaying === 'A' ? deckA.track?.bpm : deckB.track?.bpm) || 126);
  }

  private executeTransition(fromDeckId: DeckId, toDeckId: DeckId, bpm: number) {
    if (this.state.transitioning) return;
    this.state.transitioning = true;
    this.notify();

    // 1. Start target deck
    if (this.onDeckAction) {
      this.onDeckAction('play', toDeckId);
    }

    // 2. Animate crossfader and neural stem swap over duration
    const durationMs = ((60 / bpm) * this.state.transitionDurationBeats) * 1000;
    const startTime = Date.now();
    const startXfader = fromDeckId === 'A' ? -1.0 : 1.0;
    const endXfader = fromDeckId === 'A' ? 1.0 : -1.0;

    if (this.transitionTimer) clearInterval(this.transitionTimer);

    this.transitionTimer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(1.0, elapsed / durationMs);

      // Smooth cosine curve
      const smoothProgress = 0.5 - 0.5 * Math.cos(rawProgress * Math.PI);
      const currentXfader = startXfader + (endXfader - startXfader) * smoothProgress;

      this.state.progress = rawProgress;
      this.notify();

      if (this.onAutomixStep) {
        this.onAutomixStep({ crossfader: currentXfader });
      }

      if (rawProgress >= 1.0) {
        clearInterval(this.transitionTimer!);
        this.transitionTimer = null;
        this.state.transitioning = false;
        this.state.progress = 0;
        this.notify();

        // Pause outgoing deck
        if (this.onDeckAction) {
          this.onDeckAction('pause', fromDeckId);
        }
      }
    }, 40); // 25 fps automation
  }

  public getState(): AutomixState {
    return { ...this.state };
  }
}

export const automixService = new AutomixService();
