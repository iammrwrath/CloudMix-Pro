import React, { useState, useEffect } from 'react';
import { Cloud, HardDrive, Check, X, Shield, Music, Music2, LogIn, LogOut, RefreshCw, FolderOpen, Wifi } from 'lucide-react';
import { googleDriveService } from '../services/GoogleDriveService';
import { storageCache } from '../services/StorageCacheService';
import { musicLibraryService } from '../services/MusicLibraryService';
import { youtubeMusicService } from '../services/YouTubeMusicService';

interface SettingsModalProps {
  onClose: () => void;
}

/** Small self-contained input for the Google OAuth Client ID */
const YtClientIdInput: React.FC = () => {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    storageCache.getSetting<string>('yt_client_id', '').then((v) => setValue(v || ''));
  }, []);

  const save = async () => {
    await storageCache.setSetting('yt_client_id', value.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex space-x-1.5 w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="xxxxxx.apps.googleusercontent.com"
        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
      />
      <button
        onClick={save}
        className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-white font-semibold transition-colors flex items-center space-x-1"
      >
        {saved ? <Check className="w-3 h-3 text-emerald-400" /> : <span>Save</span>}
      </button>
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'local' | 'gdrive' | 'youtube'>('local');
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [folderId, setFolderId] = useState('');
  const [localDrivePath, setLocalDrivePath] = useState('G:\\My Drive\\Music');
  const [saved, setSaved] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [ytConnected, setYtConnected] = useState(false);
  const [ytEmail, setYtEmail] = useState<string | null>(null);
  const [ytLoading, setYtLoading] = useState(false);

  // Load all persisted settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      // Load local path
      const savedPath = await storageCache.getSetting<string>('local_music_path', 'G:\\My Drive\\Music');
      setLocalDrivePath(savedPath);

      // Load Google Drive config
      const gdConfig = googleDriveService.getConfig();
      setApiKey(gdConfig.apiKey || '');
      setClientId(gdConfig.clientId || '');
      setFolderId(gdConfig.folderId || '');

      // Load YouTube Music auth state
      const ytToken = await storageCache.getSetting<string | null>('yt_oauth_token', null);
      const ytEmailSaved = await storageCache.getSetting<string | null>('yt_email', null);
      if (ytToken) {
        setYtConnected(true);
        setYtEmail(ytEmailSaved);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    // 1. Persist local music path
    await storageCache.setSetting('local_music_path', localDrivePath);

    // 2. Persist Google Drive config
    googleDriveService.setConfig({ apiKey, clientId, folderId });

    setSaved(true);

    // 3. Trigger library rescan from the new path
    if (localDrivePath.trim()) {
      setScanning(true);
      setScanResult(null);
      try {
        const count = await musicLibraryService.refreshFromLocalPath(localDrivePath.trim());
        setScanResult(`âœ“ Found ${count} tracks in ${localDrivePath}`);
      } catch (e) {
        setScanResult(`âš  Could not scan folder: ${e}`);
      } finally {
        setScanning(false);
      }
    }

    setTimeout(() => {
      setSaved(false);
      if (!scanning) onClose();
    }, 1200);
  };

  const handleBrowseFolder = async () => {
    if ((window as any).desktopAPI?.selectFolder) {
      const folder = await (window as any).desktopAPI.selectFolder();
      if (folder) setLocalDrivePath(folder);
    }
  };

  const handleManualScan = async () => {
    if (!localDrivePath.trim()) return;
    setScanning(true);
    setScanResult(null);
    try {
      const count = await musicLibraryService.refreshFromLocalPath(localDrivePath.trim());
      setScanResult(`âœ“ Loaded ${count} tracks from ${localDrivePath}`);
    } catch (e) {
      setScanResult(`âš  Scan error: ${e}`);
    } finally {
      setScanning(false);
    }
  };

  const handleYtConnect = async () => {
    setYtLoading(true);
    try {
      await youtubeMusicService.signIn();
      // After sign-in, check if token was stored
      const token = await storageCache.getSetting<string | null>('yt_oauth_token', null);
      const email = await storageCache.getSetting<string | null>('yt_email', null);
      if (token) {
        setYtConnected(true);
        setYtEmail(email);
      }
    } catch (e) {
      console.error('YouTube Music sign-in failed:', e);
    } finally {
      setYtLoading(false);
    }
  };

  const handleYtDisconnect = async () => {
    await storageCache.setSetting('yt_oauth_token', null);
    await storageCache.setSetting('yt_email', null);
    youtubeMusicService.signOut();
    setYtConnected(false);
    setYtEmail(null);
  };

  const TABS = [
    { id: 'local' as const, label: 'Local Music', icon: HardDrive },
    { id: 'gdrive' as const, label: 'Google Drive', icon: Cloud },
    { id: 'youtube' as const, label: 'YouTube Music', icon: Music2 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dj-panel border border-dj-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dj-border bg-dj-surface/90">
          <div className="flex items-center space-x-2">
            <Music className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-base text-white">CloudMix Pro â€” Music Sources</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-dj-border bg-dj-surface/60">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 text-xs font-mono font-bold transition-all ${
                  activeTab === tab.id
                    ? 'text-cyan-300 border-b-2 border-cyan-400 bg-cyan-950/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.id === 'youtube' && ytConnected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-5 space-y-4 overflow-y-auto">

          {/* â”€â”€ LOCAL MUSIC TAB â”€â”€ */}
          {activeTab === 'local' && (
            <>
              <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3 text-xs text-blue-200 flex items-start space-x-2">
                <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Point CloudMix Pro to your local music folder. It will scan for MP3, WAV, FLAC, M4A, AAC, and OGG files and load them directly into your library.
                </span>
              </div>

              {/* Local Path */}
              <div className="bg-dj-surface rounded-xl p-3 border border-dj-border">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Local Music Folder Path
                </label>
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                  <input
                    type="text"
                    value={localDrivePath}
                    onChange={(e) => setLocalDrivePath(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleBrowseFolder}
                    title="Browse for folder"
                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-cyan-500 transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  e.g. G:\My Drive\Music or D:\DJ Music
                </span>
              </div>

              {/* Scan Button & Result */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleManualScan}
                  disabled={scanning || !localDrivePath.trim()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold hover:bg-cyan-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                  <span>{scanning ? 'Scanning...' : 'Scan Now'}</span>
                </button>
                {scanResult && (
                  <span className={`text-[11px] font-mono ${scanResult.startsWith('âœ“') ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {scanResult}
                  </span>
                )}
              </div>
            </>
          )}

          {/* â”€â”€ GOOGLE DRIVE TAB â”€â”€ */}
          {activeTab === 'gdrive' && (
            <>
              <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3 text-xs text-blue-200 flex items-start space-x-2">
                <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  CloudMix Pro streams music directly from Google Drive using high-speed chunked range requests and caches tracks locally for flawless offline gig safety.
                </span>
              </div>

              {/* API Key */}
              <div className="bg-dj-surface rounded-xl p-3 border border-dj-border">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Google Drive API Key (Optional for direct cloud streaming)
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Folder ID */}
              <div className="bg-dj-surface rounded-xl p-3 border border-dj-border">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Google Drive Music Folder ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1a2b3c4d5e6f7g8h9..."
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {/* â”€â”€ Music2 MUSIC TAB â”€â”€ */}
          {activeTab === 'youtube' && (
            <>
              <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-3 text-xs text-rose-200 flex items-start space-x-2">
                <Music2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  Connect your YouTube Music account to browse your playlists, liked songs, and music library directly in CloudMix Pro.
                </span>
              </div>

              {ytConnected ? (
                /* Connected state */
                <div className="bg-dj-surface rounded-xl p-4 border border-emerald-500/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center">
                        <Music2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">YouTube Music</p>
                        <p className="text-[11px] text-emerald-400 font-mono">
                          ● Connected{ytEmail ? ` — ${ytEmail}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleYtDisconnect}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs font-mono transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                  <div className="mt-3 pt-3 border-t border-dj-border text-[11px] text-slate-400">
                    Your YouTube Music playlists and library are now available in the <span className="text-cyan-300 font-bold">Library → YouTube Music</span> tab.
                  </div>
                </div>
              ) : (
                /* Sign-in state — requires Client ID */
                <div className="bg-dj-surface rounded-xl p-4 border border-dj-border flex flex-col items-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center">
                    <Music2 className="w-7 h-7 text-red-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">Connect YouTube Music</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Sign in with Google to access your playlists, liked songs, and music library.
                    </p>
                  </div>

                  {/* Client ID input */}
                  <div className="w-full space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Google OAuth Client ID
                    </label>
                    <YtClientIdInput />
                  </div>

                  <button
                    onClick={handleYtConnect}
                    disabled={ytLoading}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-bold transition-all shadow-lg shadow-red-500/20 active:scale-95"
                  >
                    {ytLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>{ytLoading ? 'Connecting...' : 'Sign in with Google'}</span>
                  </button>
                  <p className="text-[10px] text-slate-500 text-center">
                    Uses read-only access to your YouTube Music library. No data is uploaded or modified.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Footer Buttons (Local + GDrive tabs) */}
          {activeTab !== 'youtube' && (
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={scanning}
                className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center space-x-1.5"
              >
                {saved ? <Check className="w-3.5 h-3.5" /> : scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                <span>{saved ? 'Saved!' : scanning ? 'Scanning...' : 'Save Settings'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};




