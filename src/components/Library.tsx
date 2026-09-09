import React, { useState, useEffect } from 'react';
import { TrackMetadata, Playlist, DeckId } from '../types/dj';
import { storageCache } from '../services/StorageCacheService';
import { googleDriveService } from '../services/GoogleDriveService';
import { youtubeMusicService } from '../services/YouTubeMusicService';
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
} from 'lucide-react';

interface LibraryProps {
  onLoadTrack: (deckId: DeckId, track: TrackMetadata) => void;
  onOpenDjayImport: () => void;
  onOpenGDriveSettings: () => void;
}

export const Library: React.FC<LibraryProps> = ({
  onLoadTrack,
  onOpenDjayImport,
  onOpenGDriveSettings,
}) => {
  const [tracks, setTracks] = useState<TrackMetadata[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedCrate, setSelectedCrate] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPinning, setIsPinning] = useState<Record<string, number>>({}); // trackId -> percent
  const [ytResults, setYtResults] = useState<TrackMetadata[]>([]);
  const [isSearchingYt, setIsSearchingYt] = useState(false);

  useEffect(() => {
    loadLibraryData();
    setYtResults(youtubeMusicService.getFeaturedTracks());
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
                <th className="py-2 px-3 w-10">#</th>
                <th className="py-2 px-3">Title</th>
                <th className="py-2 px-3">Artist</th>
                <th className="py-2 px-2 text-center w-16">BPM</th>
                <th className="py-2 px-2 text-center w-16">Key</th>
                <th className="py-2 px-2 text-center w-16">Time</th>
                <th className="py-2 px-2 text-center w-24">Source</th>
                <th className="py-2 px-3 text-right w-44">Actions</th>
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
                    <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>

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

                    {/* Camelot Key Badge */}
                    <td className="py-2 px-2 text-center">
                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">
                        {track.camelotKey || track.key}
                      </span>
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

                    {/* Load to Deck A / B buttons */}
                    <td className="py-2 px-3 text-right space-x-2">
                      <button
                        onClick={() => onLoadTrack('A', track)}
                        title="Load Track to Deck A"
                        className="px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-400 hover:text-black font-mono font-extrabold text-[10.5px] transition-all cursor-pointer active:scale-[0.95] shadow-[0_0_8px_rgba(0,240,255,0.2)] hover:shadow-[0_0_12px_rgba(0,240,255,0.6)]"
                      >
                        LOAD A
                      </button>
                      <button
                        onClick={() => onLoadTrack('B', track)}
                        title="Load Track to Deck B"
                        className="px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-500/60 text-rose-300 hover:bg-rose-500 hover:text-black font-mono font-extrabold text-[10.5px] transition-all cursor-pointer active:scale-[0.95] shadow-[0_0_8px_rgba(255,46,136,0.2)] hover:shadow-[0_0_12px_rgba(255,46,136,0.6)]"
                      >
                        LOAD B
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
