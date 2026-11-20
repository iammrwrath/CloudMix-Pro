/**
 * Grand Central Dispatch (dispatch.dll) Priority Work Queue Scheduler
 * Inspired by Algoriddim djay Pro's libdispatch QoS tiering:
 * Ensures UI & live audio control callbacks never starve behind background waveform/BPM/cloud indexing work.
 */
export type DispatchQoS = 'userInteractive' | 'userInitiated' | 'utility' | 'background';

export interface DispatchedTask {
  id: number;
  label: string;
  qos: DispatchQoS;
  fn: () => void | Promise<void>;
  enqueuedAt: number;
}

export interface DispatchQueueStats {
  criticalPerformanceDepth: number;
  isCriticalSectionActive: boolean;
  queuedCounts: Record<DispatchQoS, number>;
  executedTotal: number;
  deferredTotal: number;
}

export class DispatchQueueService {
  private nextTaskId = 1;
  private criticalDepth = 0;
  private executedTotal = 0;
  private deferredTotal = 0;
  private queues: Record<DispatchQoS, DispatchedTask[]> = {
    userInteractive: [],
    userInitiated: [],
    utility: [],
    background: [],
  };
  private flushScheduled = false;

  /**
   * Mark entry into a latency-critical performance section (e.g. active cue/loop/beatmatch or deck start).
   * Low-priority 'utility' and 'background' tasks are deferred until the critical section completes.
   */
  public beginCriticalPerformanceSection(): void {
    this.criticalDepth += 1;
  }

  /**
   * Exit a critical performance section and flush deferred background queues when clear.
   */
  public endCriticalPerformanceSection(): void {
    if (this.criticalDepth > 0) {
      this.criticalDepth -= 1;
    }
    if (this.criticalDepth === 0) {
      this.scheduleDrain();
    }
  }

  /**
   * Dispatch work onto a QoS-tiered queue.
   */
  public dispatch(qos: DispatchQoS, label: string, fn: () => void | Promise<void>): number {
    const id = this.nextTaskId++;
    const task: DispatchedTask = {
      id,
      label,
      qos,
      fn,
      enqueuedAt: Date.now(),
    };

    if (qos === 'userInteractive') {
      this.executeTask(task);
      return id;
    }

    if ((qos === 'utility' || qos === 'background') && this.criticalDepth > 0) {
      this.deferredTotal += 1;
    }

    this.queues[qos].push(task);
    this.scheduleDrain();
    return id;
  }

  public getQueueStats(): DispatchQueueStats {
    return {
      criticalPerformanceDepth: this.criticalDepth,
      isCriticalSectionActive: this.criticalDepth > 0,
      queuedCounts: {
        userInteractive: this.queues.userInteractive.length,
        userInitiated: this.queues.userInitiated.length,
        utility: this.queues.utility.length,
        background: this.queues.background.length,
      },
      executedTotal: this.executedTotal,
      deferredTotal: this.deferredTotal,
    };
  }

  private scheduleDrain(): void {
    if (this.flushScheduled) return;
    if (this.criticalDepth > 0 && this.queues.userInitiated.length === 0) return;
    this.flushScheduled = true;

    const run = () => {
      this.flushScheduled = false;
      this.drain();
    };

    if (this.queues.userInitiated.length > 0) {
      queueMicrotask(run);
      return;
    }

    const win =
      typeof window !== 'undefined'
        ? (window as Window & {
            requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
          })
        : undefined;

    if (win && typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(run, { timeout: 50 });
    } else {
      setTimeout(run, 8);
    }
  }

  private drain(): void {
    while (this.queues.userInitiated.length > 0) {
      const next = this.queues.userInitiated.shift();
      if (next) this.executeTask(next);
    }

    if (this.criticalDepth > 0) {
      return;
    }

    const lowOrder: DispatchQoS[] = ['utility', 'background'];
    for (const qos of lowOrder) {
      if (this.criticalDepth > 0) return;
      const task = this.queues[qos].shift();
      if (task) {
        this.executeTask(task);
        if (this.queues.utility.length > 0 || this.queues.background.length > 0) {
          this.scheduleDrain();
        }
        return;
      }
    }
  }

  private executeTask(task: DispatchedTask): void {
    this.executedTotal += 1;
    try {
      const result = task.fn();
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch((err) => {
          console.warn(`[DispatchQueue:${task.qos}] Async task "${task.label}" failed:`, err);
        });
      }
    } catch (err) {
      console.warn(`[DispatchQueue:${task.qos}] Task "${task.label}" failed:`, err);
    }
  }
}

export const dispatchQueueService = new DispatchQueueService();
