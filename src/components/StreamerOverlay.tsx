import React, { useState, useEffect } from 'react';
import { TrackMetadata, LyricsLine, DeckState } from '../types/dj';
import { broadcastService, NowPlayingState, OverlayConfig } from '../services/BroadcastService';
import { streamerbotService, StreamerbotConfig, StreamerbotStatus } from '../services/StreamerbotService';
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
  Bot,
  Sliders,
  FolderOpen,
  Zap,
  CheckCircle2,
  AlertCircle,
  Play,
  Volume2,
  RefreshCw,
  Send,
  Terminal,
  Cpu,
} from 'lucide-react';

interface StreamerOverlayProps {
  deckA: DeckState;
  deckB: DeckState;
  onClose: () => void;
}

export const StreamerOverlay: React.FC<StreamerOverlayProps> = ({ deckA, deckB, onClose }) => {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingState>(broadcastService.getState());
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'obs' | 'streamerbot' | 'streamdeck' | 'lyrics'>('obs');

  // Overlay Elements Display Customization
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>({
    showCurrentTrack: true,
    showNextTrack: true,
    showLyrics: true,
    showVideo: true,
  });

  const [lyricsLines, setLyricsLines] = useState<LyricsLine[]>([]);

  // Streamer.bot WebSocket State
  const [sbConfig, setSbConfig] = useState<StreamerbotConfig>(streamerbotService.getConfig());
  const [sbStatus, setSbStatus] = useState<StreamerbotStatus>(streamerbotService.getStatus());
  const [triggerFeedback, setTriggerFeedback] = useState<string | null>(null);

  // Load saved overlay & streamerbot configs
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

    const unsubscribeBroadcast = broadcastService.subscribe((state) => {
      setNowPlaying(state);
    });

    const unsubscribeSb = streamerbotService.subscribeStatus((status) => {
      setSbStatus(status);
    });

    return () => {
      unsubscribeBroadcast();
      unsubscribeSb();
    };
  }, []);

  // Determine active track for stream overlay
  const activeDeck = deckA.isPlaying ? 'A' : deckB.isPlaying ? 'B' : (nowPlaying.activeDeck || 'A');
  const activeTrack = activeDeck === 'A' ? deckA.track : deckB.track;
  const activeTimeMs = (activeDeck === 'A' ? deckA.currentTime : deckB.currentTime) * 1000;

  // Real synchronized lyrics for the active track
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

  const handleToggle = (key: keyof OverlayConfig) => {
    setOverlayConfig((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      storageCache.setSetting('obs_overlay_config', next);
      broadcastService.update({ overlayConfig: next });
      return next;
    });
  };

  const obsUrl = 'http://127.0.0.1:8088/overlay';

  const handleCopyUrl = (url: string, endpointKey?: string) => {
    navigator.clipboard.writeText(url);
    if (endpointKey) {
      setCopiedEndpoint(endpointKey);
      setTimeout(() => setCopiedEndpoint(null), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleOpenBrowser = () => {
    if (typeof window !== 'undefined') {
      window.open(obsUrl, '_blank', 'width=1280,height=720,menubar=no,toolbar=no');
    }
  };

  // Streamer.bot Handlers
  const handleSbConnectToggle = async () => {
    if (sbStatus === 'connected') {
      streamerbotService.disconnect();
    } else {
      await streamerbotService.connect(sbConfig.wsUrl);
    }
  };

  const handleSbConfigChange = (key: keyof StreamerbotConfig, val: any) => {
    const updated = { ...sbConfig, [key]: val };
    setSbConfig(updated);
    streamerbotService.saveConfig(updated);
  };

  const handleTestTrigger = async (actionName: string, eventName: string) => {
    setTriggerFeedback(`Sending ${eventName}...`);
    const success = await streamerbotService.triggerAction(actionName, {
      test: true,
      event: eventName,
      title: activeTrack?.title || 'Cyberpunk Drive (Original Mix)',
      artist: activeTrack?.artist || 'Aether & DJ Nova',
      bpm: activeTrack?.bpm || 126.0,
      key: activeTrack?.camelotKey || '8A',
      deck: activeDeck,
    });

    if (success) {
      setTriggerFeedback(`✓ Action "${actionName}" dispatched to Streamer.bot!`);
    } else {
      setTriggerFeedback(`✕ Could not reach Streamer.bot at ${sbConfig.wsUrl}. Check that WebSocket server is enabled in Streamer.bot.`);
    }

    setTimeout(() => setTriggerFeedback(null), 4000);
  };

  // Stream Deck Test Trigger
  const handleTestStreamDeck = async (endpoint: string, label: string) => {
    setTriggerFeedback(`Executing ${label}...`);
    try {
      const res = await fetch(`http://127.0.0.1:8088${endpoint}`);
      if (res.ok) {
        setTriggerFeedback(`✓ Executed: ${label}`);
      } else {
        setTriggerFeedback(`✕ Server returned ${res.status}`);
      }
    } catch (e: any) {
      setTriggerFeedback(`✕ Failed: ${e.message}`);
    }
    setTimeout(() => setTriggerFeedback(null), 3000);
  };

  const nextTrack = nowPlaying.nextTrack;
  const activeLyricIdx = lyricsLines.findIndex((l, i) => {
    const next = lyricsLines[i + 1];
    return activeTimeMs >= l.timestampMs && (!next || activeTimeMs < next.timestampMs);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-dj-panel border border-dj-border rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        
        {/* 1. Header */}
        <div className="flex items-center justify-between p-4 border-b border-dj-border bg-dj-surface/90 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base text-white tracking-wide">
                  Live Stream & Broadcast Hub
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  PORT 8088 LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Universal OBS Studio Browser Source, Native Streamer.bot WebSocket & Elgato Stream Deck API
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

        {/* 2. Top Universal OBS Browser Source URL Bar */}
        <div className="px-5 py-3 bg-slate-950/80 border-b border-dj-border/50 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center space-x-2 flex-1 min-w-[280px]">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0">
              OBS URL:
            </span>
            <div className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 select-all truncate flex-1 shadow-inner">
              {obsUrl}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => handleCopyUrl(obsUrl)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-mono font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>COPIED!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY OBS URL</span>
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

        {/* 3. Navigation Tabs */}
        <div className="flex items-center border-b border-dj-border/50 px-5 pt-2 bg-slate-900/40 shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('obs')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center space-x-2 cursor-pointer shrink-0 ${
              activeTab === 'obs'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>OBS Browser Source</span>
          </button>

          <button
            onClick={() => setActiveTab('streamerbot')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center space-x-2 cursor-pointer shrink-0 ${
              activeTab === 'streamerbot'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Streamer.bot Integration</span>
            {sbStatus === 'connected' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('streamdeck')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center space-x-2 cursor-pointer shrink-0 ${
              activeTab === 'streamdeck'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Elgato Stream Deck & API</span>
          </button>

          <button
            onClick={() => setActiveTab('lyrics')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center space-x-2 cursor-pointer shrink-0 ${
              activeTab === 'lyrics'
                ? 'border-pink-500 text-pink-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Subtitles className="w-3.5 h-3.5" />
            <span>Synced Lyrics Monitor</span>
          </button>
        </div>

        {/* Global Action Feedback Notification */}
        {triggerFeedback && (
          <div className="bg-gradient-to-r from-purple-900/90 to-slate-900/90 px-4 py-2 text-xs font-mono border-b border-purple-500/40 text-purple-200 flex items-center justify-between animate-in slide-in-from-top-1 duration-200">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
              {triggerFeedback}
            </span>
            <button onClick={() => setTriggerFeedback(null)} className="text-slate-400 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 4. Tab Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          
          {/* TAB 1: OBS BROWSER SOURCE & MODULAR THEMES */}
          {activeTab === 'obs' && (
            <div className="space-y-5">
              {/* Live Overlay Preview Canvas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-cyan-400" />
                    Live Overlay Preview (Transparent Glassmorphic Stream Feed)
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                    WebSocket Port 8088 Synchronized
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 shadow-inner relative overflow-hidden flex flex-col space-y-3">
                  {/* Subtle Background Visual Grid */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                  {/* Active Track Glassmorphic Widget */}
                  {overlayConfig.showCurrentTrack && (
                    <div className="relative flex items-center space-x-3.5 p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md shadow-lg max-w-lg">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center shrink-0 shadow-md">
                        {activeTrack?.coverArtUrl ? (
                          <img src={activeTrack.coverArtUrl} alt="Cover" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Sparkles className="w-6 h-6 text-black" />
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 uppercase">
                            DECK {activeDeck}
                          </span>
                          <span className="text-xs font-mono text-amber-300 font-bold">
                            {activeTrack?.camelotKey || activeTrack?.key || '8A'} • {activeTrack ? (activeTrack.bpm * (activeDeck === 'A' ? deckA.playbackRate : deckB.playbackRate)).toFixed(1) : '126.0'} BPM
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-white truncate mt-0.5">
                          {activeTrack?.title || 'No Track Loaded'}
                        </h4>
                        <p className="text-xs text-slate-300 truncate">
                          {activeTrack?.artist || 'Ready for mix'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Up Next Pill */}
                  {overlayConfig.showNextTrack && nextTrack && (
                    <div className="relative flex items-center justify-between p-2.5 rounded-lg bg-purple-950/40 border border-purple-800/40 max-w-lg">
                      <div className="flex items-center space-x-2 overflow-hidden">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-700/60 uppercase">
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
                </div>
              </div>

              {/* Modular Elements Customization */}
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Modular Stream Widgets
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={overlayConfig.showCurrentTrack}
                      onChange={() => handleToggle('showCurrentTrack')}
                      className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 w-4 h-4 cursor-pointer accent-cyan-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-1.5 text-white font-bold text-xs">
                        <Music className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Now Playing Track Card</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Title, Artist, Artwork, Live BPM, Camelot Key & Deck Indicator
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={overlayConfig.showNextTrack}
                      onChange={() => handleToggle('showNextTrack')}
                      className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 w-4 h-4 cursor-pointer accent-cyan-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-1.5 text-white font-bold text-xs">
                        <SkipForward className="w-3.5 h-3.5 text-purple-400" />
                        <span>Up Next / Queue Banner</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Shows upcoming queued track from Automix or standby deck
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={overlayConfig.showLyrics}
                      onChange={() => handleToggle('showLyrics')}
                      className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 w-4 h-4 cursor-pointer accent-cyan-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-1.5 text-white font-bold text-xs">
                        <Subtitles className="w-3.5 h-3.5 text-pink-400" />
                        <span>Synchronized Lyrics Line</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Live synced .lrc karaoke caption banner for viewers
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={overlayConfig.showVideo}
                      onChange={() => handleToggle('showVideo')}
                      className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 w-4 h-4 cursor-pointer accent-cyan-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-1.5 text-white font-bold text-xs">
                        <Video className="w-3.5 h-3.5 text-red-400" />
                        <span>YouTube Visualizer Feed</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Embeds live video visualizer feed when playing YouTube streams
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* OBS Quick Setup Instructions */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Quick OBS Studio Setup Guide (Zero Configuration Needed)
                </span>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11.5px] leading-relaxed">
                  <li>In OBS Studio, click <strong className="text-white">+ Sources</strong> and select <strong className="text-white">Browser</strong>.</li>
                  <li>Paste the URL: <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">{obsUrl}</code></li>
                  <li>Set Width to <strong className="text-white">1920</strong> and Height to <strong className="text-white">1080</strong> (or 600×120 for lower third).</li>
                  <li>The background is 100% transparent glassmorphism by default. No Chroma Key required.</li>
                </ol>
              </div>

              {/* OBS Native Text File Output (GDI+) */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <FolderOpen className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">Native OBS Text Files (GDI+ Sources)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    CloudMix Pro automatically maintains clean real-time text files (<code className="text-slate-300">nowplaying.txt</code>, <code className="text-slate-300">artist.txt</code>, <code className="text-slate-300">title.txt</code>, <code className="text-slate-300">bpm.txt</code>, <code className="text-slate-300">key.txt</code>) in your local application directory.
                  </p>
                </div>
                <button
                  onClick={() => handleCopyUrl('%APPDATA%\\CloudMixPro\\obs', 'appdata')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold text-slate-200 cursor-pointer shrink-0 ml-3"
                >
                  {copiedEndpoint === 'appdata' ? 'Copied!' : 'Copy Folder Path'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: STREAMER.BOT UNIVERSAL INTEGRATION */}
          {activeTab === 'streamerbot' && (
            <div className="space-y-5">
              {/* WebSocket Connection Panel */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-mono font-bold uppercase text-slate-200">
                      Streamer.bot WebSocket Server Connection
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1.5 ${
                        sbStatus === 'connected'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : sbStatus === 'connecting'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          sbStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                        }`}
                      />
                      {sbStatus}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">
                      WebSocket Server URL (Streamer.bot &gt; Servers/Clients &gt; WebSocket Server):
                    </label>
                    <input
                      type="text"
                      value={sbConfig.wsUrl}
                      onChange={(e) => handleSbConfigChange('wsUrl', e.target.value)}
                      placeholder="ws://127.0.0.1:8080/"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleSbConnectToggle}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all shadow-md cursor-pointer ${
                        sbStatus === 'connected'
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-purple-600 hover:bg-purple-500 text-white'
                      }`}
                    >
                      {sbStatus === 'connected' ? 'Disconnect' : sbStatus === 'connecting' ? 'Connecting...' : 'Connect to Streamer.bot'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="sb-auto-connect"
                    checked={sbConfig.autoConnect}
                    onChange={(e) => handleSbConfigChange('autoConnect', e.target.checked)}
                    className="rounded border-slate-700 text-purple-500 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer accent-purple-500"
                  />
                  <label htmlFor="sb-auto-connect" className="text-xs text-slate-300 cursor-pointer">
                    Auto-connect to Streamer.bot on startup
                  </label>
                </div>
              </div>

              {/* Automated DJ Action Triggers */}
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Automated DJ Event Triggers (Dispatched to Streamer.bot Actions)
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  When a DJ event occurs in CloudMix Pro, the configured Streamer.bot action will be executed with track metadata arguments (<code className="text-purple-300">%trackTitle%</code>, <code className="text-purple-300">%trackArtist%</code>, <code className="text-purple-300">%bpm%</code>, <code className="text-purple-300">%key%</code>, <code className="text-purple-300">%deck%</code>).
                </p>

                <div className="space-y-2.5">
                  {/* Track Change */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-[200px]">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5 text-cyan-400" />
                        On Track Change / Load
                      </span>
                      <span className="text-[11px] text-slate-400">Fired when a new song begins playing on either deck</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={sbConfig.actionOnTrackChange}
                        onChange={(e) => handleSbConfigChange('actionOnTrackChange', e.target.value)}
                        placeholder="Action Name in Streamer.bot"
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-purple-300 w-44"
                      />
                      <button
                        onClick={() => handleTestTrigger(sbConfig.actionOnTrackChange, 'track_change')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-200 border border-slate-700 cursor-pointer active:scale-95"
                      >
                        Test Action
                      </button>
                    </div>
                  </div>

                  {/* Beat Drop */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-[200px]">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        On Beat Drop / Peak Energy
                      </span>
                      <span className="text-[11px] text-slate-400">Trigger smart lights, confetti or camera stingers on drops</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={sbConfig.actionOnDrop}
                        onChange={(e) => handleSbConfigChange('actionOnDrop', e.target.value)}
                        placeholder="Action Name in Streamer.bot"
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-purple-300 w-44"
                      />
                      <button
                        onClick={() => handleTestTrigger(sbConfig.actionOnDrop, 'beat_drop')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-200 border border-slate-700 cursor-pointer active:scale-95"
                      >
                        Test Action
                      </button>
                    </div>
                  </div>

                  {/* Crossfader Slam */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-[200px]">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-pink-400" />
                        On Crossfader Slam / Cut
                      </span>
                      <span className="text-[11px] text-slate-400">Switch OBS cameras or trigger DJ scratch sound effects</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={sbConfig.actionOnCrossfader}
                        onChange={(e) => handleSbConfigChange('actionOnCrossfader', e.target.value)}
                        placeholder="Action Name in Streamer.bot"
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-purple-300 w-44"
                      />
                      <button
                        onClick={() => handleTestTrigger(sbConfig.actionOnCrossfader, 'crossfader_slam')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-200 border border-slate-700 cursor-pointer active:scale-95"
                      >
                        Test Action
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inbound HTTP Chat Commands for Twitch / YouTube */}
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Inbound Chat Commands & Viewer Song Requests (HTTP API)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* !song command */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-cyan-300 uppercase">!song Command</span>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Use Fetch URL in Streamer.bot to post currently playing track to Twitch/YouTube chat.
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopyUrl('http://127.0.0.1:8088/api/streamerbot/song', 'song_cmd')}
                      className="w-full py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-cyan-300 border border-slate-700 cursor-pointer text-center"
                    >
                      {copiedEndpoint === 'song_cmd' ? 'Copied URL!' : 'Copy http://127.0.0.1:8088/api/streamerbot/song'}
                    </button>
                  </div>

                  {/* !request command */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-purple-300 uppercase">!request &lt;song&gt;</span>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Forward viewer requests into CloudMix Pro's live stream request drawer.
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopyUrl('http://127.0.0.1:8088/api/streamerbot/request', 'req_cmd')}
                      className="w-full py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-purple-300 border border-slate-700 cursor-pointer text-center"
                    >
                      {copiedEndpoint === 'req_cmd' ? 'Copied URL!' : 'Copy http://127.0.0.1:8088/api/streamerbot/request'}
                    </button>
                  </div>

                  {/* Channel Points Sampler */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-amber-300 uppercase">Channel Points Sampler</span>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Trigger 8-Pad Sampler soundboard via Twitch channel points or tips.
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopyUrl('http://127.0.0.1:8088/api/streamerbot/sample?pad=1', 'sample_cmd')}
                      className="w-full py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-amber-300 border border-slate-700 cursor-pointer text-center"
                    >
                      {copiedEndpoint === 'sample_cmd' ? 'Copied URL!' : 'Copy http://127.0.0.1:8088/api/streamerbot/sample?pad=1'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ELGATO STREAM DECK & BITFOCUS COMPANION API */}
          {activeTab === 'streamdeck' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Elgato Stream Deck & Bitfocus Companion Universal API
                </h4>
                <p className="text-xs text-slate-400">
                  Trigger every function of CloudMix Pro with 1 tap on your Elgato Stream Deck using the "System: Website / HTTP Request" action or Companion HTTP Generic module.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Deck A: Play / Pause Toggle', endpoint: '/api/streamdeck/play?deck=A', color: 'text-cyan-400' },
                  { label: 'Deck B: Play / Pause Toggle', endpoint: '/api/streamdeck/play?deck=B', color: 'text-pink-400' },
                  { label: 'Deck A: Cue / Stutter Point', endpoint: '/api/streamdeck/cue?deck=A', color: 'text-cyan-400' },
                  { label: 'Deck B: Cue / Stutter Point', endpoint: '/api/streamdeck/cue?deck=B', color: 'text-pink-400' },
                  { label: 'Deck A: Beat Sync', endpoint: '/api/streamdeck/sync?deck=A', color: 'text-cyan-400' },
                  { label: 'Deck B: Beat Sync', endpoint: '/api/streamdeck/sync?deck=B', color: 'text-pink-400' },
                  { label: 'Deck A: 4-Beat Auto-Loop', endpoint: '/api/streamdeck/loop?deck=A&bars=4', color: 'text-emerald-400' },
                  { label: 'Deck B: 4-Beat Auto-Loop', endpoint: '/api/streamdeck/loop?deck=B&bars=4', color: 'text-emerald-400' },
                  { label: 'Neural Stem: Mute/Solo Vocals (Deck A)', endpoint: '/api/streamdeck/stem?deck=A&stem=vocals&action=mute', color: 'text-purple-400' },
                  { label: 'Neural Stem: Mute/Solo Drums (Deck A)', endpoint: '/api/streamdeck/stem?deck=A&stem=drums&action=mute', color: 'text-purple-400' },
                  { label: 'Trigger Hot Cue 1 (Deck A)', endpoint: '/api/streamdeck/hotcue?deck=A&cue=1', color: 'text-amber-400' },
                  { label: 'Trigger Sampler Pad 1', endpoint: '/api/streamdeck/sampler?pad=1', color: 'text-amber-400' },
                  { label: 'Automix AI: Trigger Next Track Transition', endpoint: '/api/streamdeck/automix', color: 'text-purple-400' },
                ].map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <Terminal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className={`text-xs font-bold ${item.color} truncate`}>{item.label}</span>
                      <code className="text-[10.5px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate hidden md:inline">
                        http://127.0.0.1:8088{item.endpoint}
                      </code>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleCopyUrl(`http://127.0.0.1:8088${item.endpoint}`, `sd_${idx}`)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 border border-slate-700 cursor-pointer"
                      >
                        {copiedEndpoint === `sd_${idx}` ? 'Copied!' : 'Copy URL'}
                      </button>
                      <button
                        onClick={() => handleTestStreamDeck(item.endpoint, item.label)}
                        className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-[11px] font-mono font-bold text-white transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        Test Action
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SYNCHRONIZED LYRICS & TRANSLATION */}
          {activeTab === 'lyrics' && (
            <div className="space-y-4">
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
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                {lyricsLines.map((line, idx) => {
                  const isActive = idx === activeLyricIdx;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-purple-900/80 to-slate-900/90 border border-purple-500/80 shadow-md scale-[1.01]'
                          : 'bg-slate-900/40 border border-slate-800/40 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isActive ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {line.text}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {Math.floor(line.timestampMs / 60000)}:
                          {Math.floor((line.timestampMs % 60000) / 1000)
                            .toString()
                            .padStart(2, '0')}
                        </span>
                      </div>
                      {line.translation && (
                        <p
                          className={`text-[11px] mt-0.5 italic ${
                            isActive ? 'text-pink-300' : 'text-slate-500'
                          }`}
                        >
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

        {/* 5. Footer */}
        <div className="p-3.5 bg-dj-surface/90 border-t border-dj-border flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>WebSocket Live Broadcast Engine • Sub-millisecond IPC Bridge</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
