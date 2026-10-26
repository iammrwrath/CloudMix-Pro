import React, { useState, useEffect } from 'react';
import {
  Disc3,
  Cloud,
  Wifi,
  Sliders,
  Tv,
  Settings,
  Sparkles,
  Activity,
  Cpu,
  GitBranch,
  RefreshCw,
  Download,
  ExternalLink,
  LayoutGrid,
  Columns,
  Bot,
  HelpCircle,
  BookOpen,
  Brain,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Minus,
  Square,
  X,
  Sun,
  Moon,
  Menu,
} from 'lucide-react';
import { midiControllerService, MidiDevice } from '../services/MidiControllerService';
import { updateService, UpdateStatus } from '../services/UpdateService';
import { LayoutMode } from '../types/dj';

interface HeaderProps {
  masterBpm: number;
  onMasterBpmChange: (bpm: number) => void;
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
  isRecording: boolean;
  recordingDuration: number;
  onToggleRecording: () => void;
  isAutomixActive: boolean;
  onToggleAutomix: () => void;
  onToggleKeyboardModal: () => void;
  onToggleMidiModal: () => void;
  onToggleStreamerHud: () => void;
  onToggleSettingsModal: () => void;
  isStreamerHudOpen: boolean;
  requestCount?: number;
  isCortexOpen?: boolean;
  onToggleCortex?: () => void;
  onOpenPatchModal?: () => void;
  drawerMode?: 'collapsed' | 'split' | 'expanded';
  onDrawerModeChange?: (mode: 'collapsed' | 'split' | 'expanded') => void;
  uiZoom?: number;
  onUiZoomChange?: (zoom: number) => void;
  themeMode?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onToggleUserGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  masterBpm,
  onMasterBpmChange,
  layoutMode,
  onLayoutModeChange,
  isRecording,
  recordingDuration,
  onToggleRecording,
  isAutomixActive,
  onToggleAutomix,
  onToggleKeyboardModal,
  onToggleMidiModal,
  onToggleStreamerHud,
  onToggleSettingsModal,
  isStreamerHudOpen,
  requestCount = 0,
  isCortexOpen = false,
  onToggleCortex,
  onOpenPatchModal,
  drawerMode = 'split',
  onDrawerModeChange,
  uiZoom = 1.0,
  onUiZoomChange,
  themeMode = 'dark',
  onToggleTheme,
  onToggleUserGuide,
}) => {
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [quantize, setQuantize] = useState(true);
  const [connectedMidiDevices, setConnectedMidiDevices] = useState<MidiDevice[]>([]);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(updateService.getStatus());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'm' || e.key === 'M') {
        setIsMenuOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  useEffect(() => {
    // Scan MIDI devices
    midiControllerService.init().then(() => {
      setConnectedMidiDevices(midiControllerService.getConnectedDevices());
    });

    // Check full screen and maximized status if desktopAPI available
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.isFullScreen) {
      (window as any).desktopAPI.isFullScreen().then((res: boolean) => {
        setIsFullScreen(Boolean(res));
      }).catch(() => {});
    }
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.isMaximized) {
      (window as any).desktopAPI.isMaximized().then((res: boolean) => {
        setIsMaximized(Boolean(res));
      }).catch(() => {});
    }

    // Subscribe to update status
    const unsub = updateService.subscribe((status) => {
      setUpdateStatus(status);
    });
    return () => unsub();
  }, []);

  const handleMinimize = () => {
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.minimizeWindow) {
      (window as any).desktopAPI.minimizeWindow();
    }
  };

  const handleMaximize = async () => {
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.maximizeWindow) {
      const res = await (window as any).desktopAPI.maximizeWindow();
      if (res && typeof res.isMaximized === 'boolean') {
        setIsMaximized(res.isMaximized);
      } else {
        setIsMaximized((prev) => !prev);
      }
    } else if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
        setIsMaximized(true);
      } else {
        document.exitFullscreen?.().catch(() => {});
        setIsMaximized(false);
      }
    }
  };

  const handleToggleFullScreen = async () => {
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.toggleFullScreen) {
      const res = await (window as any).desktopAPI.toggleFullScreen();
      if (res && typeof res.isFullScreen === 'boolean') {
        setIsFullScreen(res.isFullScreen);
      } else {
        setIsFullScreen((prev) => !prev);
      }
    } else if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
        setIsFullScreen(true);
      } else {
        document.exitFullscreen?.().catch(() => {});
        setIsFullScreen(false);
      }
    }
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.closeWindow) {
      (window as any).desktopAPI.closeWindow();
    }
  };

  const handleTapTempo = () => {
    const now = performance.now();
    const newTimes = [...tapTimes, now].slice(-4);
    setTapTimes(newTimes);

    if (newTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTimes.length; i++) {
        intervals.push(newTimes[i] - newTimes[i - 1]);
      }
      const avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round((60000 / avgIntervalMs) * 10) / 10;
      if (calculatedBpm >= 60 && calculatedBpm <= 200) {
        onMasterBpmChange(calculatedBpm);
      }
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const primaryMidiName =
    connectedMidiDevices.length > 0
      ? connectedMidiDevices[0].name
      : 'MIDI Ready (WebMIDI)';

  return (
    <header
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) handleMaximize();
      }}
      style={{ WebkitAppRegion: 'drag' } as any}
      className="flex items-center justify-between h-11 px-2 md:px-3 bg-dj-panel/95 backdrop-blur-xl border-b border-dj-border shadow-[0_4px_18px_rgba(0,0,0,0.45)] select-none z-20 shrink-0 w-full overflow-hidden gap-1.5"
    >
      {/* 1. Brand & Title + Layout Switcher + Zoom */}
      <div style={{ WebkitAppRegion: 'no-drag' } as any} className="flex items-center space-x-1.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.45)] shrink-0">
          <div className="w-full h-full rounded-[6px] bg-slate-950 flex items-center justify-center">
            <Disc3 className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
        </div>
        <div className="flex flex-col leading-none">
          <div className="flex items-center space-x-1">
            <span className="font-black text-sm md:text-[15px] tracking-tight text-white">
              CLOUDMIX
            </span>
            <span className="font-mono text-[10px] font-extrabold px-1 py-0.5 rounded bg-cyan-950/90 text-cyan-400 border border-cyan-500/50 shadow-[0_0_8px_rgba(0,240,255,0.3)] leading-none">
              PRO
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 hidden 2xl:inline mt-0.5">
            Next-Gen Cloud Workstation
          </span>
        </div>

        {/* Layout Switcher */}
        <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-white/10 ml-1">
          <button
            onClick={() => onLayoutModeChange('horizontal')}
            title="Classic Horizontal 2-Deck Jog View"
            className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold flex items-center space-x-1 cursor-pointer transition-all ${
              layoutMode === 'horizontal' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">2-DECK</span>
          </button>
          <button
            onClick={() => onLayoutModeChange('vertical')}
            title="Pro Rekordbox Stacked Vertical Waveforms (120 FPS)"
            className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold flex items-center space-x-1 cursor-pointer transition-all ${
              layoutMode === 'vertical' && drawerMode !== 'expanded' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">STACKED</span>
          </button>
          <button
            onClick={() => onDrawerModeChange?.(drawerMode === 'expanded' ? 'split' : 'expanded')}
            title="djay Pro Expanded Library View (Press L)"
            className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold flex items-center space-x-1 cursor-pointer transition-all ${
              drawerMode === 'expanded'
                ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden lg:inline">LIBRARY</span>
          </button>
        </div>

        {/* Global UI Zoom / Scale Controller */}
        {onUiZoomChange && (
          <div className="flex items-center space-x-0.5 bg-slate-900/90 px-1 py-0.5 rounded-lg border border-slate-800 shadow-sm shrink-0" title="Global UI Zoom / Display Scale (Click % to reset to Auto)">
            <button
              onClick={() => onUiZoomChange(Math.max(0.65, Math.round((uiZoom - 0.05) * 100) / 100))}
              title="Zoom Out (Ctrl -)"
              className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUiZoomChange(-1)}
              title="Click to reset to Auto-Fit Scale (Adapts to screen resolution)"
              className="px-1 py-0.5 text-[11px] font-mono font-black text-cyan-300 hover:text-cyan-200 cursor-pointer transition-colors"
            >
              {Math.round(uiZoom * 100)}%
            </button>
            <button
              onClick={() => onUiZoomChange(Math.min(1.4, Math.round((uiZoom + 0.05) * 100) / 100))}
              title="Zoom In (Ctrl +)"
              className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Master BPM & Quantize Hub */}
      <div style={{ WebkitAppRegion: 'no-drag' } as any} className="flex items-center space-x-1 bg-slate-900/90 px-2 py-0.5 rounded-xl border border-white/10 shadow-inner shrink-0">
        <div className="flex items-center space-x-1">
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider hidden xl:inline mr-0.5">
            BPM
          </span>
          <button
            onClick={() => onMasterBpmChange(Math.max(60, masterBpm - 0.5))}
            className="w-4 h-4 rounded bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 text-xs flex items-center justify-center cursor-pointer transition-colors"
          >
            -
          </button>
          <span className="font-mono font-black text-xs md:text-sm text-white min-w-[44px] text-center tracking-tight">
            {masterBpm.toFixed(1)}
          </span>
          <button
            onClick={() => onMasterBpmChange(Math.min(220, masterBpm + 0.5))}
            className="w-4 h-4 rounded bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 text-xs flex items-center justify-center cursor-pointer transition-colors"
          >
            +
          </button>
        </div>

        <button
          onClick={handleTapTempo}
          className="px-1.5 py-0.5 text-[11px] font-mono font-black rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          TAP
        </button>

        <button
          onClick={() => setQuantize(!quantize)}
          className={`px-1.5 py-0.5 text-[11px] font-mono font-black rounded border transition-all cursor-pointer ${
            quantize
              ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          QNT
        </button>
      </div>

      {/* 3. Right Toolbar: Feature Toggles + Slide-Out Menu + Pinned Window Controls */}
      <div style={{ WebkitAppRegion: 'no-drag' } as any} className="flex items-center space-x-1.5 min-w-0 justify-end">
        {/* On compact windows: Show active REC pill if recording */}
        {isRecording && (
          <button
            onClick={onToggleRecording}
            title="Stop & Save Mix Recording"
            className="flex items-center space-x-1 px-1.5 py-1 rounded-lg text-[11px] font-mono font-black transition-all cursor-pointer border shrink-0 bg-red-600 text-white border-red-300 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse"
          >
            <div className="w-2 h-2 rounded-full bg-white" />
            <span>{formatDuration(recordingDuration)}</span>
          </button>
        )}

        {/* Full toolbar icon row (Cleanly hidden on compact/split windows to prevent crowding and horizontal scrolling) */}
        <div className="hidden xl:flex items-center space-x-1 min-w-0">
          {/* Master Mix Recording Button (when not already active) */}
          {!isRecording && (
            <button
              onClick={onToggleRecording}
              title="Record Live Master Mix to Lossless Audio"
              className="flex items-center space-x-1 px-1.5 py-1 rounded-lg text-[11px] font-mono font-black transition-all cursor-pointer border shrink-0 bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800 hover:text-red-400"
            >
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>REC</span>
            </button>
          )}

          {/* Automix AI Assistant Quick Toggle */}
          <button
            onClick={onToggleAutomix}
            title="Toggle Automix AI Autonomous Transition Engine"
            className={`flex items-center space-x-1 px-1.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border shrink-0 ${
              isAutomixActive
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.7)] animate-pulse'
                : 'bg-slate-900/90 hover:bg-slate-800 text-purple-400 border-slate-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">AUTOMIX</span>
          </button>

          {/* MixCortex AI Co-Pilot Quick Toggle */}
          <button
            onClick={onToggleCortex}
            title="Toggle MixCortex AI Co-Pilot (Real-time Harmonic & Vibe Next Track Ideas)"
            className={`flex items-center space-x-1 px-1.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border shrink-0 ${
              isCortexOpen
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white border-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.8)] font-black'
                : 'bg-slate-900/90 hover:bg-slate-800 text-purple-400 border-purple-500/40 hover:border-purple-400'
            }`}
          >
            <Brain className={`w-3.5 h-3.5 ${isCortexOpen ? 'text-white animate-pulse' : 'text-purple-400 animate-pulse'}`} />
            <span className="font-extrabold tracking-wide text-[11px] hidden 2xl:inline">CORTEX</span>
          </button>

          {/* MIDI Hardware Button */}
          <button
            onClick={onToggleMidiModal}
            title={`Configure DJ Hardware / MIDI Mappings (${primaryMidiName})`}
            className="flex items-center space-x-1 px-1.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden 2xl:inline max-w-[70px] truncate">{primaryMidiName}</span>
            <span className="2xl:hidden">MIDI</span>
          </button>

          {/* Streamer HUD / Lyrics Overlay Button */}
          <button
            onClick={onToggleStreamerHud}
            title="Toggle StreamerBot / OBS Live Overlay & Requests Hub"
            className={`flex items-center space-x-1 px-1.5 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer shrink-0 ${
              isStreamerHudOpen
                ? 'bg-purple-600 text-white border-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.7)]'
                : 'bg-slate-900/90 hover:bg-slate-800 text-purple-400 border-slate-800'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>OBS</span>
            {requestCount > 0 && (
              <span className="px-1 py-0.2 rounded-full bg-pink-500 text-white text-[10px] font-mono animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.8)]">
                {requestCount}
              </span>
            )}
          </button>

          {/* Version badge & update check */}
          <button
            onClick={() => (onOpenPatchModal ? onOpenPatchModal() : updateService.checkForUpdates())}
            title={`CloudMix Pro v${updateStatus.version || '2.0.44'} - Click to check GitHub for patches`}
            className="flex items-center space-x-1 px-1.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-cyan-300 text-[11px] font-mono transition-all cursor-pointer shadow-sm group"
          >
            <Sparkles className="w-3 h-3 text-cyan-400 group-hover:rotate-12 transition-transform" />
            <span className="inline font-bold text-cyan-300">v{updateStatus.version || '2.0.44'}</span>
            {updateStatus.status === 'checking' && (
              <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin ml-0.5" />
            )}
          </button>

          {/* Persistent Light / Dark Theme Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              title={themeMode === 'dark' ? 'Switch to Studio Titanium Light Mode' : 'Switch to Cinematic Obsidian Dark Mode'}
              className={`flex items-center space-x-1 px-1.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                themeMode === 'light'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border-slate-800 hover:border-cyan-500/40'
              }`}
            >
              {themeMode === 'light' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden 2xl:inline">LIGHT</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden 2xl:inline">DARK</span>
                </>
              )}
            </button>
          )}

          {/* User Guide & Manual (F1) */}
          <button
            onClick={onToggleUserGuide}
            title="CloudMix Pro User Guide & Manual (F1)"
            className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-slate-800 transition-colors cursor-pointer flex items-center space-x-1"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono font-bold">GUIDE</span>
          </button>

          {/* Keyboard Shortcuts Help Button */}
          <button
            onClick={onToggleKeyboardModal}
            title="Keyboard Shortcuts Cheat Sheet (?)"
            className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {/* Settings button */}
          <button
            onClick={onToggleSettingsModal}
            title="Cloud & Drive Settings"
            className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dedicated Slide-Out Studio Control Center Trigger (Modular Menu) */}
        <button
          onClick={() => setIsMenuOpen((prev) => !prev)}
          title="Toggle Studio Control Center & Modular Apps Drawer (M)"
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border relative shrink-0 ${
            isMenuOpen
              ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.6)] font-black'
              : 'bg-slate-900/90 hover:bg-slate-800 text-cyan-400 hover:text-white border-cyan-500/40 hover:border-cyan-400 shadow-sm'
          }`}
        >
          <Menu className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px]">MENU</span>
          {/* Active notification indicator */}
          {(isRecording || isAutomixActive || isCortexOpen || requestCount > 0) && (
            <span className={`w-2 h-2 rounded-full absolute -top-0.5 -right-0.5 ${
              isRecording ? 'bg-rose-500 animate-ping' : 'bg-purple-500 animate-pulse'
            }`} />
          )}
        </button>

        {/* Pinned Window Controls (Always Visible, Never Clipped) */}
        <div className="flex items-center space-x-1 pl-1 ml-0.5 border-l border-white/10 shrink-0 select-none">
          {/* Fullscreen Toggle (F11) */}
          <button
            onClick={handleToggleFullScreen}
            title={isFullScreen ? 'Exit Full Screen (F11)' : 'Enter Full Screen (F11)'}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isFullScreen
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border-slate-800'
            }`}
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {typeof window !== 'undefined' && Boolean((window as any).desktopAPI) && (
            <>
              {/* Minimize Window */}
              <button
                onClick={handleMinimize}
                title="Minimize to Taskbar"
                className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              {/* Maximize / Restore Window */}
              <button
                onClick={handleMaximize}
                title={isMaximized ? 'Restore Down' : 'Maximize Window'}
                className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
              </button>

              {/* Close Application */}
              <button
                onClick={handleClose}
                title="Close CloudMix Pro"
                className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-rose-600/90 text-slate-400 hover:text-white border border-slate-800 hover:border-rose-500 transition-colors cursor-pointer group"
              >
                <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4. Slide-Out Studio Control Center Drawer (Modular Menu) */}
      {isMenuOpen && (
        <div
          style={{ WebkitAppRegion: 'no-drag' } as any}
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className={`w-80 sm:w-96 h-full shadow-2xl flex flex-col border-l animate-in slide-in-from-right duration-250 select-text overflow-hidden ${
              themeMode === 'light'
                ? 'bg-white border-slate-200 text-slate-800'
                : 'bg-slate-950/95 border-slate-800 text-slate-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
              themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-sm">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold font-sans ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    Studio Control Center
                  </h3>
                  <span className="text-[11px] font-mono text-cyan-500 font-semibold block">
                    Modular Performance & Workstation Tools
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                title="Close Menu (Esc)"
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* SECTION 1: LIVE PERFORMANCE & AI ENGINES */}
              <div className="space-y-2">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block px-1 ${
                  themeMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Live Performance & AI Engines
                </span>

                {/* Master Mix Recording Card */}
                <div className={`p-3 rounded-xl border transition-all ${
                  isRecording
                    ? 'bg-rose-500/10 border-rose-500/50 shadow-sm'
                    : themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-slate-400'}`} />
                      <div>
                        <div className={`text-xs font-bold font-sans ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          Master Mix Recording
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {isRecording ? `Recording: ${formatDuration(recordingDuration)}` : 'Ready to record (Lossless Audio)'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={onToggleRecording}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isRecording
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                          : themeMode === 'light'
                            ? 'bg-white hover:bg-slate-100 text-rose-600 border border-slate-300'
                            : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700'
                      }`}
                    >
                      {isRecording ? 'STOP' : 'RECORD'}
                    </button>
                  </div>
                </div>

                {/* Automix AI Assistant Card */}
                <div className={`p-3 rounded-xl border transition-all ${
                  isAutomixActive
                    ? 'bg-purple-500/10 border-purple-500/50 shadow-sm'
                    : themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2 rounded-lg ${isAutomixActive ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400'}`}>
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-bold font-sans ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          Automix AI Assistant
                        </div>
                        <div className="text-[11px] font-sans text-slate-500">
                          Autonomous stem-blending transitions
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={onToggleAutomix}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isAutomixActive
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                          : themeMode === 'light'
                            ? 'bg-white hover:bg-slate-100 text-purple-700 border border-slate-300'
                            : 'bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700'
                      }`}
                    >
                      {isAutomixActive ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* MixCortex AI Co-Pilot Card */}
                <div className={`p-3 rounded-xl border transition-all ${
                  isCortexOpen
                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm'
                    : themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2 rounded-lg ${isCortexOpen ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400'}`}>
                        <Brain className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-bold font-sans ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          MixCortex AI Co-Pilot
                        </div>
                        <div className="text-[11px] font-sans text-slate-500">
                          Harmonic Camelot & vibe track suggestions
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleCortex?.()}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isCortexOpen
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                          : themeMode === 'light'
                            ? 'bg-white hover:bg-slate-100 text-indigo-700 border border-slate-300'
                            : 'bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700'
                      }`}
                    >
                      {isCortexOpen ? 'PANEL ON' : 'PANEL OFF'}
                    </button>
                  </div>
                </div>

                {/* Streamer HUD & OBS Lyrics Card */}
                <div className={`p-3 rounded-xl border transition-all ${
                  isStreamerHudOpen
                    ? 'bg-fuchsia-500/10 border-fuchsia-500/50 shadow-sm'
                    : themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2 rounded-lg ${isStreamerHudOpen ? 'bg-fuchsia-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400'}`}>
                        <Tv className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-bold font-sans flex items-center space-x-1.5 ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          <span>OBS & Live Streamer Hub</span>
                          {requestCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[10px] font-mono">
                              {requestCount} req
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-sans text-slate-500">
                          Browser overlays, lyrics, & song requests
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={onToggleStreamerHud}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isStreamerHudOpen
                          ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-md'
                          : themeMode === 'light'
                            ? 'bg-white hover:bg-slate-100 text-fuchsia-700 border border-slate-300'
                            : 'bg-slate-800 hover:bg-slate-700 text-fuchsia-400 border border-slate-700'
                      }`}
                    >
                      {isStreamerHudOpen ? 'HUD ON' : 'HUD OFF'}
                    </button>
                  </div>
                </div>

                {/* MIDI Hardware Card */}
                <div className={`p-3 rounded-xl border transition-all ${
                  connectedMidiDevices.length > 0
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                    : themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2 rounded-lg ${connectedMidiDevices.length > 0 ? 'bg-amber-500 text-black shadow-sm' : 'bg-slate-800 text-slate-400'}`}>
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-bold font-sans ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          MIDI Hardware Controller
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 truncate max-w-[170px]">
                          {primaryMidiName}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onToggleMidiModal();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        themeMode === 'light'
                          ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      SETUP
                    </button>
                  </div>
                </div>

              </div>

              {/* SECTION 2: WORKSTATION & DISPLAY PREFERENCES */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block px-1 ${
                  themeMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Workstation & Display
                </span>

                {/* Theme Mode Toggle */}
                {onToggleTheme && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                  }`}>
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2 rounded-lg ${themeMode === 'light' ? 'bg-amber-500/20 text-amber-500' : 'bg-cyan-500/20 text-cyan-400'}`}>
                        {themeMode === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className={`text-xs font-bold font-sans ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          Color Theme
                        </div>
                        <div className="text-[11px] font-sans text-slate-500">
                          {themeMode === 'light' ? 'Studio Titanium Light' : 'Cinematic Obsidian Dark'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={onToggleTheme}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        themeMode === 'light'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'bg-cyan-500 text-black shadow-sm'
                      }`}
                    >
                      {themeMode === 'light' ? 'LIGHT' : 'DARK'}
                    </button>
                  </div>
                )}

                {/* UI Zoom Controller */}
                {onUiZoomChange && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                  }`}>
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                        <ZoomIn className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-bold font-sans ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          Display Zoom Scaling
                        </div>
                        <div className="text-[11px] font-sans text-slate-500">
                          Current Scale: {Math.round(uiZoom * 100)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onUiZoomChange(Math.max(0.65, Math.round((uiZoom - 0.05) * 100) / 100))}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        onClick={() => onUiZoomChange(-1)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono font-bold cursor-pointer"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => onUiZoomChange(Math.min(1.4, Math.round((uiZoom + 0.05) * 100) / 100))}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Fullscreen Mode */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                      {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className={`text-xs font-bold font-sans ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        Fullscreen Performance
                      </div>
                      <div className="text-[11px] font-sans text-slate-500">
                        {isFullScreen ? 'Currently Fullscreen (F11)' : 'Windowed Mode (F11)'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleFullScreen}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      isFullScreen
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : themeMode === 'light'
                          ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {isFullScreen ? 'EXIT' : 'ENTER'}
                  </button>
                </div>

              </div>

              {/* SECTION 3: HELP, MANUAL & UPDATES */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block px-1 ${
                  themeMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Documentation & Settings
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {/* User Guide */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onToggleUserGuide?.();
                    }}
                    className={`p-2.5 rounded-xl border flex items-center space-x-2 text-left transition-colors cursor-pointer ${
                      themeMode === 'light'
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                        : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-200'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold leading-tight">User Guide</div>
                      <span className="text-[10px] font-mono text-slate-500">Press F1</span>
                    </div>
                  </button>

                  {/* Keyboard Shortcuts */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onToggleKeyboardModal();
                    }}
                    className={`p-2.5 rounded-xl border flex items-center space-x-2 text-left transition-colors cursor-pointer ${
                      themeMode === 'light'
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                        : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-200'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold leading-tight">Shortcuts</div>
                      <span className="text-[10px] font-mono text-slate-500">Press ?</span>
                    </div>
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onToggleSettingsModal();
                    }}
                    className={`p-2.5 rounded-xl border flex items-center space-x-2 text-left transition-colors cursor-pointer ${
                      themeMode === 'light'
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                        : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-200'
                    }`}
                  >
                    <Settings className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold leading-tight">Settings</div>
                      <span className="text-[10px] font-mono text-slate-500">Drives & Audio</span>
                    </div>
                  </button>

                  {/* Updates */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (onOpenPatchModal) onOpenPatchModal();
                      else updateService.checkForUpdates();
                    }}
                    className={`p-2.5 rounded-xl border flex items-center space-x-2 text-left transition-colors cursor-pointer ${
                      themeMode === 'light'
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                        : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold leading-tight">v{updateStatus.version || '2.0.44'}</div>
                      <span className="text-[10px] font-mono text-slate-500">GitHub Updates</span>
                    </div>
                  </button>
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className={`p-3 border-t text-center text-xs font-mono text-slate-500 shrink-0 ${
              themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
            }`}>
              CloudMix Pro • Press <code className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300">Esc</code> or <code className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300">M</code> to close
            </div>

          </div>
        </div>
      )}
    </header>
  );
};
