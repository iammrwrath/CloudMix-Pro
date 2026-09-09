import React, { useState, useEffect } from 'react';
import { DeckId, DeckState, HotCue, TrackMetadata, WaveformData } from '../types/dj';
import { WaveformDisplay } from './WaveformDisplay';
import { JogWheel } from './JogWheel';
import { PerformancePads } from './PerformancePads';
import { PitchFader } from './PitchFader';
import { Play, Pause, Disc, Radio, RefreshCw, Zap } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';
import { cloudProgression } from '../services/CloudProgressionService';

interface DeckProps {
  deckId: DeckId;
  deckState: DeckState;
  waveformData: WaveformData | null;
  onPlayToggle: () => void;
  onCueClick: () => void;
  onSyncClick: () => void;
  onSeek: (seconds: number) => void;
  onRateChange: (rate: number) => void;
  onKeyLockToggle: () => void;
  onNudge: (factor: number) => void;
  onReleaseNudge: () => void;
  onScratch: (deltaSec: number) => void;
  onTriggerCue: (cueId: number) => void;
  onSetCue: (cueId: number, position: number) => void;
  onClearCue: (cueId: number) => void;
  onSetAutoLoop: (beats: number) => void;
  onExitLoop: () => void;
  onBeatJump: (beats: number) => void;
  onStemMuteToggle?: (stem: 'vocals' | 'harmonics' | 'drums') => void;
  onStemSoloToggle?: (stem: 'vocals' | 'harmonics' | 'drums') => void;
}

