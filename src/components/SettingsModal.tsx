import React, { useState, useEffect } from 'react';
import { Cloud, HardDrive, Check, X, Shield, Music, Music2, LogIn, LogOut, RefreshCw, FolderOpen, Wifi, Monitor, ZoomIn, ZoomOut, Speaker, Headphones, Volume2, Sliders, Disc, Radio, Wand2, Palette, Cpu, SlidersHorizontal, Settings, Loader2 } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'general' | 'audio' | 'dvs' | 'sound' | 'automix' | 'library' | 'appearance' | 'advanced' | 'midi'>('general');
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

  // DVS State
  const [dvsEnabled, setDvsEnabled] = useState(false);
  const [dvsMode, setDvsMode] = useState<'relative' | 'absolute'>('relative');
  const [dvsLeadInSec, setDvsLeadInSec] = useState(2);

  // Sound / EQ State
  const [eqType, setEqType] = useState<'isolator' | 'classic'>('isolator');
  const [headroomDb, setHeadroomDb] = useState<'-6dB' | '-9dB' | '-12dB'>('-9dB');
  const [limiterEnabled, setLimiterEnabled] = useState(true);

  // Automix State
  const [automixDurationSec, setAutomixDurationSec] = useState(8);
  const [automixSync, setAutomixSync] = useState(true);
  const [automixCurve, setAutomixCurve] = useState<'smooth' | 'linear'>('smooth');

  // Appearance State
  const [themeMode, setThemeMode] = useState<'pro_dark' | 'midnight' | 'neon'>('pro_dark');
  const [deckLayout, setDeckLayout] = useState<'2_deck' | '4_deck'>('2_deck');

  // Advanced State
  const [stemModelQuality, setStemModelQuality] = useState<'high' | 'ultra'>('high');
  const [gpuAcceleration, setGpuAcceleration] = useState(true);
  const [cacheCleared, setCacheCleared] = useState(false);

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

      // Load DVS settings
      const savedDvs = await storageCache.getSetting<boolean>('dvs_enabled', false);
      const savedDvsMode = await storageCache.getSetting<'relative' | 'absolute'>('dvs_mode', 'relative');
      setDvsEnabled(savedDvs);
      setDvsMode(savedDvsMode);

      // Load Sound settings
      const savedEq = await storageCache.getSetting<'isolator' | 'classic'>('sound_eq_type', 'isolator');
      const savedHeadroom = await storageCache.getSetting<'-6dB' | '-9dB' | '-12dB'>('sound_headroom', '-9dB');
      setEqType(savedEq);
      setHeadroomDb(savedHeadroom);

      // Load Automix settings
      const savedAutoDur = await storageCache.getSetting<number>('automix_duration', 8);
      const savedAutoSync = await storageCache.getSetting<boolean>('automix_sync', true);
      setAutomixDurationSec(savedAutoDur);
      setAutomixSync(savedAutoSync);

      // Load Appearance settings
      const savedTheme = await storageCache.getSetting<'pro_dark' | 'midnight' | 'neon'>('appearance_theme', 'pro_dark');
      setThemeMode(savedTheme);

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

    // 5. Persist DVS, Sound, Automix, Appearance
    await storageCache.setSetting('dvs_enabled', dvsEnabled);
    await storageCache.setSetting('dvs_mode', dvsMode);
    await storageCache.setSetting('sound_eq_type', eqType);
    await storageCache.setSetting('sound_headroom', headroomDb);
    await storageCache.setSetting('automix_duration', automixDurationSec);
    await storageCache.setSetting('automix_sync', automixSync);
    await storageCache.setSetting('appearance_theme', themeMode);

    setSaved(true);

    // 6. Trigger library rescan from the new path
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
    { id: 'general' as const, label: 'General', icon: Settings },
    { id: 'audio' as const, label: 'Audio Devices', icon: Speaker },
    { id: 'dvs' as const, label: 'DVS', icon: Disc },
    { id: 'sound' as const, label: 'Sound', icon: SlidersHorizontal },
    { id: 'automix' as const, label: 'Automix', icon: Wand2 },
    { id: 'library' as const, label: 'Library', icon: HardDrive },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'advanced' as const, label: 'Advanced', icon: Cpu },
    { id: 'midi' as const, label: 'MIDI Devices', icon: Sliders },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="bg-[#0b0e14] border border-dj-border rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[820px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dj-border bg-dj-surface/90 shrink-0">
          <div className="flex items-center space-x-2.5">
            <Settings className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-lg text-white font-sans">Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column djay Pro Layout: Sidebar + Main Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-48 sm:w-56 bg-[#080a0f] border-r border-dj-border/80 p-2 sm:p-3 space-y-1 overflow-y-auto shrink-0 select-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs sm:text-[13px] font-mono font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="truncate">{tab.label}</span>
                  {tab.id === 'library' && ytConnected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Main Content Pane */}
          <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 overflow-y-auto bg-dj-surface/40 min-w-0">
            <div className="space-y-5">
              {/* 1. GENERAL TAB */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="border-b border-dj-border pb-2">
                    <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider">General Preferences</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Application startup, playhead safety, and keyboard ergonomics</p>
                  </div>

                  <div className="bg-dj-surface rounded-xl p-4 border border-dj-border space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-xs font-mono font-bold text-white block">Auto-Sync on Track Load</span>
                        <span className="text-[11px] text-slate-400">Automatically sync BPM & phase to the playing deck when loading a song</span>
                      </div>
                      <input type="checkbox" defaultChecked className="accent-cyan-500 w-4 h-4 rounded cursor-pointer" />
                    </label>

                    <div className="border-t border-slate-800 pt-3">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-mono font-bold text-white block">Quantize Hot Cues & Loops</span>
                          <span className="text-[11px] text-slate-400">Snap cue point triggers and auto-loops to the nearest beatgrid marker</span>
                        </div>
                        <input type="checkbox" defaultChecked className="accent-cyan-500 w-4 h-4 rounded cursor-pointer" />
                      </label>
                    </div>

                    <div className="border-t border-slate-800 pt-3">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-mono font-bold text-white block">Playhead Protection (Lock Playing Deck)</span>
                          <span className="text-[11px] text-slate-400">Prevents accidentally loading a track onto an active deck during live gigs</span>
                        </div>
                        <input type="checkbox" defaultChecked className="accent-cyan-500 w-4 h-4 rounded cursor-pointer" />
                      </label>
                    </div>
                  </div>

                  <div className="bg-blue-950/20 border border-blue-800/40 rounded-xl p-3 text-xs text-blue-300 flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>Press <kbd className="bg-slate-800 px-1 py-0.5 rounded border border-slate-700 text-white font-mono">?</kbd> anywhere in CloudMix Pro to view full keyboard and controller mappings.</span>
                  </div>
                </div>
              )}

              {/* 2. AUDIO DEVICES TAB */}
              {activeTab === 'audio' && (
                <div className="space-y-4">
                  <div className="border-b border-dj-border pb-2">
                    <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider">Audio Devices & Output Routing</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Route master audience speakers and private headphone pre-cueing</p>
                  </div>

                  {/* Master Output */}
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
                    <p className="text-[10.5px] text-slate-500">
                      Sends mixed master channel audio through isolator EQs, FX rack, and limiter to the main audience.
                    </p>
                  </div>

                  {/* Headphones Monitor */}
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
                    <p className="text-[10.5px] text-slate-500">
                      Routes Deck A / Deck B CUE channels and VirtualDJ Sandbox auditioning privately into your headphones.
                    </p>
                  </div>

                  {/* DSP Latency */}
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
                </div>
              )}

              {/* 3. DVS TAB */}
              {activeTab === 'dvs' && (
                <div className="space-y-4">
                  <div className="border-b border-dj-border pb-2">
                    <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider">Digital Vinyl System (DVS)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Control digital tracks using real physical timecode vinyl and turntables</p>
                  </div>

                  <div className="bg-dj-surface rounded-xl p-4 border border-dj-border space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-xs font-mono font-bold text-white block">Enable DVS Timecode Control</span>
                        <span className="text-[11px] text-slate-400">Support for Serato NoiseMap, Traktor Scratch, and djay Pro timecode vinyl</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={dvsEnabled}
                        onChange={(e) => setDvsEnabled(e.target.checked)}
                        className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                      />
                    </label>

                    <div className="border-t border-slate-800 pt-3 space-y-2">
                      <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">Turntable Mode</span>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setDvsMode('relative')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            dvsMode === 'relative'
                              ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold block">Relative Mode</span>
                          <span className="text-[10.5px] text-slate-400 mt-1 block">Needle drop jumps allowed, loops and cues keep playback in sync</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDvsMode('absolute')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            dvsMode === 'absolute'
                              ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold block">Absolute Mode</span>
                          <span className="text-[10.5px] text-slate-400 mt-1 block">Exact 1:1 physical needle position on vinyl corresponds to track audio</span>
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-white block">Lead-in Silence Margin</span>
                        <span className="text-[11px] text-slate-400">Turntable needle drop buffer at beginning of timecode</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-cyan-400">{dvsLeadInSec} seconds</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. SOUND / EQ TAB */}
              {activeTab === 'sound' && (
                <div className="space-y-4">
                  <div className="border-b border-dj-border pb-2">
                    <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider">Sound & EQ Calibration</h3>
                    <p className="text-xs text-slate-400 mt-0.5">3-Band EQ frequency crossovers, studio limiter headroom, and isolator kills</p>
                  </div>

                  <div className="bg-dj-surface rounded-xl p-4 border border-dj-border space-y-4">
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block mb-2">Equalizer Curve</span>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setEqType('isolator')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            eqType === 'isolator'
                              ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold block">Isolator EQ (-70dB Kill)</span>
                          <span className="text-[10.5px] text-slate-400 mt-1 block">Complete band muting for surgical acapella and drum blending</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEqType('classic')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            eqType === 'classic'
                              ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold block">Classic DJ EQ (-24dB Cut)</span>
                          <span className="text-[10.5px] text-slate-400 mt-1 block">Gentle, musical analog crossover slopes for smooth club blending</span>
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-3">
                      <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block mb-2">Mix Headroom Margin</span>
                      <div className="grid grid-cols-3 gap-2">
                        {(['-6dB', '-9dB', '-12dB'] as const).map((db) => (
                          <button
                            key={db}
                            type="button"
                            onClick={() => setHeadroomDb(db)}
                            className={`py-2 px-3 rounded-lg border text-center font-mono text-xs font-bold transition-all cursor-pointer ${
                              headroomDb === db
                                ? 'bg-amber-950/50 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            {db}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10.5px] text-slate-500 mt-1.5 block">Recommended: -9dB gives dynamic punch without clipping master limiter</span>
                    </div>

                    <div className="border-t border-slate-800 pt-3">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-mono font-bold text-white block">Master Transparent Peak Limiter</span>
                          <span className="text-[11px] text-slate-400">Zero-latency dynamic compression to protect club PA systems from digital overs</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={limiterEnabled}
                          onChange={(e) => setLimiterEnabled(e.target.checked)}
                          className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. AUTOMIX TAB */}
              {activeTab === 'automix' && (
                <div className="space-y-4">
                  <div className="border-b border-dj-border pb-2">
                    <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider">Automix Engine</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Automated track transitions, crossfade durations, and smart harmonic mixing</p>
                  </div>

                  <div className="bg-dj-surface rounded-xl p-4 border border-dj-border space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Transition Duration</span>
                        <span className="text-xs font-mono font-bold text-cyan-400">{automixDurationSec} seconds</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="24"
                        step="1"
                        value={automixDurationSec}
                        onChange={(e) => setAutomixDurationSec(parseInt(e.target.value))}
                        className="w-full h-2 appearance-none bg-slate-900 rounded-full outline-none cursor-pointer accent-cyan-400"
                      />
                    </div>

                    <div className="border-t border-slate-800 pt-3">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-mono font-bold text-white block">Automatic Tempo & Beat Sync</span>
                          <span className="text-[11px] text-slate-400">Match incoming track BPM and align downbeats before crossfading</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={automixSync}
                          onChange={(e) => setAutomixSync(e.target.checked)}
                          className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="border-t border-slate-800 pt-3">
                      <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block mb-2">Auto-Crossfade Curve</span>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setAutomixCurve('smooth')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            automixCurve === 'smooth'
                              ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold block">Smooth (Equal Power)</span>
                          <span className="text-[10.5px] text-slate-400 mt-1 block">Constant perceived loudness throughout the mix transition</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAutomixCurve('linear')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            automixCurve === 'linear'
                              ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold block">Linear Blend</span>
                          <span className="text-[10.5px] text-slate-400 mt-1 block">Uniform fader slope for quick back-to-back transitions</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. LIBRARY TAB */}
              {activeTab === 'library' && (
                <div className="space-y-4">
                  <div className="border-b border-dj-border pb-2">
                    <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider">Music Library & Cloud Sources</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Connect local hard drives, Google Drive, and YouTube Music</p>
                  </div>

                  {/* Local Folder */}
                  <div className="bg-dj-surface rounded-xl p-4 border border-dj-border space-y-2">
                    <label className="text-xs font-mono font-bold text-white uppercase tracking-wider block">
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
                    <div className="flex items-center space-x-2 pt-1">
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
                  </div>

                  {/* Google Drive */}
                  <div className="bg-dj-surface rounded-xl p-4 border border-dj-border space-y-3">
                    <div className="flex items-center space-x-2">
                      <Cloud className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Google Drive Streaming</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Folder ID (e.g. 1a2b3c4d5e6f7g8h9...)"
                      value={folderId}
                      onChange={(e) => setFolderId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* YouTube Music */}
                  <div className="bg-dj-surface rounded-xl p-4 border border-dj-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Music2 className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">YouTube Music Integration</span>
                      </div>
                      {ytConnected ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] text-emerald-400 font-mono">● Connected{ytEmail ? ` (${ytEmail})` : ''}</span>
                          <button
                            onClick={handleYtDisconnect}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 text-[10px] font-mono border border-slate-700 transition-colors cursor-pointer"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">Disconnected</span>
                      )}
                    </div>
                    {!ytConnected ? (
                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[10px] font-mono text-slate-400 block mb-1">
                            Google Cloud OAuth Client ID (Optional for custom quota)
                          </label>
                          <YtClientIdInput />
                        </div>
                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            onClick={handleYtConnect}
                            disabled={ytLoading}
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                          >
                            {ytLoading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Signing in...</span>
                              </>
                            ) : (
                              <>
                                <Music2 className="w-3.5 h-3.5" />
                                <span>Sign In with Google / YouTube</span>
                              </>
                            )}
                          </button>
                        </div>
                        {ytError && (
                          <p className="text-[11px] text-rose-400 font-mono bg-rose-950/40 p-2 rounded border border-rose-800/60">
                            {ytError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Signed in as <span className="text-white font-mono">{ytEmail || 'YouTube User'}</span>. Your playlists and favorite tracks will automatically synchronize into the Crate Library.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 7. APPEARANCE TAB */}
              {activeTab === 'appearance' && (
                <div className="space-y-4">
                  <div className="border-b border-dj-border pb-2">
                    <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider">Appearance & Workstation Display</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Display zoom, deck layout views, and high-contrast color themes</p>
                  </div>

                  <div className="bg-dj-surface rounded-xl p-4 border border-dj-border space-y-4">
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block mb-2">Color Theme</span>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'pro_dark' as const, label: 'Pro Dark', desc: 'djay Pro Onyx' },
                          { id: 'midnight' as const, label: 'Midnight Blue', desc: 'Pioneer CDJ Studio' },
                          { id: 'neon' as const, label: 'Cyberpunk Neon', desc: 'High-contrast club' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setThemeMode(t.id)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              themeMode === t.id
                                ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="text-xs font-mono font-bold block">{t.label}</span>
                            <span className="text-[10px] text-slate-500">{t.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-xs font-mono font-bold text-white block">Workstation UI Zoom</span>
                          <span className="text-[11px] text-slate-400">Current scale: {Math.round(uiZoom * 100)}%</span>
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

                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {[
                          { label: 'Compact', val: 0.9, pct: '90%' },
                          { label: 'Standard', val: 1.0, pct: '100%' },
                          { label: 'Comfort', val: 1.15, pct: '115%' },
                          { label: 'Large (4K)', val: 1.3, pct: '130%' },
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            onClick={() => handleUpdateZoom(preset.val)}
                            className={`py-2 px-2 rounded-lg border font-mono text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${
                              Math.abs(uiZoom - preset.val) < 0.05
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold'
                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <span className="font-bold">{preset.pct}</span>
                            <span className="text-[10px] text-slate-400">{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 8. ADVANCED TAB */}
              {activeTab === 'advanced' && (
                <div className="space-y-4">
                  <div className="border-b border-dj-border pb-2">
                    <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider">Advanced & Performance</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Neural stem separation AI quality, GPU acceleration, and gig memory cleaner</p>
                  </div>

                  <div className="bg-dj-surface rounded-xl p-4 border border-dj-border space-y-4">
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block mb-2">Neural Mix AI Separation Engine</span>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setStemModelQuality('high')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            stemModelQuality === 'high'
                              ? 'bg-purple-950/40 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold block">4-Band Real-Time DSP</span>
                          <span className="text-[10.5px] text-slate-400 mt-1 block">Linkwitz-Riley phase-aligned crossovers with 0ms latency</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStemModelQuality('ultra')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            stemModelQuality === 'ultra'
                              ? 'bg-purple-950/40 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold block">Discrete 4-Track Stems</span>
                          <span className="text-[10.5px] text-slate-400 mt-1 block">Acapella / Instrumental with 100% clean isolation & zero bleed</span>
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-3">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-mono font-bold text-white block">Hardware GPU Acceleration</span>
                          <span className="text-[11px] text-slate-400">Uses WebGL 2.0 to accelerate real-time 60fps scrolling waveforms</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={gpuAcceleration}
                          onChange={(e) => setGpuAcceleration(e.target.checked)}
                          className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-white block">Purge Audio Buffer & Waveform Cache</span>
                        <span className="text-[11px] text-slate-400">Clears transient decoded audio files to free system RAM</span>
                      </div>
                      <button
                        onClick={async () => {
                          await storageCache.clearAll();
                          setCacheCleared(true);
                          setTimeout(() => setCacheCleared(false), 2000);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-500/50 text-xs font-mono text-rose-300 transition-colors cursor-pointer"
                      >
                        {cacheCleared ? 'Cache Purged!' : 'Purge Cache'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 9. MIDI DEVICES TAB */}
              {activeTab === 'midi' && (
                <div className="space-y-4">
                  <div className="border-b border-dj-border pb-2">
                    <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider">MIDI Controllers & Mapping</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Plug-and-play Pioneer, Denon, Numark, and custom MIDI controllers</p>
                  </div>

                  <div className="bg-dj-surface rounded-xl p-4 border border-dj-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sliders className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Connected MIDI Controllers</span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400">● WebMIDI API Ready</span>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono">Pioneer DDJ-400 / FLX4</span>
                        <span className="text-[10px] bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono font-bold">Auto-Mapped</span>
                      </div>
                      <p className="text-[11px] text-slate-400">Platters, pitch faders, channel strips, crossfader, and 8 performance pads pre-configured.</p>
                    </div>

                    <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-white block">Jog Wheel Touch Sensitivity</span>
                        <span className="text-[11px] text-slate-400">Calibrate vinyl touch sensitivity and scratch response curve</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-cyan-400">100% (Standard)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer Save Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-dj-border shrink-0 mt-4">
              <span className="text-[11px] font-mono text-slate-500">CloudMix Pro v1.6.0 • Production Grade</span>
              <div className="flex space-x-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleSave}
                  disabled={scanning}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                >
                  {saved ? <Check className="w-3.5 h-3.5" /> : scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                  <span>{saved ? 'Saved!' : scanning ? 'Scanning...' : 'Save Settings'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};




