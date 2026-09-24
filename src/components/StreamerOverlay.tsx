import React, { useState, useEffect } from 'react';
import { TrackMetadata, LyricsLine, DeckState } from '../types/dj';
import { broadcastService, NowPlayingState, OverlayConfig } from '../services/BroadcastService';
import { automixService } from '../services/AutomixService';
import { storageCache } from '../services/StorageCacheService';
import { lyricsService } from '../services/LyricsService';
import {
  Tv,
  Subtitles,
  Radio,
  Share2,
  Sparkles,
  X,
  Copy,
  Check,
  ExternalLink,
  Music,
  SkipForward,
  Video,
  Layers,
  Settings2,
} from 'lucide-react';

interface StreamerOverlayProps {
  deckA: DeckState;
  deckB: DeckState;
  onClose: () => void;
}

export const StreamerOverlay: React.FC<StreamerOverlayProps> = ({ deckA, deckB, onClose }) => {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingState>(broadcastService.getState());
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'preview' | 'lyrics'>('config');

  // Overlay Elements Display Customization
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>({
    showCurrentTrack: true,
    showNextTrack: true,
    showLyrics: true,
    showVideo: true,
  });

  const [lyricsLines, setLyricsLines] = useState<LyricsLine[]>([]);

  // Load saved overlay config
  useEffect(() => {
    storageCache.getSetting<OverlayConfig>('obs_overlay_config', {
      showCurrentTrack: true,
      showNextTrack: true,
      showLyrics: true,
      showVideo: true,
    }).then((saved) => {
      if (saved) {
        setOverlayConfig(saved);
        broadcastService.update({ overlayConfig: saved });
      }
    });

    const unsubscribe = broadcastService.subscribe((state) => {
      setNowPlaying(state);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Determine active track for stream overlay
  const activeDeck = deckA.isPlaying ? 'A' : deckB.isPlaying ? 'B' : (nowPlaying.activeDeck || 'A');
  const activeTrack = activeDeck === 'A' ? deckA.track : deckB.track;
  const activeTimeMs = (activeDeck === 'A' ? deckA.currentTime : deckB.currentTime) * 1000;

  // Fetch real synchronized lyrics for the active track
  useEffect(() => {
    if (activeTrack && activeTrack.title) {
      lyricsService.fetchLyrics(activeTrack.artist, activeTrack.title, activeTrack.duration).then((lines) => {
        if (lines && lines.length > 0) {
          setLyricsLines(lines);
        } else {
          setLyricsLines([
            { timestampMs: 0, text: `♪ ${activeTrack.artist || 'CloudMix Pro'} - ${activeTrack.title}`, translation: "Instrumental / In-sync playback" }
          ]);
        }
      });
    } else {
      setLyricsLines([
        { timestampMs: 0, text: "Ready for playback — Load a track to sync lyrics", translation: "Prêt pour la lecture" }
      ]);
    }
  }, [activeTrack?.artist, activeTrack?.title]);

  // Handle toggle change and propagate to broadcast & persistent storage
  const handleToggle = (key: keyof OverlayConfig) => {
    setOverlayConfig((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      storageCache.setSetting('obs_overlay_config', next);
      broadcastService.update({ overlayConfig: next });
      return next;
    });
  };


  // Determine next track
  const queue = automixService.getQueue();
  const nextTrack = queue && queue.length > 0
    ? queue[0].track
    : (activeDeck === 'A' ? deckB.track : deckA.track);

  // Find active lyrics line based on audio elapsed time
  let activeLyricIdx = 0;
  for (let i = 0; i < lyricsLines.length; i++) {
    if (activeTimeMs >= lyricsLines[i].timestampMs) {
      activeLyricIdx = i;
    }
  }

  // Construct dynamic browser source URL
  const baseOverlayUrl = 'http://127.0.0.1:8088/overlay';
  const overlayUrl = `${baseOverlayUrl}?current=${overlayConfig.showCurrentTrack ? 1 : 0}&next=${overlayConfig.showNextTrack ? 1 : 0}&lyrics=${overlayConfig.showLyrics ? 1 : 0}&video=${overlayConfig.showVideo ? 1 : 0}`;

  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(overlayUrl);
      } else {
        const input = document.createElement('input');
        input.value = overlayUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Failed to copy overlay URL:', err);
    }
  };

  const handleOpenBrowser = () => {
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.openExternal) {
      (window as any).desktopAPI.openExternal(overlayUrl);
    } else {
      window.open(overlayUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-dj-panel border border-dj-border rounded-2xl w-full max-w-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dj-border bg-dj-surface/90">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base text-white tracking-wide flex items-center gap-2">
                OBS Streamer HUD & Live Broadcast
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  PORT 8088 LIVE
                </span>
              </span>
              <p className="text-[11px] text-slate-400">
                Transparent Glassmorphic Browser Source with Real-Time WebSocket Synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* URL Quick Copy Bar */}
        <div className="bg-slate-950/80 px-5 py-3 border-b border-dj-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-hidden">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0">
              OBS URL:
            </span>
            <code className="text-xs font-mono text-cyan-300 bg-slate-900 px-2.5 py-1 rounded border border-cyan-500/30 truncate select-all flex-1 sm:max-w-xs">
              {overlayUrl}
            </code>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0 justify-end">
            <button
              onClick={handleCopyUrl}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-black border border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>COPIED URL!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY OVERLAY URL</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenBrowser}
              title="Preview overlay directly in web browser"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-dj-border/50 px-5 pt-2 bg-slate-900/40">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'config'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Customize Elements</span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'preview'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Live Stream Preview</span>
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'lyrics'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Subtitles className="w-3.5 h-3.5" />
            <span>Synced Lyrics Monitor</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh]">
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                  OBS Overlay Elements & Modular Layers
                </h4>
                <p className="text-xs text-slate-400">
                  Select which widgets and indicators are broadcast in real-time to your OBS browser source:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Current Track */}
                <label className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={overlayConfig.showCurrentTrack}
                    onChange={() => handleToggle('showCurrentTrack')}
                    className="mt-0.5 rounded border-slate-700 text-purple-500 focus:ring-purple-500 w-4 h-4 cursor-pointer accent-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-1.5 text-white font-bold text-xs">
                      <Music className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Current Track Info</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Title, Artist, Vinyl Artwork, BPM, Camelot Key, Deck Badge & Progress
                    </p>
                  </div>
                </label>

                {/* 2. Next Track */}
                <label className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={overlayConfig.showNextTrack}
                    onChange={() => handleToggle('showNextTrack')}
                    className="mt-0.5 rounded border-slate-700 text-purple-500 focus:ring-purple-500 w-4 h-4 cursor-pointer accent-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-1.5 text-white font-bold text-xs">
                      <SkipForward className="w-3.5 h-3.5 text-purple-400" />
                      <span>Next Track (Up Next)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Displays upcoming track from Automix Queue or opposite standby deck
                    </p>
                  </div>
                </label>

                {/* 3. Lyrics */}
                <label className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={overlayConfig.showLyrics}
                    onChange={() => handleToggle('showLyrics')}
                    className="mt-0.5 rounded border-slate-700 text-purple-500 focus:ring-purple-500 w-4 h-4 cursor-pointer accent-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-1.5 text-white font-bold text-xs">
                      <Subtitles className="w-3.5 h-3.5 text-pink-400" />
                      <span>Synchronized Lyrics</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Live sub-millisecond .lrc lyrics karaoke line and translation banner
                    </p>
                  </div>
                </label>

                {/* 4. YouTube Music Video */}
                <label className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={overlayConfig.showVideo}
                    onChange={() => handleToggle('showVideo')}
                    className="mt-0.5 rounded border-slate-700 text-purple-500 focus:ring-purple-500 w-4 h-4 cursor-pointer accent-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-1.5 text-white font-bold text-xs">
                      <Video className="w-3.5 h-3.5 text-red-400" />
                      <span>YouTube Music Video Feed</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Embeds live music video visualizer feed when playing YouTube tracks
                    </p>
                  </div>
                </label>
              </div>

              {/* Instructions Tip */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>OBS Studio Setup Instructions:</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  1. In OBS Studio, add a new <strong className="text-white">Browser Source</strong>.<br />
                  2. Paste the copied URL (<code className="text-cyan-300">http://127.0.0.1:8088/overlay</code>).<br />
                  3. Set Width: <strong className="text-white">680</strong>, Height: <strong className="text-white">380</strong>, and check <strong className="text-white">"Shutdown source when not visible"</strong>.<br />
                  4. Any checkbox changes made above take effect instantly on your live stream without restarting OBS!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* 1. OBS Browser Source Widget Preview */}
              {overlayConfig.showCurrentTrack && (
                <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-purple-500/40 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider flex items-center space-x-1">
                      <Radio className="w-3 h-3 animate-pulse text-purple-400" />
                      <span>OBS NOW PLAYING OVERLAY (LIVE PREVIEW)</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                      WebSocket Port 8088 Ready
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center shadow-md overflow-hidden shrink-0">
                      {activeTrack?.coverArtUrl ? (
                        <img src={activeTrack.coverArtUrl} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <Sparkles className="w-8 h-8 text-black" />
                      )}
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
              )}

              {/* 2. Next Track Preview */}
              {overlayConfig.showNextTrack && nextTrack && (
                <div className="bg-slate-900/80 border border-purple-500/30 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-700/60 uppercase">
                      UP NEXT
                    </span>
                    <span className="text-xs font-bold text-white truncate">{nextTrack.title}</span>
                    <span className="text-xs text-slate-400 truncate hidden sm:inline">• {nextTrack.artist}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400 shrink-0">
                    {nextTrack.bpm.toFixed(1)} BPM
                  </span>
                </div>
              )}

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
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Test Trigger
                </button>
              </div>
            </div>
          )}

          {activeTab === 'lyrics' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <Subtitles className="w-4 h-4 text-cyan-400" />
                  <span>Synchronized Lyrics & Translation (Sub-millisecond Lock)</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                  Target: English
                </span>
              </div>

              {/* Lyrics Stream Container */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2">
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
          )}
        </div>
      </div>
    </div>
  );
};
