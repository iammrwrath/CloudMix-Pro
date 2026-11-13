/**
 * CloudMix Pro - Musical Phrase & Section Analysis Engine
 *
 * Automatically detects and tags structural dance music phases (Intro, Verse, Buildup, Drop, Outro)
 * in standard 16-bar and 32-bar groupings to power scrolling waveform overlays and visual mix-in/mix-out countdowns.
 */

export type PhraseType = 'intro' | 'verse' | 'buildup' | 'drop' | 'breakdown' | 'outro';

export interface MusicalPhrase {
  index: number;
  type: PhraseType;
  startBeat: number;
  endBeat: number;
  startTimeSec: number;
  endTimeSec: number;
  barCount: 8 | 16 | 32;
  energyLevel: number; // 0.0 - 1.0 normalized
  label: string;
  color: string;
}

export class PhraseDetector {
  /**
   * Colors associated with standard DJ software phrase types (matching club standard schemes)
   */
  public static readonly PHRASE_COLORS: Record<PhraseType, string> = {
    intro: '#3b82f6',     // Sky Blue
    verse: '#06b6d4',     // Cyan
    buildup: '#f59e0b',   // Amber / Yellow
    drop: '#ef4444',      // Neon Red / Coral
    breakdown: '#8b5cf6', // Electric Purple
    outro: '#64748b',     // Slate
  };

  /**
   * Analyzes an audio buffer or audio energy profile to segment the track into 16-bar / 32-bar phrases.
   */
  public static analyzePhrases(
    durationSec: number,
    bpm: number,
    firstBeatSec: number = 0.0,
    energyProfile?: Float32Array
  ): MusicalPhrase[] {
    const validBpm = Math.max(40, bpm || 120);
    const secPerBeat = 60 / validBpm;
    const totalBeats = Math.floor((durationSec - firstBeatSec) / secPerBeat);
    if (totalBeats < 16) return [];

    const phrases: MusicalPhrase[] = [];
    const beatsPer16Bars = 64; // 16 bars * 4 beats/bar

    let currentBeat = 0;
    let phraseIndex = 1;

    while (currentBeat < totalBeats) {
      const remainingBeats = totalBeats - currentBeat;
      // Default to 16-bar segments; fall back to 8-bar if near end
      const barCount: 8 | 16 | 32 = remainingBeats < 64 ? 8 : 16;
      const phraseLengthBeats = barCount === 8 ? 32 : 64;

      const endBeat = Math.min(totalBeats, currentBeat + phraseLengthBeats);
      const startTimeSec = firstBeatSec + (currentBeat * secPerBeat);
      const endTimeSec = firstBeatSec + (endBeat * secPerBeat);

      // Estimate energy from energyProfile or normalized progress
      let energy = 0.5;
      if (energyProfile && energyProfile.length > 0) {
        const startRatio = Math.max(0, Math.min(1, startTimeSec / durationSec));
        const endRatio = Math.max(0, Math.min(1, endTimeSec / durationSec));
        const startSample = Math.floor(startRatio * energyProfile.length);
        const endSample = Math.floor(endRatio * energyProfile.length);

        let sum = 0;
        let count = 0;
        for (let s = startSample; s < endSample && s < energyProfile.length; s++) {
          sum += energyProfile[s];
          count++;
        }
        if (count > 0) energy = Math.min(1.0, sum / count);
      }

      // Classify phrase role based on progress and energy profile
      const progressRatio = startTimeSec / durationSec;
      let type: PhraseType = 'verse';

      if (progressRatio < 0.15) {
        type = 'intro';
      } else if (progressRatio > 0.85) {
        type = 'outro';
      } else if (energy > 0.75) {
        type = 'drop';
      } else if (energy > 0.6) {
        type = 'buildup';
      } else if (energy < 0.35) {
        type = 'breakdown';
      } else {
        type = 'verse';
      }

      phrases.push({
        index: phraseIndex++,
        type,
        startBeat: currentBeat,
        endBeat,
        startTimeSec,
        endTimeSec,
        barCount,
        energyLevel: energy,
        label: `${type.toUpperCase()} ${barCount}B`,
        color: this.PHRASE_COLORS[type],
      });

      currentBeat = endBeat;
    }

    return phrases;
  }

  /**
   * Returns remaining bars and beats in the current phrase (e.g. "8.2 bars to DROP").
   */
  public static getPhraseCountdown(
    phrases: MusicalPhrase[],
    currentTimeSec: number,
    bpm: number
  ): { currentPhrase: MusicalPhrase | null; nextPhrase: MusicalPhrase | null; barsRemaining: number; beatsRemaining: number } {
    const secPerBeat = 60 / Math.max(40, bpm || 120);

    for (let i = 0; i < phrases.length; i++) {
      const p = phrases[i];
      if (currentTimeSec >= p.startTimeSec && currentTimeSec < p.endTimeSec) {
        const remainingSec = p.endTimeSec - currentTimeSec;
        const totalBeatsLeft = Math.max(0, remainingSec / secPerBeat);
        const barsRemaining = Math.floor(totalBeatsLeft / 4);
        const beatsRemaining = Math.floor(totalBeatsLeft % 4);

        return {
          currentPhrase: p,
          nextPhrase: phrases[i + 1] || null,
          barsRemaining,
          beatsRemaining,
        };
      }
    }

    return {
      currentPhrase: null,
      nextPhrase: null,
      barsRemaining: 0,
      beatsRemaining: 0,
    };
  }
}
