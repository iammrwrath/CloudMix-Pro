import React, { useState, useEffect } from 'react';
import { Cloud, HardDrive, Check, X, Shield, Music, Music2, LogIn, LogOut, RefreshCw, FolderOpen, Wifi, Monitor, ZoomIn, ZoomOut, Speaker, Headphones, Volume2, Sliders } from 'lucide-react';
import { googleDriveService } from '../services/GoogleDriveService';
import { storageCache } from '../services/StorageCacheService';
import { musicLibraryService } from '../services/MusicLibraryService';
import { youtubeMusicService } from '../services/YouTubeMusicService';
import { audioEngine } from '../audio/AudioEngine';

interface SettingsModalProps {
  onClose: () => void;
  uiZoom?: number;
  onUiZoomChange?: (zoom: number) => void;
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

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, uiZoom: propUiZoom, onUiZoomChange }) => {
  const [activeTab, setActiveTab] = useState<'local' | 'audio' | 'gdrive' | 'youtube' | 'display'>('local');
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [folderId, setFolderId] = useState('');
  const [localDrivePath, setLocalDrivePath] = useState('G:\\My Drive\\Music');
  const [uiZoom, setUiZoom] = useState(propUiZoom || 1.0);
  const [saved, setSaved] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [ytConnected, setYtConnected] = useState(false);
  const [ytEmail, setYtEmail] = useState<string | null>(null);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);

  // Audio Device Routing State
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [masterDeviceId, setMasterDeviceId] = useState<string>('default');
  const [headphoneDeviceId, setHeadphoneDeviceId] = useState<string>('default');
  const [latencyHint, setLatencyHint] = useState<'interactive' | 'balanced' | 'playback'>('interactive');
  const [audioTesting, setAudioTesting] = useState<'master' | 'headphone' | null>(null);

  // Sync prop changes if changed externally
  useEffect(() => {
    if (propUiZoom !== undefined) {
      setUiZoom(propUiZoom);
    }
  }, [propUiZoom]);

  const handleUpdateZoom = (newZoom: number) => {
    setUiZoom(newZoom);
    if (onUiZoomChange) {
      onUiZoomChange(newZoom);
    }
  };

  // Load all persisted settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      // Load audio output devices
      try {
        const devices = await audioEngine.getAvailableAudioDevices();
        setAudioDevices(devices);
      } catch {}

      const savedMasterDevice = await storageCache.getSetting<string>('audio_master_device_id', audioEngine.getMasterDeviceId() || 'default');
      const savedHeadphoneDevice = await storageCache.getSetting<string>('audio_headphone_device_id', audioEngine.getHeadphoneDeviceId() || 'default');
      const savedLatency = await storageCache.getSetting<'interactive' | 'balanced' | 'playback'>('audio_latency_hint', 'interactive');
      setMasterDeviceId(savedMasterDevice);
      setHeadphoneDeviceId(savedHeadphoneDevice);
      setLatencyHint(savedLatency);

      // Load local path
      const savedPath = await storageCache.getSetting<string>('local_music_path', 'G:\\My Drive\\Music');
      setLocalDrivePath(savedPath);

      // Load UI Zoom if not provided via props
      if (propUiZoom === undefined) {
        const savedZoom = await storageCache.getSetting<number>('ui_zoom', 1.0);
        if (savedZoom) setUiZoom(savedZoom);
      }

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

    // 3. Persist UI Zoom
    await storageCache.setSetting('ui_zoom', uiZoom);

    // 4. Persist and Apply Audio Output Devices & Latency
    await storageCache.setSetting('audio_master_device_id', masterDeviceId);
    await storageCache.setSetting('audio_headphone_device_id', headphoneDeviceId);
    await storageCache.setSetting('audio_latency_hint', latencyHint);
    await audioEngine.setMasterOutputDevice(masterDeviceId);
    await audioEngine.setHeadphoneOutputDevice(headphoneDeviceId);
    await audioEngine.setLatencyHint(latencyHint);

    setSaved(true);

    // 5. Trigger library rescan from the new path
    if (localDrivePath.trim()) {
      setScanning(true);
      setScanResult(null);
      try {
        const count = await musicLibraryService.refreshFromLocalPath(localDrivePath.trim());
        setScanResult(`Loaded ${count} tracks from ${localDrivePath}`);
      } catch (e) {
        setScanResult(`Error: Could not scan folder (${e})`);
      } finally {
        setScanning(false);
      }
    }

    setTimeout(() => {
      setSaved(false);
      if (!scanning) onClose();
    }, 1200);
  };

  const handleTestAudio = async (type: 'master' | 'headphone') => {
    setAudioTesting(type);
    try {
      audioEngine.init();
      const ctx = audioEngine.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') await ctx.resume();

      // Synthesize a pleasant chime to verify the exact speaker or headphone output
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'master' ? 523.25 : 880.0, now); // C5 for master, A5 for headphone
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      if (type === 'master') {
        const masterNode = audioEngine.getMasterNode();
        if (masterNode) gain.connect(masterNode);
        else gain.connect(ctx.destination);
      } else {
        // Route directly into headphone bus
        audioEngine.setCueActive('A', true);
        const deckA = audioEngine.getDeck('A');
        if (deckA) gain.connect(deckA.cueGain);
        else gain.connect(ctx.destination);
      }

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (err) {
      console.error('[AUDIO TEST ERROR]', err);
    } finally {
      setTimeout(() => setAudioTesting(null), 700);
    }
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
      setScanResult(`Loaded ${count} tracks from ${localDrivePath}`);
    } catch (e: any) {
      setScanResult(`Scan error: ${e?.message || e}`);
    } finally {
      setScanning(false);
    }
  };

  const handleYtConnect = async () => {
    setYtLoading(true);
    setYtError(null);
    try {
      await youtubeMusicService.signIn();
      // After sign-in, check if token was stored
      const token = await storageCache.getSetting<string | null>('yt_oauth_token', null);
      const email = await storageCache.getSetting<string | null>('yt_email', null);
      if (token) {
        setYtConnected(true);
        setYtEmail(email);
      }
    } catch (e: any) {
      console.error('YouTube Music sign-in failed:', e);
      setYtError(e?.message || 'Sign-in failed. Please verify your Client ID.');
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
    { id: 'audio' as const, label: 'Audio Outputs', icon: Speaker },
    { id: 'gdrive' as const, label: 'Google Drive', icon: Cloud },
    { id: 'youtube' as const, label: 'YouTube Music', icon: Music2 },
    { id: 'display' as const, label: 'Display & Zoom', icon: Monitor },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-dj-panel border border-dj-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dj-border bg-dj-surface/90">
          <div className="flex items-center space-x-2.5">
            <Music className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-lg text-white font-sans">CloudMix Pro - Settings & Sources</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-dj-border bg-dj-surface/60 px-2 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'text-cyan-300 border-b-2 border-cyan-400 bg-cyan-950/30 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.id === 'youtube' && ytConnected && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-5 overflow-y-auto">

          {/* -- LOCAL MUSIC TAB -- */}
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
                  <span className={`text-[11px] font-mono ${scanResult.toLowerCase().includes('error') ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {scanResult}
                  </span>
                )}
              </div>
            </>
          )}

          {/* -- AUDIO OUTPUTS TAB (djay Pro / Traktor / VirtualDJ style) -- */}
          {activeTab === 'audio' && (
            <>
              <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-3 text-xs text-cyan-200 flex items-start space-x-2">
                <Speaker className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  Configure independent audio hardware routing for your <strong className="text-white">Master Output</strong> (speakers/PA system) and <strong className="text-white">Headphones Pre-Cueing</strong> (DJ controller headphone jack or USB audio interface).
                </span>
              </div>

              {/* Master Output Device Selection */}
              <div className="bg-dj-surface rounded-xl p-4 border border-dj-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Speaker className="w-4 h-4 text-cyan-400" />
                    <label className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Master Output (Speakers / PA)
                    </label>
                  </div>
                  <button
                    onClick={() => handleTestAudio('master')}
                    disabled={audioTesting !== null}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/50 text-[11px] font-mono text-cyan-300 transition-colors cursor-pointer"
                  >
                    <Volume2 className={`w-3 h-3 ${audioTesting === 'master' ? 'animate-bounce text-emerald-400' : ''}`} />
                    <span>{audioTesting === 'master' ? 'Testing...' : 'Test Output'}</span>
                  </button>
                </div>

                <select
                  value={masterDeviceId}
                  onChange={(e) => setMasterDeviceId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="default">Default System Audio Output</option>
                  {audioDevices.map((dev, idx) => (
                    <option key={dev.deviceId || idx} value={dev.deviceId}>
                      {dev.label || `Audio Device ${idx + 1}`}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  Sends mixed master channel audio through isolator EQs, FX rack, and limiter to the main audience.
                </p>
              </div>

              {/* Headphones Pre-Cueing Device Selection */}
              <div className="bg-dj-surface rounded-xl p-4 border border-dj-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Headphones className="w-4 h-4 text-amber-400" />
                    <label className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Headphone Monitor / Pre-Cueing
                    </label>
                  </div>
                  <button
                    onClick={() => handleTestAudio('headphone')}
                    disabled={audioTesting !== null}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-950 border border-slate-700 hover:border-amber-500/50 text-[11px] font-mono text-amber-300 transition-colors cursor-pointer"
                  >
                    <Volume2 className={`w-3 h-3 ${audioTesting === 'headphone' ? 'animate-bounce text-emerald-400' : ''}`} />
                    <span>{audioTesting === 'headphone' ? 'Testing...' : 'Test Cue'}</span>
                  </button>
                </div>

                <select
                  value={headphoneDeviceId}
                  onChange={(e) => setHeadphoneDeviceId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="default">Default System Audio Output (Same as Master)</option>
                  {audioDevices.map((dev, idx) => (
                    <option key={dev.deviceId || idx} value={dev.deviceId}>
                      {dev.label || `Audio Device ${idx + 1}`}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  Routes Deck A / Deck B CUE channels and VirtualDJ Sandbox auditioning privately into your headphones.
                </p>
              </div>

              {/* DSP Latency & Buffer Engine Settings */}
              <div className="bg-dj-surface rounded-xl p-4 border border-dj-border space-y-3">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <label className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Audio Engine Latency & Buffer Size
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'interactive' as const, label: 'Ultra Low (Scratch)', ms: '~5ms', desc: 'Highest responsiveness for turntablism' },
                    { id: 'balanced' as const, label: 'Balanced (Club Mix)', ms: '~12ms', desc: 'Optimal for live DJ transitions & FX' },
                    { id: 'playback' as const, label: 'Maximum Safety', ms: '~25ms', desc: 'Prevents dropouts on high CPU load' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setLatencyHint(preset.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        latencyHint === preset.id
                          ? 'bg-purple-950/40 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono">{preset.label}</span>
                        <span className="text-[10px] font-mono text-purple-400 font-black">{preset.ms}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block leading-tight">{preset.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                  <span>Hardware Sample Rate: <strong className="text-cyan-300">{audioEngine.getSampleRate()} Hz</strong></span>
                  <span>Base Engine Latency: <strong className="text-emerald-400">{audioEngine.getBaseLatency().toFixed(1)} ms</strong></span>
                </div>
              </div>
            </>
          )}

          {/* -- GOOGLE DRIVE TAB -- */}
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

          {/* -- YOUTUBE MUSIC TAB -- */}
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
                  <div className="w-full space-y-2">
                    <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
                      Google OAuth 2.0 Client ID
                    </label>
                    <YtClientIdInput />
                    <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl space-y-2 mt-2 text-left">
                      <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold font-mono">
                        <span>⚠️ Google Console Redirect URI Requirement:</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        In your <span className="text-white font-semibold">Google Cloud Console</span> → <span className="text-white font-semibold">APIs & Services</span> → <span className="text-white font-semibold">Credentials</span> → select your OAuth Client ID → under <span className="text-cyan-300 font-semibold">"Authorized redirect URIs"</span>, you must add:
                      </p>
                      <div className="flex items-center justify-between bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-1.5 font-mono text-xs text-cyan-300 select-all">
                        <code>http://127.0.0.1:42813/callback</code>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard?.writeText('http://127.0.0.1:42813/callback')}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded cursor-pointer transition-colors border border-slate-700"
                        >
                          Copy URI
                        </button>
                      </div>
                      <p className="text-[10.5px] text-slate-400">
                        Also make sure your OAuth client application type is set to <span className="text-white font-semibold">Web application</span> (or Desktop app with this loopback URI).
                      </p>
                    </div>
                  </div>

                  {ytError && (
                    <div className="w-full bg-red-950/50 border border-red-800/80 rounded-xl p-3 text-xs font-mono text-red-200 text-center">
                      {ytError}
                    </div>
                  )}

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

          {/* -- DISPLAY & UI ZOOM TAB -- */}
          {activeTab === 'display' && (
            <>
              <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-3 text-xs text-cyan-200 flex items-start space-x-2">
                <Monitor className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  Adjust the UI scale to fit your monitor resolution (1080p, 1440p, or 4K). You can also zoom anytime using the Header zoom buttons or keyboard shortcuts (<code className="text-cyan-300 font-mono">Ctrl +</code> / <code className="text-cyan-300 font-mono">Ctrl -</code>).
                </span>
              </div>

              <div className="bg-dj-surface rounded-xl p-4 border border-dj-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-white block">Workstation UI Scale</span>
                    <span className="text-xs text-slate-400">Current scale: {Math.round(uiZoom * 100)}%</span>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700">
                    <button
                      onClick={() => handleUpdateZoom(Math.max(0.8, Math.round((uiZoom - 0.1) * 10) / 10))}
                      title="Zoom Out"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-black text-sm text-cyan-300 min-w-[50px] text-center">
                      {Math.round(uiZoom * 100)}%
                    </span>
                    <button
                      onClick={() => handleUpdateZoom(Math.min(1.5, Math.round((uiZoom + 0.1) * 10) / 10))}
                      title="Zoom In"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Preset Scale Buttons */}
                <div className="grid grid-cols-4 gap-3 pt-2">
                  {[
                    { label: 'Compact', val: 0.9, pct: '90%' },
                    { label: 'Standard', val: 1.0, pct: '100%' },
                    { label: 'Comfort', val: 1.15, pct: '115%' },
                    { label: 'Large (4K)', val: 1.3, pct: '130%' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      onClick={() => handleUpdateZoom(preset.val)}
                      className={`py-3 px-3 rounded-xl border font-mono text-sm flex flex-col items-center justify-center transition-all cursor-pointer ${
                        Math.abs(uiZoom - preset.val) < 0.05
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-[0_0_14px_rgba(6,182,212,0.35)] font-black'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="font-bold text-base">{preset.pct}</span>
                      <span className="text-xs text-slate-400 mt-0.5">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Footer Buttons (Local, GDrive & Display tabs) */}
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




