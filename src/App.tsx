import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DeckId,
  DeckState,
  MixerState,
  NeuralTransitionMode,
  TrackMetadata,
  WaveformData,
  LayoutMode,
  BottomDrawerTab,
  FXUnit,
  FXType,
} from './types/dj';
import { audioEngine } from './audio/AudioEngine';
import { AudioAnalyzer } from './audio/AudioAnalyzer';
import { googleDriveService } from './services/GoogleDriveService';
import { youtubeMusicService } from './services/YouTubeMusicService';
import { youtubeDeckBridge } from './services/YouTubeDeckBridge';
import { cloudProgression } from './services/CloudProgressionService';
import { midiControllerService } from './services/MidiControllerService';
import { broadcastService } from './services/BroadcastService';
import { mixRecorder } from './audio/MixRecorder';
import { samplerEngine } from './audio/SamplerEngine';
import { automixService } from './services/AutomixService';
import { storageCache } from './services/StorageCacheService';
import { Header } from './components/Header';
import { Deck } from './components/Deck';
import { Mixer } from './components/Mixer';
import { Library } from './components/Library';
import { FXRack } from './components/FXRack';
import { VerticalWaveforms } from './components/VerticalWaveforms';
import { SamplerBank } from './components/SamplerBank';
import { AutomixHud } from './components/AutomixHud';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { StreamerOverlay } from './components/StreamerOverlay';
import { MidiModal } from './components/MidiModal';
import { DjayImportModal } from './components/DjayImportModal';
import { SettingsModal } from './components/SettingsModal';
import { MiniDeckHeader } from './components/MiniDeckHeader';
import { CortexDJCoPilot } from './components/cortex/CortexDJCoPilot';
import { CortexFloatingWindow } from './components/cortex/CortexFloatingWindow';
import { MixCortexStandaloneApp } from './components/cortex/MixCortexStandaloneApp';
import { cortexMonitorService } from './services/CortexMonitorService';
import { pulseMonitorService } from './services/PulseMonitorService';
import { PatchUpdateModal } from './components/PatchUpdateModal';
import { BookOpen, SlidersHorizontal, Volume2, Bot, ChevronUp, ChevronDown, Maximize2, Minimize2, Columns, Activity, Brain } from 'lucide-react';

