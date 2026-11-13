/**
 * CloudMix Pro - Dynamic Multi-Anchor Beatgrid Engine
 *
 * Solves fluctuating live tempos, disco/funk drift, and dynamic Latin rhythms (Merengue, Dembow, Salsa)
 * by allowing continuous variable BPM calculation and multi-point grid re-anchoring.
 */

export interface BeatAnchor {
  id: string;
  timeSec: number;        // Track playback timestamp in seconds
  bpm: number;            // Local BPM starting from this anchor
  beatNumber: number;     // 1, 2, 3, or 4 (downbeat tracking)
  isUserFixed?: boolean;  // True if manually placed or tapped by DJ
}

export interface BeatgridMap {
  trackId: string;
  nominalBpm: number;
  anchors: BeatAnchor[];
}

export class BeatgridEngine {
  /**
   * Generates a standard uniform beatgrid from a single BPM and initial downbeat.
   */
  public static createUniformGrid(trackId: string, bpm: number, firstBeatSec: number = 0.0): BeatgridMap {
    const validBpm = Math.max(30, Math.min(300, bpm || 120));
    return {
      trackId,
      nominalBpm: validBpm,
      anchors: [
        {
          id: 'anchor-0',
          timeSec: Math.max(0, firstBeatSec),
          bpm: validBpm,
          beatNumber: 1,
          isUserFixed: false,
        },
      ],
    };
  }

  /**
   * Sorts anchors chronologically to ensure accurate piecewise time-to-beat conversion.
   */
  private static getSortedAnchors(grid: BeatgridMap): BeatAnchor[] {
    return [...grid.anchors].sort((a, b) => a.timeSec - b.timeSec);
  }

  /**
   * Calculates the exact continuous beat index (e.g. 16.5 = halfway through beat 16)
   * at any given playback timestamp, accounting for multi-anchor tempo variations.
   */
  public static getBeatPosition(grid: BeatgridMap, timeSec: number): number {
    const anchors = this.getSortedAnchors(grid);
    if (anchors.length === 0) return 0;

    let accumulatedBeats = 0;
    for (let i = 0; i < anchors.length; i++) {
      const current = anchors[i];
      const next = anchors[i + 1];

      const segmentStart = current.timeSec;
      const segmentEnd = next ? next.timeSec : Infinity;
      const secPerBeat = 60 / current.bpm;

      if (timeSec < segmentStart && i === 0) {
        // Before first anchor: extrapolate backwards
        const timeDiff = timeSec - segmentStart;
        return timeDiff / secPerBeat;
      }

      if (timeSec >= segmentStart && timeSec < segmentEnd) {
        // Within current segment
        const elapsedInSegment = timeSec - segmentStart;
        return accumulatedBeats + (elapsedInSegment / secPerBeat);
      }

      if (next) {
        const segmentDuration = next.timeSec - current.timeSec;
        accumulatedBeats += segmentDuration / secPerBeat;
      }
    }

    return accumulatedBeats;
  }

  /**
   * Converts a beat index back into track playback seconds.
   */
  public static getTimeForBeat(grid: BeatgridMap, targetBeat: number): number {
    const anchors = this.getSortedAnchors(grid);
    if (anchors.length === 0) return 0;

    let accumulatedBeats = 0;
    for (let i = 0; i < anchors.length; i++) {
      const current = anchors[i];
      const next = anchors[i + 1];
      const secPerBeat = 60 / current.bpm;

      if (targetBeat < 0 && i === 0) {
        return current.timeSec + (targetBeat * secPerBeat);
      }

      const beatsInSegment = next ? (next.timeSec - current.timeSec) / secPerBeat : Infinity;

      if (targetBeat >= accumulatedBeats && targetBeat <= accumulatedBeats + beatsInSegment) {
        const remainingBeats = targetBeat - accumulatedBeats;
        return current.timeSec + (remainingBeats * secPerBeat);
      }

      accumulatedBeats += beatsInSegment;
    }

    const last = anchors[anchors.length - 1];
    return last.timeSec + ((targetBeat - accumulatedBeats) * (60 / last.bpm));
  }

  /**
   * Snaps a timestamp to the closest beat marker (for Quantize Hot Cues and Loops).
   */
  public static snapToNearestBeat(grid: BeatgridMap, timeSec: number): number {
    const beatPos = this.getBeatPosition(grid, timeSec);
    const nearestBeat = Math.round(beatPos);
    return Math.max(0, this.getTimeForBeat(grid, nearestBeat));
  }

  /**
   * Adds or updates a manual anchor at the current playhead.
   * Useful when a live drummer drifts or tempo changes mid-song.
   */
  public static addAnchor(
    grid: BeatgridMap,
    timeSec: number,
    bpm?: number,
    beatNumber: number = 1
  ): BeatgridMap {
    const effectiveBpm = bpm ? Math.max(30, Math.min(300, bpm)) : grid.nominalBpm;
    const newAnchor: BeatAnchor = {
      id: `anchor-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timeSec: Math.max(0, timeSec),
      bpm: effectiveBpm,
      beatNumber,
      isUserFixed: true,
    };

    // Filter out any close duplicate within 10ms
    const filtered = grid.anchors.filter((a) => Math.abs(a.timeSec - timeSec) > 0.01);
    filtered.push(newAnchor);

    return {
      ...grid,
      anchors: filtered.sort((a, b) => a.timeSec - b.timeSec),
    };
  }

  /**
   * Shifts the entire beatgrid earlier or later by a small delta (in seconds)
   * without altering the calculated BPM.
   */
  public static nudgeGridOffset(grid: BeatgridMap, deltaSec: number): BeatgridMap {
    return {
      ...grid,
      anchors: grid.anchors.map((a) => ({
        ...a,
        timeSec: Math.max(0, a.timeSec + deltaSec),
      })),
    };
  }
}
