import React, { useRef, useEffect } from 'react';
import { DeckState, WaveformData, MixerState } from '../types/dj';
import { Play, Pause, Disc, Repeat, Minimize2, Music } from 'lucide-react';

interface MiniDeckHeaderProps {
  deckA: DeckState;
  deckB: DeckState;
  waveformDataA: WaveformData | null;
  waveformDataB: WaveformData | null;
  mixer: MixerState;
  masterBpm: number;
  onPlayToggle: (deckId: 'A' | 'B') => void;
  onCueClick: (deckId: 'A' | 'B') => void;
  onSyncClick: (deckId: 'A' | 'B') => void;
  onRateChange: (deckId: 'A' | 'B', rate: number) => void;
  onSetAutoLoop: (deckId: 'A' | 'B', beats: number) => void;
  onExitLoop: (deckId: 'A' | 'B') => void;
  onSeek: (deckId: 'A' | 'B', seconds: number) => void;
  onCrossfaderChange: (value: number) => void;
  onToggleExpandedLibrary: () => void;
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
};

export const MiniDeckHeader: React.FC<MiniDeckHeaderProps> = ({
  deckA,
  deckB,
  waveformDataA,
  waveformDataB,
  mixer,
  masterBpm,
  onPlayToggle,
  onCueClick,
  onSyncClick,
  onRateChange,
  onSetAutoLoop,
  onExitLoop,
  onSeek,
  onCrossfaderChange,
  onToggleExpandedLibrary,
}) => {
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);

  // Render Mini Waveform for Deck
  const drawWaveform = (
    canvas: HTMLCanvasElement | null,
    deck: DeckState,
    waveform: WaveformData | null,
    primaryColor: string,
    playedColor: string
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 300;
    const height = canvas.clientHeight || 28;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    const duration = deck.duration || (deck.track?.duration ?? 0);
    const progress = duration > 0 ? Math.min(1, Math.max(0, deck.currentTime / duration)) : 0;
    const playheadX = progress * width;

    // Draw waveform bars
    if (waveform && waveform.overviewPeaks && waveform.overviewPeaks.length > 0) {
      const peaks = waveform.overviewPeaks;
      const step = peaks.length / width;
      const midY = height / 2;

      for (let x = 0; x < width; x++) {
        const peakIdx = Math.floor(x * step);
        const amp = Math.min(1, Math.max(0.05, peaks[peakIdx] || 0.1));
        const barH = amp * (height - 4);

        if (x < playheadX) {
          ctx.fillStyle = playedColor;
        } else {
          ctx.fillStyle = primaryColor;
        }

        ctx.fillRect(x, midY - barH / 2, 1, barH);
      }
    } else {
      // Placeholder baseline
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }

    // Hot Cue Pins
    if (deck.track?.hotCues && duration > 0) {
      deck.track.hotCues.forEach((cue) => {
        const cueX = (cue.position / duration) * width;
        ctx.fillStyle = cue.color || '#f59e0b';
        ctx.fillRect(cueX - 1, 0, 2, height);
      });
    }

    // Active Loop Region
    if (deck.activeLoop && duration > 0) {
      const startX = (deck.activeLoop.start / duration) * width;
      const endX = (deck.activeLoop.end / duration) * width;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.fillRect(startX, 0, Math.max(2, endX - startX), height);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, 0, Math.max(2, endX - startX), height);
    }

    // Playhead Needle
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.fillRect(playheadX - 1, 0, 2, height);
    ctx.shadowBlur = 0;

    ctx.restore();
  };

  useEffect(() => {
    drawWaveform(canvasRefA.current, deckA, waveformDataA, '#1e3a8a', '#00f0ff');
  }, [deckA.currentTime, deckA.duration, waveformDataA, deckA.activeLoop]);

  useEffect(() => {
    drawWaveform(canvasRefB.current, deckB, waveformDataB, '#500724', '#ff2e88');
  }, [deckB.currentTime, deckB.duration, waveformDataB, deckB.activeLoop]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>, deckId: 'A' | 'B') => {
    const canvas = deckId === 'A' ? canvasRefA.current : canvasRefB.current;
    const deck = deckId === 'A' ? deckA : deckB;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const pct = x / rect.width;
    const duration = deck.duration || (deck.track?.duration ?? 0);
    if (duration > 0) {
      onSeek(deckId, pct * duration);
    }
  };

  const renderDeckStrip = (deckId: 'A' | 'B') => {
    const deck = deckId === 'A' ? deckA : deckB;
    const isA = deckId === 'A';
    const accentBorder = isA ? 'border-cyan-500/40' : 'border-rose-500/40';
    const accentText = isA ? 'text-cyan-400' : 'text-rose-400';
    const accentBg = isA ? 'bg-cyan-500' : 'bg-rose-500';
    const duration = deck.duration || (deck.track?.duration ?? 0);
    const remainingTime = Math.max(0, duration - deck.currentTime);

    return (
      <div className={`flex-1 flex items-center space-x-2 bg-slate-900/90 rounded-xl p-2 border ${accentBorder} shadow-lg overflow-hidden`}>
        {/* Track Artwork & Vinyl Platter Icon */}
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-950 border border-white/10 shrink-0 flex items-center justify-center group shadow-md">
          {deck.track?.coverArtUrl ? (
            <img src={deck.track.coverArtUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
              <Music className={`w-5 h-5 ${accentText} opacity-70`} />
            </div>
          )}
          {deck.isPlaying && (
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
              <Disc className={`w-6 h-6 ${accentText} animate-spin`} style={{ animationDuration: '1.8s' }} />
            </div>
          )}
          <span className={`absolute top-0.5 left-0.5 px-1 rounded text-[9px] font-mono font-black ${isA ? 'bg-cyan-500 text-black' : 'bg-rose-500 text-black'}`}>
            {deckId}
          </span>
        </div>

        {/* Track Title, Artist, BPM & Key */}
        <div className="flex flex-col min-w-0 w-36 xl:w-44 shrink-0">
          <span className="text-xs font-bold text-white truncate" title={deck.track?.title || 'No Track Loaded'}>
            {deck.track?.title || 'No Track Loaded'}
          </span>
          <span className="text-[10px] text-slate-400 truncate" title={deck.track?.artist || 'Load from Library'}>
            {deck.track?.artist || 'Drag or click LOAD'}
          </span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span className={`font-mono text-[10px] font-extrabold ${accentText}`}>
              {((deck.track?.bpm ? deck.track.bpm * deck.playbackRate : masterBpm) || 120.0).toFixed(1)} <span className="text-[8px] text-slate-500 font-normal">BPM</span>
            </span>
            <span className="px-1 py-0.2 rounded bg-slate-800 border border-white/10 text-[9px] font-mono font-bold text-amber-300">
              {deck.musicalKey || deck.track?.camelotKey || '8A'}
            </span>
            {deck.isSync && (
              <span className="px-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/50 text-[8px] font-mono font-bold animate-pulse">
                SYNC
              </span>
            )}
          </div>
        </div>

        {/* Waveform Scrubber with Time Display */}
        <div className="flex-1 flex flex-col justify-center space-y-1 min-w-[140px]">
          <div className="flex items-center justify-between text-[9px] font-mono">
            <span className="text-slate-300 font-bold">{formatTime(deck.currentTime)}</span>
            <span className="text-slate-500">-{formatTime(remainingTime)}</span>
          </div>
          <div className="relative h-7 w-full rounded-md overflow-hidden border border-white/10 cursor-pointer group">
            <canvas
              ref={isA ? canvasRefA : canvasRefB}
              onClick={(e) => handleCanvasClick(e, deckId)}
              className="w-full h-full block"
            />
          </div>
        </div>

        {/* Transport Actions: SYNC, LOOP, CUE, PLAY */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => onSyncClick(deckId)}
            title="Beat Sync to Master Clock"
            className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-extrabold border transition-all cursor-pointer ${
              deck.isSync
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10'
            }`}
          >
            SYNC
          </button>

          <button
            onClick={() => {
              if (deck.activeLoop) {
                onExitLoop(deckId);
              } else {
                onSetAutoLoop(deckId, 4);
              }
            }}
            title={deck.activeLoop ? 'Exit 4-Beat Loop' : 'Activate 4-Beat Auto Loop'}
            className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
              deck.activeLoop
                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onCueClick(deckId)}
            title="Cue / Set Cue Point"
            className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-600/60 text-amber-400 font-mono font-extrabold text-[11px] transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            CUE
          </button>

          <button
            onClick={() => onPlayToggle(deckId)}
            title={deck.isPlaying ? 'Pause' : 'Play'}
            className={`p-2 rounded-lg border font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-md ${
              deck.isPlaying
                ? `${accentBg} text-black border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.4)]`
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
            }`}
          >
            {deck.isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
        </div>

        {/* Pitch Slider Mini Control */}
        <div className="flex flex-col items-center justify-center shrink-0 pl-1 border-l border-white/5 space-y-0.5">
          <span className="font-mono text-[9px] text-slate-400">
            {((deck.playbackRate - 1.0) * 100 >= 0 ? '+' : '') +
              ((deck.playbackRate - 1.0) * 100).toFixed(1)}%
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onRateChange(deckId, Math.max(0.5, deck.playbackRate - 0.01))}
              className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center cursor-pointer"
            >
              -
            </button>
            <button
              onClick={() => onRateChange(deckId, 1.0)}
              title="Reset Pitch to 0.0%"
              className="w-4 h-4 rounded bg-slate-800 hover:bg-cyan-950 text-cyan-400 font-mono text-[9px] flex items-center justify-center cursor-pointer"
            >
              0
            </button>
            <button
              onClick={() => onRateChange(deckId, Math.min(2.0, deck.playbackRate + 0.01))}
              className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-slate-950/95 border-b border-dj-border px-3 py-2 flex items-center space-x-3 shadow-2xl relative z-30">
      {/* Deck A Mini Strip */}
      {renderDeckStrip('A')}

      {/* Center Mixer: Mini Crossfader & Return Button */}
      <div className="w-48 xl:w-56 flex flex-col items-center justify-center px-2 py-1 bg-slate-900/80 rounded-xl border border-white/10 shrink-0 space-y-1">
        <div className="flex items-center justify-between w-full text-[9px] font-mono text-slate-400 px-1">
          <button
            onClick={() => onCrossfaderChange(-1.0)}
            className="hover:text-cyan-400 font-bold cursor-pointer"
          >
            DECK A
          </button>
          <span className="font-bold text-slate-200">{masterBpm.toFixed(1)} BPM</span>
          <button
            onClick={() => onCrossfaderChange(1.0)}
            className="hover:text-rose-400 font-bold cursor-pointer"
          >
            DECK B
          </button>
        </div>

        {/* Tactile Mini Crossfader */}
        <div className="w-full relative flex items-center py-1">
          <input
            type="range"
            min="-1.0"
            max="1.0"
            step="0.01"
            value={mixer.crossfader}
            onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-white/10"
          />
        </div>

        <div className="flex items-center justify-between w-full pt-0.5 border-t border-white/5">
          <button
            onClick={() => onCrossfaderChange(0.0)}
            className="text-[9px] font-mono text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800/80 cursor-pointer"
          >
            CENTER
          </button>

          <button
            onClick={onToggleExpandedLibrary}
            title="Return to Full Performance Decks View (or press L)"
            className="text-[10px] font-mono font-bold text-cyan-400 hover:text-white flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 transition-colors cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.3)]"
          >
            <Minimize2 className="w-3 h-3" />
            <span>FULL DECKS</span>
          </button>
        </div>
      </div>

      {/* Deck B Mini Strip */}
      {renderDeckStrip('B')}
    </div>
  );
};