export const App: React.FC = () => {
  // Standalone MixCortex AI Independent App Mode
  if (
    typeof window !== 'undefined' &&
    (window.location.search.includes('view=standalone-cortex') ||
      window.location.hash.includes('standalone-cortex') ||
      window.location.search.includes('view=cortex-standalone'))
  ) {
    return <MixCortexStandaloneApp />;
  }

  // Floating Mini Companion HUD Mode
  if (
    typeof window !== 'undefined' &&
    (window.location.search.includes('view=cortex-companion') ||
      window.location.hash.includes('cortex-companion') ||
      window.location.search.includes('view=pulsedj-companion') ||
      window.location.hash.includes('pulsedj-companion'))
  ) {
    return <CortexFloatingWindow />;
  }

  const [masterBpm, setMasterBpm] = useState(126.0);

  // Deck A State
  const [deckA, setDeckA] = useState<DeckState>({
    deckId: 'A',
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1.0,
    tempoRange: 0.08,
    keyLock: true,
    musicalKey: '8A',
    pitchSemitones: 0,
    isSync: false,
    isMaster: true,
    volume: 0.9,
    trimGain: 1.0,
    eqMode: 'isolator',
    eqHigh: 0,
    eqMid: 0,
    eqLow: 0,
    eqHighKill: false,
    eqMidKill: false,
    eqLowKill: false,
    stems: {
      vocals: 1.0,
      harmonics: 1.0,
      bass: 1.0,
      drums: 1.0,
      vocalsMuted: false,
      harmonicsMuted: false,
      bassMuted: false,
      drumsMuted: false,
      vocalsSolo: false,
      harmonicsSolo: false,
      bassSolo: false,
      drumsSolo: false,
    },
    filter: 0,
    activeLoop: null,
    slipMode: false,
    sandboxMode: false,
    shadowPlayheadTime: 0,
    isScratching: false,
    selectedPadMode: 'hotcue',
    meterLevelL: 0,
    meterLevelR: 0,
    fx: {
      enabled: false,
      type: 'echo',
      wetDry: 0.5,
      beats: 0.5,
      param: 0.5,
    },
  });

  // Deck B State
  const [deckB, setDeckB] = useState<DeckState>({
    deckId: 'B',
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1.0,
    tempoRange: 0.08,
    keyLock: true,
    musicalKey: '9A',
    pitchSemitones: 0,
    isSync: false,
    isMaster: false,
    volume: 0.9,
    trimGain: 1.0,
    eqMode: 'isolator',
    eqHigh: 0,
    eqMid: 0,
    eqLow: 0,
    eqHighKill: false,
    eqMidKill: false,
    eqLowKill: false,
    stems: {
      vocals: 1.0,
      harmonics: 1.0,
      bass: 1.0,
      drums: 1.0,
      vocalsMuted: false,
      harmonicsMuted: false,
      bassMuted: false,
      drumsMuted: false,
      vocalsSolo: false,
      harmonicsSolo: false,
      bassSolo: false,
      drumsSolo: false,
    },
    filter: 0,
    activeLoop: null,
    slipMode: false,
    sandboxMode: false,
    shadowPlayheadTime: 0,
    isScratching: false,
    selectedPadMode: 'hotcue',
    meterLevelL: 0,
    meterLevelR: 0,
    fx: {
      enabled: false,
      type: 'echo',
      wetDry: 0.5,
      beats: 0.5,
      param: 0.5,
    },
  });

  // Waveform peak caches
  const [waveformDataA, setWaveformDataA] = useState<WaveformData | null>(null);
  const [waveformDataB, setWaveformDataB] = useState<WaveformData | null>(null);

  // Mixer State
  const [mixer, setMixer] = useState<MixerState>({
    crossfader: 0.0,
    crossfaderCurve: 'linear',
    neuralTransitionMode: 'standard',
    masterVolume: 0.85,
    boothVolume: 0.7,
    headphoneVolume: 0.8,
    headphoneCueA: false,
    headphoneCueB: false,
    headphoneMix: 0.5,
    masterMeterL: 0,
    masterMeterR: 0,
  });

  // Modals & UI state
  const [isMidiModalOpen, setIsMidiModalOpen] = useState(false);
  const [isStreamerHudOpen, setIsStreamerHudOpen] = useState(false);
  const [isDjayImportOpen, setIsDjayImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPatchModalOpen, setIsPatchModalOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'collapsed' | 'split' | 'expanded'>('split');
  const [libraryRefreshTrigger, setLibraryRefreshTrigger] = useState(0);

  // Pro DJ Workstation State
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('horizontal');
  const [bottomDrawerTab, setBottomDrawerTab] = useState<BottomDrawerTab>('library');
  const [isKeyboardModalOpen, setIsKeyboardModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isAutomixActive, setIsAutomixActive] = useState(false);
  const [uiZoom, setUiZoom] = useState<number>(1.0);

  const applyZoom = (factor: number) => {
    // If running inside Electron, use native webContents setZoomFactor
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.setZoomFactor) {
      try {
        const res = (window as any).desktopAPI.setZoomFactor(factor);
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch {}
      if (typeof document !== 'undefined' && document.documentElement) {
        (document.documentElement.style as any).zoom = '1.0';
      }
    } else if (typeof document !== 'undefined' && document.documentElement) {
      // Browser fallback: scale via documentElement CSS zoom
      (document.documentElement.style as any).zoom = `${factor}`;
    }
  };

  const getAutoZoom = () => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const h = typeof window !== 'undefined' ? window.innerHeight : 900;
    // Factor in device pixel ratio: on HiDPI screens (e.g. 1920x1200 @ 150% DPI scale)
    // the logical viewport is already smaller (e.g. 1280x800) but content still feels cramped.
    // Applying a tighter zoom on these screens ensures everything fits without clipping.
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    if (w <= 1040 || h <= 640) return 0.72;
    if (w <= 1280 || h <= 800) return dpr >= 1.5 ? 0.78 : 0.85;
    if (w <= 1440 || h <= 900) return dpr >= 1.5 ? 0.85 : 0.9;
    return 1.0;
  };

  // Load persisted UI Zoom and Audio Device routing preferences on startup
  useEffect(() => {
    storageCache.getSetting<number | null>('ui_zoom', null).then((savedZoom) => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
      const h = typeof window !== 'undefined' ? window.innerHeight : 900;
      if (savedZoom && typeof savedZoom === 'number' && savedZoom >= 0.7 && savedZoom <= 1.6) {
        // If on a small/HiDPI laptop screen and saved zoom is too large, adapt to optimal dense view
        if ((w <= 1280 || h <= 800) && savedZoom > 0.85) {
          const auto = getAutoZoom();
          setUiZoom(auto);
          applyZoom(auto);
          return;
        }
        setUiZoom(savedZoom);
        applyZoom(savedZoom);
      } else {
        const auto = getAutoZoom();
        setUiZoom(auto);
        applyZoom(auto);
      }
    });

    // Re-apply auto zoom on window resize (handles OS snap, resolution changes, etc.)
    const handleResize = () => {
      storageCache.getSetting<number | null>('ui_zoom', null).then((savedZoom) => {
        // Only auto-correct if user hasn't manually set a zoom above the auto threshold
        if (!savedZoom) {
          const auto = getAutoZoom();
          setUiZoom(auto);
          applyZoom(auto);
        }
      });
    };
    window.addEventListener('resize', handleResize);

    // Initialize audio output devices
    Promise.all([
      storageCache.getSetting<string>('audio_master_device_id', 'default'),
      storageCache.getSetting<string>('audio_headphone_device_id', 'default'),
      storageCache.getSetting<'interactive' | 'balanced' | 'playback'>('audio_latency_hint', 'interactive'),
    ]).then(([masterDev, hpDev, latency]) => {
      if (masterDev && masterDev !== 'default') audioEngine.setMasterOutputDevice(masterDev);
      if (hpDev && hpDev !== 'default') audioEngine.setHeadphoneOutputDevice(hpDev);
      if (latency) audioEngine.setLatencyHint(latency);
    }).catch(() => {});

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleUiZoomChange = (zoom: number) => {
    const clamped = Math.max(0.7, Math.min(1.5, Math.round(zoom * 10) / 10));
    setUiZoom(clamped);
    applyZoom(clamped);
    storageCache.setSetting('ui_zoom', clamped);
  };

  // High-Efficiency Audio Clock & Meter Loop (Decoupled & Throttled to 30 FPS)
  useEffect(() => {
    let animId: number;
    let lastUiTick = 0;
    let lastBroadcastTick = 0;

    const tick = (now: number) => {
      // Throttle React state re-renders to 30 FPS (~33.3ms) to eliminate main-thread stutter
      if (now - lastUiTick >= 33.3) {
        lastUiTick = now;

        let timeA = audioEngine.getCurrentTime('A');
        let timeB = audioEngine.getCurrentTime('B');

        // Check if Deck A or Deck B is powered by YouTubeDeckBridge
        if (youtubeDeckBridge.isYouTubeDeck('A')) {
          timeA = youtubeDeckBridge.getCurrentTime('A');
        }
        if (youtubeDeckBridge.isYouTubeDeck('B')) {
          timeB = youtubeDeckBridge.getCurrentTime('B');
        }

        const meterA = youtubeDeckBridge.isYouTubeDeck('A') && youtubeDeckBridge.isTrackPlaying('A') ? 0.75 : audioEngine.getDeckLevel('A');
        const meterB = youtubeDeckBridge.isYouTubeDeck('B') && youtubeDeckBridge.isTrackPlaying('B') ? 0.75 : audioEngine.getDeckLevel('B');
        const masterMeter = Math.max(meterA, meterB, audioEngine.getMasterLevel());

        setDeckA((prev) => {
          if (prev.currentTime === timeA && prev.meterLevelL === meterA) return prev;
          return {
            ...prev,
            currentTime: timeA,
            meterLevelL: meterA,
            meterLevelR: meterA,
          };
        });

        setDeckB((prev) => {
          if (prev.currentTime === timeB && prev.meterLevelL === meterB) return prev;
          return {
            ...prev,
            currentTime: timeB,
            meterLevelL: meterB,
            meterLevelR: meterB,
          };
        });

        setMixer((prev) => {
          if (prev.masterMeterL === masterMeter) return prev;
          return {
            ...prev,
            masterMeterL: masterMeter,
            masterMeterR: masterMeter,
          };
        });
      }

      // Throttle OBS/StreamerBot broadcast updates to 4 Hz (every 250ms)
      if (now - lastBroadcastTick >= 250) {
        lastBroadcastTick = now;
        const timeA = youtubeDeckBridge.isYouTubeDeck('A') ? youtubeDeckBridge.getCurrentTime('A') : audioEngine.getCurrentTime('A');
        const timeB = youtubeDeckBridge.isYouTubeDeck('B') ? youtubeDeckBridge.getCurrentTime('B') : audioEngine.getCurrentTime('B');
        broadcastService.update({
          elapsedSecA: timeA,
          elapsedSecB: timeB,
        });
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Provide live deck status to MixCortex AI Co-Pilot Monitor and keep OBS BroadcastService state synchronized
  useEffect(() => {
    const provider = () => ({
      deckA,
      deckB,
      crossfader: mixer.crossfader,
    });
    cortexMonitorService.setDeckStateProvider(provider);
    pulseMonitorService.setDeckStateProvider(provider);

    // Synchronize Up Next / Next Track for OBS Overlay
    const automixQueue = automixService.getQueue();
    let nextTrack: TrackMetadata | null = null;
    if (automixQueue && automixQueue.length > 0) {
      nextTrack = automixQueue[0].track;
    } else {
      // If no automix queue, use opposite deck's loaded track
      if (deckA.isPlaying && deckB.track && deckB.track.id !== deckA.track?.id) {
        nextTrack = deckB.track;
      } else if (deckB.isPlaying && deckA.track && deckA.track.id !== deckB.track?.id) {
        nextTrack = deckA.track;
      }
    }

    broadcastService.update({
      trackA: deckA.track,
      trackB: deckB.track,
      isPlayingA: deckA.isPlaying,
      isPlayingB: deckB.isPlaying,
      nextTrack,
    });
  }, [deckA, deckB, mixer.crossfader]);

  const handleToggleCortex = () => {
    if ((bottomDrawerTab === 'cortex' || bottomDrawerTab === 'pulsedj') && drawerMode !== 'collapsed') {
      setBottomDrawerTab('library');
    } else {
      setBottomDrawerTab('cortex');
      if (drawerMode === 'collapsed') setDrawerMode('split');
    }
  };

  const handlePopOutCortex = () => {
    if ((window as any).desktopAPI?.openCortexCompanion) {
      (window as any).desktopAPI.openCortexCompanion();
    } else if ((window as any).desktopAPI?.openPulseDjCompanion) {
      (window as any).desktopAPI.openPulseDjCompanion();
    } else {
      window.open('?view=cortex-companion', 'MixCortex_Companion', 'width=420,height=760');
    }
  };

  // WebMIDI Controller Binding
  useEffect(() => {
    const unsubscribe = midiControllerService.onControl((controlName, value) => {
      // Transport
      if (controlName === 'DeckA_Play' && value > 0.5) handlePlayToggle('A');
      else if (controlName === 'DeckB_Play' && value > 0.5) handlePlayToggle('B');
      else if (controlName === 'DeckA_Cue' && value > 0.5) handleCueClick('A');
      else if (controlName === 'DeckB_Cue' && value > 0.5) handleCueClick('B');
      else if (controlName === 'DeckA_Sync' && value > 0.5) handleSyncClick('A');
      else if (controlName === 'DeckB_Sync' && value > 0.5) handleSyncClick('B');

      // Faders & Mixer
      else if (controlName === 'Crossfader') handleCrossfaderChange(value * 2.0 - 1.0);
      else if (controlName === 'DeckA_Fader') handleFaderChange('A', value);
      else if (controlName === 'DeckB_Fader') handleFaderChange('B', value);
      else if (controlName === 'DeckA_Filter') handleFilterChange('A', value * 2.0 - 1.0);
      else if (controlName === 'DeckB_Filter') handleFilterChange('B', value * 2.0 - 1.0);
      else if (controlName === 'DeckA_EQ_High') handleEQChange('A', 'high', value * 2.0 - 1.0);
      else if (controlName === 'DeckA_EQ_Mid') handleEQChange('A', 'mid', value * 2.0 - 1.0);
      else if (controlName === 'DeckA_EQ_Low') handleEQChange('A', 'low', value * 2.0 - 1.0);
      else if (controlName === 'DeckB_EQ_High') handleEQChange('B', 'high', value * 2.0 - 1.0);
      else if (controlName === 'DeckB_EQ_Mid') handleEQChange('B', 'mid', value * 2.0 - 1.0);
      else if (controlName === 'DeckB_EQ_Low') handleEQChange('B', 'low', value * 2.0 - 1.0);
      else if (controlName === 'Master_Volume') handleMasterVolumeChange(value);

      // Pitch Faders
      else if (controlName === 'DeckA_Pitch') handleRateChange('A', 1.0 + (value - 0.5) * 0.16);
      else if (controlName === 'DeckB_Pitch') handleRateChange('B', 1.0 + (value - 0.5) * 0.16);

      // Jog Wheel Scratch / Nudge
      else if (controlName === 'DeckA_JogTurn') handleScratch('A', (value - 0.5) * 0.4);
      else if (controlName === 'DeckB_JogTurn') handleScratch('B', (value - 0.5) * 0.4);

      // Loop Encoder / Controls
      else if (controlName === 'DeckA_Loop_Toggle' && value > 0.5) {
        if (deckA.activeLoop) handleExitLoop('A');
        else handleSetAutoLoop('A', 4);
      } else if (controlName === 'DeckB_Loop_Toggle' && value > 0.5) {
        if (deckB.activeLoop) handleExitLoop('B');
        else handleSetAutoLoop('B', 4);
      } else if (controlName === 'DeckA_Loop_Halve' && value > 0.5) {
        handleSetAutoLoop('A', Math.max(0.25, (deckA.activeLoop?.beats || 4) / 2));
      } else if (controlName === 'DeckB_Loop_Halve' && value > 0.5) {
        handleSetAutoLoop('B', Math.max(0.25, (deckB.activeLoop?.beats || 4) / 2));
      }

      // FX Paddles
      else if (controlName === 'DeckA_FX_Paddle') handleToggleFX('A', 'echo');
      else if (controlName === 'DeckB_FX_Paddle') handleToggleFX('B', 'echo');

      // 4-Stem Neural Mix Mutes
      else if (controlName === 'DeckA_Stem_Vocals' && value > 0.5) handleStemMuteToggle('A', 'vocals');
      else if (controlName === 'DeckA_Stem_Harmonics' && value > 0.5) handleStemMuteToggle('A', 'harmonics');
      else if (controlName === 'DeckA_Stem_Bass' && value > 0.5) handleStemMuteToggle('A', 'bass');
      else if (controlName === 'DeckA_Stem_Drums' && value > 0.5) handleStemMuteToggle('A', 'drums');
      else if (controlName === 'DeckB_Stem_Vocals' && value > 0.5) handleStemMuteToggle('B', 'vocals');
      else if (controlName === 'DeckB_Stem_Harmonics' && value > 0.5) handleStemMuteToggle('B', 'harmonics');
      else if (controlName === 'DeckB_Stem_Bass' && value > 0.5) handleStemMuteToggle('B', 'bass');
      else if (controlName === 'DeckB_Stem_Drums' && value > 0.5) handleStemMuteToggle('B', 'drums');

      // Hot Cues 1-8
      else if (controlName.startsWith('DeckA_HotCue_') && value > 0.5) {
        const cueIdx = parseInt(controlName.replace('DeckA_HotCue_', '')) - 1;
        handleTriggerCue('A', cueIdx);
      } else if (controlName.startsWith('DeckB_HotCue_') && value > 0.5) {
        const cueIdx = parseInt(controlName.replace('DeckB_HotCue_', '')) - 1;
        handleTriggerCue('B', cueIdx);
      }

      // Headphone Cue PFL
      else if (controlName === 'Headphone_Cue_A' && value > 0.5) {
        setMixer((p) => ({ ...p, headphoneCueA: !p.headphoneCueA }));
      } else if (controlName === 'Headphone_Cue_B' && value > 0.5) {
        setMixer((p) => ({ ...p, headphoneCueB: !p.headphoneCueB }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [deckA, deckB]);

  // Load Track to Deck
  const handleLoadTrack = useCallback(async (deckId: DeckId, track: TrackMetadata) => {
    try {
      // 1. YouTube Music direct bridge integration: real audio via native YouTube player
      if (track.fileSource === 'youtube') {
        let vidId = '';
        if (track.id.startsWith('yt_')) {
          vidId = track.id.replace(/^yt_/, '');
        } else if (track.fileUrl && track.fileUrl.includes('v=')) {
          const match = track.fileUrl.match(/v=([a-zA-Z0-9_-]{11})/);
          if (match) vidId = match[1];
        }

        if (vidId) {
          // Pause AudioEngine source so no local audio conflicts
          audioEngine.pauseDeck(deckId);

          const duration = await youtubeDeckBridge.loadVideo(deckId, vidId);
          track.duration = duration || track.duration || 210;

          // Generate silent visual waveform buffer for deck rendering
          const silentBuffer = audioEngine.generateSilentWaveformBuffer(track.duration, track.bpm || 125);
          const wf = AudioAnalyzer.extractWaveformData(silentBuffer);
          audioEngine.loadTrackToDeck(deckId, silentBuffer);

          // Update volume multiplier on YouTube player based on current faders
          const currentVol = deckId === 'A' ? deckA.volume : deckB.volume;
          youtubeDeckBridge.setVolume(deckId, currentVol);

          if (deckId === 'A') {
            setWaveformDataA(wf);
            setDeckA((prev) => ({
              ...prev,
              track,
              currentTime: 0,
              duration: track.duration,
              isPlaying: false,
              playbackRate: 1.0,
            }));
            broadcastService.update({ trackA: track, isPlayingA: false });
          } else {
            setWaveformDataB(wf);
            setDeckB((prev) => ({
              ...prev,
              track,
              currentTime: 0,
              duration: track.duration,
              isPlaying: false,
              playbackRate: 1.0,
            }));
            broadcastService.update({ trackB: track, isPlayingB: false });
          }
          return;
        }
      }

      // Decode audio (supports Google Drive, local audio, stream)
      youtubeDeckBridge.clearDeck(deckId);
      let arrayBuffer: ArrayBuffer;
      if (
        (track.fileSource === 'local' || track.fileSource === 'djay_pro') &&
        track.fileUrl &&
        (track.fileUrl.startsWith('file:///') || (track.fileUrl.includes(':\\') || track.fileUrl.includes(':/')))
      ) {
        // Local filesystem path — use Electron IPC to read binary, bypassing fetch CORS
        const filePath = track.fileUrl.startsWith('file:///')
          ? decodeURIComponent(track.fileUrl.replace(/^file:\/\/\//, '')).replace(/\//g, '\\')
          : track.fileUrl;
        const desktopAPI = (window as any).desktopAPI;
        if (desktopAPI?.readLocalAudio) {
          arrayBuffer = await desktopAPI.readLocalAudio(filePath);
        } else {
          // In browser dev mode — try blob URL approach
          arrayBuffer = await googleDriveService.loadAudioData(track);
        }
      } else {
        arrayBuffer = await googleDriveService.loadAudioData(track);
      }
      const audioBuffer = await audioEngine.decodeAudioData(arrayBuffer);

      // Extract high-speed waveform data & auto BPM estimation if missing
      const wf = AudioAnalyzer.extractWaveformData(audioBuffer);
      if (!track.bpm || track.bpm <= 0) {
        const est = AudioAnalyzer.estimateBPM(audioBuffer);
        track.bpm = est.bpm;
      }

      audioEngine.loadTrackToDeck(deckId, audioBuffer);

      if (deckId === 'A') {
        setWaveformDataA(wf);
        setDeckA((prev) => ({
          ...prev,
          track,
          currentTime: 0,
          duration: audioBuffer.duration,
          isPlaying: false,
          playbackRate: 1.0,
        }));
        broadcastService.update({ trackA: track, isPlayingA: false });
      } else {
        setWaveformDataB(wf);
        setDeckB((prev) => ({
          ...prev,
          track,
          currentTime: 0,
          duration: audioBuffer.duration,
          isPlaying: false,
          playbackRate: 1.0,
        }));
        broadcastService.update({ trackB: track, isPlayingB: false });
      }
    } catch (err) {
      console.warn('Network audio load failed, deploying emergency offline synth groove:', err);
      try {
        const audioBuffer = audioEngine.generateOfflineGrooveBuffer(track.bpm || 126, 32);
        const wf = AudioAnalyzer.extractWaveformData(audioBuffer);
        track.bpm = track.bpm || 126.0;
        audioEngine.loadTrackToDeck(deckId, audioBuffer);

        if (deckId === 'A') {
          setWaveformDataA(wf);
          setDeckA((prev) => ({
            ...prev,
            track,
            currentTime: 0,
            duration: audioBuffer.duration,
            isPlaying: false,
            playbackRate: 1.0,
          }));
          broadcastService.update({ trackA: track, isPlayingA: false });
        } else {
          setWaveformDataB(wf);
          setDeckB((prev) => ({
            ...prev,
            track,
            currentTime: 0,
            duration: audioBuffer.duration,
            isPlaying: false,
            playbackRate: 1.0,
          }));
          broadcastService.update({ trackB: track, isPlayingB: false });
        }
      } catch (synthErr) {
        console.error('Fatal error loading track:', synthErr);
        alert('Error loading track: ' + err);
      }
    }
  }, [deckA.volume, deckB.volume]);

  // Seek Deck
  const handleSeek = (deckId: DeckId, sec: number) => {
    if (youtubeDeckBridge.isYouTubeDeck(deckId)) {
      youtubeDeckBridge.seek(deckId, sec);
    }
    audioEngine.seekDeck(deckId, sec);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, currentTime: sec }));
    else setDeckB((prev) => ({ ...prev, currentTime: sec }));
  };

  // Play / Pause Toggle
  const handlePlayToggle = (deckId: DeckId) => {
    let isPlaying: boolean;
    if (youtubeDeckBridge.isYouTubeDeck(deckId)) {
      if (youtubeDeckBridge.isTrackPlaying(deckId)) {
        youtubeDeckBridge.pause(deckId);
        isPlaying = false;
      } else {
        youtubeDeckBridge.play(deckId);
        isPlaying = true;
      }
    } else {
      isPlaying = audioEngine.togglePlayPause(deckId);
    }

    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, isPlaying }));
      broadcastService.update({ isPlayingA: isPlaying, activeDeck: 'A' });
      if (isPlaying && deckA.track) {
        automixService.addHistory({
          id: `${deckA.track.id}-${Date.now()}`,
          track: deckA.track,
          playedAt: new Date().toISOString(),
          durationSec: deckA.duration || 0,
          deckId: 'A',
        });
      }
    } else {
      setDeckB((prev) => ({ ...prev, isPlaying }));
      broadcastService.update({ isPlayingB: isPlaying, activeDeck: 'B' });
      if (isPlaying && deckB.track) {
        automixService.addHistory({
          id: `${deckB.track.id}-${Date.now()}`,
          track: deckB.track,
          playedAt: new Date().toISOString(),
          durationSec: deckB.duration || 0,
          deckId: 'B',
        });
      }
    }
  };

  // Cue Button Click
  const handleCueClick = (deckId: DeckId) => {
    const deck = deckId === 'A' ? deckA : deckB;
    if (deck.isPlaying) {
      if (youtubeDeckBridge.isYouTubeDeck(deckId)) {
        youtubeDeckBridge.pause(deckId);
        youtubeDeckBridge.seek(deckId, 0);
      }
      audioEngine.pauseDeck(deckId);
      audioEngine.seekDeck(deckId, 0);
      if (deckId === 'A') setDeckA((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
      else setDeckB((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    } else {
      if (youtubeDeckBridge.isYouTubeDeck(deckId)) {
        youtubeDeckBridge.seek(deckId, 0);
        youtubeDeckBridge.play(deckId);
      }
      audioEngine.playDeck(deckId, 0);
      if (deckId === 'A') setDeckA((prev) => ({ ...prev, isPlaying: true }));
      else setDeckB((prev) => ({ ...prev, isPlaying: true }));
    }
  };

  // Beatgrid Sync Click
  const handleSyncClick = (deckId: DeckId) => {
    const otherDeck = deckId === 'A' ? deckB : deckA;
    if (!otherDeck.track) return;

    const targetBpm = otherDeck.track.bpm * otherDeck.playbackRate;
    const thisTrackBpm = (deckId === 'A' ? deckA.track : deckB.track)?.bpm || 120;
    const newRate = targetBpm / thisTrackBpm;

    if (youtubeDeckBridge.isYouTubeDeck(deckId)) {
      youtubeDeckBridge.setPlaybackRate(deckId, newRate);
    }
    audioEngine.setPlaybackRate(deckId, newRate);
    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, playbackRate: newRate, isSync: true }));
    } else {
      setDeckB((prev) => ({ ...prev, playbackRate: newRate, isSync: true }));
    }
  };

  // Pitch Rate Change
  const handleRateChange = (deckId: DeckId, rate: number) => {
    if (youtubeDeckBridge.isYouTubeDeck(deckId)) {
      youtubeDeckBridge.setPlaybackRate(deckId, rate);
    }
    audioEngine.setPlaybackRate(deckId, rate);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, playbackRate: rate }));
    else setDeckB((prev) => ({ ...prev, playbackRate: rate }));
  };

  // Real-Time Harmonic Key Shift (Semitone Detune)
  const handleKeyShift = (deckId: DeckId, semitones: number) => {
    const targetSemitones = Math.max(-12, Math.min(12, semitones));
    audioEngine.setDeckPitchSemitones(deckId, targetSemitones);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, pitchSemitones: targetSemitones }));
    else setDeckB((prev) => ({ ...prev, pitchSemitones: targetSemitones }));
  };

  // 1-Click Harmonic Key Match / Sync
  const handleKeySync = (deckId: DeckId) => {
    const masterDeck = deckId === 'A' ? deckB : deckA;
    const targetSemitones = masterDeck.pitchSemitones || 0;
    handleKeyShift(deckId, targetSemitones);
  };

  // Nudge / Pitch Bend
  const handleNudge = (deckId: DeckId, factor: number) => {
    audioEngine.nudge(deckId, factor);
  };

  const handleReleaseNudge = (deckId: DeckId) => {
    audioEngine.releaseNudge(deckId);
  };

  const handleScratchStart = (deckId: DeckId) => {
    audioEngine.startScratch(deckId);
  };

  const handleScratch = (deckId: DeckId, deltaSec: number) => {
    audioEngine.updateScratch(deckId, deltaSec);
    const newPos = audioEngine.getCurrentTime(deckId);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, currentTime: newPos }));
    else setDeckB((prev) => ({ ...prev, currentTime: newPos }));
  };

  const handleScratchEnd = (deckId: DeckId) => {
    audioEngine.endScratch(deckId);
  };

  // Hot Cues
  const handleTriggerCue = (deckId: DeckId, cueId: number) => {
    const deck = deckId === 'A' ? deckA : deckB;
    const cue = deck.track?.hotCues.find((c) => c.id === cueId);
    if (cue) {
      audioEngine.triggerHotCue(deckId, cue, true);
      if (deckId === 'A') setDeckA((prev) => ({ ...prev, isPlaying: true, currentTime: cue.position }));
      else setDeckB((prev) => ({ ...prev, isPlaying: true, currentTime: cue.position }));
    }
  };

  const handleSetCue = (deckId: DeckId, cueId: number, position: number) => {
    const deck = deckId === 'A' ? deckA : deckB;
    if (!deck.track) return;

    const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
    const newCue = {
      id: cueId,
      position,
      color: colors[cueId % colors.length],
      label: `Cue ${cueId + 1}`,
      active: true,
    };

    cloudProgression.syncHotCue(deck.track.id, newCue);
    const updatedCues = [...(deck.track.hotCues || [])];
    const idx = updatedCues.findIndex((c) => c.id === cueId);
    if (idx >= 0) updatedCues[idx] = newCue;
    else updatedCues.push(newCue);

    const updatedTrack = { ...deck.track, hotCues: updatedCues };
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, track: updatedTrack }));
    else setDeckB((prev) => ({ ...prev, track: updatedTrack }));
  };

  const handleClearCue = (deckId: DeckId, cueId: number) => {
    const deck = deckId === 'A' ? deckA : deckB;
    if (!deck.track) return;
    const updatedCues = deck.track.hotCues.filter((c) => c.id !== cueId);
    const updatedTrack = { ...deck.track, hotCues: updatedCues };
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, track: updatedTrack }));
    else setDeckB((prev) => ({ ...prev, track: updatedTrack }));
  };

  // Auto Loops
  const handleSetAutoLoop = (deckId: DeckId, beats: number) => {
    const deck = deckId === 'A' ? deckA : deckB;
    const bpm = deck.track?.bpm || 120;
    const loopDurationSec = (60.0 / bpm) * beats;
    const start = audioEngine.getCurrentTime(deckId);
    const end = start + loopDurationSec;

    audioEngine.setLoop(deckId, start, end);
    const loopObj = { start, end, beats };
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, activeLoop: loopObj }));
    else setDeckB((prev) => ({ ...prev, activeLoop: loopObj }));
  };

  const handleExitLoop = (deckId: DeckId) => {
    audioEngine.exitLoop(deckId);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, activeLoop: null }));
    else setDeckB((prev) => ({ ...prev, activeLoop: null }));
  };

  const handleBeatJump = (deckId: DeckId, beats: number) => {
    const deck = deckId === 'A' ? deckA : deckB;
    const bpm = deck.track?.bpm || 120;
    audioEngine.beatJump(deckId, beats, bpm);
  };

  // Mixer Controls
  const handleEQChange = (deckId: 'A' | 'B', band: 'low' | 'mid' | 'high', val: number) => {
    audioEngine.setEQ(deckId, band, val);
    const key = band === 'low' ? 'eqLow' : band === 'mid' ? 'eqMid' : 'eqHigh';
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, [key]: val }));
    else setDeckB((prev) => ({ ...prev, [key]: val }));
  };

  const handleEQKillToggle = (deckId: 'A' | 'B', band: 'low' | 'mid' | 'high') => {
    const deck = deckId === 'A' ? deckA : deckB;
    const killKey = band === 'low' ? 'eqLowKill' : band === 'mid' ? 'eqMidKill' : 'eqHighKill';
    const newKill = !deck[killKey];
    audioEngine.setEQ(deckId, band, 0, newKill);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, [killKey]: newKill }));
    else setDeckB((prev) => ({ ...prev, [killKey]: newKill }));
  };

  const handleFilterChange = (deckId: 'A' | 'B', val: number) => {
    audioEngine.setFilter(deckId, val);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, filter: val }));
    else setDeckB((prev) => ({ ...prev, filter: val }));
  };

  const handleTrimChange = (deckId: 'A' | 'B', val: number) => {
    audioEngine.setTrimGain(deckId, val);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, trimGain: val }));
    else setDeckB((prev) => ({ ...prev, trimGain: val }));
  };

  const handleFaderChange = (deckId: 'A' | 'B', val: number) => {
    audioEngine.setChannelVolume(deckId, val);
    if (youtubeDeckBridge.isYouTubeDeck(deckId)) {
      // Calculate crossfader multiplier
      const xf = mixer.crossfader; // -1 (Deck A) to +1 (Deck B)
      let xfMult = 1.0;
      if (deckId === 'A') {
        xfMult = xf <= 0 ? 1.0 : Math.max(0, 1.0 - xf);
      } else {
        xfMult = xf >= 0 ? 1.0 : Math.max(0, 1.0 + xf);
      }
      youtubeDeckBridge.setVolume(deckId, val * xfMult * mixer.masterVolume);
    }
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, volume: val }));
    else setDeckB((prev) => ({ ...prev, volume: val }));
  };

  const handleCrossfaderChange = (val: number) => {
    audioEngine.setCrossfader(val, mixer.crossfaderCurve);
    setMixer((prev) => ({ ...prev, crossfader: val }));

    // Update YouTube decks volume with crossfader blend
    if (youtubeDeckBridge.isYouTubeDeck('A')) {
      const xfA = val <= 0 ? 1.0 : Math.max(0, 1.0 - val);
      youtubeDeckBridge.setVolume('A', deckA.volume * xfA * mixer.masterVolume);
    }
    if (youtubeDeckBridge.isYouTubeDeck('B')) {
      const xfB = val >= 0 ? 1.0 : Math.max(0, 1.0 + val);
      youtubeDeckBridge.setVolume('B', deckB.volume * xfB * mixer.masterVolume);
    }
  };

  const handleCrossfaderCurveChange = (curve: 'smooth' | 'linear' | 'scratch') => {
    audioEngine.setCrossfader(mixer.crossfader, curve);
    setMixer((prev) => ({ ...prev, crossfaderCurve: curve }));
  };

  const handleMasterVolumeChange = (val: number) => {
    audioEngine.setMasterVolume(val);
    setMixer((prev) => ({ ...prev, masterVolume: val }));
  };

  const handleHeadphoneVolumeChange = (val: number) => {
    audioEngine.setHeadphoneVolume(val);
    setMixer((prev) => ({ ...prev, headphoneVolume: val }));
  };

  // Stem & Neural Mix Controls
  const handleEQModeToggle = (deckId: 'A' | 'B') => {
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, eqMode: p.eqMode === 'stems' ? 'isolator' : 'stems' }));
    } else {
      setDeckB((p) => ({ ...p, eqMode: p.eqMode === 'stems' ? 'isolator' : 'stems' }));
    }
  };

  const handleStemGainChange = (deckId: 'A' | 'B', stem: 'vocals' | 'harmonics' | 'bass' | 'drums', val: number) => {
    audioEngine.setStemGain(deckId, stem, val);
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, stems: { ...p.stems, [stem]: val } }));
    } else {
      setDeckB((p) => ({ ...p, stems: { ...p.stems, [stem]: val } }));
    }
  };

  const handleStemMuteToggle = (deckId: 'A' | 'B', stem: 'vocals' | 'harmonics' | 'bass' | 'drums') => {
    const isMuted = audioEngine.toggleStemMute(deckId, stem);
    const muteKey = `${stem}Muted` as const;
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, stems: { ...p.stems, [muteKey]: isMuted } }));
    } else {
      setDeckB((p) => ({ ...p, stems: { ...p.stems, [muteKey]: isMuted } }));
    }
  };

  const handleStemSoloToggle = (deckId: 'A' | 'B', stem: 'vocals' | 'harmonics' | 'bass' | 'drums') => {
    const isSolo = audioEngine.toggleStemSolo(deckId, stem);
    const soloKey = `${stem}Solo` as const;
    if (deckId === 'A') {
      setDeckA((p) => ({
        ...p,
        stems: {
          ...p.stems,
          vocalsSolo: false,
          harmonicsSolo: false,
          bassSolo: false,
          drumsSolo: false,
          [soloKey]: isSolo,
        },
      }));
    } else {
      setDeckB((p) => ({
        ...p,
        stems: {
          ...p.stems,
          vocalsSolo: false,
          harmonicsSolo: false,
          bassSolo: false,
          drumsSolo: false,
          [soloKey]: isSolo,
        },
      }));
    }
  };

  const handleNeuralTransitionModeChange = (mode: NeuralTransitionMode) => {
    audioEngine.setNeuralTransitionMode(mode);
    setMixer((p) => ({ ...p, neuralTransitionMode: mode }));
  };

  // VirtualDJ Sandbox Audition Mode
  const handleToggleSandbox = (deckId: DeckId) => {
    const deck = deckId === 'A' ? deckA : deckB;
    const nextVal = !deck.sandboxMode;
    audioEngine.setDeckSandbox(deckId, nextVal);
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, sandboxMode: nextVal }));
    } else {
      setDeckB((p) => ({ ...p, sandboxMode: nextVal }));
    }
  };

  // Quantized Slip Mode
  const handleToggleSlip = (deckId: DeckId) => {
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, slipMode: !p.slipMode }));
    } else {
      setDeckB((p) => ({ ...p, slipMode: !p.slipMode }));
    }
  };

  // Quick Multi-FX Punch-In / Punch-Out Toggle
  const handleToggleFX = (deckId: DeckId, type: FXType) => {
    const deck = deckId === 'A' ? deckA : deckB;
    const isCurrentlyActive = deck.fx.enabled && deck.fx.type === type;
    const updatedFx: FXUnit = {
      ...deck.fx,
      type,
      enabled: !isCurrentlyActive,
    };
    if (deckId === 'A') {
      handleUpdateDeckAFX(updatedFx);
    } else {
      handleUpdateDeckBFX(updatedFx);
    }
  };

  // Studio FX Handlers
  const handleUpdateDeckAFX = (fx: FXUnit) => {
    setDeckA((p) => ({ ...p, fx }));
    audioEngine.setDeckFX('A', fx, deckA.track?.bpm || masterBpm);
  };

  const handleUpdateDeckBFX = (fx: FXUnit) => {
    setDeckB((p) => ({ ...p, fx }));
    audioEngine.setDeckFX('B', fx, deckB.track?.bpm || masterBpm);
  };

  // Master Mix Recording Handler
  useEffect(() => {
    mixRecorder.setListener((state) => {
      setIsRecording(state.isRecording);
      setRecordingDuration(state.duration);
    });
  }, []);

  const handleToggleRecording = async () => {
    if (isRecording) {
      const res = await mixRecorder.stop();
      if (res && res.blob) {
        mixRecorder.downloadRecording(res.blob);
      }
    } else {
      audioEngine.init();
      audioEngine.resumeContext();
      mixRecorder.start();
    }
  };

  // Automix AI Setup
  useEffect(() => {
    automixService.setDeckStateProvider(() => ({ deckA, deckB }));

    automixService.registerCallbacks(
      (updates) => {
        if (updates.crossfader !== undefined) {
          handleCrossfaderChange(updates.crossfader);
        }
      },
      (action, deckId) => {
        if (action === 'play') {
          audioEngine.playDeck(deckId);
          if (deckId === 'A') setDeckA((p) => ({ ...p, isPlaying: true }));
          if (deckId === 'B') setDeckB((p) => ({ ...p, isPlaying: true }));
        } else {
          audioEngine.pauseDeck(deckId);
          if (deckId === 'A') setDeckA((p) => ({ ...p, isPlaying: false }));
          if (deckId === 'B') setDeckB((p) => ({ ...p, isPlaying: false }));
        }
      },
      (deckId, track) => {
        handleLoadTrack(deckId, track);
      }
    );

    const unsub = automixService.subscribe((state) => {
      setIsAutomixActive(state.active);
    });
    return () => unsub();
  }, [deckA, deckB]);

  // Super-Responsive DJ Keyboard Shortcuts Engine
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in inputs or search bars
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Deck A Shortcuts: Q (Cue), W (Play), E (Sync), 1-4 (Hot Cues)
      if (key === 'q') {
        e.preventDefault();
        handleCueClick('A');
      } else if (key === 'w') {
        e.preventDefault();
        handlePlayToggle('A');
      } else if (key === 'e') {
        e.preventDefault();
        handleSyncClick('A');
      } else if (['1', '2', '3', '4'].includes(key)) {
        const cueId = parseInt(key) - 1;
        handleTriggerCue('A', cueId);
      }

      // Deck B Shortcuts: U (Cue), I (Play), O (Sync), 7-0 (Hot Cues)
      else if (key === 'u') {
        e.preventDefault();
        handleCueClick('B');
      } else if (key === 'i') {
        e.preventDefault();
        handlePlayToggle('B');
      } else if (key === 'o') {
        e.preventDefault();
        handleSyncClick('B');
      } else if (['7', '8', '9', '0'].includes(key)) {
        const cueId = key === '0' ? 3 : parseInt(key) - 7;
        handleTriggerCue('B', cueId);
      }

      // Sampler Soundboard: Alt + 1..8
      else if (e.altKey && ['1', '2', '3', '4', '5', '6', '7', '8'].includes(key)) {
        e.preventDefault();
        const slotIdx = parseInt(key) - 1;
        samplerEngine.triggerSlot(slotIdx);
      }

      // Crossfader Quick Snaps: Z (Deck A), X (Center), C (Deck B)
      else if (key === 'z') {
        e.preventDefault();
        handleCrossfaderChange(-1.0);
      } else if (key === 'x') {
        e.preventDefault();
        handleCrossfaderChange(0.0);
      } else if (key === 'c') {
        e.preventDefault();
        handleCrossfaderChange(1.0);
      }

      // Layout Switcher: V
      else if (key === 'v') {
        e.preventDefault();
        setLayoutMode((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
      }

      // Help / Keyboard Shortcuts Modal: ? or Shift+/
      else if (e.key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        setIsKeyboardModalOpen((prev) => !prev);
      }

      // Zoom Hotkeys: Ctrl + / Ctrl - / Ctrl 0
      else if ((e.ctrlKey || e.metaKey) && (key === '=' || key === '+')) {
        e.preventDefault();
        handleUiZoomChange(uiZoom + 0.1);
      } else if ((e.ctrlKey || e.metaKey) && key === '-') {
        e.preventDefault();
        handleUiZoomChange(uiZoom - 0.1);
      } else if ((e.ctrlKey || e.metaKey) && key === '0') {
        e.preventDefault();
        handleUiZoomChange(1.0);
      }

      // Library / Drawer Toggle: L (Toggles between djay Pro expanded library and split view)
      else if (key === 'l' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setDrawerMode((prev) => (prev === 'expanded' ? 'split' : 'expanded'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deckA, deckB, uiZoom]);

  return (
    <div
      className="flex flex-col h-screen w-screen bg-dj-bg text-slate-100 overflow-hidden select-none relative"
    >
      {/* Ambient Cyberpunk Glow Atmosphere */}
      <div className="absolute top-1/6 -left-36 w-96 h-96 rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/6 -right-36 w-96 h-96 rounded-full bg-pink-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

            {/* When in Expanded Library Mode (djay Pro Mode): show MiniDeckHeader at top! */}
      {drawerMode === 'expanded' ? (
        <MiniDeckHeader
          deckA={deckA}
          deckB={deckB}
          waveformDataA={waveformDataA}
          waveformDataB={waveformDataB}
          mixer={mixer}
          masterBpm={masterBpm}
          onPlayToggle={handlePlayToggle}
          onCueClick={handleCueClick}
          onSyncClick={handleSyncClick}
          onRateChange={handleRateChange}
          onSetAutoLoop={handleSetAutoLoop}
          onExitLoop={handleExitLoop}
          onSeek={(d, sec) => handleSeek(d, sec)}
          onCrossfaderChange={handleCrossfaderChange}
          onToggleExpandedLibrary={() => setDrawerMode('split')}
          onLoadTrack={(deckId, track) => handleLoadTrack(deckId, track)}
        />
      ) : (
        /* 1. Header Toolbar */
        <Header
          masterBpm={masterBpm}
          onMasterBpmChange={setMasterBpm}
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          onToggleRecording={handleToggleRecording}
          isAutomixActive={isAutomixActive}
          onToggleAutomix={() => automixService.toggleAutomix(deckA, deckB)}
          onToggleKeyboardModal={() => setIsKeyboardModalOpen((prev) => !prev)}
          onToggleMidiModal={() => setIsMidiModalOpen(true)}
          onToggleStreamerHud={() => setIsStreamerHudOpen((prev) => !prev)}
          onToggleSettingsModal={() => setIsSettingsOpen(true)}
          isStreamerHudOpen={isStreamerHudOpen}
          isCortexOpen={(bottomDrawerTab === 'cortex' || bottomDrawerTab === 'pulsedj') && drawerMode !== 'collapsed'}
          onToggleCortex={handleToggleCortex}
          onOpenPatchModal={() => setIsPatchModalOpen(true)}
          drawerMode={drawerMode}
          onDrawerModeChange={setDrawerMode}
          uiZoom={uiZoom}
          onUiZoomChange={handleUiZoomChange}
        />
      )}

      {/* 2. Main DJ Decks & Mixer Workspace */}
      {drawerMode !== 'expanded' && (
        <div className="flex-1 flex flex-col p-1.5 sm:p-2 space-y-1.5 sm:space-y-2 overflow-hidden relative z-10 min-h-0">
          {/* Stacked Vertical Waveforms (Rekordbox / Serato Pro mode) */}
          {layoutMode === 'vertical' && (
            <div className="w-full">
              <VerticalWaveforms
                deckA={deckA}
                deckB={deckB}
                waveformA={waveformDataA}
                waveformB={waveformDataB}
                masterBpm={masterBpm}
              />
            </div>
          )}

          <div className="flex flex-1 space-x-2 overflow-hidden justify-center">
            {/* Deck A */}
            <Deck
              deckId="A"
              deckState={deckA}
              waveformData={waveformDataA}
              onLoadTrack={(t) => handleLoadTrack('A', t)}
              onPlayToggle={() => handlePlayToggle('A')}
              onCueClick={() => handleCueClick('A')}
              onSyncClick={() => handleSyncClick('A')}
              onSeek={(sec) => handleSeek('A', sec)}
              onRateChange={(rate) => handleRateChange('A', rate)}
              onKeyLockToggle={() => setDeckA((p) => ({ ...p, keyLock: !p.keyLock }))}
              onNudge={(f) => handleNudge('A', f)}
              onReleaseNudge={() => handleReleaseNudge('A')}
              onScratch={(d) => handleScratch('A', d)}
              onScratchStart={() => handleScratchStart('A')}
              onScratchEnd={() => handleScratchEnd('A')}
              onTriggerCue={(id) => handleTriggerCue('A', id)}
              onSetCue={(id, pos) => handleSetCue('A', id, pos)}
              onClearCue={(id) => handleClearCue('A', id)}
              onSetAutoLoop={(b) => handleSetAutoLoop('A', b)}
              onExitLoop={() => handleExitLoop('A')}
              onBeatJump={(b) => handleBeatJump('A', b)}
              onStemGainChange={(stem, val) => handleStemGainChange('A', stem, val)}
              onStemMuteToggle={(stem) => handleStemMuteToggle('A', stem)}
              onStemSoloToggle={(stem) => handleStemSoloToggle('A', stem)}
              onKeyShift={(st) => handleKeyShift('A', st)}
              onKeySync={() => handleKeySync('A')}
              onToggleSlip={() => handleToggleSlip('A')}
              onToggleSandbox={() => handleToggleSandbox('A')}
              onToggleFX={(type) => handleToggleFX('A', type)}
            />

            {/* Central Pro Mixer */}
            <Mixer
              deckA={deckA}
              deckB={deckB}
              mixer={mixer}
              onEQChange={handleEQChange}
              onEQKillToggle={handleEQKillToggle}
              onFilterChange={handleFilterChange}
              onTrimChange={handleTrimChange}
              onFaderChange={handleFaderChange}
              onCrossfaderChange={handleCrossfaderChange}
              onCrossfaderCurveChange={handleCrossfaderCurveChange}
              onMasterVolumeChange={handleMasterVolumeChange}
              onHeadphoneVolumeChange={handleHeadphoneVolumeChange}
              onCueToggle={(d) => {
                const key = d === 'A' ? 'headphoneCueA' : 'headphoneCueB';
                setMixer((p) => {
                  const nextState = !p[key];
                  audioEngine.setCueActive(d, nextState);
                  return { ...p, [key]: nextState };
                });
              }}
              onEQModeToggle={handleEQModeToggle}
              onStemGainChange={handleStemGainChange}
              onStemMuteToggle={handleStemMuteToggle}
              onStemSoloToggle={handleStemSoloToggle}
              onNeuralTransitionModeChange={handleNeuralTransitionModeChange}
            />

            {/* Deck B */}
            <Deck
              deckId="B"
              deckState={deckB}
              waveformData={waveformDataB}
              onLoadTrack={(t) => handleLoadTrack('B', t)}
              onPlayToggle={() => handlePlayToggle('B')}
              onCueClick={() => handleCueClick('B')}
              onSyncClick={() => handleSyncClick('B')}
              onSeek={(sec) => handleSeek('B', sec)}
              onRateChange={(rate) => handleRateChange('B', rate)}
              onKeyLockToggle={() => setDeckB((p) => ({ ...p, keyLock: !p.keyLock }))}
              onNudge={(f) => handleNudge('B', f)}
              onReleaseNudge={() => handleReleaseNudge('B')}
              onScratch={(d) => handleScratch('B', d)}
              onScratchStart={() => handleScratchStart('B')}
              onScratchEnd={() => handleScratchEnd('B')}
              onTriggerCue={(id) => handleTriggerCue('B', id)}
              onSetCue={(id, pos) => handleSetCue('B', id, pos)}
              onClearCue={(id) => handleClearCue('B', id)}
              onSetAutoLoop={(b) => handleSetAutoLoop('B', b)}
              onExitLoop={() => handleExitLoop('B')}
              onBeatJump={(b) => handleBeatJump('B', b)}
              onStemGainChange={(stem, val) => handleStemGainChange('B', stem, val)}
              onStemMuteToggle={(stem) => handleStemMuteToggle('B', stem)}
              onStemSoloToggle={(stem) => handleStemSoloToggle('B', stem)}
              onKeyShift={(st) => handleKeyShift('B', st)}
              onKeySync={() => handleKeySync('B')}
              onToggleSlip={() => handleToggleSlip('B')}
              onToggleSandbox={() => handleToggleSandbox('B')}
              onToggleFX={(type) => handleToggleFX('B', type)}
            />
          </div>
        </div>
      )}

      {/* 3. Bottom Pro DJ Workstation Drawer */}
      <div
        className={`px-1.5 sm:px-2 pb-1.5 flex flex-col ${
          drawerMode === 'expanded'
            ? 'flex-1 h-[calc(100vh-96px)] overflow-hidden'
            : drawerMode === 'split'
            ? 'h-[min(26vh,230px)] min-h-[110px] shrink-0'
            : 'h-[42px] shrink-0 overflow-hidden'
        }`}
      >
        {/* Drawer Tab Navigation Strip */}
        <div className="flex items-center justify-between pb-1.5 px-1">
          <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => {
                setBottomDrawerTab('library');
                if (drawerMode === 'collapsed') setDrawerMode('split');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                drawerMode !== 'collapsed' && bottomDrawerTab === 'library'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>CRATE LIBRARY</span>
            </button>

            <button
              onClick={() => {
                setBottomDrawerTab('fx');
                if (drawerMode === 'collapsed') setDrawerMode('split');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                drawerMode !== 'collapsed' && bottomDrawerTab === 'fx'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>STUDIO FX</span>
            </button>

            <button
              onClick={() => {
                setBottomDrawerTab('sampler');
                if (drawerMode === 'collapsed') setDrawerMode('split');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                drawerMode !== 'collapsed' && bottomDrawerTab === 'sampler'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>8-PAD SAMPLER</span>
            </button>

            <button
              onClick={() => {
                setBottomDrawerTab('automix');
                if (drawerMode === 'collapsed') setDrawerMode('split');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                drawerMode !== 'collapsed' && bottomDrawerTab === 'automix'
                  ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-[0_0_12px_rgba(236,72,153,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AUTOMIX AI</span>
            </button>

            <button
              onClick={() => {
                setBottomDrawerTab('cortex');
                if (drawerMode === 'collapsed') setDrawerMode('split');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                drawerMode !== 'collapsed' && (bottomDrawerTab === 'cortex' || bottomDrawerTab === 'pulsedj')
                  ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-purple-300 border border-purple-500/50 shadow-[0_0_14px_rgba(168,85,247,0.4)] font-black'
                  : 'text-slate-400 hover:text-purple-300'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>MIXCORTEX AI</span>
            </button>
          </div>

          {/* 3-Tier Drawer Sizing Controls */}
          <div className="flex items-center space-x-1 bg-slate-900/80 p-0.5 rounded-lg border border-white/10 text-[11px] font-mono">
            <button
              onClick={() => setDrawerMode('collapsed')}
              title="Collapse Drawer (Full Screen Decks)"
              className={`flex items-center space-x-1 px-2 py-1 rounded cursor-pointer transition-colors ${
                drawerMode === 'collapsed' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ChevronDown className="w-3 h-3" />
              <span className="hidden sm:inline">COLLAPSE</span>
            </button>

            <button
              onClick={() => setDrawerMode('split')}
              title="Split View (Decks + 360px Drawer)"
              className={`flex items-center space-x-1 px-2 py-1 rounded cursor-pointer transition-colors ${
                drawerMode === 'split' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span className="hidden sm:inline">SPLIT</span>
            </button>

            <button
              onClick={() => setDrawerMode((prev) => (prev === 'expanded' ? 'split' : 'expanded'))}
              title="djay Pro Expanded Library Mode (Press L)"
              className={`flex items-center space-x-1 px-2.5 py-1 rounded cursor-pointer transition-colors ${
                drawerMode === 'expanded'
                  ? 'bg-indigo-600 text-white font-bold shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                  : 'text-slate-400 hover:text-cyan-400'
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>EXPAND LIBRARY</span>
            </button>
          </div>
        </div>

        {/* Tab Content Panels */}
        {drawerMode !== 'collapsed' && (
          <div className="w-full flex-1 min-h-0 h-[calc(100%-46px)] overflow-hidden flex flex-col">
            {bottomDrawerTab === 'library' && (
              <Library
                key={libraryRefreshTrigger}
                onLoadTrack={handleLoadTrack}
                onOpenDjayImport={() => setIsDjayImportOpen(true)}
                onOpenGDriveSettings={() => setIsSettingsOpen(true)}
                currentMasterKey={deckA.isPlaying ? deckA.musicalKey : deckB.musicalKey}
                onStartAutomix={() => automixService.startAutomix(deckA, deckB)}
                isExpanded={drawerMode === 'expanded'}
                onToggleExpand={() => setDrawerMode((prev) => (prev === 'expanded' ? 'split' : 'expanded'))}
              />
            )}

            {bottomDrawerTab === 'fx' && (
              <FXRack
                deckAfx={deckA.fx}
                deckBfx={deckB.fx}
                onUpdateDeckAFX={handleUpdateDeckAFX}
                onUpdateDeckBFX={handleUpdateDeckBFX}
              />
            )}

            {bottomDrawerTab === 'sampler' && <SamplerBank />}

            {bottomDrawerTab === 'automix' && <AutomixHud deckA={deckA} deckB={deckB} />}

            {(bottomDrawerTab === 'cortex' || bottomDrawerTab === 'pulsedj') && (
              <CortexDJCoPilot
                onLoadTrackToDeck={(deckId, track) => handleLoadTrack(deckId, track)}
                onPopOutWindow={handlePopOutCortex}
              />
            )}
          </div>
        )}
      </div>

      {/* 4. Modals & Overlays */}
      {isStreamerHudOpen && (
        <StreamerOverlay
          deckA={deckA}
          deckB={deckB}
          onClose={() => setIsStreamerHudOpen(false)}
        />
      )}

      {isMidiModalOpen && <MidiModal onClose={() => setIsMidiModalOpen(false)} />}

      {isDjayImportOpen && (
        <DjayImportModal
          onClose={() => setIsDjayImportOpen(false)}
          onImportSuccess={() => {
            setLibraryRefreshTrigger((p) => p + 1);
          }}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          uiZoom={uiZoom}
          onUiZoomChange={handleUiZoomChange}
        />
      )}

      {/* GitHub In-App Patch Downloader Modal */}
      {isPatchModalOpen && <PatchUpdateModal onClose={() => setIsPatchModalOpen(false)} />}

      {/* 5. Keyboard Shortcuts Reference Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isKeyboardModalOpen}
        onClose={() => setIsKeyboardModalOpen(false)}
      />
    </div>
  );
};
