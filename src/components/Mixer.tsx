import React from 'react';
import { DeckState, MixerState, NeuralTransitionMode } from '../types/dj';
import { RotaryKnob } from './RotaryKnob';
import { VUMeter } from './VUMeter';
import { ChannelFader } from './ChannelFader';
import { Headphones, Sliders, Volume2, Sparkles } from 'lucide-react';

interface MixerProps {
  deckA: DeckState;
  deckB: DeckState;
  mixer: MixerState;
  onEQChange: (deckId: 'A' | 'B', band: 'low' | 'mid' | 'high', val: number) => void;
  onEQKillToggle: (deckId: 'A' | 'B', band: 'low' | 'mid' | 'high') => void;
  onFilterChange: (deckId: 'A' | 'B', val: number) => void;
  onTrimChange: (deckId: 'A' | 'B', val: number) => void;
  onFaderChange: (deckId: 'A' | 'B', val: number) => void;
  onCrossfaderChange: (val: number) => void;
  onCrossfaderCurveChange: (curve: 'smooth' | 'linear' | 'scratch') => void;
  onMasterVolumeChange: (val: number) => void;
  onHeadphoneVolumeChange: (val: number) => void;
  onCueToggle: (deckId: 'A' | 'B') => void;
  onEQModeToggle?: (deckId: 'A' | 'B') => void;
  onStemGainChange?: (deckId: 'A' | 'B', stem: 'vocals' | 'harmonics' | 'bass' | 'drums', val: number) => void;
  onStemMuteToggle?: (deckId: 'A' | 'B', stem: 'vocals' | 'harmonics' | 'bass' | 'drums') => void;
  onStemSoloToggle?: (deckId: 'A' | 'B', stem: 'vocals' | 'harmonics' | 'bass' | 'drums') => void;
  onNeuralTransitionModeChange?: (mode: NeuralTransitionMode) => void;
}

