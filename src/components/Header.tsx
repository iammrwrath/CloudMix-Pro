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
  drawerMode?: 'collapsed' | 'split' | 'expanded';
  onDrawerModeChange?: (mode: 'collapsed' | 'split' | 'expanded') => void;
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
  drawerMode = 'split',
  onDrawerModeChange,
}) => {
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [quantize, setQuantize] = useState(true);
  const [connectedMidiDevices, setConnectedMidiDevices] = useState<MidiDevice[]>([]);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(updateService.getStatus());

  useEffect(() => {
    // Scan MIDI devices
    midiControllerService.init().then(() => {
      setConnectedMidiDevices(midiControllerService.getConnectedDevices());
    });

    // Subscribe to update status
    const unsub = updateService.subscribe((status) => {
      setUpdateStatus(status);
    });
    return () => unsub();
  }, []);

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
    <header className="flex items-center justify-between h-12 px-3 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.6)] select-none z-20">
      {/* 1. Brand & Title */}
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.4)]">
          <div className="w-full h-full rounded-[6px] bg-slate-950 flex items-center justify-center">
            <Disc3 className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-1.5">
            <span className="font-black text-sm md:text-base tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-300">
              CLOUDMIX
            </span>
            <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-cyan-950/90 text-cyan-400 border border-cyan-500/50 shadow-[0_0_8px_rgba(0,240,255,0.3)]">
              PRO
            </span>
          </div>
          <span className="text-[9px] font-mono text-slate-400 hidden sm:inline">
            Next-Gen Cloud-Native DJ Workstation
          </span>
        </div>

        {/* Layout Switcher */}
        <div className="hidden md:flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-white/10 ml-2">
          <button
            onClick={() => onLayoutModeChange('horizontal')}
            title="Classic Horizontal 2-Deck Jog View"
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center space-x-1 cursor-pointer transition-all ${
              layoutMode === 'horizontal' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden xl:inline">2-DECK</span>
          </button>
          <button
            onClick={() => onLayoutModeChange('vertical')}
            title="Pro Rekordbox Stacked Vertical Waveforms (120 FPS)"
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center space-x-1 cursor-pointer transition-all ${
              layoutMode === 'vertical' && drawerMode !== 'expanded' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="w-3 h-3" />
            <span className="hidden xl:inline">STACKED</span>
          </button>
          <button
            onClick={() => onDrawerModeChange?.(drawerMode === 'expanded' ? 'split' : 'expanded')}
            title="djay Pro Expanded Library View (Press L)"
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center space-x-1 cursor-pointer transition-all ${
              drawerMode === 'expanded'
                ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3 h-3 text-indigo-400" />
            <span className="hidden xl:inline">LIBRARY</span>
          </button>
        </div>
      </div>

      {/* 2. Master BPM & Quantize Hub */}
      <div className="flex items-center space-x-2.5 bg-slate-900/90 px-3 py-1 rounded-xl border border-white/10 shadow-inner">
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">
            MASTER CLOCK
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onMasterBpmChange(Math.max(60, masterBpm - 0.5))}
              className="w-4.5 h-4.5 rounded bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 text-xs flex items-center justify-center cursor-pointer transition-colors"
            >
              -
            </button>
            <span className="font-mono font-extrabold text-sm text-white min-w-[48px] text-center tracking-tight">
              {masterBpm.toFixed(1)}
            </span>
            <button
              onClick={() => onMasterBpmChange(Math.min(220, masterBpm + 0.5))}
              className="w-4.5 h-4.5 rounded bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 text-xs flex items-center justify-center cursor-pointer transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={handleTapTempo}
          className="px-2 py-1 text-xs font-mono font-extrabold rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          TAP
        </button>

        <button
          onClick={() => setQuantize(!quantize)}
          className={`px-2 py-1 text-xs font-mono font-extrabold rounded border transition-all cursor-pointer ${
            quantize
              ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          QUANTIZE
        </button>
      </div>

      {/* 3. System Status Badges, Recording & Feature Toggles */}
      <div className="flex items-center space-x-2">
        {/* Master Mix Recording Button */}
        <button
          onClick={onToggleRecording}
          title={isRecording ? "Click to Stop & Save Mix Recording" : "Record Live Master Mix to Lossless Audio"}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-black transition-all cursor-pointer border ${
            isRecording
              ? 'bg-red-600 text-white border-red-300 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800 hover:text-red-400'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500'}`} />
          <span>{isRecording ? formatDuration(recordingDuration) : 'REC MIX'}</span>
        </button>

        {/* Automix AI Assistant Quick Toggle */}
        <button
          onClick={onToggleAutomix}
          title="Toggle Automix AI Autonomous Transition Engine"
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
            isAutomixActive
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.7)] animate-pulse'
              : 'bg-slate-900/90 hover:bg-slate-800 text-purple-400 border-slate-800'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AUTOMIX</span>
        </button>
        {/* Google Drive Status Badge */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10.5px] font-mono text-slate-300">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
          <Cloud className="w-3.5 h-3.5 text-blue-400" />
          <span>Drive:</span>
          <span className="text-emerald-400 font-bold">Online</span>
        </div>

        {/* Real-time Cloud Progression Sync Badge */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10.5px] font-mono text-slate-300">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)] animate-pulse" />
          <Wifi className="w-3.5 h-3.5 text-cyan-400" />
          <span>Sync:</span>
          <span className="text-cyan-400 font-bold">Active</span>
        </div>

        {/* MIDI Hardware Button */}
        <button
          onClick={onToggleMidiModal}
          title="Configure DJ Hardware / MIDI Mappings"
          className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-[10.5px] font-mono text-slate-200 transition-colors cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span className="max-w-[100px] truncate hidden xl:inline">{primaryMidiName}</span>
          <span className="xl:hidden">MIDI</span>
        </button>

        {/* Streamer HUD / Lyrics Overlay Button */}
        <button
          onClick={onToggleStreamerHud}
          title="Toggle StreamerBot / OBS Live Lyrics HUD"
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
            isStreamerHudOpen
              ? 'bg-purple-600 text-white border-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.7)]'
              : 'bg-slate-900/90 hover:bg-slate-800 text-purple-400 border-slate-800'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Streamer HUD</span>
        </button>

        {/* GitHub & In-App Patch Updates Widget */}
        <div className="flex items-center space-x-1">
          {updateStatus.status === 'available' ? (
            <button
              onClick={() => updateService.startDownload()}
              title="A new patch is available on GitHub! Click to download."
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-mono text-[10.5px] font-bold shadow-[0_0_12px_rgba(236,72,153,0.6)] animate-pulse cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Patch v{updateStatus.version}</span>
            </button>
          ) : updateStatus.status === 'downloading' ? (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-500/50 text-[10.5px] font-mono text-purple-200">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
              <span>Patching: {updateStatus.percent || 0}%</span>
            </div>
          ) : updateStatus.status === 'downloaded' ? (
            <button
              onClick={() => updateService.restartAndApply()}
              title="Patch downloaded. Click to restart and apply."
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10.5px] font-bold shadow-[0_0_12px_rgba(16,185,129,0.6)] cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restart & Apply</span>
            </button>
          ) : (
            <button
              onClick={() => updateService.checkForUpdates()}
              title={`CloudMix Pro v${updateStatus.version || '1.1.0'} - Click to check GitHub for patches`}
              className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-[10.5px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline">v{updateStatus.version || '1.1.0'}</span>
              {updateStatus.status === 'checking' && (
                <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin ml-0.5" />
              )}
            </button>
          )}

          {/* GitHub Repo Quick Link */}
          <a
            href="https://github.com/iammrwrath/CloudMix-Pro"
            target="_blank"
            rel="noreferrer"
            title="Open GitHub Repository (iammrwrath/CloudMix-Pro)"
            className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer hidden md:flex items-center justify-center"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Keyboard Shortcuts Help Button */}
        <button
          onClick={onToggleKeyboardModal}
          title="Keyboard Shortcuts Cheat Sheet (?)"
          className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Settings button */}
        <button
          onClick={onToggleSettingsModal}
          title="Cloud & Drive Settings"
          className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
