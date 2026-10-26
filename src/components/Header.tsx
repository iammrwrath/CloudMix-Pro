import { createPortal } from 'react-dom';
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
      className="grid grid-cols-[1fr_auto_1fr] items-center h-10 px-2 sm:px-3 bg-dj-panel/95 backdrop-blur-xl border-b border-dj-border shadow-[0_2px_12px_rgba(0,0,0,0.35)] select-none z-20 shrink-0 w-full gap-2"
    >
      {/* 1. Left Zone: Brand Capsule + Workstation Views + Zoom */}
      <div style={{ WebkitAppRegion: 'no-drag' } as any} className="flex items-center space-x-1.5 justify-start min-w-0 shrink-0">
        {/* Brand Capsule */}
        <div className="h-7 px-2 rounded-lg bg-slate-900/90 border border-white/10 flex items-center space-x-1.5 shrink-0 shadow-xs">
          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-[1.5px] flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
              <Disc3 className="w-2.5 h-2.5 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
          </div>
          <span className="font-black text-xs tracking-tight text-white">CLOUDMIX</span>
          <span className="font-mono text-[9px] font-black px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 leading-none">
            PRO
          </span>
        </div>

        {/* Workstation Views Segmented Control */}
        <div className="h-7 bg-slate-900/90 rounded-lg border border-white/10 p-0.5 flex items-center shrink-0 shadow-xs">
          <button
            onClick={() => onLayoutModeChange('horizontal')}
            title="Classic Horizontal 2-Deck Jog View"
            className={`h-6 px-2 rounded-md text-[11px] font-mono flex items-center space-x-1 cursor-pointer transition-all ${
              layoutMode === 'horizontal'
                ? 'bg-cyan-500 text-black font-black shadow-xs'
                : 'text-slate-400 hover:text-white font-bold'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2-DECK</span>
          </button>
          <button
            onClick={() => onLayoutModeChange('vertical')}
            title="Pro Rekordbox Stacked Vertical Waveforms (120 FPS)"
            className={`h-6 px-2 rounded-md text-[11px] font-mono flex items-center space-x-1 cursor-pointer transition-all ${
              layoutMode === 'vertical' && drawerMode !== 'expanded'
                ? 'bg-purple-600 text-white font-black shadow-xs'
                : 'text-slate-400 hover:text-white font-bold'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">STACKED</span>
          </button>
          <button
            onClick={() => onDrawerModeChange?.(drawerMode === 'expanded' ? 'split' : 'expanded')}
            title="Expanded Crate Library View (Press L)"
            className={`h-6 px-2 rounded-md text-[11px] font-mono flex items-center space-x-1 cursor-pointer transition-all ${
              drawerMode === 'expanded'
                ? 'bg-indigo-600 text-white font-black shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                : 'text-slate-400 hover:text-white font-bold'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CRATES</span>
          </button>
        </div>

        {/* Global UI Zoom Segmented Control */}
        {onUiZoomChange && (
          <div
            className="h-7 bg-slate-900/90 rounded-lg border border-white/10 p-0.5 flex items-center space-x-0.5 shrink-0 shadow-xs"
            title="Global UI Zoom / Display Scale (Click % to reset)"
          >
            <button
              onClick={() => onUiZoomChange(Math.max(0.65, Math.round((uiZoom - 0.05) * 100) / 100))}
              title="Zoom Out (Ctrl -)"
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={() => onUiZoomChange(-1)}
              title="Reset to Auto-Fit Scale"
              className="px-1.5 h-6 rounded flex items-center justify-center font-mono text-[11px] font-black text-cyan-300 hover:text-cyan-200 hover:bg-white/10 cursor-pointer transition-colors"
            >
              {Math.round(uiZoom * 100)}%
            </button>
            <button
              onClick={() => onUiZoomChange(Math.min(1.4, Math.round((uiZoom + 0.05) * 100) / 100))}
              title="Zoom In (Ctrl +)"
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Center Zone: Master Sync, Master BPM & Quantize Engine (Dead Center) */}
      <div style={{ WebkitAppRegion: 'no-drag' } as any} className="flex items-center space-x-1.5 justify-center shrink-0">
        {/* Master BPM Capsule */}
        <div className="h-7 bg-slate-900/90 rounded-lg border border-white/10 px-2 flex items-center space-x-1.5 shrink-0 shadow-xs">
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
            BPM
          </span>
          <button
            onClick={() => onMasterBpmChange(Math.max(60, masterBpm - 0.5))}
            title="Nudge BPM Down (-0.5)"
            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black flex items-center justify-center cursor-pointer transition-colors"
          >
            -
          </button>
          <span className="font-mono font-black text-xs text-white min-w-[38px] text-center tracking-tight">
            {masterBpm.toFixed(1)}
          </span>
          <button
            onClick={() => onMasterBpmChange(Math.min(220, masterBpm + 0.5))}
            title="Nudge BPM Up (+0.5)"
            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black flex items-center justify-center cursor-pointer transition-colors"
          >
            +
          </button>
        </div>

        {/* TAP Tempo Button */}
        <button
          onClick={handleTapTempo}
          title="Tap Tempo (Calculate BPM from 4 taps)"
          className="h-7 px-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-white/10 font-mono text-[11px] font-black active:scale-95 transition-all cursor-pointer shadow-xs"
        >
          TAP
        </button>

        {/* Beat Quantize Button */}
        <button
          onClick={() => setQuantize(!quantize)}
          title={quantize ? 'Quantize Active (Snaps cue/loops to beatgrid)' : 'Quantize Off'}
          className={`h-7 px-2.5 rounded-lg font-mono text-[11px] font-black border transition-all cursor-pointer shadow-xs ${
            quantize
              ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border-white/10'
          }`}
        >
          QNT
        </button>
      </div>

      {/* 3. Right Zone: Studio Tools, Drawer Trigger & Pinned Window Controls */}
      <div style={{ WebkitAppRegion: 'no-drag' } as any} className="flex items-center space-x-1.5 justify-end min-w-0 shrink-0">
        {/* Master Mix Recording Capsule */}
        {isRecording ? (
          <button
            onClick={onToggleRecording}
            title="Mix Recording Active — Click to Stop & Save Lossless Audio"
            className="h-7 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 font-mono text-[11px] font-black shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse flex items-center space-x-1.5 shrink-0 cursor-pointer transition-all"
          >
            <div className="w-2 h-2 rounded-full bg-white shadow-xs" />
            <span>REC {formatDuration(recordingDuration)}</span>
          </button>
        ) : (
          <button
            onClick={onToggleRecording}
            title="Record Live Master Mix to Lossless Audio"
            className="h-7 px-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-rose-400 border border-white/10 font-mono text-[11px] font-bold flex items-center space-x-1.5 shrink-0 cursor-pointer transition-colors shadow-xs"
          >
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-xs" />
            <span className="hidden xl:inline">REC</span>
          </button>
        )}

        {/* Secondary Studio Fast-Toggles (Visible on widescreen displays >= 1280px) */}
        <div className="hidden xl:flex items-center space-x-1.5 shrink-0">
          {/* Automix AI Assistant */}
          <button
            onClick={onToggleAutomix}
            title="Toggle Automix AI Autonomous Transition Engine"
            className={`h-7 px-2 rounded-lg border font-mono text-[11px] font-bold flex items-center space-x-1 shrink-0 cursor-pointer transition-all shadow-xs ${
              isAutomixActive
                ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)] animate-pulse'
                : 'bg-slate-900/90 hover:bg-slate-800 text-purple-400 border-white/10'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">AUTOMIX</span>
          </button>

          {/* MixCortex AI Co-Pilot */}
          <button
            onClick={onToggleCortex}
            title="Toggle MixCortex AI Co-Pilot (Harmonic Camelot & Next Track Ideas)"
            className={`h-7 px-2 rounded-lg border font-mono text-[11px] font-bold flex items-center space-x-1 shrink-0 cursor-pointer transition-all shadow-xs ${
              isCortexOpen
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                : 'bg-slate-900/90 hover:bg-slate-800 text-indigo-400 border-white/10'
            }`}
          >
            <Brain className={`w-3.5 h-3.5 ${isCortexOpen ? 'animate-pulse' : ''}`} />
            <span className="hidden 2xl:inline">CORTEX</span>
          </button>

          {/* MIDI Hardware Controller */}
          <button
            onClick={onToggleMidiModal}
            title={`Configure DJ Hardware / MIDI Mappings (${primaryMidiName})`}
            className="h-7 px-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-white/10 font-mono text-[11px] font-bold flex items-center space-x-1 shrink-0 cursor-pointer transition-colors shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden 2xl:inline max-w-[70px] truncate">{primaryMidiName}</span>
          </button>

          {/* Streamer HUD / OBS Live Overlay */}
          <button
            onClick={onToggleStreamerHud}
            title="Toggle StreamerBot / OBS Live Overlay & Requests Hub"
            className={`h-7 px-2 rounded-lg border font-mono text-[11px] font-bold flex items-center space-x-1 shrink-0 cursor-pointer transition-all shadow-xs ${
              isStreamerHudOpen
                ? 'bg-fuchsia-600 text-white border-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.5)]'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-fuchsia-300 border-white/10'
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="hidden 2xl:inline">OBS</span>
            {requestCount > 0 && (
              <span className="px-1 py-0.2 rounded-full bg-pink-500 text-white text-[9px] font-mono font-black animate-pulse">
                {requestCount}
              </span>
            )}
          </button>

          {/* Theme Mode Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              title={themeMode === 'dark' ? 'Switch to Studio Titanium Light Mode' : 'Switch to Cinematic Obsidian Dark Mode'}
              className="h-7 px-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-white/10 font-mono text-[11px] font-bold flex items-center space-x-1 shrink-0 cursor-pointer transition-colors shadow-xs"
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
            className="h-7 px-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-white/10 font-mono text-[11px] font-bold flex items-center space-x-1 shrink-0 cursor-pointer transition-colors shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">GUIDE</span>
          </button>

          {/* Cloud & Drive Settings */}
          <button
            onClick={onToggleSettingsModal}
            title="Cloud & Drive Settings"
            className="h-7 w-7 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-xs"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Studio Control Center Slide-Out Drawer Button (MENU) */}
        <button
          onClick={() => setIsMenuOpen((prev) => !prev)}
          title="Toggle Studio Control Center & Modular Tools Drawer (Press M)"
          className={`h-7 px-2.5 rounded-lg border font-mono text-[11px] font-black flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer relative shadow-xs ${
            isMenuOpen
              ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
              : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/40 hover:border-cyan-400'
          }`}
        >
          <Menu className="w-3.5 h-3.5" />
          <span>MENU</span>
          {(isRecording || isAutomixActive || isCortexOpen || requestCount > 0) && (
            <span className={`w-2 h-2 rounded-full absolute -top-0.5 -right-0.5 ${
              isRecording ? 'bg-rose-500 animate-ping' : 'bg-purple-500 animate-pulse'
            }`} />
          )}
        </button>

        {/* Pinned Frameless Window Controls Segmented Capsule */}
        <div className="h-7 bg-slate-900/90 rounded-lg border border-white/10 p-0.5 flex items-center space-x-0.5 shrink-0 shadow-xs">
          {/* Fullscreen Toggle (F11) */}
          <button
            onClick={handleToggleFullScreen}
            title={isFullScreen ? 'Exit Full Screen (F11)' : 'Enter Full Screen (F11)'}
            className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-colors ${
              isFullScreen
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-white/10'
            }`}
          >
            {isFullScreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>

          {typeof window !== 'undefined' && Boolean((window as any).desktopAPI) && (
            <>
              {/* Minimize Window */}
              <button
                onClick={handleMinimize}
                title="Minimize to Taskbar"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>

              {/* Maximize / Restore Window */}
              <button
                onClick={handleMaximize}
                title={isMaximized ? 'Restore Down' : 'Maximize Window'}
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              >
                <Square className="w-3 h-3" />
              </button>

              {/* Close Application */}
              <button
                onClick={handleClose}
                title="Close CloudMix Pro"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 cursor-pointer transition-colors group"
              >
                <X className="w-3 h-3 group-hover:scale-110 transition-transform" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4. Slide-Out Studio Control Center Drawer (Modular Menu) */}
      {isMenuOpen && typeof document !== 'undefined' && createPortal(
        <div
          style={{ WebkitAppRegion: 'no-drag' } as any}
          className="fixed inset-0 z-[99999] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
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
                      <div className="text-xs font-bold leading-tight">v{updateStatus.version || '2.0.47'}</div>
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
        </div>,
        document.body
      )}
    </header>
  );
};
