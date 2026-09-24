import React, { useState } from 'react';
import { DeckId, DeckState, FXType, HotCue, TrackMetadata, WaveformData } from '../types/dj';
import { WaveformDisplay } from './WaveformDisplay';
import { JogWheel } from './JogWheel';
import { PerformancePads } from './PerformancePads';
import { PitchFader } from './PitchFader';
import { Play, Pause, Radio, Zap, Headphones, Repeat, Sparkles, Layers, Disc } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';
import { cloudProgression } from '../services/CloudProgressionService';

interface DeckProps {
  deckId: DeckId;
  deckState: DeckState;
  waveformData: WaveformData | null;
  onLoadTrack?: (track: TrackMetadata) => void;
  onPlayToggle: () => void;
  onCueClick: () => void;
  onSyncClick: () => void;
  onSeek: (seconds: number) => void;
  onRateChange: (rate: number) => void;
  onKeyLockToggle: () => void;
  onNudge: (factor: number) => void;
  onReleaseNudge: () => void;
  onScratch: (deltaSec: number) => void;
  onScratchStart?: () => void;
  onScratchEnd?: () => void;
  onTriggerCue: (cueId: number) => void;
  onSetCue: (cueId: number, position: number) => void;
  onClearCue: (cueId: number) => void;
  onSetAutoLoop: (beats: number) => void;
  onExitLoop: () => void;
  onBeatJump: (beats: number) => void;
  onStemGainChange?: (stem: 'vocals' | 'harmonics' | 'bass' | 'drums', val: number) => void;
  onStemMuteToggle?: (stem: 'vocals' | 'harmonics' | 'bass' | 'drums') => void;
  onStemSoloToggle?: (stem: 'vocals' | 'harmonics' | 'bass' | 'drums') => void;
  onIsolateAcapella?: () => void;
  onIsolateInstrumental?: () => void;
  onResetStems?: () => void;
  onKeyShift?: (semitones: number) => void;
  onKeySync?: () => void;
  onToggleSlip?: () => void;
  onToggleSandbox?: () => void;
  onToggleFX?: (type: FXType) => void;
}

