import React, { useState, useEffect, useMemo } from 'react';
import { TrackMetadata, Playlist, DeckId, AutomixQueueItem, HistoryItem } from '../types/dj';
import { storageCache } from '../services/StorageCacheService';
import { googleDriveService } from '../services/GoogleDriveService';
import { youtubeMusicService } from '../services/YouTubeMusicService';
import { automixService } from '../services/AutomixService';
import { musicLibraryService } from '../services/MusicLibraryService';
import {
  Folder,
  Music,
  Cloud,
  CheckCircle2,
  Download,
  Plus,
  Search,
  UploadCloud,
  Database,
  Flame,
  Clock,
  Play,
  Radio,
  Loader2,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Bot,
  Maximize2,
  Minimize2,
  List,
  FolderPlus,
  Disc,
} from 'lucide-react';

interface LibraryProps {
  onLoadTrack: (deckId: DeckId, track: TrackMetadata) => void;
  onOpenDjayImport: () => void;
  onOpenGDriveSettings: () => void;
  currentMasterKey?: string;
  onStartAutomix?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const DEFAULT_PLAYLIST_NAMES = [
  'Music',
  'Work',
  'Dubstep',
  'REBIRTH',
  '80s to 2000s',
  'Muevelo',
  'House',
  'Reggaeton',
  'Hip Hop',
  "Let's Rock",
  '2000s',
  'Reggae',
  'Weeknd',
  'Afro',
  '&THEA',
  'Dembow',
  'Bonobo',
];

export const Library = React.memo<LibraryProps>(({
  onLoadTrack,
  onOpenDjayImport,
  onOpenGDriveSettings,
  currentMasterKey,
  onStartAutomix,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [tracks, setTracks] = useState<TrackMetadata[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedCrate, setSelectedCrate] = useState<string>('all');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPinning, setIsPinning] = useState<Record<string, number>>({});
  const [ytResults, setYtResults] = useState<TrackMetadata[]>([]);
  const [isSearchingYt, setIsSearchingYt] = useState(false);
  const [queue, setQueue] = useState<AutomixQueueItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [rightSidebarTab, setRightSidebarTab] = useState<'queue' | 'history'>('queue');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  useEffect(() => {
    loadLibraryData();
    setYtResults(youtubeMusicService.getFeaturedTracks());
    const unsubQ = automixService.subscribeQueue(setQueue);
    const unsubH = automixService.subscribeHistory(setHistory);

    // Subscribe to real-time music library updates (from folder scan or djay Pro import)
    const unsubLib = musicLibraryService.subscribe((pulseTracks) => {
      if (pulseTracks && pulseTracks.length > 0) {
        const djTracks = pulseTracks.map((pt) => musicLibraryService.convertPulseToDjTrack(pt));
        setTracks(djTracks);
      }
    });

    return () => {
      unsubQ();
      unsubH();
      unsubLib();
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

    const initialTracks: TrackMetadata[] = [
      {
        id: 'demo-1',
        title: 'Cyberpunk Drive (Original Mix)',
        artist: 'Aether & DJ Nova',
        album: 'Neo Tokyo Sessions',
        genre: 'Synthwave / Electro',
        year: 2026,
        duration: 214.5,
        bpm: 126.0,
        key: 'Am',
        camelotKey: '8A',
        fileUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
        fileSource: 'stream',
        dateAdded: '9/1/26',
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
        album: 'Horizon EP',
        genre: 'Melodic House',
        year: 2026,
        duration: 198.2,
        bpm: 128.0,
        key: 'Em',
        camelotKey: '9A',
        fileUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
        fileSource: 'stream',
        dateAdded: '9/5/26',
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
        album: 'Low End Theory',
        genre: 'Dubstep / Bass',
        year: 2025,
        duration: 240.0,
        bpm: 124.0,
        key: 'Dm',
        camelotKey: '7A',
        fileUrl: 'https://cdn.freesound.org/previews/415/415444_5121236-lq.mp3',
        fileSource: 'stream',
        dateAdded: '8/20/26',
        rating: 4,
        hotCues: [
          { id: 0, position: 0.0, color: '#ef4444', label: 'Intro', active: true },
          { id: 1, position: 31.0, color: '#f59e0b', label: 'Heavy Drop', active: true },
        ],
        savedLoops: [],
        beatGrid: { bpm: 124.0, firstBeatOffset: 0.0, meter: 4 },
      },
      {
        id: 'demo-4',
        title: 'Nobody Land',
        artist: 'Tory Lanez',
        album: 'Alone At Prom',
        genre: 'R&B / Synthpop',
        year: 2026,
        duration: 221.0,
        bpm: 139.0,
        key: 'Fm',
        camelotKey: '4A',
        fileUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
        fileSource: 'local',
        dateAdded: '6/15/26',
        rating: 5,
        hotCues: [],
        savedLoops: [],
        beatGrid: { bpm: 139.0, firstBeatOffset: 0.0, meter: 4 },
      },
      {
        id: 'demo-5',
        title: "'97 Hov",
        artist: 'Benny the Butcher',
        album: 'The Plugs I Met',
        genre: 'Hip Hop',
        year: 2019,
        duration: 251.0,
        bpm: 82.0,
        key: 'Gm',
        camelotKey: '6A',
        fileUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
        fileSource: 'local',
        dateAdded: '6/15/26',
        rating: 4,
        hotCues: [],
        savedLoops: [],
        beatGrid: { bpm: 82.0, firstBeatOffset: 0.0, meter: 4 },
      },
      {
        id: 'demo-6',
        title: 'BROTHER',
        artist: 'Jessie Reyez & 6LACK',
        album: 'YESSIE',
        genre: 'Soul / R&B',
        year: 2025,
        duration: 179.0,
        bpm: 80.0,
        key: 'Bbm',
        camelotKey: '3A',
        fileUrl: 'https://cdn.freesound.org/previews/415/415444_5121236-lq.mp3',
        fileSource: 'local',
        dateAdded: '6/15/26',
        rating: 5,
        hotCues: [],
        savedLoops: [],
        beatGrid: { bpm: 80.0, firstBeatOffset: 0.0, meter: 4 },
      },
      {
        id: 'demo-7',
        title: 'GOLIATH',
        artist: 'Jessie Reyez',
        album: 'YESSIE',
        genre: 'R&B / Trap',
        year: 2025,
        duration: 186.0,
        bpm: 86.0,
        key: 'Cm',
        camelotKey: '5A',
        fileUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
        fileSource: 'local',
        dateAdded: '6/15/26',
        rating: 4,
        hotCues: [],
        savedLoops: [],
        beatGrid: { bpm: 86.0, firstBeatOffset: 0.0, meter: 4 },
      },
      {
        id: 'demo-8',
        title: 'Where Are U Now (Afro House Remix)',
        artist: 'Skrillex & Diplo ft. Justin Bieber',
        album: 'Jack U Remixed',
        genre: 'Afro House',
        year: 2025,
        duration: 220.0,
        bpm: 124.0,
        key: 'Em',
        camelotKey: '9A',
        fileUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
        fileSource: 'drive',
        dateAdded: '7/27/26',
        rating: 5,
        hotCues: [],
        savedLoops: [],
        beatGrid: { bpm: 124.0, firstBeatOffset: 0.0, meter: 4 },
      },
      {
        id: 'demo-9',
        title: 'Shiver (Club Mix)',
        artist: 'John Summit & Hayla',
        album: 'Comfort in Chaos',
        genre: 'Tech House',
        year: 2025,
        duration: 236.0,
        bpm: 126.0,
        key: 'Am',
        camelotKey: '8A',
        fileUrl: 'https://cdn.freesound.org/previews/415/415444_5121236-lq.mp3',
        fileSource: 'drive',
        dateAdded: '8/12/26',
        rating: 5,
        hotCues: [],
        savedLoops: [],
        beatGrid: { bpm: 126.0, firstBeatOffset: 0.0, meter: 4 },
      },
    ];

    if (savedTracks.length === 0) {
      for (const t of initialTracks) {
        await storageCache.saveTrack(t);
      }
      setTracks(initialTracks);
    } else {
      setTracks(savedTracks);
    }

    if (savedPlaylists.length === 0) {
      const now = new Date().toISOString();
      const initialPlaylists: Playlist[] = DEFAULT_PLAYLIST_NAMES.map((name, idx) => ({
        id: `pl-${idx}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name,
        trackIds: idx === 0 ? initialTracks.map((t) => t.id) : [],
        dateCreated: now,
        dateUpdated: now,
        isCloudSynced: false,
        isPinnedOffline: false,
      }));
      for (const p of initialPlaylists) {
        await storageCache.savePlaylist(p);
      }
      setPlaylists(initialPlaylists);
    } else {
      setPlaylists(savedPlaylists);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const now = new Date().toISOString();
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name: newPlaylistName.trim(),
      trackIds: [],
      dateCreated: now,
      dateUpdated: now,
      isCloudSynced: false,
      isPinnedOffline: false,
    };
    await storageCache.savePlaylist(newPl);
    setPlaylists((prev) => [...prev, newPl]);
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
    setSelectedPlaylistId(newPl.id);
    setSelectedCrate('playlist');
  };

  const handleLocalFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newTracks: TrackMetadata[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const trackId = 'local_' + Math.random().toString(36).substring(2, 10);
      const url = URL.createObjectURL(file);

      const buffer = await file.arrayBuffer();
      await storageCache.cacheAudioData(trackId, buffer);

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
        genre: 'Imported',
        year: new Date().getFullYear(),
        duration: 180,
        bpm: 125.0,
        key: '8A',
        camelotKey: '8A',
        fileUrl: url,
        fileSource: 'local',
        sizeBytes: file.size,
        dateAdded: new Date().toLocaleDateString(),
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

  // Filter Tracks (memoized to prevent expensive re-filtering 6,000+ tracks on re-renders)
  const filteredTracks = useMemo(() => {
    if (selectedCrate === 'youtube') return ytResults;
    return tracks.filter((t) => {
      if (selectedCrate === 'gdrive' && t.fileSource !== 'drive') return false;
      if (selectedCrate === 'prep' && (t.rating || 0) < 4) return false;
      if (selectedCrate === 'playlist' && selectedPlaylistId) {
        const pl = playlists.find((p) => p.id === selectedPlaylistId);
        if (pl && pl.name !== 'Music' && !pl.trackIds.includes(t.id)) return false;
      }
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.genre && t.genre.toLowerCase().includes(q)) ||
        (t.camelotKey && t.camelotKey.toLowerCase().includes(q)) ||
        t.bpm.toString().includes(q)
      );
    });
  }, [selectedCrate, ytResults, tracks, selectedPlaylistId, playlists, searchQuery]);

  const totalDurationSecs = useMemo(() => {
    return filteredTracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [filteredTracks]);
  const totalHours = Math.floor(totalDurationSecs / 3600);
  const totalMins = Math.floor((totalDurationSecs % 3600) / 60);
  const formattedDuration = totalHours > 0 ? `${totalHours} h ${totalMins} min` : `${totalMins} min`;

  const getActivePlaylistName = () => {
    if (selectedCrate === 'youtube') return 'YouTube Music';
    if (selectedCrate === 'gdrive') return 'Google Drive';
    if (selectedCrate === 'prep') return 'Prepare Crate';
    if (selectedCrate === 'history') return 'Set History';
    if (selectedCrate === 'playlist' && selectedPlaylistId) {
      const pl = playlists.find((p) => p.id === selectedPlaylistId);
      if (pl) return pl.name;
    }
    return 'Music';
  };

  return (
    <div
      className="flex w-full h-full flex-1 min-h-0 bg-dj-panel rounded-xl border border-dj-border shadow-2xl overflow-hidden select-none"
    >
      {/* 1. Crates & Playlists Sidebar (djay Pro Tree Layout) */}
      <div className="w-56 bg-dj-surface/95 border-r border-dj-border p-2.5 flex flex-col justify-between shrink-0 overflow-y-auto">
        <div className="space-y-3">
          {/* Section: Main Sources */}
          <div>
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1 block">
              SOURCES
            </span>
            <nav className="space-y-0.5">
              <button
                onClick={() => {
                  setSelectedCrate('all');
                  setSelectedPlaylistId(null);
                }}
                className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCrate === 'all' && !selectedPlaylistId
                    ? 'bg-slate-700 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate">All Tracks ({tracks.length})</span>
              </button>

              <button
                onClick={() => {
                  setSelectedCrate('gdrive');
                  setSelectedPlaylistId(null);
                }}
                className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCrate === 'gdrive'
                    ? 'bg-slate-700 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 text-blue-400" />
                <span className="truncate">Google Drive</span>
              </button>

              <button
                onClick={() => {
                  setSelectedCrate('youtube');
                  setSelectedPlaylistId(null);
                  if (ytResults.length === 0) {
                    setYtResults(youtubeMusicService.getFeaturedTracks());
                  }
                }}
                className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCrate === 'youtube'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-600/60 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-rose-500" />
                <span className="truncate">YouTube Music</span>
              </button>

              <button
                onClick={() => {
                  setSelectedCrate('prep');
                  setSelectedPlaylistId(null);
                }}
                className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCrate === 'prep'
                    ? 'bg-slate-700 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="truncate">Prepare Crate</span>
              </button>
            </nav>
          </div>

          {/* Section: Playlists / Folders (djay Pro Tree) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                PLAYLISTS
              </span>
              <button
                onClick={() => setIsCreatingPlaylist(!isCreatingPlaylist)}
                title="Create New Playlist"
                className="text-slate-400 hover:text-cyan-400 p-0.5 rounded cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Add Playlist Input */}
            {isCreatingPlaylist && (
              <div className="flex items-center space-x-1 mb-1.5 p-1 bg-slate-900 rounded-md border border-slate-700">
                <input
                  type="text"
                  placeholder="Playlist name..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                  className="w-full bg-transparent text-[11px] text-white px-1 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleCreatePlaylist}
                  className="px-1.5 py-0.5 rounded bg-cyan-600 text-black font-bold text-[10px]"
                >
                  OK
                </button>
              </div>
            )}

            <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
              {playlists.map((pl) => {
                const isSelected = selectedCrate === 'playlist' && selectedPlaylistId === pl.id;
                const count = pl.name === 'Music' ? tracks.length : pl.trackIds.length;

                return (
                  <button
                    key={pl.id}
                    onClick={() => {
                      setSelectedCrate('playlist');
                      setSelectedPlaylistId(pl.id);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-700 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span className="truncate">{pl.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-1">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Tools */}
        <div className="space-y-1.5 pt-2 border-t border-dj-border/60">
          <button
            onClick={onOpenDjayImport}
            title="Import libraries from djay Pro, Rekordbox, Serato, VirtualDJ, & Traktor"
            className="w-full py-1.5 px-2 rounded bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/60 text-indigo-200 hover:text-white hover:border-indigo-400 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Universal DJ Migration</span>
          </button>

          <button
            onClick={onOpenGDriveSettings}
            className="w-full py-1.5 px-2 rounded bg-blue-950/60 border border-blue-700/60 text-blue-300 hover:bg-blue-900/60 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
          >
            <Cloud className="w-3 h-3 text-blue-400" />
            <span>Drive Sync Config</span>
          </button>
        </div>
      </div>

      {/* 2. Main Multi-Column Track Browser */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Summary Banner (Matching djay Pro in Image 3) */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-dj-border bg-dj-surface/70">
          {/* Crate Title & Stats */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-white font-mono">
              {getActivePlaylistName()}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {filteredTracks.length} Songs · {formattedDuration}
            </span>
          </div>

          {/* Search, Import, & Fullscreen Expand Toggle */}
          <div className="flex items-center space-x-2">
            {/* Search Input */}
            <form onSubmit={handleYouTubeSearch} className="relative w-64 xl:w-80">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search My Collection (Title, Artist, Key, BPM)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </form>

            {/* Local Import Button */}
            <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm">
              <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">Import Audio</span>
              <input
                type="file"
                multiple
                accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg"
                onChange={handleLocalFileInput}
                className="hidden"
              />
            </label>

            {/* Universal DJ Migration Hub Button */}
            <button
              onClick={onOpenDjayImport}
              title="Migrate Cues, Loops & Playlists from djay Pro, Rekordbox, Serato, VirtualDJ, & Traktor"
              className="cursor-pointer px-2.5 py-1 rounded-lg bg-indigo-950/90 hover:bg-indigo-900/90 text-indigo-300 hover:text-white border border-indigo-600/70 text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Universal DJ Migration</span>
              <span className="md:hidden">Migrate</span>
            </button>

            {/* Expand / Minimize Drawer Toggle Button */}
            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                title={isExpanded ? 'Exit Expanded Library (Split View)' : 'Expand to Full Library (djay Pro Mode)'}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950 text-slate-300 hover:text-cyan-400 border border-slate-600 text-xs font-mono font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-sm"
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden xl:inline">{isExpanded ? 'SPLIT' : 'EXPAND'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tracks Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
            <thead className="sticky top-0 bg-dj-surface text-slate-300 font-mono text-[11px] font-black uppercase tracking-wider border-b border-dj-border z-10 shadow-sm">
              <tr>
                <th className="py-2.5 px-3 w-10">#</th>
                <th className="py-2.5 px-2 w-12 text-center">Art</th>
                <th className="py-2.5 px-3">Title</th>
                <th className="py-2.5 px-3">Artist</th>
                <th className="py-2.5 px-2.5">Genre</th>
                <th className="py-2.5 px-2.5 text-center w-18">Time</th>
                <th className="py-2.5 px-2.5 text-center w-20">BPM</th>
                <th className="py-2.5 px-2.5 text-center w-20">Key</th>
                <th className="py-2.5 px-2 text-center w-14 hidden md:table-cell">Year</th>
                <th className="py-2.5 px-2.5 text-center w-24 hidden lg:table-cell">Date Added</th>
                <th className="py-2.5 px-3 text-right w-52">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dj-border/50 font-sans">
              {filteredTracks.map((track, idx) => {
                const isDownloading = isPinning[track.id] !== undefined;

                return (
                  <tr
                    key={track.id}
                    onDoubleClick={() => onLoadTrack('A', track)}
                    className="hover:bg-slate-800/80 transition-colors group cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono text-slate-400 font-bold text-xs">{idx + 1}</td>

                    {/* Artwork Thumbnail */}
                    <td className="py-1 px-2 w-12 text-center">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center mx-auto shadow-sm">
                        {track.coverArtUrl ? (
                          <img src={track.coverArtUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
                            <Disc className="w-5 h-5 text-cyan-400/80" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-2.5 px-3 font-black text-white group-hover:text-cyan-300 text-xs sm:text-[13.5px] transition-colors">
                      <div className="flex items-center space-x-1.5">
                        <span className="truncate">{track.title}</span>
                      </div>
                    </td>

                    {/* Artist */}
                    <td className="py-2.5 px-3 text-slate-300 font-medium text-xs sm:text-[12.5px] truncate">{track.artist}</td>

                    {/* Genre */}
                    <td className="py-2.5 px-2.5 text-slate-400 text-xs truncate">
                      {track.genre || 'Music'}
                    </td>

                    {/* Duration */}
                    <td className="py-2.5 px-2.5 text-center font-mono text-slate-300 font-bold text-xs">
                      {Math.floor(track.duration / 60)}:
                      {Math.floor(track.duration % 60)
                        .toString()
                        .padStart(2, '0')}
                    </td>

                    {/* BPM */}
                    <td className="py-2.5 px-2.5 text-center font-mono font-black text-cyan-300 text-xs sm:text-[13px]">
                      {track.bpm.toFixed(1)}
                    </td>

                    {/* Camelot Key Badge & Harmonic Match */}
                    <td className="py-2.5 px-2.5 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-700/80 shadow-sm">
                          {track.camelotKey || track.key}
                        </span>
                        {(() => {
                          const k = (track.camelotKey || track.key || '').trim().toUpperCase();
                          const m = (currentMasterKey || '').trim().toUpperCase();
                          if (!m || !k) return null;
                          if (k === m) {
                            return (
                              <span
                                title="Harmonic Perfect Match"
                                className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
                              >
                                MATCH
                              </span>
                            );
                          }
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
                                  title="Harmonic Shift"
                                  className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500/60"
                                >
                                  {nK > nM ? '+1 E' : '-1 E'}
                                </span>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>
                    </td>

                    {/* Year */}
                    <td className="py-2.5 px-2 text-center font-mono text-slate-400 text-xs hidden md:table-cell">
                      {track.year || 2026}
                    </td>

                    {/* Date Added */}
                    <td className="py-2.5 px-2.5 text-center font-mono text-slate-400 text-xs hidden lg:table-cell">
                      {track.dateAdded ? track.dateAdded.substring(0, 10) : '6/15/26'}
                    </td>

                    {/* Actions: LOAD A, LOAD B, +Q */}
                    <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadTrack('A', track);
                        }}
                        title="Load Track to Deck A"
                        className="px-2.5 py-1.5 rounded-md bg-cyan-950/90 border border-cyan-400/80 text-cyan-300 hover:bg-cyan-400 hover:text-black font-mono font-black text-[11px] transition-all cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                      >
                        LOAD A
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadTrack('B', track);
                        }}
                        title="Load Track to Deck B"
                        className="px-2.5 py-1.5 rounded-md bg-rose-950/90 border border-rose-400/80 text-rose-300 hover:bg-rose-500 hover:text-black font-mono font-black text-[11px] transition-all cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(255,46,136,0.3)]"
                      >
                        LOAD B
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          automixService.addToQueue(track);
                        }}
                        title="Add to Automix Queue"
                        className="px-2 py-1.5 rounded-md bg-purple-950/90 border border-purple-400/80 text-purple-300 hover:bg-purple-500 hover:text-white font-mono font-black text-[10.5px] transition-all cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
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

      {/* 3. Pro Automix Queue & Live History Sidebar */}
      {isRightSidebarOpen ? (
        <div className="w-72 border-l border-dj-border flex flex-col bg-dj-surface/95 shrink-0 select-none">
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
                            <span className="text-cyan-400 font-mono">{item.track.bpm.toFixed(0)} BPM</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onLoadTrack('A', item.track)}
                          title="Load to Deck A"
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 hover:bg-cyan-500 hover:text-black border border-cyan-800/60 transition-colors cursor-pointer"
                        >
                          A
                        </button>
                        <button
                          onClick={() => onLoadTrack('B', item.track)}
                          title="Load to Deck B"
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-950 text-rose-300 hover:bg-rose-500 hover:text-black border border-rose-800/60 transition-colors cursor-pointer"
                        >
                          B
                        </button>
                        <button
                          onClick={() => automixService.removeFromQueue(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between pb-1.5 border-b border-white/5 text-[10px] font-mono text-slate-400">
                  <span>RECENTLY PLAYED</span>
                  <span>{history.length} TRACKS</span>
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
});
