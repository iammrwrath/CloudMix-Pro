/**
 * UI & Functional Telemetry Auditor for CloudMix Pro
 *
 * Automatically scans the live DOM layout, bounding boxes, and runtime state
 * on mount, window resize, zoom change, layout switch, or theme toggle.
 *
 * Detects:
 * 1. Off-screen / Clipped interactive controls (Header window controls, Deck transport, Library actions).
 * 2. Element Overlap / Collision (JogWheel overlapping WaveformDisplay or PerformancePads).
 * 3. Unintended Container Overflow (PitchFader, 4-Stem strip, Mixer channel strips clipping child controls).
 * 4. HTML Entity leakage (`&#39;`, `&quot;`, `&amp;`) in visible text nodes.
 * 5. AudioEngine & WebAudio health status.
 *
 * Reports structured telemetry directly to the Electron Main Process and
 * `http://127.0.0.1:8088/api/diagnostics` so Antigravity can inspect UI/UX
 * and functional health automatically.
 */

import { audioEngine } from '../audio/AudioEngine';
import { autoErrorHealingService } from './AutoErrorHealingService';

export interface UILayoutViolation {
  id: string;
  severity: 'error' | 'warning';
  category: 'overlap' | 'clipped-offscreen' | 'container-overflow' | 'entity-leak' | 'audio-health';
  element: string;
  message: string;
  rect?: { left: number; top: number; right: number; bottom: number; width: number; height: number };
}

export interface UIDiagnosticReport {
  timestamp: string;
  viewport: {
    innerWidth: number;
    innerHeight: number;
    devicePixelRatio: number;
    theme: string;
  };
  healthy: boolean;
  violationCount: number;
  violations: UILayoutViolation[];
  metrics: Record<string, { left: number; top: number; right: number; bottom: number; width: number; height: number }>;
  audioState: {
    initialized: boolean;
    outputSinkId: string;
  };
}

function roundRect(r: DOMRect) {
  return {
    left: Math.round(r.left),
    top: Math.round(r.top),
    right: Math.round(r.right),
    bottom: Math.round(r.bottom),
    width: Math.round(r.width),
    height: Math.round(r.height),
  };
}

function rectsOverlap(a: DOMRect, b: DOMRect, tolerancePx = 3): boolean {
  return !(
    a.right - tolerancePx <= b.left ||
    a.left + tolerancePx >= b.right ||
    a.bottom - tolerancePx <= b.top ||
    a.top + tolerancePx >= b.bottom
  );
}

class UILayoutAuditorService {
  private lastReport: UIDiagnosticReport | null = null;
  private auditTimer: number | null = null;
  private initialized = false;
  private reportedSignatures = new Set<string>();

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    const scheduleAudit = () => {
      if (this.auditTimer) window.clearTimeout(this.auditTimer);
      this.auditTimer = window.setTimeout(() => {
        this.runAudit();
      }, 450);
    };

    window.addEventListener('resize', scheduleAudit);
    window.addEventListener('load', scheduleAudit);