export const Deck = React.memo<DeckProps>(({
  deckId,
  deckState,
  waveformData,
  onLoadTrack,
  onPlayToggle,
  onCueClick,
  onSyncClick,
  onSeek,
  onRateChange,
  onKeyLockToggle,
  onNudge,
  onReleaseNudge,
  onScratch,
  onScratchStart,
  onScratchEnd,
  onTriggerCue,
  onSetCue,
  onClearCue,
  onSetAutoLoop,
  onExitLoop,
  onBeatJump,
  onStemGainChange,
  onStemMuteToggle,
  onStemSoloToggle,
  onIsolateAcapella,
  onIsolateInstrumental,
  onResetStems,
  onKeyShift,
  onKeySync,
  onToggleSlip,
  onToggleSandbox,
  onToggleFX,
}) => {
  const [tempoRange, setTempoRange] = useState(0.08); // 8% default
  const [selectedLoopBeats, setSelectedLoopBeats] = useState<number>(4);
  const [isDragOver, setIsDragOver] = useState(false);
  const isDeckA = deckId === 'A';
  const accentColor = isDeckA ? '#00e5ff' : '#ff3366';

  const toggleRange = () => {
    if (tempoRange === 0.08) setTempoRange(0.16);
    else if (tempoRange === 0.16) setTempoRange(0.5);
    else setTempoRange(0.08);
  };

  const halveLoop = () => {
    const nextBeats = Math.max(0.25, selectedLoopBeats / 2);
    setSelectedLoopBeats(nextBeats);
    if (deckState.activeLoop) {
      onSetAutoLoop(nextBeats);
    }
  };

  const doubleLoop = () => {
    const nextBeats = Math.min(32, selectedLoopBeats * 2);
    setSelectedLoopBeats(nextBeats);
    if (deckState.activeLoop) {
      onSetAutoLoop(nextBeats);
    }
  };

  const toggleLoop = () => {
    if (deckState.activeLoop) {
      onExitLoop();
    } else {
      onSetAutoLoop(selectedLoopBeats);
    }
  };

  const stemList = [
    { id: 'vocals' as const, label: 'Vocals', short: 'VOC', color: '#06b6d4' },
    { id: 'harmonics' as const, label: 'Harmonics', short: 'MEL', color: '#a855f7' },
    { id: 'bass' as const, label: 'Bass', short: 'BAS', color: '#10b981' },
    { id: 'drums' as const, label: 'Drums', short: 'DRM', color: '#f97316' },
  ];

  const track = deckState.track;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        try {
          const raw = e.dataTransfer.getData('text/plain');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.title && onLoadTrack) {
              // Pass the full original track object (preserves hotCues, savedLoops, genre, rating etc.)
              onLoadTrack({
                ...parsed,
                hotCues: parsed.hotCues || [],
                savedLoops: parsed.savedLoops || [],
                beatGrid: parsed.beatGrid || { bpm: parsed.bpm || 124, firstBeatOffset: 0, meter: 4 },
              });
            }
          }
        } catch {}
      }}
      className={`relative flex flex-col h-full bg-dj-panel rounded-xl p-1.5 sm:p-2 border shadow-2xl flex-1 min-w-0 overflow-hidden justify-between transition-all duration-150 ${
        isDragOver
          ? 'border-cyan-400 ring-2 ring-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.6)]'
          : 'border-dj-border'
      }`}
    >
      {/* Illuminated Drag-over Drop Zone Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-dashed border-cyan-400 rounded-xl animate-pulse pointer-events-none">
          <Disc className="w-12 h-12 text-cyan-400 animate-spin mb-2" />
          <span className="text-sm font-black text-white tracking-wider">
            DROP TO LOAD DECK {deckId}
          </span>
          <span className="text-xs text-cyan-300 font-mono mt-1">Instant Deck Assignment</span>
        </div>
      )}
      {/* 1. Deck Header: Track Info, BPM, Key, Time */}
      <div className="flex items-center justify-between bg-dj-surface/80 rounded-lg p-2 mb-1 border border-dj-border">
        {/* Deck Identifier badge & Track Title */}
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm font-mono text-black shadow-md"
            style={{ backgroundColor: accentColor }}
          >
            {deckId}
          </div>
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-xs sm:text-[13px] text-white truncate max-w-[120px] sm:max-w-[160px] xl:max-w-[200px]">
                {track ? track.title : 'No Track Loaded'}
              </span>
              {deckState.sandboxMode && (
                <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse">
                  SANDBOX
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium text-slate-300 truncate max-w-[120px] sm:max-w-[160px] xl:max-w-[200px]">
              {track ? track.artist : 'Drag track from Library or Google D...'}
            </span>
          </div>
        </div>

        {/* BPM & Musical Key Badges with Harmonic Shift */}
        <div className="flex items-center space-x-2">
          {/* Key with Camelot wheel color coding + Semitone Shift Controls */}
          <div className="flex items-center space-x-1.5 bg-slate-800/95 px-2 py-1 rounded-lg border border-slate-700 shadow-sm">
            <div className="flex flex-col items-center mr-0.5">
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">KEY</span>
              <span className="text-xs sm:text-[13px] font-mono font-black text-amber-300 leading-none">
                {track?.camelotKey || track?.key || '--'}
                {deckState.pitchSemitones !== 0 && (
                  <span className="text-[9px] text-cyan-300 ml-0.5">
                    {deckState.pitchSemitones > 0 ? `+${deckState.pitchSemitones}` : deckState.pitchSemitones}
                  </span>
                )}
              </span>
            </div>

            {/* Semitone Shift Buttons */}
            <div className="flex flex-col space-y-0.5">
              <button
                onClick={() => onKeyShift?.((deckState.pitchSemitones || 0) + 1)}
                title="Transpose Key Up 1 Semitone"
                className="w-4 h-3 bg-slate-700 hover:bg-cyan-500 hover:text-black text-slate-200 rounded text-[8px] font-black flex items-center justify-center cursor-pointer transition-colors"
              >
                ▲
              </button>
              <button
                onClick={() => onKeyShift?.((deckState.pitchSemitones || 0) - 1)}
                title="Transpose Key Down 1 Semitone"
                className="w-4 h-3 bg-slate-700 hover:bg-cyan-500 hover:text-black text-slate-200 rounded text-[8px] font-black flex items-center justify-center cursor-pointer transition-colors"
              >
                ▼
              </button>
            </div>

            {/* Key Match / Sync Button */}
            {onKeySync && (
              <button
                onClick={onKeySync}
                title="Harmonic Key Match / Sync with other deck"
                className={`px-1.5 py-1 rounded text-[9px] font-mono font-black border transition-all cursor-pointer ${
                  deckState.pitchSemitones !== 0
                    ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                MATCH
              </button>
            )}
          </div>

          {/* BPM display */}
          <div className="flex flex-col items-center bg-slate-800/95 px-2.5 py-1 rounded-lg border border-slate-700 shadow-sm">
            <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">BPM</span>
            <span className="text-xs sm:text-[13px] font-mono font-black text-cyan-300 leading-none">
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
          stems={deckState.stems}
          accentColor={accentColor}
        />
      </div>

      {/* 3. Pro Workstation Tactical Performance Bar: Quick Loop & Multi-FX Punch Buttons */}
      <div className="flex items-center justify-between bg-slate-900/90 rounded-lg px-2 py-0.5 my-0.5 border border-white/10 shadow-sm shrink-0">
        {/* Quick Loop Controls (< 1 > with 1/2x and 2x) */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          <span className="text-[8.5px] font-mono text-slate-400 font-bold uppercase mr-0.5 hidden xs:inline">LOOP</span>
          <button
            onClick={halveLoop}
            title="Halve loop length (/2)"
            className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono font-bold flex items-center justify-center border border-slate-700 transition-colors cursor-pointer active:scale-95"
          >
            &lt;
          </button>
          <button
            onClick={toggleLoop}
            title="Toggle Quantized Auto-Loop"
            className={`px-2 h-5 sm:h-6 rounded font-mono text-[10px] font-black border transition-all cursor-pointer active:scale-95 flex items-center space-x-1 ${
              deckState.activeLoop
                ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:text-white'
            }`}
          >
            <Repeat className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span>{deckState.activeLoop ? `${deckState.activeLoop.beats}B` : `${selectedLoopBeats}B`}</span>
          </button>
          <button
            onClick={doubleLoop}
            title="Double loop length (x2)"
            className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono font-bold flex items-center justify-center border border-slate-700 transition-colors cursor-pointer active:scale-95"
          >
            &gt;
          </button>
        </div>

        {/* 3-Slot Multi-FX Instant Punch Bar */}
        <div className="flex items-center space-x-1">
          <span className="text-[8.5px] font-mono text-slate-400 font-bold uppercase mr-0.5 hidden xs:inline">FX</span>
          {(['echo', 'reverb', 'flanger'] as FXType[]).map((fxType) => {
            const isActive = deckState.fx.enabled && deckState.fx.type === fxType;
            return (
              <button
                key={fxType}
                onClick={() => onToggleFX?.(fxType)}
                title={`Instant ${fxType.toUpperCase()} FX Punch-In`}
                className={`px-1.5 h-5 sm:h-6 rounded font-mono text-[9px] font-black uppercase border transition-all cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.8)]'
                    : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                {fxType === 'echo' ? 'ECHO' : fxType}
              </button>
            );
          })}
        </div>

        {/* Slip Mode Toggle Button */}
        <button
          onClick={onToggleSlip}
          title="Slip Mode: Audio playhead continues in background during scratch or loops"
          className={`px-2 h-5 sm:h-6 rounded font-mono text-[9px] font-black border transition-all cursor-pointer active:scale-95 ${
            deckState.slipMode
              ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
              : 'bg-slate-800/90 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          SLIP
        </button>
      </div>

      {/* 4. Middle Section: 4-Stem Neural Mix Strip + Jog Wheel + Pitch Fader */}
      <div className="flex items-center justify-between flex-1 my-0.5 py-0.5 gap-1.5 sm:gap-2 min-h-0">
        {/* 4-Stem Neural Mix Quick Panel (Drums, Bass, Harmonic, Vocal) */}
        <div className="flex flex-col justify-between h-24 sm:h-28 md:h-34 xl:h-44 bg-slate-950/70 rounded-xl p-1 sm:p-1.5 border border-white/5 w-16 sm:w-20 xl:w-24 shrink-0 shadow-inner">
          <div className="flex items-center justify-between border-b border-white/5 pb-0.5">
            <span className="text-[8.5px] sm:text-[10px] font-mono font-bold text-slate-300">STEMS</span>
            <span className="text-[7.5px] sm:text-[9px] font-mono text-purple-400 font-bold">4-WAY</span>
          </div>

          <div className="flex flex-col space-y-1.5 my-auto">
            {stemList.map((stem) => {
              const isMuted = deckState.stems[`${stem.id}Muted` as keyof typeof deckState.stems];
              const isSolo = deckState.stems[`${stem.id}Solo` as keyof typeof deckState.stems];

              return (
                <div key={stem.id} className="flex items-center justify-between">
                  {/* Stem Label / Color Dot */}
                  <div className="flex items-center space-x-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isMuted ? '#64748b' : stem.color }}
                    />
                    <span
                      className={`text-[9.5px] font-mono font-extrabold leading-none ${
                        isMuted ? 'text-slate-500 line-through' : 'text-slate-200'
                      }`}
                    >
                      {stem.short}
                    </span>
                  </div>

                  {/* Micro Solo & Mute Buttons */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onStemMuteToggle?.(stem.id)}
                      title={`Mute ${stem.label}`}
                      className={`w-4 h-4 rounded text-[8px] font-mono font-black border uppercase transition-colors flex items-center justify-center cursor-pointer ${
                        isMuted
                          ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_6px_rgba(244,63,94,0.7)]'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      M
                    </button>
                    <button
                      onClick={() => onStemSoloToggle?.(stem.id)}
                      title={`Solo ${stem.label}`}
                      className={`w-4 h-4 rounded text-[8px] font-mono font-black border uppercase transition-colors flex items-center justify-center cursor-pointer ${
                        isSolo
                          ? 'bg-amber-400 border-amber-300 text-black shadow-[0_0_6px_rgba(251,191,36,0.7)]'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      S
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Acapella / Instrumental 1-Tap Buttons */}
          <div className="grid grid-cols-2 gap-1 pt-1 border-t border-white/5">
            <button
              onClick={() => onIsolateAcapella?.()}
              title="1-Tap Acapella: Pure vocals isolation with 0% instrument bleed"
              className={`py-0.5 rounded text-[7px] font-mono font-extrabold transition-all cursor-pointer ${
                deckState.stems.vocalsSolo && !deckState.stems.vocalsMuted
                  ? 'bg-pink-500 text-white shadow-[0_0_8px_rgba(236,72,153,0.9)]'
                  : 'bg-slate-800 text-pink-400 hover:bg-slate-700'
              }`}
            >
              ACAP
            </button>
            <button
              onClick={() => onIsolateInstrumental?.()}
              title="1-Tap Instrumental: Pure instruments with 0% vocals"
              className={`py-0.5 rounded text-[7px] font-mono font-extrabold transition-all cursor-pointer ${
                deckState.stems.vocalsMuted && !deckState.stems.drumsMuted
                  ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.9)]'
                  : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'
              }`}
            >
              INST
            </button>
          </div>
        </div>

        {/* Tactile Grooved Vinyl Jog Wheel with Mechanical Tonearm */}
        <div className="flex-1 flex justify-center items-center min-h-0 min-w-0 overflow-hidden">
          <JogWheel
            deckId={deckId}
            currentTime={deckState.currentTime}
            duration={deckState.duration}
            isPlaying={deckState.isPlaying}
            playbackRate={deckState.playbackRate}
            onNudge={onNudge}
            onReleaseNudge={onReleaseNudge}
            onScratch={onScratch}
            onScratchStart={onScratchStart}
            onScratchEnd={onScratchEnd}
            accentColor={accentColor}
            coverArtUrl={track?.coverArtUrl}
          />
        </div>

        {/* Pitch Fader */}
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

      {/* 5. Performance Pads Section (Hot Cues, Loops, Stems) */}
      <div className="my-0.5 shrink-0">
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
          onIsolateAcapella={onIsolateAcapella}
          onIsolateInstrumental={onIsolateInstrumental}
          onResetStems={onResetStems}
          accentColor={accentColor}
        />
      </div>

      {/* 6. Primary Transport Controls: Play, Cue, Sync, Sandbox Mode */}
      <div className="flex items-center justify-between pt-0.5 sm:pt-1 border-t border-dj-border/60 shrink-0">
        {/* VirtualDJ Sandbox Mode Toggle */}
        <button
          onClick={onToggleSandbox}
          title="VirtualDJ Sandbox Mode: Private Headphone Audition. Mutes master output for this deck while you prep your mix."
          className={`h-7 sm:h-8 md:h-9 xl:h-10 px-1.5 sm:px-2.5 rounded-lg sm:rounded-xl font-mono font-extrabold text-[9px] sm:text-[10.5px] mr-1 border transition-all cursor-pointer flex items-center justify-center space-x-1 active:scale-[0.95] select-none shrink-0 ${
            deckState.sandboxMode
              ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.85)] animate-pulse'
              : 'bg-slate-900/90 border-amber-500/30 text-amber-400 hover:bg-slate-800 hover:border-amber-400'
          }`}
        >
          <Headphones className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden xs:inline">SANDBOX</span>
        </button>

        {/* SYNC Button */}
        <button
          onClick={onSyncClick}
          title="Instant Beatgrid Sync"
          className={`flex-1 h-7 sm:h-8 md:h-9 xl:h-10 rounded-lg sm:rounded-xl font-mono font-extrabold text-[10.5px] sm:text-xs md:text-[13px] mr-1 border transition-all cursor-pointer flex items-center justify-center space-x-1 sm:space-x-1.5 active:scale-[0.95] select-none shrink-0 ${
            deckState.isSync
              ? 'bg-cyan-500 text-black border-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.8)]'
              : 'bg-slate-900/90 border-cyan-500/30 text-cyan-400 hover:bg-slate-800 hover:border-cyan-400'
          }`}
          style={{
            boxShadow: deckState.isSync ? undefined : 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
          <span>SYNC</span>
        </button>

        {/* CUE Button */}
        <button
          onClick={onCueClick}
          title="Temporary Cue Playhead"
          className="flex-1 h-7 sm:h-8 md:h-9 xl:h-10 rounded-lg sm:rounded-xl font-mono font-extrabold text-[10.5px] sm:text-xs md:text-[13px] mr-1 bg-slate-900/90 border border-amber-500/40 text-amber-400 hover:bg-slate-800 hover:border-amber-400 active:scale-[0.95] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex items-center justify-center space-x-1 sm:space-x-1.5 cursor-pointer select-none shrink-0"
          style={{
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>CUE</span>
        </button>

        {/* Large Illuminated PLAY / PAUSE Button */}
        <button
          onClick={onPlayToggle}
          title="Play / Pause"
          className={`flex-1 h-7 sm:h-8 md:h-9 xl:h-10 rounded-lg sm:rounded-xl font-mono font-extrabold text-[10.5px] sm:text-xs md:text-[13px] border transition-all cursor-pointer flex items-center justify-center space-x-1 sm:space-x-1.5 active:scale-[0.95] select-none shrink-0 ${
            deckState.isPlaying
              ? 'bg-emerald-500 text-black border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.85)]'
              : 'bg-slate-900/90 border-emerald-500/30 text-emerald-400 hover:bg-slate-800 hover:border-emerald-400'
          }`}
          style={{
            boxShadow: deckState.isPlaying ? undefined : 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {deckState.isPlaying ? (
            <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 fill-current animate-pulse" />
          ) : (
            <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 fill-current" />
          )}
          <span>{deckState.isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </button>
      </div>
    </div>
  );
});
