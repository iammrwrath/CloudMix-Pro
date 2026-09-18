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
import { UniversalDjImportModal } from './components/migration/UniversalDjImportModal';
import { StreamRequestQueue, StreamSongRequest } from './components/streaming/StreamRequestQueue';
import { stemSeparatorService } from './services/StemSeparatorService';
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
  const [isStreamRequestQueueOpen, setIsStreamRequestQueueOpen] = useState(false);
  const [streamRequests, setStreamRequests] = useState<StreamSongRequest[]>([]);
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

  // Load persisted UI Zoom preference on startup
  useEffect(() => {
    storageCache.getSetting<number>('ui_zoom', 1.0).then((savedZoom) => {
      if (savedZoom && typeof savedZoom === 'number' && savedZoom >= 0.8 && savedZoom <= 1.6) {
        setUiZoom(savedZoom);
      }
    });
  }, []);

  const handleUiZoomChange = (zoom: number) => {
    const clamped = Math.max(0.8, Math.min(1.5, Math.round(zoom * 10) / 10));
    setUiZoom(clamped);
    storageCache.setSetting('ui_zoom', clamped);
  };

  const deckStateRef = useRef({ deckA, deckB, mixer });
  deckStateRef.current = { deckA, deckB, mixer };

  // High-Efficiency Audio Clock & Meter Loop (Decoupled & Throttled to ~8 FPS for UI Clocks)
  // Waveforms, JogWheels, and Vertical Waveforms run at hardware 60-144 FPS directly from WebAudio
  useEffect(() => {
    let animId: number;
    let lastUiTick = 0;
    let lastBroadcastTick = 0;

    const tick = (now: number) => {
      if (now - lastUiTick >= 125) {
        lastUiTick = now;

        const timeA = audioEngine.getCurrentTime('A');
        const timeB = audioEngine.getCurrentTime('B');
        const meterA = audioEngine.getDeckLevel('A');
        const meterB = audioEngine.getDeckLevel('B');
        const masterMeter = audioEngine.getMasterLevel();

        setDeckA((prev) => {
          if (Math.abs(prev.currentTime - timeA) < 0.05 && Math.abs(prev.meterLevelL - meterA) < 0.04) return prev;
          return {
            ...prev,
            currentTime: timeA,
            meterLevelL: meterA,
            meterLevelR: meterA,
          };
        });

        setDeckB((prev) => {
          if (Math.abs(prev.currentTime - timeB) < 0.05 && Math.abs(prev.meterLevelL - meterB) < 0.04) return prev;
          return {
            ...prev,
            currentTime: timeB,
            meterLevelL: meterB,
            meterLevelR: meterB,
          };
        });

        setMixer((prev) => {
          if (Math.abs(prev.masterMeterL - masterMeter) < 0.04) return prev;
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
        const timeA = audioEngine.getCurrentTime('A');
        const timeB = audioEngine.getCurrentTime('B');
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

  // Provide live deck status to MixCortex AI Co-Pilot Monitor via stable ref
  useEffect(() => {
    const provider = () => ({
      deckA: deckStateRef.current.deckA,
      deckB: deckStateRef.current.deckB,
      crossfader: deckStateRef.current.mixer.crossfader,
    });
    cortexMonitorService.setDeckStateProvider(provider);
    pulseMonitorService.setDeckStateProvider(provider);
  }, []);

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
        if (deckStateRef.current.deckA.activeLoop) handleExitLoop('A');
        else handleSetAutoLoop('A', 4);
      } else if (controlName === 'DeckB_Loop_Toggle' && value > 0.5) {
        if (deckStateRef.current.deckB.activeLoop) handleExitLoop('B');
        else handleSetAutoLoop('B', 4);
      } else if (controlName === 'DeckA_Loop_Halve' && value > 0.5) {
        handleSetAutoLoop('A', Math.max(0.25, (deckStateRef.current.deckA.activeLoop?.beats || 4) / 2));
      } else if (controlName === 'DeckB_Loop_Halve' && value > 0.5) {
        handleSetAutoLoop('B', Math.max(0.25, (deckStateRef.current.deckB.activeLoop?.beats || 4) / 2));
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
  }, []);

  // Load Track to Deck
  const handleLoadTrack = useCallback(async (deckId: DeckId, track: TrackMetadata) => {
    try {
      // Decode audio (supports Google Drive, YouTube Music / AuraMusic, local audio, stream)
      let arrayBuffer: ArrayBuffer;
      if (track.fileSource === 'youtube') {
        arrayBuffer = await youtubeMusicService.loadAudioData(track);
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

      // Algoriddim djay Pro / Serato grade 4-track discrete stem separation in background
      stemSeparatorService
        .separateTrack(track.id, audioBuffer)
        .then((stems) => {
          audioEngine.setDeckStems(deckId, stems);
        })
        .catch((stemErr) => {
          console.warn('Stem separation background worker notice:', stemErr);
        });

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

        stemSeparatorService
          .separateTrack(`offline-${track.id || Date.now()}`, audioBuffer)
          .then((stems) => {
            audioEngine.setDeckStems(deckId, stems);
          })
          .catch(() => {});

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
  }, []);

  // Play / Pause Toggle
  const handlePlayToggle = useCallback((deckId: DeckId) => {
    const isPlaying = audioEngine.togglePlayPause(deckId);
    if (deckId === 'A') {
      setDeckA((prev) => {
        if (isPlaying && prev.track) {
          automixService.addHistory({
            id: `${prev.track.id}-${Date.now()}`,
            track: prev.track,
            playedAt: new Date().toISOString(),
            durationSec: prev.duration || 0,
            deckId: 'A',
          });
        }
        return { ...prev, isPlaying };
      });
      broadcastService.update({ isPlayingA: isPlaying, activeDeck: 'A' });
    } else {
      setDeckB((prev) => {
        if (isPlaying && prev.track) {
          automixService.addHistory({
            id: `${prev.track.id}-${Date.now()}`,
            track: prev.track,
            playedAt: new Date().toISOString(),
            durationSec: prev.duration || 0,
            deckId: 'B',
          });
        }
        return { ...prev, isPlaying };
      });
      broadcastService.update({ isPlayingB: isPlaying, activeDeck: 'B' });
    }
  }, []);

  // Cue Button Click
  const handleCueClick = useCallback((deckId: DeckId) => {
    const isPlaying = deckId === 'A' ? deckStateRef.current.deckA.isPlaying : deckStateRef.current.deckB.isPlaying;
    if (isPlaying) {
      audioEngine.pauseDeck(deckId);
      audioEngine.seekDeck(deckId, 0);
      if (deckId === 'A') setDeckA((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
      else setDeckB((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    } else {
      audioEngine.playDeck(deckId, 0);
      if (deckId === 'A') setDeckA((prev) => ({ ...prev, isPlaying: true }));
      else setDeckB((prev) => ({ ...prev, isPlaying: true }));
    }
  }, []);

  // Beatgrid Sync Click
  const handleSyncClick = useCallback((deckId: DeckId) => {
    const otherDeck = deckId === 'A' ? deckStateRef.current.deckB : deckStateRef.current.deckA;
    if (!otherDeck.track) return;

    const targetBpm = otherDeck.track.bpm * otherDeck.playbackRate;
    const thisDeck = deckId === 'A' ? deckStateRef.current.deckA : deckStateRef.current.deckB;
    const thisTrackBpm = thisDeck.track?.bpm || 120;
    const newRate = targetBpm / thisTrackBpm;

    audioEngine.setPlaybackRate(deckId, newRate);
    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, playbackRate: newRate, isSync: true }));
    } else {
      setDeckB((prev) => ({ ...prev, playbackRate: newRate, isSync: true }));
    }
  }, []);

  // Pitch Rate Change
  const handleRateChange = useCallback((deckId: DeckId, rate: number) => {
    audioEngine.setPlaybackRate(deckId, rate);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, playbackRate: rate }));
    else setDeckB((prev) => ({ ...prev, playbackRate: rate }));
  }, []);

  // Real-Time Harmonic Key Shift (Semitone Detune)
  const handleKeyShift = useCallback((deckId: DeckId, semitones: number) => {
    const targetSemitones = Math.max(-12, Math.min(12, semitones));
    audioEngine.setDeckPitchSemitones(deckId, targetSemitones);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, pitchSemitones: targetSemitones }));
    else setDeckB((prev) => ({ ...prev, pitchSemitones: targetSemitones }));
  }, []);

  // 1-Click Harmonic Key Match / Sync
  const handleKeySync = useCallback((deckId: DeckId) => {
    const masterDeck = deckId === 'A' ? deckStateRef.current.deckB : deckStateRef.current.deckA;
    const targetSemitones = masterDeck.pitchSemitones || 0;
    handleKeyShift(deckId, targetSemitones);
  }, [handleKeyShift]);

  // Nudge / Pitch Bend
  const handleNudge = useCallback((deckId: DeckId, factor: number) => {
    audioEngine.nudge(deckId, factor);
  }, []);

  const handleReleaseNudge = useCallback((deckId: DeckId) => {
    audioEngine.releaseNudge(deckId);
  }, []);

  const handleScratch = useCallback((deckId: DeckId, deltaSec: number) => {
    const current = audioEngine.getCurrentTime(deckId);
    audioEngine.seekDeck(deckId, current + deltaSec);
  }, []);

  // Hot Cues
  const handleTriggerCue = useCallback((deckId: DeckId, cueId: number) => {
    const deck = deckId === 'A' ? deckStateRef.current.deckA : deckStateRef.current.deckB;
    const cue = deck.track?.hotCues.find((c) => c.id === cueId);
    if (cue) {
      audioEngine.triggerHotCue(deckId, cue, true);
      if (deckId === 'A') setDeckA((prev) => ({ ...prev, isPlaying: true, currentTime: cue.position }));
      else setDeckB((prev) => ({ ...prev, isPlaying: true, currentTime: cue.position }));
    }
  }, []);

  const handleSetCue = useCallback((deckId: DeckId, cueId: number, position: number) => {
    const deck = deckId === 'A' ? deckStateRef.current.deckA : deckStateRef.current.deckB;
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
  }, []);

  const handleClearCue = useCallback((deckId: DeckId, cueId: number) => {
    const deck = deckId === 'A' ? deckStateRef.current.deckA : deckStateRef.current.deckB;
    if (!deck.track) return;
    const updatedCues = deck.track.hotCues.filter((c) => c.id !== cueId);
    const updatedTrack = { ...deck.track, hotCues: updatedCues };
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, track: updatedTrack }));
    else setDeckB((prev) => ({ ...prev, track: updatedTrack }));
  }, []);

  // Auto Loops
  const handleSetAutoLoop = useCallback((deckId: DeckId, beats: number) => {
    const deck = deckId === 'A' ? deckStateRef.current.deckA : deckStateRef.current.deckB;
    const bpm = deck.track?.bpm || 120;
    const loopDurationSec = (60.0 / bpm) * beats;
    const start = audioEngine.getCurrentTime(deckId);
    const end = start + loopDurationSec;

    audioEngine.setLoop(deckId, start, end);
    const loopObj = { start, end, beats };
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, activeLoop: loopObj }));
    else setDeckB((prev) => ({ ...prev, activeLoop: loopObj }));
  }, []);

  const handleExitLoop = useCallback((deckId: DeckId) => {
    audioEngine.exitLoop(deckId);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, activeLoop: null }));
    else setDeckB((prev) => ({ ...prev, activeLoop: null }));
  }, []);

  const handleBeatJump = useCallback((deckId: DeckId, beats: number) => {
    const deck = deckId === 'A' ? deckStateRef.current.deckA : deckStateRef.current.deckB;
    const bpm = deck.track?.bpm || 120;
    audioEngine.beatJump(deckId, beats, bpm);
  }, []);

  // Mixer Controls
  const handleEQChange = useCallback((deckId: 'A' | 'B', band: 'low' | 'mid' | 'high', val: number) => {
    audioEngine.setEQ(deckId, band, val);
    const key = band === 'low' ? 'eqLow' : band === 'mid' ? 'eqMid' : 'eqHigh';
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, [key]: val }));
    else setDeckB((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleEQKillToggle = useCallback((deckId: 'A' | 'B', band: 'low' | 'mid' | 'high') => {
    const deck = deckId === 'A' ? deckStateRef.current.deckA : deckStateRef.current.deckB;
    const killKey = band === 'low' ? 'eqLowKill' : band === 'mid' ? 'eqMidKill' : 'eqHighKill';
    const newKill = !deck[killKey];
    audioEngine.setEQ(deckId, band, 0, newKill);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, [killKey]: newKill }));
    else setDeckB((prev) => ({ ...prev, [killKey]: newKill }));
  }, []);

  const handleFilterChange = useCallback((deckId: 'A' | 'B', val: number) => {
    audioEngine.setFilter(deckId, val);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, filter: val }));
    else setDeckB((prev) => ({ ...prev, filter: val }));
  }, []);

  const handleTrimChange = useCallback((deckId: 'A' | 'B', val: number) => {
    audioEngine.setTrimGain(deckId, val);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, trimGain: val }));
    else setDeckB((prev) => ({ ...prev, trimGain: val }));
  }, []);

  const handleFaderChange = useCallback((deckId: 'A' | 'B', val: number) => {
    audioEngine.setChannelVolume(deckId, val);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, volume: val }));
    else setDeckB((prev) => ({ ...prev, volume: val }));
  }, []);

  const handleCrossfaderChange = useCallback((val: number) => {
    audioEngine.setCrossfader(val, deckStateRef.current.mixer.crossfaderCurve);
    setMixer((prev) => ({ ...prev, crossfader: val }));
  }, []);

  const handleCrossfaderCurveChange = useCallback((curve: 'smooth' | 'linear' | 'scratch') => {
    audioEngine.setCrossfader(deckStateRef.current.mixer.crossfader, curve);
    setMixer((prev) => ({ ...prev, crossfaderCurve: curve }));
  }, []);

  const handleMasterVolumeChange = useCallback((val: number) => {
    audioEngine.setMasterVolume(val);
    setMixer((prev) => ({ ...prev, masterVolume: val }));
  }, []);

  // Stem & Neural Mix Controls
  const handleEQModeToggle = useCallback((deckId: 'A' | 'B') => {
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, eqMode: p.eqMode === 'stems' ? 'isolator' : 'stems' }));
    } else {
      setDeckB((p) => ({ ...p, eqMode: p.eqMode === 'stems' ? 'isolator' : 'stems' }));
    }
  }, []);

  const handleStemGainChange = useCallback((deckId: 'A' | 'B', stem: 'vocals' | 'harmonics' | 'bass' | 'drums', val: number) => {
    audioEngine.setStemGain(deckId, stem, val);
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, stems: { ...p.stems, [stem]: val } }));
    } else {
      setDeckB((p) => ({ ...p, stems: { ...p.stems, [stem]: val } }));
    }
  }, []);

  const handleStemMuteToggle = useCallback((deckId: 'A' | 'B', stem: 'vocals' | 'harmonics' | 'bass' | 'drums') => {
    const isMuted = audioEngine.toggleStemMute(deckId, stem);
    const muteKey = `${stem}Muted` as const;
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, stems: { ...p.stems, [muteKey]: isMuted } }));
    } else {
      setDeckB((p) => ({ ...p, stems: { ...p.stems, [muteKey]: isMuted } }));
    }
  }, []);

  const handleStemSoloToggle = useCallback((deckId: 'A' | 'B', stem: 'vocals' | 'harmonics' | 'bass' | 'drums') => {
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
  }, []);

  // Algoriddim djay Pro Grade Neural Mix Quick Isolations (100% pure isolation, 0% bleed)
  const handleIsolateAcapella = useCallback((deckId: DeckId) => {
    audioEngine.isolateAcapella(deckId);
    const updateStems = {
      vocals: 1.0,
      harmonics: 0.0,
      bass: 0.0,
      drums: 0.0,
      vocalsMuted: false,
      harmonicsMuted: true,
      bassMuted: true,
      drumsMuted: true,
      vocalsSolo: true,
      harmonicsSolo: false,
      bassSolo: false,
      drumsSolo: false,
    };
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, stems: updateStems }));
    } else {
      setDeckB((p) => ({ ...p, stems: updateStems }));
    }
  }, []);

  const handleIsolateInstrumental = useCallback((deckId: DeckId) => {
    audioEngine.isolateInstrumental(deckId);
    const updateStems = {
      vocals: 0.0,
      harmonics: 1.0,
      bass: 1.0,
      drums: 1.0,
      vocalsMuted: true,
      harmonicsMuted: false,
      bassMuted: false,
      drumsMuted: false,
      vocalsSolo: false,
      harmonicsSolo: false,
      bassSolo: false,
      drumsSolo: false,
    };
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, stems: updateStems }));
    } else {
      setDeckB((p) => ({ ...p, stems: updateStems }));
    }
  }, []);

  const handleResetStems = useCallback((deckId: DeckId) => {
    audioEngine.resetStems(deckId);
    const updateStems = {
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
    };
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, stems: updateStems }));
    } else {
      setDeckB((p) => ({ ...p, stems: updateStems }));
    }
  }, []);

  const handleNeuralTransitionModeChange = useCallback((mode: NeuralTransitionMode) => {
    audioEngine.setNeuralTransitionMode(mode);
    setMixer((p) => ({ ...p, neuralTransitionMode: mode }));
  }, []);

  // VirtualDJ Sandbox Audition Mode
  const handleToggleSandbox = useCallback((deckId: DeckId) => {
    const deck = deckId === 'A' ? deckStateRef.current.deckA : deckStateRef.current.deckB;
    const nextVal = !deck.sandboxMode;
    audioEngine.setDeckSandbox(deckId, nextVal);
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, sandboxMode: nextVal }));
    } else {
      setDeckB((p) => ({ ...p, sandboxMode: nextVal }));
    }
  }, []);

  // Quantized Slip Mode
  const handleToggleSlip = useCallback((deckId: DeckId) => {
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, slipMode: !p.slipMode }));
    } else {
      setDeckB((p) => ({ ...p, slipMode: !p.slipMode }));
    }
  }, []);

  // Studio FX Handlers
  const handleUpdateDeckAFX = useCallback((fx: FXUnit) => {
    setDeckA((p) => ({ ...p, fx }));
    audioEngine.setDeckFX('A', fx, deckStateRef.current.deckA.track?.bpm || masterBpm);
  }, [masterBpm]);

  const handleUpdateDeckBFX = useCallback((fx: FXUnit) => {
    setDeckB((p) => ({ ...p, fx }));
    audioEngine.setDeckFX('B', fx, deckStateRef.current.deckB.track?.bpm || masterBpm);
  }, [masterBpm]);

  // Quick Multi-FX Punch-In / Punch-Out Toggle
  const handleToggleFX = useCallback((deckId: DeckId, type: FXType) => {
    const deck = deckId === 'A' ? deckStateRef.current.deckA : deckStateRef.current.deckB;
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
  }, [handleUpdateDeckAFX, handleUpdateDeckBFX]);

  // Dedicated stable callbacks for Deck A & B to ensure React.memo effectiveness
  const handleLoadTrackA = useCallback((t: TrackMetadata) => handleLoadTrack('A', t), [handleLoadTrack]);
  const handleLoadTrackB = useCallback((t: TrackMetadata) => handleLoadTrack('B', t), [handleLoadTrack]);
  const handlePlayToggleA = useCallback(() => handlePlayToggle('A'), [handlePlayToggle]);
  const handlePlayToggleB = useCallback(() => handlePlayToggle('B'), [handlePlayToggle]);
  const handleCueClickA = useCallback(() => handleCueClick('A'), [handleCueClick]);
  const handleCueClickB = useCallback(() => handleCueClick('B'), [handleCueClick]);
  const handleSyncClickA = useCallback(() => handleSyncClick('A'), [handleSyncClick]);
  const handleSyncClickB = useCallback(() => handleSyncClick('B'), [handleSyncClick]);
  const handleSeekA = useCallback((sec: number) => audioEngine.seekDeck('A', sec), []);
  const handleSeekB = useCallback((sec: number) => audioEngine.seekDeck('B', sec), []);
  const handleRateChangeA = useCallback((rate: number) => handleRateChange('A', rate), [handleRateChange]);
  const handleRateChangeB = useCallback((rate: number) => handleRateChange('B', rate), [handleRateChange]);
  const handleKeyLockToggleA = useCallback(() => setDeckA((p) => ({ ...p, keyLock: !p.keyLock })), []);
  const handleKeyLockToggleB = useCallback(() => setDeckB((p) => ({ ...p, keyLock: !p.keyLock })), []);
  const handleNudgeA = useCallback((f: number) => handleNudge('A', f), [handleNudge]);
  const handleNudgeB = useCallback((f: number) => handleNudge('B', f), [handleNudge]);
  const handleReleaseNudgeA = useCallback(() => handleReleaseNudge('A'), [handleReleaseNudge]);
  const handleReleaseNudgeB = useCallback(() => handleReleaseNudge('B'), [handleReleaseNudge]);
  const handleScratchA = useCallback((d: number) => handleScratch('A', d), [handleScratch]);
  const handleScratchB = useCallback((d: number) => handleScratch('B', d), [handleScratch]);
  const handleTriggerCueA = useCallback((id: number) => handleTriggerCue('A', id), [handleTriggerCue]);
  const handleTriggerCueB = useCallback((id: number) => handleTriggerCue('B', id), [handleTriggerCue]);
  const handleSetCueA = useCallback((id: number, pos: number) => handleSetCue('A', id, pos), [handleSetCue]);
  const handleSetCueB = useCallback((id: number, pos: number) => handleSetCue('B', id, pos), [handleSetCue]);
  const handleClearCueA = useCallback((id: number) => handleClearCue('A', id), [handleClearCue]);
  const handleClearCueB = useCallback((id: number) => handleClearCue('B', id), [handleClearCue]);
  const handleSetAutoLoopA = useCallback((b: number) => handleSetAutoLoop('A', b), [handleSetAutoLoop]);
  const handleSetAutoLoopB = useCallback((b: number) => handleSetAutoLoop('B', b), [handleSetAutoLoop]);
  const handleExitLoopA = useCallback(() => handleExitLoop('A'), [handleExitLoop]);
  const handleExitLoopB = useCallback(() => handleExitLoop('B'), [handleExitLoop]);
  const handleBeatJumpA = useCallback((b: number) => handleBeatJump('A', b), [handleBeatJump]);
  const handleBeatJumpB = useCallback((b: number) => handleBeatJump('B', b), [handleBeatJump]);
  const handleStemGainChangeA = useCallback((stem: 'vocals' | 'harmonics' | 'bass' | 'drums', val: number) => handleStemGainChange('A', stem, val), [handleStemGainChange]);
  const handleStemGainChangeB = useCallback((stem: 'vocals' | 'harmonics' | 'bass' | 'drums', val: number) => handleStemGainChange('B', stem, val), [handleStemGainChange]);
  const handleStemMuteToggleA = useCallback((stem: 'vocals' | 'harmonics' | 'bass' | 'drums') => handleStemMuteToggle('A', stem), [handleStemMuteToggle]);
  const handleStemMuteToggleB = useCallback((stem: 'vocals' | 'harmonics' | 'bass' | 'drums') => handleStemMuteToggle('B', stem), [handleStemMuteToggle]);
  const handleStemSoloToggleA = useCallback((stem: 'vocals' | 'harmonics' | 'bass' | 'drums') => handleStemSoloToggle('A', stem), [handleStemSoloToggle]);
  const handleStemSoloToggleB = useCallback((stem: 'vocals' | 'harmonics' | 'bass' | 'drums') => handleStemSoloToggle('B', stem), [handleStemSoloToggle]);
  const handleIsolateAcapellaA = useCallback(() => handleIsolateAcapella('A'), [handleIsolateAcapella]);
  const handleIsolateAcapellaB = useCallback(() => handleIsolateAcapella('B'), [handleIsolateAcapella]);
  const handleIsolateInstrumentalA = useCallback(() => handleIsolateInstrumental('A'), [handleIsolateInstrumental]);
  const handleIsolateInstrumentalB = useCallback(() => handleIsolateInstrumental('B'), [handleIsolateInstrumental]);
  const handleResetStemsA = useCallback(() => handleResetStems('A'), [handleResetStems]);
  const handleResetStemsB = useCallback(() => handleResetStems('B'), [handleResetStems]);
  const handleKeyShiftA = useCallback((st: number) => handleKeyShift('A', st), [handleKeyShift]);
  const handleKeyShiftB = useCallback((st: number) => handleKeyShift('B', st), [handleKeyShift]);
  const handleKeySyncA = useCallback(() => handleKeySync('A'), [handleKeySync]);
  const handleKeySyncB = useCallback(() => handleKeySync('B'), [handleKeySync]);
  const handleToggleSlipA = useCallback(() => handleToggleSlip('A'), [handleToggleSlip]);
  const handleToggleSlipB = useCallback(() => handleToggleSlip('B'), [handleToggleSlip]);
  const handleToggleSandboxA = useCallback(() => handleToggleSandbox('A'), [handleToggleSandbox]);
  const handleToggleSandboxB = useCallback(() => handleToggleSandbox('B'), [handleToggleSandbox]);
  const handleToggleFXA = useCallback((type: FXType) => handleToggleFX('A', type), [handleToggleFX]);
  const handleToggleFXB = useCallback((type: FXType) => handleToggleFX('B', type), [handleToggleFX]);
  const handleCueToggle = useCallback((d: 'A' | 'B') => {
    setMixer((p) => ({
      ...p,
      [d === 'A' ? 'headphoneCueA' : 'headphoneCueB']: !p[d === 'A' ? 'headphoneCueA' : 'headphoneCueB'],
    }));
  }, []);
  const handleOpenDjayImport = useCallback(() => setIsDjayImportOpen(true), []);
  const handleOpenGDriveSettings = useCallback(() => setIsSettingsOpen(true), []);
  const handleStartAutomix = useCallback(() => automixService.startAutomix(deckStateRef.current.deckA, deckStateRef.current.deckB), []);
  const handleToggleExpand = useCallback(() => setDrawerMode((prev) => (prev === 'expanded' ? 'split' : 'expanded')), []);

  // Stream Song Requests Handling
  const handleLoadRequestToDeck = useCallback((deckId: 'A' | 'B', req: StreamSongRequest) => {
    const track: TrackMetadata = {
      id: `req-${req.id}`,
      title: req.song,
      artist: req.artist || req.viewer || 'Stream Viewer Request',
      bpm: 126,
      key: '8A',
      camelotKey: '8A',
      duration: 180,
      fileSource: 'youtube',
      fileUrl: '',
      dateAdded: new Date().toISOString(),
      hotCues: [],
      savedLoops: [],
      beatGrid: { bpm: 126, firstBeatOffset: 0, meter: 4 },
    };
    handleLoadTrack(deckId, track);
    setStreamRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: 'loaded' } : r))
    );
  }, [handleLoadTrack]);

  const handleDismissRequest = useCallback((id: string) => {
    setStreamRequests((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleClearAllRequests = useCallback(() => {
    setStreamRequests([]);
  }, []);

  // Streamer.bot, Stream Deck, & Broadcast WebSocket Event Listeners
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).desktopAPI) return;

    const unsubs: Array<() => void> = [];

    if ((window as any).desktopAPI.onStreamerbotRequest) {
      const unsub = (window as any).desktopAPI.onStreamerbotRequest((req: { username: string; song: string }) => {
        const newReq: StreamSongRequest = {
          id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          viewer: req.username || 'TwitchViewer',
          song: req.song || 'Song Request',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'pending',
          source: 'streamerbot',
        };
        setStreamRequests((prev) => [newReq, ...prev]);
      });
      unsubs.push(unsub);
    }

    if ((window as any).desktopAPI.onTriggerSamplerPad) {
      const unsub = (window as any).desktopAPI.onTriggerSamplerPad((padIndex: number) => {
        samplerEngine.triggerSlot(padIndex);
      });
      unsubs.push(unsub);
    }

    if ((window as any).desktopAPI.onStreamdeckAction) {
      const unsub = (window as any).desktopAPI.onStreamdeckAction((action: { action: string; deckId?: string; param?: any }) => {
        const targetDeck = (action.deckId === 'B' ? 'B' : 'A') as DeckId;
        switch (action.action) {
          case 'playPause':
            handlePlayToggle(targetDeck);
            break;
          case 'cue':
            handleCueClick(targetDeck);
            break;
          case 'sync':
            handleSyncClick(targetDeck);
            break;
          case 'isolateAcapella':
            handleIsolateAcapella(targetDeck);
            break;
          case 'isolateInstrumental':
            handleIsolateInstrumental(targetDeck);
            break;
          case 'resetStems':
            handleResetStems(targetDeck);
            break;
          case 'loop':
            handleSetAutoLoop(targetDeck, action.param || 4);
            break;
          case 'exitLoop':
            handleExitLoop(targetDeck);
            break;
          case 'hotcue':
            handleTriggerCue(targetDeck, action.param || 0);
            break;
          case 'sampler':
            samplerEngine.triggerSlot(action.param || 0);
            break;
          default:
            break;
        }
      });
      unsubs.push(unsub);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [handlePlayToggle, handleCueClick, handleSyncClick, handleIsolateAcapella, handleIsolateInstrumental, handleResetStems, handleSetAutoLoop, handleExitLoop, handleTriggerCue]);

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
    automixService.setDeckStateProvider(() => ({
      deckA: deckStateRef.current.deckA,
      deckB: deckStateRef.current.deckB,
    }));

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
  }, []);

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
      style={uiZoom !== 1.0 ? ({ zoom: uiZoom } as React.CSSProperties) : undefined}
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
          onSeek={(d, sec) => audioEngine.seekDeck(d, sec)}
          onCrossfaderChange={handleCrossfaderChange}
          onToggleExpandedLibrary={() => setDrawerMode('split')}
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
          onToggleStreamerHud={() => setIsStreamRequestQueueOpen(true)}
          onToggleSettingsModal={() => setIsSettingsOpen(true)}
          isStreamerHudOpen={isStreamRequestQueueOpen || isStreamerHudOpen}
          requestCount={streamRequests.filter((r) => r.status === 'pending').length}
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
              onLoadTrack={handleLoadTrackA}
              onPlayToggle={handlePlayToggleA}
              onCueClick={handleCueClickA}
              onSyncClick={handleSyncClickA}
              onSeek={handleSeekA}
              onRateChange={handleRateChangeA}
              onKeyLockToggle={handleKeyLockToggleA}
              onNudge={handleNudgeA}
              onReleaseNudge={handleReleaseNudgeA}
              onScratch={handleScratchA}
              onTriggerCue={handleTriggerCueA}
              onSetCue={handleSetCueA}
              onClearCue={handleClearCueA}
              onSetAutoLoop={handleSetAutoLoopA}
              onExitLoop={handleExitLoopA}
              onBeatJump={handleBeatJumpA}
              onStemGainChange={handleStemGainChangeA}
              onStemMuteToggle={handleStemMuteToggleA}
              onStemSoloToggle={handleStemSoloToggleA}
              onIsolateAcapella={handleIsolateAcapellaA}
              onIsolateInstrumental={handleIsolateInstrumentalA}
              onResetStems={handleResetStemsA}
              onKeyShift={handleKeyShiftA}
              onKeySync={handleKeySyncA}
              onToggleSlip={handleToggleSlipA}
              onToggleSandbox={handleToggleSandboxA}
              onToggleFX={handleToggleFXA}
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
              onHeadphoneVolumeChange={() => {}}
              onCueToggle={handleCueToggle}
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
              onLoadTrack={handleLoadTrackB}
              onPlayToggle={handlePlayToggleB}
              onCueClick={handleCueClickB}
              onSyncClick={handleSyncClickB}
              onSeek={handleSeekB}
              onRateChange={handleRateChangeB}
              onKeyLockToggle={handleKeyLockToggleB}
              onNudge={handleNudgeB}
              onReleaseNudge={handleReleaseNudgeB}
              onScratch={handleScratchB}
              onTriggerCue={handleTriggerCueB}
              onSetCue={handleSetCueB}
              onClearCue={handleClearCueB}
              onSetAutoLoop={handleSetAutoLoopB}
              onExitLoop={handleExitLoopB}
              onBeatJump={handleBeatJumpB}
              onStemGainChange={handleStemGainChangeB}
              onStemMuteToggle={handleStemMuteToggleB}
              onStemSoloToggle={handleStemSoloToggleB}
              onIsolateAcapella={handleIsolateAcapellaB}
              onIsolateInstrumental={handleIsolateInstrumentalB}
              onResetStems={handleResetStemsB}
              onKeyShift={handleKeyShiftB}
              onKeySync={handleKeySyncB}
              onToggleSlip={handleToggleSlipB}
              onToggleSandbox={handleToggleSandboxB}
              onToggleFX={handleToggleFXB}
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
            ? 'h-[min(38vh,320px)] min-h-[190px] shrink-0'
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
                onOpenDjayImport={handleOpenDjayImport}
                onOpenGDriveSettings={handleOpenGDriveSettings}
                currentMasterKey={deckA.isPlaying ? deckA.musicalKey : deckB.musicalKey}
                onStartAutomix={handleStartAutomix}
                isExpanded={drawerMode === 'expanded'}
                onToggleExpand={handleToggleExpand}
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
                onLoadTrackToDeck={handleLoadTrack}
                onPopOutWindow={handlePopOutCortex}
              />
            )}
          </div>
        )}
      </div>

      {/* 4. Modals & Overlays */}
      <StreamRequestQueue
        isOpen={isStreamRequestQueueOpen}
        onClose={() => setIsStreamRequestQueueOpen(false)}
        onLoadTrackToDeck={(deckId, req) => handleLoadRequestToDeck(deckId, req)}
        requests={streamRequests}
        onDismissRequest={handleDismissRequest}
        onClearAllRequests={handleClearAllRequests}
      />

      {isStreamerHudOpen && (
        <StreamerOverlay
          deckA={deckA}
          deckB={deckB}
          onClose={() => setIsStreamerHudOpen(false)}
        />
      )}

      {isMidiModalOpen && <MidiModal onClose={() => setIsMidiModalOpen(false)} />}

      {isDjayImportOpen && (
        <UniversalDjImportModal
          onClose={() => setIsDjayImportOpen(false)}
          onImportSuccess={() => {
            setLibraryRefreshTrigger((p) => p + 1);
          }}
        />
      )}

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}

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
