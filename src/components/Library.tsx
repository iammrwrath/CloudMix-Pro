import React, { useState, useEffect } from 'react';
import { TrackMetadata, Playlist, DeckId, AutomixQueueItem, HistoryItem } from '../types/dj';
import { storageCache } from '../services/StorageCacheService';
import { googleDriveService } from '../services/GoogleDriveService';
import { youtubeMusicService } from '../services/YouTubeMusicService';
import { automixService } from '../services/AutomixService';
import {
  Folder,
  Music,
  Cloud,
  CheckCircle2,
  Download,
  Plus,
  Search,
  UploadCloud,
  HardDrive,
  Database,
  Flame,
  Clock,
  Sparkles,
  Play,
  Radio,
  Loader2,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Bot,
  ListPlus,
} from 'lucide-react';

interface LibraryProps {
  onLoadTrack: (deckId: DeckId, track: TrackMetadata) => void;
  onOpenDjayImport: () => void;
  onOpenGDriveSettings: () => void;
  currentMasterKey?: string;
  onStartAutomix?: () => void;
}

export const Library: React.FC<LibraryProps> = ({
  onLoadTrack,
  onOpenDjayImport,
  onOpenGDriveSettings,
  currentMasterKey,
  onStartAutomix,
}) => {
  const [tracks, setTracks] = useState<TrackMetadata[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedCrate, setSelectedCrate] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPinning, setIsPinning] = useState<Record<string, number>>({}); // trackId -> percent
  const [ytResults, setYtResults] = useState<TrackMetadata[]>([]);
  const [isSearchingYt, setIsSearchingYt] = useState(false);
  const [queue, setQueue] = useState<AutomixQueueItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [rightSidebarTab, setRightSidebarTab] = useState<'queue' | 'history'>('queue');

  useEffect(() => {
    loadLibraryData();
    setYtResults(youtubeMusicService.getFeaturedTracks());
    const unsubQ = automixService.subscribeQueue(setQueue);
    const unsubH = automixService.subscribeHistory(setHistory);
    return () => {
      unsubQ();
      unsubH();
    };
  }, []);

  const handleYouTubeSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearchingYt(true);
    try {
      const results = await youtubeMusicService.searchTracks(searchQuery);
      setYtResults(results);
    } catch (err) {
      console.error('Failed to search YouTube Music:', err);
    } finally {
      setIsSearchingYt(false);
    }
  };

  const loadLibraryData = async () => {
    const savedTracks = await storageCache.getAllTracks();
    const savedPlaylists = await storageCache.getAllPlaylists();

    if (savedTracks.length === 0) {
      // Seed high-energy demo tracks so the user can test the app immediately!
      const demoTracks: TrackMetadata[] = [
        {
          id: 'demo-1',
          title: 'Cyberpunk Drive (Original Mix)',
          artist: 'Aether & DJ Nova',
          duration: 214.5,
          bpm: 126.0,
          key: 'Am',
          camelotKey: '8A',
          fileUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3', // High-quality EDM sample
          fileSource: 'stream',
          dateAdded: new Date().toISOString(),
          rating: 5,
          hotCues: [
            { id: 0, position: 0.0, color: '#ef4444', label: 'Intro', active: true },
            { id: 1, position: 15.2, color: '#f97316', label: 'Build', active: true },
            { id: 2, position: 30.5, color: '#10b981', label: 'Drop', active: true },
            { id: 3, position: 60.9, color: '#3b82f6', label: 'Break', active: true },
          ],
          savedLoops: [],
          beatGrid: { bpm: 126.0, firstBeatOffset: 0.05, meter: 4 },
        },
        {
          id: 'demo-2',
          title: 'Neon Horizon (Club Extended)',
          artist: 'Solar Pulse',
          duration: 198.2,
          bpm: 128.0,
          key: 'Em',
          camelotKey: '9A',
          fileUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
          fileSource: 'stream',
          dateAdded: new Date().toISOString(),
          rating: 5,
          hotCues: [
            { id: 0, position: 0.0, color: '#ef4444', label: 'Intro', active: true },
            { id: 1, position: 14.8, color: '#00e5ff', label: 'Kick', active: true },
            { id: 2, position: 29.8, color: '#ec4899', label: 'Vocal Drop', active: true },
          ],
          savedLoops: [],
          beatGrid: { bpm: 128.0, firstBeatOffset: 0.02, meter: 4 },
        },
        {
          id: 'demo-3',
          title: 'Deep Underground (Bassline Mix)',
          artist: 'Subsonic Lab',
          duration: 240.0,
          bpm: 124.0,
          key: 'Dm',
          camelotKey: '7A',
          fileUrl: 'https://cdn.freesound.org/previews/415/415444_5121236-lq.mp3',
          fileSource: 'stream',
          dateAdded: new Date().toISOString(),
          rating: 4,
          hotCues: [
            { id: 0, position: 0.0, color: '#ef4444', label: 'Intro', active: true },
            { id: 1, position: 31.0, color: '#f59e0b', label: 'Heavy Drop', active: true },
          ],
          savedLoops: [],
          beatGrid: { bpm: 124.0, firstBeatOffset: 0.0, meter: 4 },
        },
      ];

      for (const t of demoTracks) {
        await storageCache.saveTrack(t);
      }
      setTracks(demoTracks);
    } else {
      setTracks(savedTracks);
    }

    setPlaylists(savedPlaylists);
  };

  // Local file import (drag-and-drop or file selector)
  const handleLocalFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newTracks: TrackMetadata[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const trackId = 'local_' + Math.random().toString(36).substring(2, 10);
      const url = URL.createObjectURL(file);

      // Cache file arrayBuffer locally
      const buffer = await file.arrayBuffer();
      await storageCache.cacheAudioData(trackId, buffer);

      // Clean filename
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      let title = baseName;
      let artist = 'Local Artist';
      if (baseName.includes(' - ')) {
        const parts = baseName.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }

      const track: TrackMetadata = {
        id: trackId,
        title,
        artist,
        duration: 180, // will be accurately populated upon audio load
        bpm: 125.0,
        key: '8A',
        camelotKey: '8A',
        fileUrl: url,
        fileSource: 'local',
        sizeBytes: file.size,
        dateAdded: new Date().toISOString(),
        isOfflineCached: true,
        hotCues: [],
        savedLoops: [],
        beatGrid: { bpm: 125.0, firstBeatOffset: 0.0, meter: 4 },
      };

      await storageCache.saveTrack(track);
      newTracks.push(track);
    }

    setTracks((prev) => [...newTracks, ...prev]);
  };

  const handlePinOffline = async (track: TrackMetadata) => {
    setIsPinning((prev) => ({ ...prev, [track.id]: 10 }));
    try {
      await googleDriveService.pinTrackOffline(track, (percent) => {
        setIsPinning((prev) => ({ ...prev, [track.id]: percent }));
      });
      setTracks((prev) =>
        prev.map((t) => (t.id === track.id ? { ...t, isOfflineCached: true } : t))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsPinning((prev) => {
        const next = { ...prev };
        delete next[track.id];
        return next;
      });
    }
  };

  const filteredTracks = selectedCrate === 'youtube'
    ? ytResults
    : tracks.filter((t) => {
        if (selectedCrate === 'gdrive' && t.fileSource !== 'drive') return false;
        if (selectedCrate === 'prep' && (t.rating || 0) < 4) return false;
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.camelotKey && t.camelotKey.toLowerCase().includes(q)) ||
          t.bpm.toString().includes(q)
        );
      });

  return (
    <div className="flex h-44 bg-dj-panel rounded-xl border border-dj-border shadow-2xl overflow-hidden">
      {/* 1. Crates & Playlists Sidebar */}
      <div className="w-52 bg-dj-surface/90 border-r border-dj-border p-2.5 flex flex-col justify-between">
        <div>
          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
            CRATES & SOURCES
          </span>

          <nav className="space-y-1">
            <button
              onClick={() => setSelectedCrate('all')}
              className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedCrate === 'all'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Music className="w-3.5 h-3.5 text-cyan-400" />
              <span>All Tracks ({tracks.length})</span>
            </button>

            <button
              onClick={() => setSelectedCrate('gdrive')}
              className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedCrate === 'gdrive'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Drive</span>
            </button>

            <button
              onClick={() => {
                setSelectedCrate('youtube');
                if (ytResults.length === 0) {
                  setYtResults(youtubeMusicService.getFeaturedTracks());
                }
              }}
              className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedCrate === 'youtube'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-600/60 shadow-sm'
                  : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-rose-500" />
              <span>YouTube Music</span>
            </button>

            <button
              onClick={() => setSelectedCrate('prep')}
              className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedCrate === 'prep'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Prepare Crate</span>
            </button>

            <button
              onClick={() => setSelectedCrate('history')}
              className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedCrate === 'history'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Set History</span>
            </button>
          </nav>
        </div>

        {/* Action buttons at bottom of sidebar */}
        <div className="space-y-1.5 pt-2 border-t border-dj-border/60">
          <button
            onClick={onOpenDjayImport}
            className="w-full py-1.5 px-2 rounded bg-indigo-950/60 border border-indigo-700/60 text-indigo-300 hover:bg-indigo-900/60 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all"
          >
            <Database className="w-3 h-3 text-indigo-400" />
            <span>Import djay Pro DB</span>
          </button>

          <button
            onClick={onOpenGDriveSettings}
            className="w-full py-1.5 px-2 rounded bg-blue-950/60 border border-blue-700/60 text-blue-300 hover:bg-blue-900/60 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all"
          >
            <Cloud className="w-3 h-3 text-blue-400" />
            <span>Drive Sync Config</span>
          </button>
        </div>
      </div>

      {/* 2. Main Track Browser */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="flex items-center justify-between p-2.5 border-b border-dj-border bg-dj-surface/40">
          {/* Search box */}
          <form onSubmit={handleYouTubeSearch} className="relative flex-1 max-w-md flex items-center space-x-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={
                  selectedCrate === 'youtube'
                    ? 'Search YouTube Music (e.g. Fisher, Daft Punk, Fred Again)...'
                    : 'Search by Title, Artist, BPM, Camelot Key (e.g. 8A, 128)...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            {selectedCrate === 'youtube' && (
              <button
                type="submit"
                disabled={isSearchingYt}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1 transition-all shadow-sm shrink-0"
              >
                {isSearchingYt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3" />}
                <span>Search</span>
              </button>
            )}
          </form>

          {/* Import local audio button */}
          <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm">
            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import Audio Files</span>
            <input
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg"
              onChange={handleLocalFileInput}
              className="hidden"
            />
          </label>
        </div>

        {/* Tracks Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-dj-surface text-slate-400 font-mono text-[10px] uppercase border-b border-dj-border z-10">
              <tr>
                <th className="py-2 px-2.5 w-8">#</th>
                <th className="py-2 px-2 w-12 text-center">Art</th>
                <th className="py-2 px-3">Title</th>
                <th className="py-2 px-3">Artist</th>
                <th className="py-2 px-2 text-center w-16">BPM</th>
                <th className="py-2 px-2 text-center w-16">Key</th>
                <th className="py-2 px-2 text-center w-16">Time</th>
                <th className="py-2 px-2 text-center w-20">Source</th>
                <th className="py-2 px-3 text-right w-52">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dj-border/50 font-sans">
              {filteredTracks.map((track, idx) => {
                const isDownloading = isPinning[track.id] !== undefined;

                return (
                  <tr
                    key={track.id}
                    className="hover:bg-slate-800/60 transition-colors group cursor-pointer"
                  >
                    <td className="py-2 px-2.5 font-mono text-slate-500">{idx + 1}</td>

                    {/* Artwork Thumbnail */}
                    <td className="py-1 px-2 w-12 text-center">
                      <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-800/90 border border-white/10 flex items-center justify-center mx-auto shadow-sm">
                        {track.coverArtUrl ? (
                          <img src={track.coverArtUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                            <Music className="w-3.5 h-3.5 text-cyan-400/70" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-2 px-3 font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {track.title}
                    </td>

                    {/* Artist */}
                    <td className="py-2 px-3 text-slate-300">{track.artist}</td>

                    {/* BPM */}
                    <td className="py-2 px-2 text-center font-mono font-bold text-cyan-400">
                      {track.bpm.toFixed(1)}
                    </td>

                    {/* Camelot Key Badge & Harmonic Match */}
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">
                          {track.camelotKey || track.key}
                        </span>
                        {(() => {
                          const k = (track.camelotKey || track.key || '').trim().toUpperCase();
                          const m = (currentMasterKey || '').trim().toUpperCase();
                          if (!m || !k) return null;
                          if (k === m) {
                            return (
                              <span
                                title="Harmonic Perfect Match (Same Key)"
                                className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
                              >
                                MATCH
                              </span>
                            );
                          }
                          // Camelot +/- 1 check
                          const matchK = k.match(/^(\d{1,2})([AB])$/);
                          const matchM = m.match(/^(\d{1,2})([AB])$/);
                          if (matchK && matchM) {
                            const nK = parseInt(matchK[1], 10);
                            const lK = matchK[2];
                            const nM = parseInt(matchM[1], 10);
                            const lM = matchM[2];
                            if (lK === lM && (nK === (nM % 12) + 1 || nK === ((nM - 2 + 12) % 12) + 1)) {
                              return (
                                <span
                                  title="Harmonic Energy Shift (Compatible Adjacent Key)"
                                  className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500/60"
                                >
                                  {nK > nM ? '+1 E' : '-1 E'}
                                </span>
                              );
                            }
                            if (nK === nM && lK !== lM) {
                              return (
                                <span
                                  title="Relative Major/Minor Key"
                                  className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-purple-950/90 text-purple-300 border border-purple-500/60"
                                >
                                  REL
                                </span>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-2 px-2 text-center font-mono text-slate-400">
                      {Math.floor(track.duration / 60)}:
                      {Math.floor(track.duration % 60)
                        .toString()
                        .padStart(2, '0')}
                    </td>

                    {/* Source / Offline status */}
                    <td className="py-2 px-2 text-center">
                      {track.fileSource === 'youtube' ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/60">
                          <Radio className="w-2.5 h-2.5" />
                          <span>YouTube</span>
                        </span>
                      ) : track.fileSource === 'drive' ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/60">
                          <Cloud className="w-2.5 h-2.5" />
                          <span>Drive</span>
                        </span>
                      ) : track.isOfflineCached ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Pinned</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePinOffline(track)}
                          title="Pin for Offline Gig Use"
                          disabled={isDownloading}
                          className="inline-flex items-center space-x-1 text-[10px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-950/60 hover:bg-blue-900/80 px-1.5 py-0.5 rounded border border-blue-800/60 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>{isDownloading ? `${isPinning[track.id]}%` : 'Drive Pin'}</span>
                        </button>
                      )}
                    </td>

                    {/* Actions: LOAD A, LOAD B, + QUEUE */}
                    <td className="py-2 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => onLoadTrack('A', track)}
                        title="Load Track to Deck A"
                        className="px-2 py-1 rounded-md bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-400 hover:text-black font-mono font-extrabold text-[10px] transition-all cursor-pointer active:scale-95 shadow-[0_0_8px_rgba(0,240,255,0.2)]"
                      >
                        LOAD A
                      </button>
                      <button
                        onClick={() => onLoadTrack('B', track)}
                        title="Load Track to Deck B"
                        className="px-2 py-1 rounded-md bg-rose-950/80 border border-rose-500/60 text-rose-300 hover:bg-rose-500 hover:text-black font-mono font-extrabold text-[10px] transition-all cursor-pointer active:scale-95 shadow-[0_0_8px_rgba(255,46,136,0.2)]"
                      >
                        LOAD B
                      </button>
                      <button
                        onClick={() => automixService.addToQueue(track)}
                        title="Add to Automix Queue"
                        className="px-1.5 py-1 rounded-md bg-purple-950/80 border border-purple-500/60 text-purple-300 hover:bg-purple-500 hover:text-white font-mono font-extrabold text-[9.5px] transition-all cursor-pointer active:scale-95 shadow-[0_0_8px_rgba(168,85,247,0.2)]"
                      >
                        +Q
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Pro Automix Queue & Live History Sidebar (djay Pro Workstation Match) */}
      {isRightSidebarOpen ? (
        <div className="w-72 border-l border-dj-border flex flex-col bg-dj-surface/90 shrink-0 select-none">
          {/* Sidebar Header & Tabs */}
          <div className="flex items-center justify-between p-2 border-b border-dj-border bg-slate-950/60">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setRightSidebarTab('queue')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  rightSidebarTab === 'queue'
                    ? 'bg-purple-600 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                QUEUE ({queue.length})
              </button>
              <button
                onClick={() => setRightSidebarTab('history')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  rightSidebarTab === 'history'
                    ? 'bg-purple-600 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                HISTORY ({history.length})
              </button>
            </div>

            <button
              onClick={() => setIsRightSidebarOpen(false)}
              title="Collapse Sidebar"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {rightSidebarTab === 'queue' ? (
              <>
                {/* Queue Header Controls */}
                <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                  <button
                    onClick={() => onStartAutomix?.()}
                    className="flex-1 py-1 rounded-md bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-mono font-extrabold text-[10px] flex items-center justify-center space-x-1 shadow-[0_0_10px_rgba(236,72,153,0.4)] mr-1 cursor-pointer active:scale-95"
                  >
                    <Bot className="w-3 h-3" />
                    <span>START AUTOMIX</span>
                  </button>
                  {queue.length > 0 && (
                    <button
                      onClick={() => automixService.clearQueue()}
                      title="Clear Queue"
                      className="p-1 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Queue List */}
                {queue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500 space-y-2">
                    <Bot className="w-8 h-8 opacity-40 text-purple-400" />
                    <p className="text-[11px] font-sans">Automix Queue is empty</p>
                    <p className="text-[9px] text-slate-600 max-w-[180px]">
                      Click "+Q" on any track in the library to stage upcoming songs.
                    </p>
                  </div>
                ) : (
                  queue.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/80 border border-white/5 hover:border-purple-500/40 transition-all group"
                    >
                      <div className="flex items-center space-x-2 overflow-hidden flex-1">
                        <span className="font-mono text-[10px] text-slate-500 w-3">{idx + 1}</span>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[11px] font-bold text-white truncate max-w-[140px]">
                            {item.track.title}
                          </span>
                          <div className="flex items-center space-x-1 text-[9px] text-slate-400">
                            <span className="truncate max-w-[80px]">{item.track.artist}</span>
                            <span>•</span>
                            <span className="font-mono text-cyan-400">{item.track.bpm.toFixed(0)} BPM</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => onLoadTrack('A', item.track)}
                          title="Load to Deck A"
                          className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-600 hover:text-black cursor-pointer"
                        >
                          A
                        </button>
                        <button
                          onClick={() => onLoadTrack('B', item.track)}
                          title="Load to Deck B"
                          className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-600 hover:text-black cursor-pointer"
                        >
                          B
                        </button>
                        <button
                          onClick={() => automixService.removeFromQueue(item.id)}
                          title="Remove from Queue"
                          className="p-0.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : (
              /* Live Set History */
              <>
                <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                    Played Tracks ({history.length})
                  </span>
                  {history.length > 0 && (
                    <button
                      onClick={() => automixService.clearHistory()}
                      title="Clear History"
                      className="text-[9px] font-mono text-slate-500 hover:text-rose-400 flex items-center space-x-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      <span>CLEAR</span>
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500 space-y-2">
                    <Clock className="w-8 h-8 opacity-40 text-purple-400" />
                    <p className="text-[11px] font-sans">No tracks played yet</p>
                    <p className="text-[9px] text-slate-600 max-w-[180px]">
                      Tracks played during your DJ set will automatically be recorded here.
                    </p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/80 border border-white/5"
                    >
                      <div className="flex flex-col overflow-hidden flex-1">
                        <span className="text-[11px] font-bold text-white truncate max-w-[170px]">
                          {item.track.title}
                        </span>
                        <div className="flex items-center space-x-1.5 text-[9px] text-slate-400">
                          <span className="text-purple-400 font-mono">DECK {item.deckId}</span>
                          <span>•</span>
                          <span>{item.playedAt}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onLoadTrack('A', item.track)}
                          title="Reload to Deck A"
                          className="px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                        >
                          A
                        </button>
                        <button
                          onClick={() => onLoadTrack('B', item.track)}
                          title="Reload to Deck B"
                          className="px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                        >
                          B
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* Collapsed Sidebar Tab Button */
        <div className="border-l border-dj-border bg-dj-surface/90 p-1 flex flex-col items-center justify-start shrink-0">
          <button
            onClick={() => setIsRightSidebarOpen(true)}
            title="Open Automix Queue & History Sidebar"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div
            className="mt-4 text-[10px] font-mono font-bold text-slate-400 tracking-wider flex items-center cursor-pointer hover:text-cyan-400"
            style={{ writingMode: 'vertical-rl' }}
            onClick={() => setIsRightSidebarOpen(true)}
          >
            QUEUE & HISTORY ({queue.length})
          </div>
        </div>
      )}
    </div>
  );
};
