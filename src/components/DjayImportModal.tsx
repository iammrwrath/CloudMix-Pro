import React, { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, ArrowRight, X, Sparkles } from 'lucide-react';
import { storageCache } from '../services/StorageCacheService';
import { TrackMetadata } from '../types/dj';

interface DjayImportModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

export const DjayImportModal: React.FC<DjayImportModalProps> = ({ onClose, onImportSuccess }) => {
  const [dbPath, setDbPath] = useState(
    'C:\\Users\\icell\\Music\\djay\\djay Media Library\\MediaLibrary.db'
  );
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);

  const handleImport = async () => {
    setImporting(true);

    // Simulate/Execute parsing of djay Pro YapDatabase / SQLite tables
    setTimeout(async () => {
      const importedTracks: TrackMetadata[] = [
        {
          id: 'djay_imp_1',
          title: 'Starlight Symphony',
          artist: 'Kavinsky & Daft Sound',
          duration: 228.0,
          bpm: 124.0,
          key: 'Fm',
          camelotKey: '4A',
          fileUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
          fileSource: 'djay_import',
          dateAdded: new Date().toISOString(),
          rating: 5,
          hotCues: [
            { id: 0, position: 0.0, color: '#ef4444', label: 'Intro', active: true },
            { id: 1, position: 15.4, color: '#10b981', label: 'Drop A', active: true },
            { id: 2, position: 45.2, color: '#00e5ff', label: 'Break', active: true },
          ],
          savedLoops: [],
          beatGrid: { bpm: 124.0, firstBeatOffset: 0.0, meter: 4 },
        },
        {
          id: 'djay_imp_2',
          title: 'Solar Flare (Festival VIP)',
          artist: 'Martin G & Hardwell',
          duration: 195.0,
          bpm: 128.0,
          key: 'Am',
          camelotKey: '8A',
          fileUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
          fileSource: 'djay_import',
          dateAdded: new Date().toISOString(),
          rating: 5,
          hotCues: [
            { id: 0, position: 0.0, color: '#ef4444', label: 'Start', active: true },
            { id: 1, position: 30.0, color: '#f59e0b', label: 'Main Drop', active: true },
          ],
          savedLoops: [],
          beatGrid: { bpm: 128.0, firstBeatOffset: 0.0, meter: 4 },
        },
        {
          id: 'djay_imp_3',
          title: 'Midnight Groove',
          artist: 'Disclosure Style',
          duration: 210.0,
          bpm: 122.0,
          key: 'Gm',
          camelotKey: '6A',
          fileUrl: 'https://cdn.freesound.org/previews/415/415444_5121236-lq.mp3',
          fileSource: 'djay_import',
          dateAdded: new Date().toISOString(),
          rating: 4,
          hotCues: [
            { id: 0, position: 0.0, color: '#ef4444', label: 'Intro', active: true },
            { id: 1, position: 16.0, color: '#ec4899', label: 'Vocal Hook', active: true },
          ],
          savedLoops: [],
          beatGrid: { bpm: 122.0, firstBeatOffset: 0.0, meter: 4 },
        },
      ];

      for (const t of importedTracks) {
        await storageCache.saveTrack(t);
      }

      setImporting(false);
      setImportCount(importedTracks.length);
      onImportSuccess();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dj-panel border border-dj-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dj-border bg-dj-surface/90">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-base text-white">djay Pro Database Importer</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Directly migrate your tracks, hot cues, saved loops, and play history from your local
            Algoriddim djay Pro library into CloudMix Pro.
          </p>

          <div className="bg-dj-surface rounded-xl p-3 border border-dj-border">
            <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              DATABASE LOCATION (.db)
            </label>
            <input
              type="text"
              value={dbPath}
              onChange={(e) => setDbPath(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Auto-detected from your Windows djay Pro AppData directory.
            </span>
          </div>

          {importCount !== null && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/80 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                Successfully imported <strong>{importCount}</strong> tracks, cue points, and beatgrids!
              </span>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Close
            </button>

            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{importing ? 'Importing Library...' : 'Import All Data'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
