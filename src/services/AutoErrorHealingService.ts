/**
 * Autonomous Error & Self-Healing Service for CloudMix Pro
 * 
 * Captures uncaught runtime exceptions, unhandled promise rejections,
 * audio/DSP glitches, and streaming network failures in real time.
 * Automatically:
 * 1. Diagnoses the error signature and applies live self-healing workarounds (e.g. re-syncing clock, resetting audio context, re-mounting player).
 * 2. Compiles a structured issue report with stack trace, app version, and state context.
 * 3. Automatically files a GitHub issue via the desktop IPC pipeline.
 * 4. Checks for and applies immediate AI self-healing updates or patches.
 */

import { audioEngine } from '../audio/AudioEngine';
import { youtubeDeckBridge } from './YouTubeDeckBridge';
import { midiControllerService } from './MidiControllerService';
import { updateService } from './UpdateService';

export interface ErrorContext {
  component?: string;
  action?: string;
  deckId?: string;
  extra?: Record<string, any>;
}

export interface IssueReport {
  title: string;
  message: string;
  stack?: string;
  context?: ErrorContext;
  timestamp: number;
}

type ErrorListener = (report: IssueReport) => void;

class AutoErrorHealingService {
  private reportedHashes = new Set<string>();
  private listeners = new Set<ErrorListener>();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Capture unhandled synchronous exceptions
    window.addEventListener('error', (event) => {
      this.handleError(
        event.error || new Error(event.message || 'Unknown window error'),
        { component: 'window.onerror', action: `${event.filename}:${event.lineno}:${event.colno}` }
      );
    });

    // 2. Capture unhandled asynchronous promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const err = reason instanceof Error ? reason : new Error(String(reason || 'Unhandled Promise Rejection'));
      this.handleError(err, { component: 'window.unhandledrejection' });
    });

    console.log('[AutoErrorHealing] Autonomous error detection & self-healing pipeline initialized.');
  }

  /**
   * Directly report and self-heal any caught error in try/catch blocks
   */
  public report(error: Error | string, context: ErrorContext = {}) {
    const err = typeof error === 'string' ? new Error(error) : error;
    this.handleError(err, context);
  }

  private async handleError(error: Error, context: ErrorContext = {}) {
    try {
      const message = error.message || 'Unknown error occurred';
      const stack = error.stack || '';
      const hash = `${message}_${context.component || ''}`;

      // Prevent flood duplicate reporting in tight loops
      if (this.reportedHashes.has(hash)) {
        return;
      }
      this.reportedHashes.add(hash);
      setTimeout(() => this.reportedHashes.delete(hash), 60000); // 1 min debounce per unique error

      const report: IssueReport = {
        title: message.substring(0, 100),
        message,
        stack,
        context,
        timestamp: Date.now(),
      };

      console.warn('[AutoErrorHealing] Autonomous issue detected, executing self-healing recovery:', report);

      // 1. Trigger Self-Healing Workarounds
      this.applySelfHealingWorkaround(report);

      // 2. Notify in-app UI listeners (e.g. subtle toast/status indicator)
      this.listeners.forEach((listener) => {
        try {
          listener(report);
        } catch {}
      });

      // 3. Autonomous Issue Filing to GitHub via IPC
      if (typeof window !== 'undefined' && (window as any).desktopAPI?.submitAutoIssueReport) {
        await (window as any).desktopAPI.submitAutoIssueReport({
          title: report.title,
          message: report.message,
          stack: report.stack,
          context: report.context,
        });
      }
    } catch (e) {
      console.error('[AutoErrorHealing] Failed to process autonomous error report:', e);
    }
  }

  private applySelfHealingWorkaround(report: IssueReport) {
    const msg = (report.message + ' ' + (report.stack || '')).toLowerCase();

    // Auto-heal WebAudio suspended / buffer glitch
    if (msg.includes('audiocontext') || msg.includes('audiobuffer') || msg.includes('suspended')) {
      console.log('[AutoErrorHealing] Self-Healing: Attempting AudioEngine context recovery...');
      try {
        if (typeof (audioEngine as any).resumeContext === 'function') {
          (audioEngine as any).resumeContext();
        } else if (typeof (audioEngine as any).init === 'function') {
          (audioEngine as any).init();
        }
      } catch {}
    }

    // Auto-heal YouTube Iframe / Bridge postMessage disconnection
    if (msg.includes('postmessage') || msg.includes('yt.player') || msg.includes('player_bridge')) {
      console.log('[AutoErrorHealing] Self-Healing: Re-synchronizing YouTube Deck Bridge...');
      try {
        youtubeDeckBridge.reconnect();
      } catch {}
    }

    // Auto-heal MIDI disconnect / sysex buffer overflow
    if (msg.includes('midi') || msg.includes('midimessage')) {
      console.log('[AutoErrorHealing] Self-Healing: Refreshing MIDI Controller Service...');
      try {
        midiControllerService.init();
      } catch {}
    }

    // Proactively poll for AI patch updates after filing autonomous error
    try {
      updateService.checkForUpdates().catch(() => {});
    } catch {}
  }

  public onError(callback: ErrorListener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

export const autoErrorHealingService = new AutoErrorHealingService();
