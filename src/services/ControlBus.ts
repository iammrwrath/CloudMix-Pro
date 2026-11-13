/**
 * CloudMix Pro - Universal Control Object Engine (ControlBus)
 * Inspired by Mixxx's decoupled [Group], Control architecture.
 *
 * Provides a high-performance, collision-free, centralized state and event bus
 * for hardware controllers (MIDI/HID), user interfaces, keyboard hotkeys, and automated streaming hooks.
 */

export type ControlGroup =
  | 'Master'
  | 'Mixer'
  | 'DeckA'
  | 'DeckB'
  | 'DeckC'
  | 'DeckD'
  | 'Sampler'
  | 'Effects'
  | 'Automix'
  | 'Library'
  | 'Cortex';

export type ControlPath = `[${ControlGroup}], ${string}`;

export interface ControlValue {
  value: number | boolean | string;
  source?: 'hardware' | 'ui' | 'midi' | 'hid' | 'script' | 'engine';
  timestamp: number;
}

export type ControlListener = (value: ControlValue) => void;

class ControlBus {
  private static instance: ControlBus;
  private state: Map<string, ControlValue> = new Map();
  private listeners: Map<string, Set<ControlListener>> = new Map();
  private wildcards: Set<ControlListener> = new Set();

  private constructor() {
    this.initializeDefaultControls();
  }

  public static getInstance(): ControlBus {
    if (!ControlBus.instance) {
      ControlBus.instance = new ControlBus();
    }
    return ControlBus.instance;
  }

  /**
   * Initializes standard control objects with normalized initial values
   */
  private initializeDefaultControls(): void {
    const now = Date.now();
    const defaults: Record<ControlPath, number | boolean | string> = {
      '[Master], volume': 1.0,
      '[Master], crossfader': 0.5,
      '[Master], headphone_mix': 0.5,
      '[Master], headphone_volume': 1.0,
      '[Master], limiter_active': true,

      '[DeckA], play': false,
      '[DeckA], cue': false,
      '[DeckA], sync': false,
      '[DeckA], rate': 1.0,
      '[DeckA], rate_temp_up': false,
      '[DeckA], rate_temp_down': false,
      '[DeckA], volume': 1.0,
      '[DeckA], eq_high': 1.0,
      '[DeckA], eq_mid': 1.0,
      '[DeckA], eq_low': 1.0,
      '[DeckA], eq_high_kill': false,
      '[DeckA], eq_mid_kill': false,
      '[DeckA], eq_low_kill': false,
      '[DeckA], filter': 0.5,
      '[DeckA], keylock': true,
      '[DeckA], jog_touch': false,
      '[DeckA], jog_delta': 0,

      '[DeckB], play': false,
      '[DeckB], cue': false,
      '[DeckB], sync': false,
      '[DeckB], rate': 1.0,
      '[DeckB], rate_temp_up': false,
      '[DeckB], rate_temp_down': false,
      '[DeckB], volume': 1.0,
      '[DeckB], eq_high': 1.0,
      '[DeckB], eq_mid': 1.0,
      '[DeckB], eq_low': 1.0,
      '[DeckB], eq_high_kill': false,
      '[DeckB], eq_mid_kill': false,
      '[DeckB], eq_low_kill': false,
      '[DeckB], filter': 0.5,
      '[DeckB], keylock': true,
      '[DeckB], jog_touch': false,
      '[DeckB], jog_delta': 0,

      '[Mixer], crossfader': 0.5,
      '[Mixer], curve': 'linear',
      '[Mixer], headroom': -9,

      '[Automix], active': false,
      '[Automix], transition_time': 8,

      '[Library], scroll_delta': 0,
      '[Library], select': false,
      '[Library], load_deck_a': false,
      '[Library], load_deck_b': false,
    };

    for (const [key, val] of Object.entries(defaults)) {
      this.state.set(key, { value: val, source: 'engine', timestamp: now });
    }
  }

  /**
   * Normalize path format: trims extra whitespace and ensures standard formatting.
   */
  public normalizePath(path: string): string {
    const trimmed = path.trim();
    const match = trimmed.match(/^\[([^\]]+)\]\s*,\s*(.+)$/);
    if (match) {
      return `[${match[1].trim()}], ${match[2].trim()}`;
    }
    return trimmed;
  }

  /**
   * Get the current value of a control object.
   */
  public get(path: string, defaultValue: number | boolean | string = 0): number | boolean | string {
    const normalized = this.normalizePath(path);
    const item = this.state.get(normalized);
    return item ? item.value : defaultValue;
  }

  /**
   * Get the full control object state (value, source, timestamp).
   */
  public getObject(path: string): ControlValue | undefined {
    return this.state.get(this.normalizePath(path));
  }

  /**
   * Set a control object value and trigger listeners if changed or forced.
   */
  public set(
    path: string,
    value: number | boolean | string,
    source: ControlValue['source'] = 'ui',
    forceNotify: boolean = false
  ): void {
    const normalized = this.normalizePath(path);
    const prev = this.state.get(normalized);

    if (!forceNotify && prev && prev.value === value) {
      return; // No state mutation
    }

    const payload: ControlValue = {
      value,
      source,
      timestamp: Date.now(),
    };

    this.state.set(normalized, payload);

    // Notify registered specific listeners
    const groupListeners = this.listeners.get(normalized);
    if (groupListeners && groupListeners.size > 0) {
      for (const listener of groupListeners) {
        try {
          listener(payload);
        } catch (err) {
          console.error(`[ControlBus Error] Listener failed for ${normalized}:`, err);
        }
      }
    }

    // Notify wildcard / global observers
    if (this.wildcards.size > 0) {
      for (const wildcard of this.wildcards) {
        try {
          wildcard(payload);
        } catch (err) {
          console.error(`[ControlBus Error] Wildcard listener failed:`, err);
        }
      }
    }
  }

  /**
   * Subscribe to changes on a specific control object.
   * Returns an unsubscribe callback.
   */
  public subscribe(path: string, listener: ControlListener): () => void {
    const normalized = this.normalizePath(path);
    if (!this.listeners.has(normalized)) {
      this.listeners.set(normalized, new Set());
    }
    this.listeners.get(normalized)!.add(listener);

    return () => {
      const set = this.listeners.get(normalized);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(normalized);
        }
      }
    };
  }

  /**
   * Subscribe to all control mutations across the entire app.
   */
  public subscribeAll(listener: ControlListener): () => void {
    this.wildcards.add(listener);
    return () => {
      this.wildcards.delete(listener);
    };
  }

  /**
   * Helper to toggle a boolean control (e.g., play/pause, keylock, kill switches).
   */
  public toggle(path: string, source: ControlValue['source'] = 'ui'): boolean {
    const current = Boolean(this.get(path, false));
    const next = !current;
    this.set(path, next, source);
    return next;
  }

  /**
   * Helper to trigger a momentary button pulse (true on press, false on release).
   */
  public pulse(path: string, durationMs: number = 80, source: ControlValue['source'] = 'ui'): void {
    this.set(path, true, source);
    setTimeout(() => {
      this.set(path, false, source);
    }, durationMs);
  }
}

export const controlBus = ControlBus.getInstance();
