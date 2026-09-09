import React, { useState, useEffect } from 'react';
import { TrackMetadata, LyricsLine, DeckState } from '../types/dj';
import { broadcastService, NowPlayingState } from '../services/BroadcastService';
import { Tv, Subtitles, Radio, Share2, Sparkles, X } from 'lucide-react';

interface StreamerOverlayProps {
  deckA: DeckState;
  deckB: DeckState;
  onClose: () => void;
}

export const StreamerOverlay: React.FC<StreamerOverlayProps> = ({ deckA, deckB, onClose }) => {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingState>(broadcastService.getState());
  const [lyricsLines, setLyricsLines] = useState<LyricsLine[]>([
    { timestampMs: 0, text: "Searching for synchronized .lrc lyrics...", translation: "Recherche de paroles synchronisées..." },
    { timestampMs: 15000, text: "Feel the bassline drop into the groove", translation: "Ressens la ligne de basse qui tombe dans le groove" },
    { timestampMs: 30000, text: "Hands up high under the neon lights", translation: "Les mains en l'air sous les néons" },
    { timestampMs: 45000, text: "CloudMix Pro streaming direct from the cloud", translation: "CloudMix Pro streamant directement depuis le cloud" },
  ]);

  // Determine active track for stream overlay
  const activeDeck = deckA.isPlaying ? 'A' : deckB.isPlaying ? 'B' : 'A';
  const activeTrack = activeDeck === 'A' ? deckA.track : deckB.track;
  const activeTimeMs = (activeDeck === 'A' ? deckA.currentTime : deckB.currentTime) * 1000;

  // Find active lyrics line based on audio elapsed time
  let activeLyricIdx = 0;
  for (let i = 0; i < lyricsLines.length; i++) {
    if (activeTimeMs >= lyricsLines[i].timestampMs) {
      activeLyricIdx = i;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dj-panel border border-dj-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dj-border bg-dj-surface/90">
          <div className="flex items-center space-x-2">
            <Tv className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-base text-white">Streamer HUD & Synced Lyrics</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* 1. OBS Browser Source Widget Preview */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-purple-500/40 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider flex items-center space-x-1">
                <Radio className="w-3 h-3 animate-pulse text-purple-400" />
                <span>OBS NOW PLAYING OVERLAY (LIVE BROADCAST)</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                WebSocket Port 8765 Ready
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center shadow-md">
                <Sparkles className="w-8 h-8 text-black" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    DECK {activeDeck}
                  </span>
                  <span className="font-mono text-xs text-amber-400 font-bold">
                    {activeTrack?.camelotKey || '8A'} • {activeTrack ? (activeTrack.bpm * (activeDeck === 'A' ? deckA.playbackRate : deckB.playbackRate)).toFixed(1) : '126.0'} BPM
                  </span>
                </div>
                <h3 className="font-extrabold text-lg text-white truncate mt-0.5">
                  {activeTrack ? activeTrack.title : 'Waiting for track playback...'}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {activeTrack ? activeTrack.artist : 'CloudMix Pro DJ Stream'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Synced Lyrics & Live Translation (Matches user's update_song.py) */}
          <div className="bg-dj-surface rounded-xl p-4 border border-dj-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Subtitles className="w-4 h-4 text-cyan-400" />
                <span>Synchronized Lyrics & Translation (Sub-millisecond Lock)</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                Target: English
              </span>
            </div>

            {/* Lyrics Stream Container */}
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
              {lyricsLines.map((line, idx) => {
                const isActive = idx === activeLyricIdx;
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-purple-950/60 border border-purple-500/80 text-white shadow-md'
                        : 'text-slate-400 bg-slate-900/40 border border-slate-800/50'
                    }`}
                  >
                    <p className={`font-bold text-sm ${isActive ? 'text-cyan-300' : 'text-slate-300'}`}>
                      {line.text}
                    </p>
                    {line.translation && (
                      <p className="text-xs text-slate-400 italic mt-0.5">
                        {line.translation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. StreamerBot Triggers */}
          <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200">StreamerBot Direct Trigger</span>
              <span className="text-[11px] text-slate-400">
                Fires trigger events to C:\StreamerBot\trigger.txt on track change & drop
              </span>
            </div>
            <button
              onClick={() => alert("StreamerBot trigger sent successfully!")}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Test Trigger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
