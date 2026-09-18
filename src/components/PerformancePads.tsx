import React, { useState } from 'react';
import { DeckId, HotCue, StemState } from '../types/dj';

interface PerformancePadsProps {
  deckId: DeckId;
  hotCues: HotCue[];
  activeLoop: { start: number; end: number; beats: number } | null;
  bpm: number;
  currentTime: number;
  onTriggerCue: (cueId: number) => void;
  onSetCue: (cueId: number, position: number) => void;
  onClearCue: (cueId: number) => void;
  onSetAutoLoop: (beats: number) => void;
  onExitLoop: () => void;
  onBeatJump: (beats: number) => void;
  stems?: StemState;
  onStemMuteToggle?: (stem: 'vocals' | 'harmonics' | 'bass' | 'drums') => void;
  onStemSoloToggle?: (stem: 'vocals' | 'harmonics' | 'bass' | 'drums') => void;
  onIsolateAcapella?: () => void;
  onIsolateInstrumental?: () => void;
  onResetStems?: () => void;
  accentColor?: string;
}

type PadMode = 'HOT CUE' | 'AUTO LOOP' | 'BEAT JUMP' | 'STEMS';

const CUE_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
];

export const PerformancePads: React.FC<PerformancePadsProps> = ({
  deckId,
  hotCues,
  activeLoop,
  bpm,
  currentTime,
  onTriggerCue,
  onSetCue,
  onClearCue,
  onSetAutoLoop,
  onExitLoop,
  onBeatJump,
  stems,
  onStemMuteToggle,
  onStemSoloToggle,
  onIsolateAcapella,
  onIsolateInstrumental,
  onResetStems,
  accentColor = '#00e5ff',
}) => {
  const [padMode, setPadMode] = useState<PadMode>('HOT CUE');
  const [deleteMode, setDeleteMode] = useState(false);

  const loopLengths = [0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8];
  const loopLabels = ['1/16', '1/8', '1/4', '1/2', '1', '2', '4', '8'];
  const jumpDeltas = [-4, -2, -1, -0.5, 0.5, 1, 2, 4];
  const jumpLabels = ['-4', '-2', '-1', '-1/2', '+1/2', '+1', '+2', '+4'];

  const handleCueClick = (cueId: number) => {
    const existing = hotCues.find((c) => c.id === cueId && c.active);
    if (deleteMode) {
      if (existing) onClearCue(cueId);
      return;
    }
    if (existing) {
      onTriggerCue(cueId);
    } else {
      onSetCue(cueId, currentTime);
    }
  };

  const handleLoopClick = (beats: number) => {
    if (activeLoop && activeLoop.beats === beats) {
      onExitLoop();
    } else {
      onSetAutoLoop(beats);
    }
  };

  return (
    <div className="flex flex-col bg-dj-surface/90 rounded-lg p-1.5 border border-dj-border shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
      {/* Mode Selector Tabs */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <div className="flex space-x-1">
          {(['HOT CUE', 'AUTO LOOP', 'BEAT JUMP', 'STEMS'] as PadMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => { setPadMode(mode); setDeleteMode(false); }}
              className={`px-2.5 py-1 text-[10.5px] font-mono font-black rounded-md tracking-wider transition-all cursor-pointer ${
                padMode === mode
                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-[0_0_8px_rgba(255,255,255,0.2)] border border-slate-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {padMode === 'HOT CUE' && (
          <button
            onClick={() => setDeleteMode(!deleteMode)}
            className={`px-2.5 py-1 text-[9.5px] font-mono font-black rounded uppercase tracking-wider transition-all cursor-pointer ${
              deleteMode
                ? 'bg-rose-600 text-white animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.8)]'
                : 'text-slate-400 hover:text-rose-400 bg-slate-800/80 border border-slate-700'
            }`}
          >
            {deleteMode ? 'Delete' : 'Clear'}
          </button>
        )}

        {padMode === 'STEMS' && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onIsolateAcapella?.()}
              title="1-Tap Acapella: Pure vocals isolation with 0% instrument bleed"
              className={`px-1.5 py-0.5 text-[8px] font-mono font-bold rounded uppercase tracking-wider transition-all cursor-pointer ${
                stems?.vocalsSolo && !stems?.vocalsMuted
                  ? 'bg-pink-600 text-white shadow-[0_0_8px_rgba(236,72,153,0.8)]'
                  : 'bg-slate-800 text-pink-400 hover:text-white border border-slate-700'
              }`}
            >
              Acapella
            </button>
            <button
              onClick={() => onIsolateInstrumental?.()}
              title="1-Tap Instrumental: Pure instruments with 0% vocals"
              className={`px-1.5 py-0.5 text-[8px] font-mono font-bold rounded uppercase tracking-wider transition-all cursor-pointer ${
                stems?.vocalsMuted && !stems?.drumsMuted
                  ? 'bg-cyan-600 text-white shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                  : 'bg-slate-800 text-cyan-400 hover:text-white border border-slate-700'
              }`}
            >
              Inst
            </button>
            <button
              onClick={() => onResetStems?.()}
              title="Reset all stems to 100%"
              className="px-1.5 py-0.5 text-[8px] font-mono font-bold rounded uppercase text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700 cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* 8 Performance Pads Grid (Tactile RGB Backlit Silicone Pads) */}
      <div className="grid grid-cols-4 gap-1.5">
        {padMode === 'HOT CUE' && (
          Array.from({ length: 8 }).map((_, i) => {
            const cue = hotCues.find((c) => c.id === i && c.active);
            const cueColor = CUE_COLORS[i % CUE_COLORS.length];

            return (
              <button
                key={i}
                onClick={() => handleCueClick(i)}
                className={`relative h-8 sm:h-9 md:h-10 xl:h-11 rounded-lg flex flex-col items-center justify-center font-mono font-black text-xs sm:text-[13px] transition-all cursor-pointer select-none active:scale-[0.95] ${
                  cue
                    ? 'text-black font-extrabold shadow-lg'
                    : 'bg-slate-900/90 text-slate-300 hover:text-white hover:border-slate-400'
                }`}
                style={
                  cue
                    ? {
                        backgroundColor: cueColor,
                        boxShadow: `0 0 12px ${cueColor}88, inset 0 1px 0 rgba(255,255,255,0.4)`,
                        border: `1px solid ${cueColor}`,
                      }
                    : {
                        border: `1px solid ${cueColor}44`,
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06)`,
                      }
                }
              >
                <div className="flex items-center space-x-1">
                  <span>{i + 1}</span>
                  {cue && <span className="text-[9px] font-semibold opacity-90">{cue.position.toFixed(1)}s</span>}
                </div>
                {deleteMode && cue && (
                  <span className="absolute top-0 right-1 text-xs text-black font-extrabold">
                    ×
                  </span>
                )}
              </button>
            );
          })
        )}

        {padMode === 'AUTO LOOP' && (
          loopLengths.map((beats, i) => {
            const isCurrentActive = activeLoop && activeLoop.beats === beats;
            return (
              <button
                key={i}
                onClick={() => handleLoopClick(beats)}
                className={`h-8 sm:h-9 md:h-10 xl:h-11 rounded-lg flex items-center justify-center space-x-1 font-mono font-black text-xs sm:text-[13px] transition-all cursor-pointer active:scale-[0.95] ${
                  isCurrentActive
                    ? 'bg-emerald-500 text-black border border-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.8)] font-extrabold'
                    : 'bg-slate-900/90 border border-emerald-500/40 text-emerald-400 hover:bg-slate-800 hover:border-emerald-300'
                }`}
                style={{
                  boxShadow: isCurrentActive ? undefined : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <span>{loopLabels[i]}</span>
              </button>
            );
          })
        )}

        {padMode === 'BEAT JUMP' && (
          jumpDeltas.map((beats, i) => (
            <button
              key={i}
              onClick={() => onBeatJump(beats)}
              className="h-8 sm:h-9 md:h-10 xl:h-11 rounded-lg flex items-center justify-center font-mono font-black text-xs sm:text-[13px] bg-slate-900/90 border border-cyan-500/40 text-cyan-300 hover:bg-slate-800 hover:border-cyan-300 active:scale-[0.95] transition-all cursor-pointer shadow-inner"
              style={{
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <span>{jumpLabels[i]}</span>
            </button>
          ))
        )}

        {padMode === 'STEMS' && (
          <>
            {/* Row 1: 4-Stem Mutes (Vocals, Melodics, Bass, Drums) */}
            <button
              onClick={() => onStemMuteToggle?.('vocals')}
              className={`h-8 sm:h-9 md:h-10 xl:h-11 rounded-lg flex flex-col items-center justify-center font-mono font-black text-[10.5px] transition-all cursor-pointer active:scale-[0.95] ${
                stems?.vocalsMuted
                  ? 'bg-rose-950/80 border border-rose-600 text-rose-400 shadow-[0_0_8px_rgba(225,29,72,0.4)]'
                  : 'bg-pink-600 text-white border border-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.6)]'
              }`}
            >
              <span>VOCAL</span>
              <span className="text-[8px] opacity-90">{stems?.vocalsMuted ? 'MUTED' : 'ON'}</span>
            </button>

            <button
              onClick={() => onStemMuteToggle?.('harmonics')}
              className={`h-8 sm:h-9 md:h-10 xl:h-11 rounded-lg flex flex-col items-center justify-center font-mono font-black text-[10.5px] transition-all cursor-pointer active:scale-[0.95] ${
                stems?.harmonicsMuted
                  ? 'bg-rose-950/80 border border-rose-600 text-rose-400 shadow-[0_0_8px_rgba(225,29,72,0.4)]'
                  : 'bg-emerald-600 text-white border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
              }`}
            >
              <span>MELODY</span>
              <span className="text-[8px] opacity-90">{stems?.harmonicsMuted ? 'MUTED' : 'ON'}</span>
            </button>

            <button
              onClick={() => onStemMuteToggle?.('bass')}
              className={`h-8 sm:h-9 md:h-10 xl:h-11 rounded-lg flex flex-col items-center justify-center font-mono font-black text-[10.5px] transition-all cursor-pointer active:scale-[0.95] ${
                stems?.bassMuted
                  ? 'bg-rose-950/80 border border-rose-600 text-rose-400 shadow-[0_0_8px_rgba(225,29,72,0.4)]'
                  : 'bg-blue-600 text-white border border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.6)]'
              }`}
            >
              <span>BASS</span>
              <span className="text-[8px] opacity-90">{stems?.bassMuted ? 'MUTED' : 'ON'}</span>
            </button>

            <button
              onClick={() => onStemMuteToggle?.('drums')}
              className={`h-8 sm:h-9 md:h-10 xl:h-11 rounded-lg flex flex-col items-center justify-center font-mono font-black text-[10.5px] transition-all cursor-pointer active:scale-[0.95] ${
                stems?.drumsMuted
                  ? 'bg-rose-950/80 border border-rose-600 text-rose-400 shadow-[0_0_8px_rgba(225,29,72,0.4)]'
                  : 'bg-amber-600 text-white border border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
              }`}
            >
              <span>DRUMS</span>
              <span className="text-[8px] opacity-90">{stems?.drumsMuted ? 'MUTED' : 'ON'}</span>
            </button>

            {/* Row 2: 4-Stem Solos (Vocals, Melodics, Bass, Drums) */}
            <button
              onClick={() => onStemSoloToggle?.('vocals')}
              className={`h-8 sm:h-9 md:h-10 xl:h-11 rounded-lg flex flex-col items-center justify-center font-mono font-black text-[10px] transition-all cursor-pointer active:scale-[0.95] ${
                stems?.vocalsSolo
                  ? 'bg-amber-400 text-black font-extrabold border border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                  : 'bg-slate-900/90 border border-pink-700/60 text-pink-400 hover:bg-pink-950/40'
              }`}
            >
              <span>VOC SOLO</span>
              <span className="text-[8px] opacity-90">{stems?.vocalsSolo ? 'ACTIVE' : 'SOLO'}</span>
            </button>

            <button
              onClick={() => onStemSoloToggle?.('harmonics')}
              className={`h-8 sm:h-9 md:h-10 xl:h-11 rounded-lg flex flex-col items-center justify-center font-mono font-black text-[10px] transition-all cursor-pointer active:scale-[0.95] ${
                stems?.harmonicsSolo
                  ? 'bg-amber-400 text-black font-extrabold border border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                  : 'bg-slate-900/90 border border-emerald-700/60 text-emerald-400 hover:bg-emerald-950/40'
              }`}
            >
              <span>MEL SOLO</span>
              <span className="text-[8px] opacity-90">{stems?.harmonicsSolo ? 'ACTIVE' : 'SOLO'}</span>
            </button>

            <button
              onClick={() => onStemSoloToggle?.('bass')}
              className={`h-8 sm:h-9 md:h-10 xl:h-11 rounded-lg flex flex-col items-center justify-center font-mono font-black text-[10px] transition-all cursor-pointer active:scale-[0.95] ${
                stems?.bassSolo
                  ? 'bg-amber-400 text-black font-extrabold border border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                  : 'bg-slate-900/90 border border-blue-700/60 text-blue-400 hover:bg-blue-950/40'
              }`}
            >
              <span>BASS SOLO</span>
              <span className="text-[8px] opacity-90">{stems?.bassSolo ? 'ACTIVE' : 'SOLO'}</span>
            </button>

            <button
              onClick={() => onStemSoloToggle?.('drums')}
              className={`h-8 sm:h-9 md:h-10 xl:h-11 rounded-lg flex flex-col items-center justify-center font-mono font-black text-[10px] transition-all cursor-pointer active:scale-[0.95] ${
                stems?.drumsSolo
                  ? 'bg-amber-400 text-black font-extrabold border border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                  : 'bg-slate-900/90 border border-amber-700/60 text-amber-400 hover:bg-amber-950/40'
              }`}
            >
              <span>DRM SOLO</span>
              <span className="text-[8px] opacity-90">{stems?.drumsSolo ? 'ACTIVE' : 'SOLO'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
