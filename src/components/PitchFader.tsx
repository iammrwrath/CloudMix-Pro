import React from 'react';
import { DeckId } from '../types/dj';

interface PitchFaderProps {
  deckId: DeckId;
  playbackRate: number;
  tempoRange: number; // 0.08, 0.16, 0.50
  originalBpm: number;
  keyLock: boolean;
  onRateChange: (rate: number) => void;
  onRangeToggle: () => void;
  onKeyLockToggle: () => void;
  onNudge: (factor: number) => void;
  onReleaseNudge: () => void;
  accentColor?: string;
}

export const PitchFader: React.FC<PitchFaderProps> = ({
  deckId,
  playbackRate,
  tempoRange,
  originalBpm,
  keyLock,
  onRateChange,
  onRangeToggle,
  onKeyLockToggle,
  onNudge,
  onReleaseNudge,
  accentColor = '#00e5ff',
}) => {
  // slider value: -1.0 (slower) to +1.0 (faster)
  // rate = 1.0 + sliderVal * tempoRange
  const sliderVal = (playbackRate - 1.0) / tempoRange;
  const currentBpm = Math.round(originalBpm * playbackRate * 10) / 10;
  const percentDelta = (playbackRate - 1.0) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newRate = 1.0 + val * tempoRange;
    onRateChange(newRate);
  };

  const handleReset = () => {
    onRateChange(1.0);
  };

  return (
    <div className="flex flex-col items-center justify-between bg-dj-surface/90 rounded-xl p-1.5 sm:p-2 border border-dj-border shadow-[0_4px_16px_rgba(0,0,0,0.6)] w-24 sm:w-28 xl:w-32 shrink-0">
      {/* Top Controls: Key Lock & Range */}
      <div className="flex items-center justify-between w-full mb-1 px-0.5">
        <button
          onClick={onKeyLockToggle}
          title="Master Tempo (Preserve Musical Key)"
          className={`px-1.5 py-0.5 text-[8px] font-mono font-bold rounded uppercase tracking-wider transition-all cursor-pointer ${
            keyLock
              ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.8)] font-extrabold border border-amber-200'
              : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          KEY LOK
        </button>

        <button
          onClick={onRangeToggle}
          title="Toggle Pitch Range (±8%, ±16%, ±50%)"
          className="px-1.5 py-0.5 text-[8px] font-mono font-bold rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          ±{Math.round(tempoRange * 100)}%
        </button>
      </div>

      {/* Tempo % & BPM readout */}
      <div className="flex flex-col items-center mb-1">
        <span
          onClick={handleReset}
          title="Click to reset pitch to 0.0%"
          className="font-mono text-[12px] sm:text-[13px] font-extrabold text-white cursor-pointer hover:text-cyan-400 transition-colors"
        >
          {percentDelta >= 0 ? `+${percentDelta.toFixed(1)}%` : `${percentDelta.toFixed(1)}%`}
        </span>
        <span className="font-mono text-[9px] sm:text-[10px] text-slate-400 font-semibold">
          {currentBpm > 0 ? `${currentBpm.toFixed(1)} BPM` : '--.- BPM'}
        </span>
      </div>

      {/* Momentary + Nudge Button */}
      <button
        onMouseDown={() => onNudge(1.04)}
        onMouseUp={onReleaseNudge}
        onMouseLeave={onReleaseNudge}
        className="w-full py-0.5 text-[11px] sm:text-xs font-mono font-extrabold rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 active:bg-cyan-500 active:text-black border border-slate-700/80 transition-all cursor-pointer active:scale-95 shadow-sm"
      >
        +
      </button>

      {/* Vertical Slider Track with Calibrated Ticks */}
      <div className="relative h-28 sm:h-36 md:h-44 xl:h-52 w-full flex items-center justify-center my-1">
        {/* Pitch Scale Ticks on Left */}
        <div className="absolute left-1 inset-y-2 flex flex-col justify-between items-end pointer-events-none text-[7px] sm:text-[8px] font-mono text-slate-500 font-semibold pr-1">
          <span>+</span>
          <span>+4</span>
          <span className="text-amber-400 font-bold">0</span>
          <span>-4</span>
          <span>-</span>
        </div>

        {/* Center Zero Detent Indicator */}
        <div className="absolute top-1/2 left-6 right-6 h-[2px] bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.8)] pointer-events-none z-10" />

        <input
          type="range"
          min="-1"
          max="1"
          step="0.001"
          value={sliderVal}
          onChange={handleSliderChange}
          className="w-24 sm:w-32 md:w-40 xl:w-48 h-2 appearance-none bg-slate-950 rounded-full outline-none cursor-pointer -rotate-90 pitch-thumb border border-slate-800 shadow-inner"
        />
      </div>

      {/* Momentary - Nudge Button */}
      <button
        onMouseDown={() => onNudge(0.96)}
        onMouseUp={onReleaseNudge}
        onMouseLeave={onReleaseNudge}
        className="w-full py-0.5 text-[11px] font-mono font-extrabold rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 active:bg-cyan-500 active:text-black border border-slate-700/80 transition-all cursor-pointer active:scale-95 shadow-sm"
      >
        -
      </button>
    </div>
  );
};