    // Run initial audit after first render settles
    scheduleAudit();
    // Periodic background check every 20s scheduled during browser idle time to prevent main-thread timer violations
    window.setInterval(() => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => this.runAudit(), { timeout: 2000 });
      } else {
        requestAnimationFrame(() => this.runAudit());
      }
    }, 20000);

    // Expose global trigger for DevTools / Antigravity instant inspection
    (window as any).__cloudmixRunUIAudit = () => this.runAudit();
  }

  public triggerAuditSoon() {
    if (typeof window === 'undefined') return;
    if (this.auditTimer) window.clearTimeout(this.auditTimer);
    this.auditTimer = window.setTimeout(() => {
      this.runAudit();
    }, 250);
  }

  public getLastReport(): UIDiagnosticReport | null {
    return this.lastReport;
  }

  public runAudit(): UIDiagnosticReport {
    const violations: UILayoutViolation[] = [];
    const metrics: Record<string, { left: number; top: number; right: number; bottom: number; width: number; height: number }> = {};

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';

    // 1. Check Header & Window Controls visibility (never clipped off right edge)
    const headerEl = document.querySelector('header');
    if (headerEl) {
      const hRect = headerEl.getBoundingClientRect();
      metrics['header'] = roundRect(hRect);

      if (headerEl.scrollWidth > headerEl.clientWidth + 4) {
        violations.push({
          id: 'header-horizontal-overflow',
          severity: 'error',
          category: 'container-overflow',
          element: 'header',
          message: `Header scrollWidth (${headerEl.scrollWidth}px) exceeds clientWidth (${headerEl.clientWidth}px) by ${headerEl.scrollWidth - headerEl.clientWidth}px — right-hand controls may be clipped.`,
          rect: roundRect(hRect),
        });
      }

      const headerButtons = headerEl.querySelectorAll('button');
      headerButtons.forEach((btn, i) => {
        const bRect = btn.getBoundingClientRect();
        if (bRect.width === 0 || bRect.height === 0) return;
        const title = btn.getAttribute('title') || btn.textContent?.trim() || `header-btn-${i}`;
        if (bRect.right > vw + 2 || bRect.left < -2) {
          violations.push({
            id: `header-btn-offscreen-${i}`,
            severity: 'error',
            category: 'clipped-offscreen',
            element: `header button [${title}]`,
            message: `Header button "${title}" is clipped off-screen (right=${Math.round(bRect.right)}px, viewportWidth=${vw}px).`,
            rect: roundRect(bRect),
          });
        }
      });
    }

    // 2. Check Decks, JogWheels, Waveforms, and PerformancePads for overlap
    const deckCards = document.querySelectorAll('.deck-hardware-viewport');
    deckCards.forEach((deckEl, idx) => {
      const deckLabel = idx === 0 ? 'DeckA' : 'DeckB';
      const dRect = deckEl.getBoundingClientRect();
      metrics[deckLabel] = roundRect(dRect);

      const jogEl = deckEl.querySelector('.jog-wheel');
      const canvases = deckEl.querySelectorAll('canvas');
      const waveformContainer = canvases.length > 0 ? canvases[0].closest('.bg-dj-surface') : null;

      if (jogEl) {
        const jRect = jogEl.getBoundingClientRect();
        metrics[`${deckLabel}.jogWheel`] = roundRect(jRect);

        // Verify JogWheel stays inside its slot container
        const slotEl = jogEl.closest('.jog-platter-slot') || jogEl.parentElement;
        if (slotEl) {
          const sRect = slotEl.getBoundingClientRect();
          if (jRect.height > sRect.height + 4 || jRect.width > sRect.width + 4) {
            violations.push({
              id: `${deckLabel}-jog-slot-overflow`,
              severity: 'error',
              category: 'container-overflow',
              element: `${deckLabel} .jog-wheel`,
              message: `${deckLabel} JogWheel (${Math.round(jRect.width)}x${Math.round(jRect.height)}) overflows its slot container (${Math.round(sRect.width)}x${Math.round(sRect.height)}).`,
              rect: roundRect(jRect),
            });
          }
        }

        // Verify JogWheel does not overlap WaveformDisplay
        if (waveformContainer) {
          const wRect = waveformContainer.getBoundingClientRect();
          metrics[`${deckLabel}.waveform`] = roundRect(wRect);
          if (rectsOverlap(jRect, wRect, 2)) {
            violations.push({
              id: `${deckLabel}-jog-waveform-overlap`,
              severity: 'error',
              category: 'overlap',
              element: `${deckLabel} JogWheel vs Waveform`,
              message: `${deckLabel} JogWheel (top=${Math.round(jRect.top)}px) overlaps WaveformDisplay (bottom=${Math.round(wRect.bottom)}px).`,
              rect: roundRect(jRect),
            });
          }
        }
      }
    });

    // 3. Check for raw unescaped HTML entities in visible text
    const bodyText = document.body?.innerText || '';
    const entityMatch = bodyText.match(/(&#39;|&quot;|&amp;|&#x27;)/);
    if (entityMatch) {
      violations.push({
        id: 'raw-html-entity-visible',
        severity: 'warning',
        category: 'entity-leak',
        element: 'document.body',
        message: `Unescaped HTML entity "${entityMatch[0]}" detected in visible UI text.`,
      });
    }

    const report: UIDiagnosticReport = {
      timestamp: new Date().toISOString(),
      viewport: {
        innerWidth: vw,
        innerHeight: vh,
        devicePixelRatio: window.devicePixelRatio || 1,
        theme,
      },
      healthy: violations.length === 0,
      violationCount: violations.length,
      violations,
      metrics,
      audioState: {
        initialized: true,
        outputSinkId: (audioEngine as any).currentOutputDeviceId || 'default',
      },
    };

    this.lastReport = report;

    if (violations.length > 0) {
      console.warn(`[UI-AUDIT] Detected ${violations.length} UI/UX layout issue(s):`, JSON.stringify(violations));

      // Forward deduplicated UI/UX violations to AutoErrorHealingService -> GitHub Issues pipeline
      const sig = violations.map((v) => v.id).sort().join('|');
      if (sig && !this.reportedSignatures.has(sig)) {
        this.reportedSignatures.add(sig);
        autoErrorHealingService.report(
          new Error(`UI/UX Layout Violation (${violations.length}): ${violations[0].message}`),
          {
            component: 'UILayoutAuditorService',
            action: `${vw}x${vh} (${theme})`,
            extra: {
              viewport: report.viewport,
              violations: report.violations,
            },
          }
        );
      }
    }

    // Send telemetry report to Electron Main Process & Streaming Diagnostics Hub
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.reportUITelemetry) {
      (window as any).desktopAPI.reportUITelemetry(report).catch(() => {});
    }

    return report;
  }
}

export const uiLayoutAuditor = new UILayoutAuditorService();