export const Deck: React.FC<DeckProps> = ({
  deckId,
  deckState,
  waveformData,
  onPlayToggle,
  onCueClick,
  onSyncClick,
  onSeek,
  onRateChange,
  onKeyLockToggle,
  onNudge,
  onReleaseNudge,
  onScratch,
  onTriggerCue,
  onSetCue,
  onClearCue,
  onSetAutoLoop,
  onExitLoop,
  onBeatJump,
  onStemMuteToggle,
  onStemSoloToggle,
}) => {
  const [tempoRange, setTempoRange] = useState(0.08); // 8% default
  const isDeckA = deckId === 'A';
  const accentColor = isDeckA ? '#00e5ff' : '#ff3366';

  const toggleRange = () => {
    if (tempoRange === 0.08) setTempoRange(0.16);
    else if (tempoRange === 0.16) setTempoRange(0.5);
    else setTempoRange(0.08);
  };

  const track = deckState.track;

  return (
    <div className="flex flex-col h-full bg-dj-panel rounded-xl p-2 border border-dj-border shadow-2xl flex-1 min-w-[360px] overflow-hidden justify-between">
      {/* 1. Deck Header: Track Info, BPM, Key, Time */}
      <div className="flex items-center justify-between bg-dj-surface/80 rounded-lg p-1.5 mb-1 border border-dj-border">
        {/* Deck Identifier badge & Track Title */}
        <div className="flex items-center space-x-2 overflow-hidden">
          <div
            className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs font-mono text-black shadow-md"
            style={{ backgroundColor: accentColor }}
          >
            {deckId}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-xs text-white truncate max-w-[180px]">
              {track ? track.title : 'No Track Loaded'}
            </span>
            <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
              {track ? track.artist : 'Drag track from Library or Google Drive'}
            </span>
          </div>
        </div>

        {/* BPM & Musical Key Badges */}
        <div className="flex items-center space-x-1.5">
          {/* Key with Camelot wheel color coding */}
          <div className="flex flex-col items-center bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700">
            <span className="text-[8px] font-mono text-slate-400 uppercase">KEY</span>
            <span className="text-[11px] font-mono font-bold text-amber-400 leading-none">
              {track?.camelotKey || track?.key || '--'}
            </span>
          </div>

          {/* BPM display */}
          <div className="flex flex-col items-center bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
            <span className="text-[8px] font-mono text-slate-400 uppercase">BPM</span>
            <span className="text-[11px] font-mono font-bold text-cyan-400 leading-none">
              {track ? (track.bpm * deckState.playbackRate).toFixed(1) : '--.-'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Waveform Display (Tri-band Scrolling + Overview) */}
      <div className="mb-1">
        <WaveformDisplay
          deckId={deckId}
          track={track}
          waveformData={waveformData}
          currentTime={deckState.currentTime}
          duration={deckState.duration}
          isPlaying={deckState.isPlaying}
          hotCues={track?.hotCues || []}
          activeLoop={deckState.activeLoop}
          onSeek={onSeek}
          accentColor={accentColor}
        />
      </div>

      {/* 3. Middle Section: Tactile Jog Wheel + Pitch Fader */}
      <div className="flex items-center justify-between my-0.5 py-0.5">
        <div className="flex-1 flex justify-center">
          <JogWheel
            deckId={deckId}
            currentTime={deckState.currentTime}
            duration={deckState.duration}
            isPlaying={deckState.isPlaying}
            playbackRate={deckState.playbackRate}
            onNudge={onNudge}
            onReleaseNudge={onReleaseNudge}
            onScratch={onScratch}
            accentColor={accentColor}
          />
        </div>

        <PitchFader
          deckId={deckId}
          playbackRate={deckState.playbackRate}
          tempoRange={tempoRange}
          originalBpm={track?.bpm || 120}
          keyLock={deckState.keyLock}
          onRateChange={onRateChange}
          onRangeToggle={toggleRange}
          onKeyLockToggle={onKeyLockToggle}
          onNudge={onNudge}
          onReleaseNudge={onReleaseNudge}
          accentColor={accentColor}
        />
      </div>

      {/* 4. Performance Pads Section (Hot Cues, Loops, Stems) */}
      <div className="my-0.5">
        <PerformancePads
          deckId={deckId}
          hotCues={track?.hotCues || []}
          activeLoop={deckState.activeLoop}
          bpm={track?.bpm || 120}
          currentTime={deckState.currentTime}
          onTriggerCue={onTriggerCue}
          onSetCue={onSetCue}
          onClearCue={onClearCue}
          onSetAutoLoop={onSetAutoLoop}
          onExitLoop={onExitLoop}
          onBeatJump={onBeatJump}
          stems={deckState.stems}
          onStemMuteToggle={onStemMuteToggle}
          onStemSoloToggle={onStemSoloToggle}
          accentColor={accentColor}
        />
      </div>

      {/* 5. Primary Transport Controls: Large Play, Cue, Sync */}
      <div className="flex items-center justify-between pt-1 border-t border-dj-border/60">
        {/* SYNC Button */}
        <button
          onClick={onSyncClick}
          title="Instant Beatgrid Sync"
          className={`flex-1 h-9 rounded-lg font-mono font-extrabold text-xs mr-1.5 border transition-all cursor-pointer flex items-center justify-center space-x-1.5 active:scale-[0.95] select-none ${
            deckState.isSync
              ? 'bg-cyan-500 text-black border-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.8)]'
              : 'bg-slate-900/90 border-cyan-500/30 text-cyan-400 hover:bg-slate-800 hover:border-cyan-400'
          }`}
          style={{
            boxShadow: deckState.isSync ? undefined : 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>SYNC</span>
        </button>

        {/* CUE Button */}
        <button
          onClick={onCueClick}
          title="Temporary Cue Playhead"
          className="flex-1 h-9 rounded-lg font-mono font-extrabold text-xs mr-1.5 bg-slate-900/90 border border-amber-500/40 text-amber-400 hover:bg-slate-800 hover:border-amber-400 active:scale-[0.95] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex items-center justify-center space-x-1.5 cursor-pointer select-none"
          style={{
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>CUE</span>
        </button>

        {/* Large Illuminated PLAY / PAUSE Button */}
        <button
          onClick={onPlayToggle}
          title="Play / Pause"
          className={`flex-1 h-9 rounded-lg font-mono font-extrabold text-xs border transition-all cursor-pointer flex items-center justify-center space-x-1.5 active:scale-[0.95] select-none ${
            deckState.isPlaying
              ? 'bg-emerald-500 text-black border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.85)]'
              : 'bg-slate-900/90 border-emerald-500/30 text-emerald-400 hover:bg-slate-800 hover:border-emerald-400'
          }`}
          style={{
            boxShadow: deckState.isPlaying ? undefined : 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {deckState.isPlaying ? (
            <Pause className="w-4 h-4 fill-current animate-pulse" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>{deckState.isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </button>
      </div>
    </div>
  );
};
