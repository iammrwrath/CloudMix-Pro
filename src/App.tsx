import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DeckId, DeckState, MixerState, NeuralTransitionMode, TrackMetadata, WaveformData } from './types/dj';
import { audioEngine } from './audio/AudioEngine';
import { AudioAnalyzer } from './audio/AudioAnalyzer';
import { googleDriveService } from './services/GoogleDriveService';
import { youtubeMusicService } from './services/YouTubeMusicService';
import { cloudProgression } from './services/CloudProgressionService';
import { midiControllerService } from './services/MidiControllerService';
import { broadcastService } from './services/BroadcastService';
import { Header } from './components/Header';
import { Deck } from './components/Deck';
import { Mixer } from './components/Mixer';
import { Library } from './components/Library';
import { StreamerOverlay } from './components/StreamerOverlay';
import { MidiModal } from './components/MidiModal';
import { DjayImportModal } from './components/DjayImportModal';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
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
      drums: 1.0,
      vocalsMuted: false,
      harmonicsMuted: false,
      drumsMuted: false,
      vocalsSolo: false,
      harmonicsSolo: false,
      drumsSolo: false,
    },
    filter: 0,
    activeLoop: null,
    slipMode: false,
    shadowPlayheadTime: 0,
    isScratching: false,
    selectedPadMode: 'hotcue',
    meterLevelL: 0,
    meterLevelR: 0,
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
      drums: 1.0,
      vocalsMuted: false,
      harmonicsMuted: false,
      drumsMuted: false,
      vocalsSolo: false,
      harmonicsSolo: false,
      drumsSolo: false,
    },
    filter: 0,
    activeLoop: null,
    slipMode: false,
    shadowPlayheadTime: 0,
    isScratching: false,
    selectedPadMode: 'hotcue',
    meterLevelL: 0,
    meterLevelR: 0,
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

  // Modals
  const [isMidiModalOpen, setIsMidiModalOpen] = useState(false);
  const [isStreamerHudOpen, setIsStreamerHudOpen] = useState(false);
  const [isDjayImportOpen, setIsDjayImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
  const [libraryRefreshTrigger, setLibraryRefreshTrigger] = useState(0);

  // 60-120 FPS Audio Clock & Meter Loop
  useEffect(() => {
    let animId: number;

    const tick = () => {
      const timeA = audioEngine.getCurrentTime('A');
      const timeB = audioEngine.getCurrentTime('B');

      const meterA = audioEngine.getDeckLevel('A');
      const meterB = audioEngine.getDeckLevel('B');
      const masterMeter = audioEngine.getMasterLevel();

      setDeckA((prev) => ({
        ...prev,
        currentTime: timeA,
        meterLevelL: meterA,
        meterLevelR: meterA,
      }));

      setDeckB((prev) => ({
        ...prev,
        currentTime: timeB,
        meterLevelL: meterB,
        meterLevelR: meterB,
      }));

      setMixer((prev) => ({
        ...prev,
        masterMeterL: masterMeter,
        masterMeterR: masterMeter,
      }));

      // Broadcast to OBS/StreamerBot
      broadcastService.update({
        elapsedSecA: timeA,
        elapsedSecB: timeB,
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // WebMIDI Controller Binding
  useEffect(() => {
    const unsubscribe = midiControllerService.onControl((controlName, value) => {
      if (controlName === 'DeckA_Play' && value > 0.5) handlePlayToggle('A');
      else if (controlName === 'DeckB_Play' && value > 0.5) handlePlayToggle('B');
      else if (controlName === 'DeckA_Cue' && value > 0.5) handleCueClick('A');
      else if (controlName === 'DeckB_Cue' && value > 0.5) handleCueClick('B');
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
    });

    return () => {
      unsubscribe();
    };
  }, [deckA, deckB]);

  // Load Track to Deck
  const handleLoadTrack = async (deckId: DeckId, track: TrackMetadata) => {
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
      console.error('Failed to load track to deck:', err);
      alert('Error loading track: ' + err);
    }
  };

  // Play / Pause Toggle
  const handlePlayToggle = (deckId: DeckId) => {
    const isPlaying = audioEngine.togglePlayPause(deckId);
    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, isPlaying }));
      broadcastService.update({ isPlayingA: isPlaying, activeDeck: 'A' });
    } else {
      setDeckB((prev) => ({ ...prev, isPlaying }));
      broadcastService.update({ isPlayingB: isPlaying, activeDeck: 'B' });
    }
  };

  // Cue Button Click
  const handleCueClick = (deckId: DeckId) => {
    const deck = deckId === 'A' ? deckA : deckB;
    if (deck.isPlaying) {
      audioEngine.pauseDeck(deckId);
      audioEngine.seekDeck(deckId, 0);
      if (deckId === 'A') setDeckA((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
      else setDeckB((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    } else {
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

    audioEngine.setPlaybackRate(deckId, newRate);
    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, playbackRate: newRate, isSync: true }));
    } else {
      setDeckB((prev) => ({ ...prev, playbackRate: newRate, isSync: true }));
    }
  };

  // Pitch Rate Change
  const handleRateChange = (deckId: DeckId, rate: number) => {
    audioEngine.setPlaybackRate(deckId, rate);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, playbackRate: rate }));
    else setDeckB((prev) => ({ ...prev, playbackRate: rate }));
  };

  // Nudge / Pitch Bend
  const handleNudge = (deckId: DeckId, factor: number) => {
    audioEngine.nudge(deckId, factor);
  };

  const handleReleaseNudge = (deckId: DeckId) => {
    audioEngine.releaseNudge(deckId);
  };

  const handleScratch = (deckId: DeckId, deltaSec: number) => {
    const current = audioEngine.getCurrentTime(deckId);
    audioEngine.seekDeck(deckId, current + deltaSec);
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
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, volume: val }));
    else setDeckB((prev) => ({ ...prev, volume: val }));
  };

  const handleCrossfaderChange = (val: number) => {
    audioEngine.setCrossfader(val, mixer.crossfaderCurve);
    setMixer((prev) => ({ ...prev, crossfader: val }));
  };

  const handleCrossfaderCurveChange = (curve: 'smooth' | 'linear' | 'scratch') => {
    audioEngine.setCrossfader(mixer.crossfader, curve);
    setMixer((prev) => ({ ...prev, crossfaderCurve: curve }));
  };

  const handleMasterVolumeChange = (val: number) => {
    audioEngine.setMasterVolume(val);
    setMixer((prev) => ({ ...prev, masterVolume: val }));
  };

  // Stem & Neural Mix Controls
  const handleEQModeToggle = (deckId: 'A' | 'B') => {
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, eqMode: p.eqMode === 'stems' ? 'isolator' : 'stems' }));
    } else {
      setDeckB((p) => ({ ...p, eqMode: p.eqMode === 'stems' ? 'isolator' : 'stems' }));
    }
  };

  const handleStemGainChange = (deckId: 'A' | 'B', stem: 'vocals' | 'harmonics' | 'drums', val: number) => {
    audioEngine.setStemGain(deckId, stem, val);
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, stems: { ...p.stems, [stem]: val } }));
    } else {
      setDeckB((p) => ({ ...p, stems: { ...p.stems, [stem]: val } }));
    }
  };

  const handleStemMuteToggle = (deckId: 'A' | 'B', stem: 'vocals' | 'harmonics' | 'drums') => {
    const isMuted = audioEngine.toggleStemMute(deckId, stem);
    const muteKey = `${stem}Muted` as const;
    if (deckId === 'A') {
      setDeckA((p) => ({ ...p, stems: { ...p.stems, [muteKey]: isMuted } }));
    } else {
      setDeckB((p) => ({ ...p, stems: { ...p.stems, [muteKey]: isMuted } }));
    }
  };

  const handleStemSoloToggle = (deckId: 'A' | 'B', stem: 'vocals' | 'harmonics' | 'drums') => {
    const isSolo = audioEngine.toggleStemSolo(deckId, stem);
    const soloKey = `${stem}Solo` as const;
    if (deckId === 'A') {
      setDeckA((p) => ({
        ...p,
        stems: {
          ...p.stems,
          vocalsSolo: false,
          harmonicsSolo: false,
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

      // Library Drawer Toggle: L
      else if (key === 'l' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsLibraryCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deckA, deckB]);

  return (
    <div className="flex flex-col h-screen w-screen bg-dj-bg text-slate-100 overflow-hidden select-none relative">
      {/* Ambient Cyberpunk Glow Atmosphere */}
      <div className="absolute top-1/6 -left-36 w-96 h-96 rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/6 -right-36 w-96 h-96 rounded-full bg-pink-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      {/* 1. Header Toolbar */}
      <Header
        masterBpm={masterBpm}
        onMasterBpmChange={setMasterBpm}
        onToggleMidiModal={() => setIsMidiModalOpen(true)}
        onToggleStreamerHud={() => setIsStreamerHudOpen(!isStreamerHudOpen)}
        onToggleSettingsModal={() => setIsSettingsOpen(true)}
        isStreamerHudOpen={isStreamerHudOpen}
      />

      {/* 2. Main DJ Decks & Mixer Workspace */}
      <div className="flex flex-1 p-2 space-x-2 overflow-hidden relative z-10 justify-center">
        {/* Deck A */}
        <Deck
          deckId="A"
          deckState={deckA}
          waveformData={waveformDataA}
          onPlayToggle={() => handlePlayToggle('A')}
          onCueClick={() => handleCueClick('A')}
          onSyncClick={() => handleSyncClick('A')}
          onSeek={(sec) => audioEngine.seekDeck('A', sec)}
          onRateChange={(rate) => handleRateChange('A', rate)}
          onKeyLockToggle={() => setDeckA((p) => ({ ...p, keyLock: !p.keyLock }))}
          onNudge={(f) => handleNudge('A', f)}
          onReleaseNudge={() => handleReleaseNudge('A')}
          onScratch={(d) => handleScratch('A', d)}
          onTriggerCue={(id) => handleTriggerCue('A', id)}
          onSetCue={(id, pos) => handleSetCue('A', id, pos)}
          onClearCue={(id) => handleClearCue('A', id)}
          onSetAutoLoop={(b) => handleSetAutoLoop('A', b)}
          onExitLoop={() => handleExitLoop('A')}
          onBeatJump={(b) => handleBeatJump('A', b)}
          onStemMuteToggle={(stem) => handleStemMuteToggle('A', stem)}
          onStemSoloToggle={(stem) => handleStemSoloToggle('A', stem)}
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
          onCueToggle={(d) =>
            setMixer((p) => ({
              ...p,
              [d === 'A' ? 'headphoneCueA' : 'headphoneCueB']:
                !p[d === 'A' ? 'headphoneCueA' : 'headphoneCueB'],
            }))
          }
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
          onPlayToggle={() => handlePlayToggle('B')}
          onCueClick={() => handleCueClick('B')}
          onSyncClick={() => handleSyncClick('B')}
          onSeek={(sec) => audioEngine.seekDeck('B', sec)}
          onRateChange={(rate) => handleRateChange('B', rate)}
          onKeyLockToggle={() => setDeckB((p) => ({ ...p, keyLock: !p.keyLock }))}
          onNudge={(f) => handleNudge('B', f)}
          onReleaseNudge={() => handleReleaseNudge('B')}
          onScratch={(d) => handleScratch('B', d)}
          onTriggerCue={(id) => handleTriggerCue('B', id)}
          onSetCue={(id, pos) => handleSetCue('B', id, pos)}
          onClearCue={(id) => handleClearCue('B', id)}
          onSetAutoLoop={(b) => handleSetAutoLoop('B', b)}
          onExitLoop={() => handleExitLoop('B')}
          onBeatJump={(b) => handleBeatJump('B', b)}
          onStemMuteToggle={(stem) => handleStemMuteToggle('B', stem)}
          onStemSoloToggle={(stem) => handleStemSoloToggle('B', stem)}
        />
      </div>

      {/* 3. Bottom Library & Cloud Crates Section */}
      <div className="px-2 pb-2">
        <div className="flex items-center justify-between pb-1 px-1">
          <button
            onClick={() => setIsLibraryCollapsed(!isLibraryCollapsed)}
            className="text-[10px] font-mono text-slate-400 hover:text-cyan-400 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <span>{isLibraryCollapsed ? '▲ Show Track Library & Cloud Crates' : '▼ Hide Library (Full Screen Decks View)'}</span>
          </button>
        </div>
        {!isLibraryCollapsed && (
          <Library
            key={libraryRefreshTrigger}
            onLoadTrack={handleLoadTrack}
            onOpenDjayImport={() => setIsDjayImportOpen(true)}
            onOpenGDriveSettings={() => setIsSettingsOpen(true)}
          />
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

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
};