export const Mixer = React.memo<MixerProps>(({
  deckA,
  deckB,
  mixer,
  onEQChange,
  onEQKillToggle,
  onFilterChange,
  onTrimChange,
  onFaderChange,
  onCrossfaderChange,
  onCrossfaderCurveChange,
  onMasterVolumeChange,
  onHeadphoneVolumeChange,
  onCueToggle,
  onEQModeToggle,
  onStemGainChange,
  onStemMuteToggle,
  onStemSoloToggle,
  onNeuralTransitionModeChange,
}) => {
  return (
    <div className="flex flex-col h-full bg-dj-panel rounded-xl p-1.5 sm:p-2 border border-dj-border shadow-2xl w-[230px] sm:w-[260px] xl:w-[300px] min-w-[210px] max-w-[320px] overflow-hidden justify-between shrink-0">
      {/* 1. Mixer Header / Master Volume Section */}
      <div className="flex items-center justify-between bg-dj-surface/90 rounded-lg p-1 mb-0.5 border border-dj-border shrink-0">
        <RotaryKnob
          label="MASTER"
          value={mixer.masterVolume}
          min={0}
          max={1.0}
          defaultValue={0.85}
          onChange={onMasterVolumeChange}
          accentColor="#ffffff"
          size={20}
        />

        {/* Master Stereo VU Meters */}
        <div className="flex items-center space-x-1 px-1">
          <VUMeter level={mixer.masterMeterL} height={24} segments={8} />
          <VUMeter level={mixer.masterMeterR} height={24} segments={8} />
        </div>

        <RotaryKnob
          label="PHONES"
          value={mixer.headphoneVolume}
          min={0}
          max={1.0}
          defaultValue={0.8}
          onChange={onHeadphoneVolumeChange}
          accentColor="#a855f7"
          size={20}
        />
      </div>

      {/* 2. Channel Strips (Deck A & Deck B) */}
      <div className="flex justify-between flex-1 space-x-1 sm:space-x-1.5 my-0.5 min-h-0">
        {/* Channel A Strip */}
        <div className="flex-1 flex flex-col items-center bg-dj-surface/60 rounded-lg p-1 border border-dj-border/60 overflow-hidden justify-between min-h-0">
          <div className="w-full flex items-center justify-between px-0.5 mb-0.5 shrink-0">
            <span className="text-[11px] sm:text-xs font-mono font-black text-cyan-400 tracking-wide">CH 1</span>
            <button
              onClick={() => onEQModeToggle?.('A')}
              title="Toggle between 3-Band EQ and Neural Stems"
              className={`text-[9px] font-mono font-black px-1 py-0.2 rounded border transition-colors ${
                deckA.eqMode === 'stems'
                  ? 'bg-purple-900/80 border-purple-500 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {deckA.eqMode === 'stems' ? 'STEMS' : 'EQ'}
            </button>
          </div>

          {/* Gain / Trim */}
          <RotaryKnob
            label="GAIN"
            value={deckA.trimGain}
            min={0}
            max={2.0}
            defaultValue={1.0}
            onChange={(v) => onTrimChange('A', v)}
            accentColor="#00e5ff"
            size={18}
          />

          {deckA.eqMode === 'stems' ? (
            /* Neural Stems Strip */
            <>
              {/* Vocals */}
              <div className="relative my-0.5">
                <RotaryKnob
                  label="VOCAL"
                  value={deckA.stems?.vocals ?? 1.0}
                  min={0}
                  max={1.5}
                  defaultValue={1.0}
                  onChange={(v) => onStemGainChange?.('A', 'vocals', v)}
                  accentColor="#ec4899"
                  size={18}
                />
                <div className="absolute -right-3 top-0.5 flex flex-col space-y-0.5">
                  <button
                    onClick={() => onStemMuteToggle?.('A', 'vocals')}
                    title="Mute Vocals"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckA.stems?.vocalsMuted ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => onStemSoloToggle?.('A', 'vocals')}
                    title="Solo Vocals"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckA.stems?.vocalsSolo ? 'bg-amber-400 border-amber-300 text-black shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>

              {/* Melody / Harmonics */}
              <div className="relative my-0.5">
                <RotaryKnob
                  label="MELODY"
                  value={deckA.stems?.harmonics ?? 1.0}
                  min={0}
                  max={1.5}
                  defaultValue={1.0}
                  onChange={(v) => onStemGainChange?.('A', 'harmonics', v)}
                  accentColor="#a855f7"
                  size={18}
                />
                <div className="absolute -right-3 top-0.5 flex flex-col space-y-0.5">
                  <button
                    onClick={() => onStemMuteToggle?.('A', 'harmonics')}
                    title="Mute Melody"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckA.stems?.harmonicsMuted ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => onStemSoloToggle?.('A', 'harmonics')}
                    title="Solo Melody"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckA.stems?.harmonicsSolo ? 'bg-amber-400 border-amber-300 text-black shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>

              {/* Bass */}
              <div className="relative my-0.5">
                <RotaryKnob
                  label="BASS"
                  value={deckA.stems?.bass ?? 1.0}
                  min={0}
                  max={1.5}
                  defaultValue={1.0}
                  onChange={(v) => onStemGainChange?.('A', 'bass', v)}
                  accentColor="#3b82f6"
                  size={18}
                />
                <div className="absolute -right-3 top-0.5 flex flex-col space-y-0.5">
                  <button
                    onClick={() => onStemMuteToggle?.('A', 'bass')}
                    title="Mute Bass"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckA.stems?.bassMuted ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => onStemSoloToggle?.('A', 'bass')}
                    title="Solo Bass"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckA.stems?.bassSolo ? 'bg-amber-400 border-amber-300 text-black shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>

              {/* Drums / Bass */}
              <div className="relative my-0.5">
                <RotaryKnob
                  label="DRUMS"
                  value={deckA.stems?.drums ?? 1.0}
                  min={0}
                  max={1.5}
                  defaultValue={1.0}
                  onChange={(v) => onStemGainChange?.('A', 'drums', v)}
                  accentColor="#f59e0b"
                  size={18}
                />
                <div className="absolute -right-3 top-0.5 flex flex-col space-y-0.5">
                  <button
                    onClick={() => onStemMuteToggle?.('A', 'drums')}
                    title="Mute Drums"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckA.stems?.drumsMuted ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => onStemSoloToggle?.('A', 'drums')}
                    title="Solo Drums"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckA.stems?.drumsSolo ? 'bg-amber-400 border-amber-300 text-black shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Standard 3-Band Isolator EQ */
            <>
              {/* High EQ */}
              <div className="relative my-0.5">
                <RotaryKnob
                  label="HI"
                  value={deckA.eqHigh}
                  min={-1.0}
                  max={1.0}
                  defaultValue={0.0}
                  onChange={(v) => onEQChange('A', 'high', v)}
                  accentColor="#00e5ff"
                  size={18}
                />
                <button
                  onClick={() => onEQKillToggle('A', 'high')}
                  title="Kill High EQ (-inf)"
                  className={`absolute -right-3 top-0.5 text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                    deckA.eqHighKill ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_6px_rgba(244,63,94,0.7)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  K
                </button>
              </div>

              {/* Mid EQ */}
              <div className="relative my-0.5">
                <RotaryKnob
                  label="MID"
                  value={deckA.eqMid}
                  min={-1.0}
                  max={1.0}
                  defaultValue={0.0}
                  onChange={(v) => onEQChange('A', 'mid', v)}
                  accentColor="#00e5ff"
                  size={18}
                />
                <button
                  onClick={() => onEQKillToggle('A', 'mid')}
                  title="Kill Mid EQ (-inf)"
                  className={`absolute -right-3 top-0.5 text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                    deckA.eqMidKill ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_6px_rgba(244,63,94,0.7)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  K
                </button>
              </div>

              {/* Low EQ */}
              <div className="relative my-0.5">
                <RotaryKnob
                  label="LOW"
                  value={deckA.eqLow}
                  min={-1.0}
                  max={1.0}
                  defaultValue={0.0}
                  onChange={(v) => onEQChange('A', 'low', v)}
                  accentColor="#00e5ff"
                  size={18}
                />
                <button
                  onClick={() => onEQKillToggle('A', 'low')}
                  title="Kill Low EQ (-inf)"
                  className={`absolute -right-3 top-0.5 text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                    deckA.eqLowKill ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_6px_rgba(244,63,94,0.7)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  K
                </button>
              </div>
            </>
          )}

          {/* Color Sound Filter Knob */}
          <div className="my-0.5">
            <RotaryKnob
              label="FILTER"
              value={deckA.filter}
              min={-1.0}
              max={1.0}
              defaultValue={0.0}
              onChange={(v) => onFilterChange('A', v)}
              accentColor="#06b6d4"
              size={18}
            />
          </div>

          {/* Headphone CUE button */}
          <button
            onClick={() => onCueToggle('A')}
            className={`w-full py-0.5 rounded-md text-[9px] sm:text-[9.5px] font-mono font-black tracking-wider my-0.5 border transition-all flex items-center justify-center space-x-1 cursor-pointer active:scale-95 shrink-0 ${
              mixer.headphoneCueA
                ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.7)]'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <Headphones className="w-2.5 h-2.5" />
            <span>CUE</span>
          </button>

          {/* Channel Fader & Meter with Calibrated Scale */}
          <div className="flex items-end justify-center space-x-1 sm:space-x-1.5 mt-auto pt-0.5 w-full px-0.5 shrink-0">
            {/* dB scale labels */}
            <div className="flex flex-col justify-between h-10 sm:h-12 md:h-16 text-[6.5px] sm:text-[7.5px] font-mono font-bold text-slate-400 text-right pr-0.5 pointer-events-none select-none shrink-0">
              <span className="text-emerald-400 font-black">+6</span>
              <span className="text-white font-black">0</span>
              <span>-6</span>
              <span>-12</span>
              <span>-∞</span>
            </div>

            {/* Tactile Pro Vertical Fader */}
            <div className="relative flex items-center justify-center h-10 sm:h-12 md:h-16 w-6 sm:w-7">
              <ChannelFader
                volume={deckA.volume}
                onChange={(v) => onFaderChange('A', v)}
                accentColor="#00e5ff"
                channelName="Channel 1"
              />
            </div>

            <VUMeter level={deckA.meterLevelL} height={24} segments={8} />
          </div>
        </div>

        {/* Channel B Strip */}
        <div className="flex-1 flex flex-col items-center bg-dj-surface/60 rounded-lg p-1 border border-dj-border/60 overflow-hidden justify-between min-h-0">
          <div className="w-full flex items-center justify-between px-0.5 mb-0.5 shrink-0">
            <span className="text-[11px] sm:text-xs font-mono font-black text-rose-500 tracking-wide">CH 2</span>
            <button
              onClick={() => onEQModeToggle?.('B')}
              title="Toggle between 3-Band EQ and Neural Stems"
              className={`text-[9px] font-mono font-black px-1 py-0.2 rounded border transition-colors ${
                deckB.eqMode === 'stems'
                  ? 'bg-purple-900/80 border-purple-500 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {deckB.eqMode === 'stems' ? 'STEMS' : 'EQ'}
            </button>
          </div>

          {/* Gain / Trim */}
          <RotaryKnob
            label="GAIN"
            value={deckB.trimGain}
            min={0}
            max={2.0}
            defaultValue={1.0}
            onChange={(v) => onTrimChange('B', v)}
            accentColor="#ff3366"
            size={18}
          />

          {deckB.eqMode === 'stems' ? (
            /* Neural Stems Strip */
            <>
              {/* Vocals */}
              <div className="relative my-0.5">
                <RotaryKnob
                  label="VOCAL"
                  value={deckB.stems?.vocals ?? 1.0}
                  min={0}
                  max={1.5}
                  defaultValue={1.0}
                  onChange={(v) => onStemGainChange?.('B', 'vocals', v)}
                  accentColor="#ec4899"
                  size={18}
                />
                <div className="absolute -right-3 top-0.5 flex flex-col space-y-0.5">
                  <button
                    onClick={() => onStemMuteToggle?.('B', 'vocals')}
                    title="Mute Vocals"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckB.stems?.vocalsMuted ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => onStemSoloToggle?.('B', 'vocals')}
                    title="Solo Vocals"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckB.stems?.vocalsSolo ? 'bg-amber-400 border-amber-300 text-black shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>

              {/* Melody / Harmonics */}
              <div className="relative my-0.5">
                <RotaryKnob
                  label="MELODY"
                  value={deckB.stems?.harmonics ?? 1.0}
                  min={0}
                  max={1.5}
                  defaultValue={1.0}
                  onChange={(v) => onStemGainChange?.('B', 'harmonics', v)}
                  accentColor="#a855f7"
                  size={18}
                />
                <div className="absolute -right-3 top-0.5 flex flex-col space-y-0.5">
                  <button
                    onClick={() => onStemMuteToggle?.('B', 'harmonics')}
                    title="Mute Melody"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckB.stems?.harmonicsMuted ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => onStemSoloToggle?.('B', 'harmonics')}
                    title="Solo Melody"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckB.stems?.harmonicsSolo ? 'bg-amber-400 border-amber-300 text-black shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>

              {/* Bass */}
              <div className="relative my-0.5">
                <RotaryKnob
                  label="BASS"
                  value={deckB.stems?.bass ?? 1.0}
                  min={0}
                  max={1.5}
                  defaultValue={1.0}
                  onChange={(v) => onStemGainChange?.('B', 'bass', v)}
                  accentColor="#3b82f6"
                  size={18}
                />
                <div className="absolute -right-3 top-0.5 flex flex-col space-y-0.5">
                  <button
                    onClick={() => onStemMuteToggle?.('B', 'bass')}
                    title="Mute Bass"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckB.stems?.bassMuted ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => onStemSoloToggle?.('B', 'bass')}
                    title="Solo Bass"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckB.stems?.bassSolo ? 'bg-amber-400 border-amber-300 text-black shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>

              {/* Drums / Bass */}
              <div className="relative my-0.5">
                <RotaryKnob
                  label="DRUMS"
                  value={deckB.stems?.drums ?? 1.0}
                  min={0}
                  max={1.5}
                  defaultValue={1.0}
                  onChange={(v) => onStemGainChange?.('B', 'drums', v)}
                  accentColor="#f59e0b"
                  size={18}
                />
                <div className="absolute -right-3 top-0.5 flex flex-col space-y-0.5">
                  <button
                    onClick={() => onStemMuteToggle?.('B', 'drums')}
                    title="Mute Drums"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckB.stems?.drumsMuted ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => onStemSoloToggle?.('B', 'drums')}
                    title="Solo Drums"
                    className={`text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                      deckB.stems?.drumsSolo ? 'bg-amber-400 border-amber-300 text-black shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Standard 3-Band Isolator EQ */
            <>
              {/* High EQ */}
              <div className="relative my-0.5">
                <RotaryKnob
                  label="HI"
                  value={deckB.eqHigh}
                  min={-1.0}
                  max={1.0}
                  defaultValue={0.0}
                  onChange={(v) => onEQChange('B', 'high', v)}
                  accentColor="#ff3366"
                  size={18}
                />
                <button
                  onClick={() => onEQKillToggle('B', 'high')}
                  title="Kill High EQ (-inf)"
                  className={`absolute -right-3 top-0.5 text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                    deckB.eqHighKill ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_6px_rgba(244,63,94,0.7)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  K
                </button>
              </div>

              {/* Mid EQ */}
              <div className="relative my-0.5">
                <RotaryKnob
                  label="MID"
                  value={deckB.eqMid}
                  min={-1.0}
                  max={1.0}
                  defaultValue={0.0}
                  onChange={(v) => onEQChange('B', 'mid', v)}
                  accentColor="#ff3366"
                  size={18}
                />
                <button
                  onClick={() => onEQKillToggle('B', 'mid')}
                  title="Kill Mid EQ (-inf)"
                  className={`absolute -right-3 top-0.5 text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                    deckB.eqMidKill ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_6px_rgba(244,63,94,0.7)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  K
                </button>
              </div>

              {/* Low EQ */}
              <div className="relative my-0.5">
                <RotaryKnob
                  label="LOW"
                  value={deckB.eqLow}
                  min={-1.0}
                  max={1.0}
                  defaultValue={0.0}
                  onChange={(v) => onEQChange('B', 'low', v)}
                  accentColor="#ff3366"
                  size={18}
                />
                <button
                  onClick={() => onEQKillToggle('B', 'low')}
                  title="Kill Low EQ (-inf)"
                  className={`absolute -right-3 top-0.5 text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded uppercase border ${
                    deckB.eqLowKill ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_6px_rgba(244,63,94,0.7)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  K
                </button>
              </div>
            </>
          )}

          {/* Color Sound Filter Knob */}
          <div className="my-0.5">
            <RotaryKnob
              label="FILTER"
              value={deckB.filter}
              min={-1.0}
              max={1.0}
              defaultValue={0.0}
              onChange={(v) => onFilterChange('B', v)}
              accentColor="#ec4899"
              size={18}
            />
          </div>

          {/* Headphone CUE button */}
          <button
            onClick={() => onCueToggle('B')}
            className={`w-full py-0.5 rounded-md text-[9px] sm:text-[9.5px] font-mono font-black tracking-wider my-0.5 border transition-all flex items-center justify-center space-x-1 cursor-pointer active:scale-95 shrink-0 ${
              mixer.headphoneCueB
                ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.7)]'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <Headphones className="w-2.5 h-2.5" />
            <span>CUE</span>
          </button>

          {/* Channel Fader & Meter with Calibrated Scale */}
          <div className="flex items-end justify-center space-x-1 sm:space-x-1.5 mt-auto pt-0.5 w-full px-0.5 shrink-0">
            {/* dB scale labels */}
            <div className="flex flex-col justify-between h-10 sm:h-12 md:h-16 text-[6.5px] sm:text-[7.5px] font-mono font-bold text-slate-400 text-right pr-0.5 pointer-events-none select-none shrink-0">
              <span className="text-emerald-400 font-black">+6</span>
              <span className="text-white font-black">0</span>
              <span>-6</span>
              <span>-12</span>
              <span>-∞</span>
            </div>

            {/* Tactile Pro Vertical Fader */}
            <div className="relative flex items-center justify-center h-10 sm:h-12 md:h-16 w-6 sm:w-7">
              <ChannelFader
                volume={deckB.volume}
                onChange={(v) => onFaderChange('B', v)}
                accentColor="#ff2e88"
                channelName="Channel 2"
              />
            </div>

            <VUMeter level={deckB.meterLevelR} height={24} segments={8} />
          </div>
        </div>
      </div>

      {/* 3. Crossfader Section (Studio Magvel Well) */}
      <div className="bg-dj-surface/90 rounded-lg p-1 mt-0.5 border border-dj-border shadow-[0_4px_12px_rgba(0,0,0,0.6)] shrink-0">
        {/* Unified Neural FX & Curve Selector Row */}
        <div className="flex items-center justify-between mb-0.5 pb-0.5 border-b border-dj-border/50 text-[8px] font-mono">
          <div className="flex items-center space-x-1">
            <span className="text-purple-400 font-bold flex items-center space-x-0.5">
              <Sparkles className="w-2.5 h-2.5 text-purple-400 animate-pulse" />
              <span>NEURAL</span>
            </span>
            <div className="flex space-x-0.5 bg-slate-950/80 p-0.5 rounded border border-purple-500/30">
              {[
                { id: 'standard', label: 'STD' },
                { id: 'bass_swap', label: 'BAS' },
                { id: 'vocal_swap', label: 'VOC' },
                { id: 'harmonic_swap', label: 'HRM' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => onNeuralTransitionModeChange?.(mode.id as NeuralTransitionMode)}
                  title={`Neural Mix Mode: ${mode.label}`}
                  className={`px-1 py-0.2 text-[7.5px] font-mono font-black rounded uppercase transition-all cursor-pointer ${
                    mixer.neuralTransitionMode === mode.id
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_8px_rgba(168,85,247,0.8)] border border-purple-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-slate-400 font-bold">CURVE</span>
            <div className="flex space-x-0.5 bg-slate-950/80 p-0.5 rounded border border-slate-700">
              {(['smooth', 'linear', 'scratch'] as const).map((curve) => (
                <button
                  key={curve}
                  onClick={() => onCrossfaderCurveChange(curve)}
                  className={`px-1 py-0.2 text-[7.5px] font-mono font-black rounded uppercase transition-all cursor-pointer ${
                    mixer.crossfaderCurve === curve
                      ? 'bg-slate-700 text-white shadow-[0_0_6px_rgba(255,255,255,0.2)] border border-slate-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {curve === 'smooth' ? 'SMO' : curve === 'linear' ? 'LIN' : 'SCR'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Crossfader horizontal slider */}
        <div className="relative flex items-center justify-center py-0.5 px-2">
          {/* Center Zero Tick Indicator */}
          <div className="absolute top-0.5 bottom-0.5 left-1/2 w-[2px] bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.8)] pointer-events-none z-10" />

          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={mixer.crossfader}
            onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
            className="w-full h-2.5 appearance-none bg-slate-950 rounded-full outline-none cursor-pointer slider-thumb border border-slate-800 shadow-inner"
          />
        </div>

        <div className="flex justify-between text-[10px] font-mono font-black px-2">
          <span className="text-cyan-400 drop-shadow-[0_0_6px_rgba(0,240,255,0.6)]">DECK A</span>
          <span className="text-slate-400 text-[8.5px] font-bold tracking-wider self-center">CENTER</span>
          <span className="text-pink-500 drop-shadow-[0_0_6px_rgba(255,46,136,0.6)]">DECK B</span>
        </div>
      </div>

    </div>
  );
});
