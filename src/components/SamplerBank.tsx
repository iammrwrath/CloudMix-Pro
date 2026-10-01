import React, { useState, useEffect, useRef } from 'react';
import { SamplerSlot, SamplerBankPreset, SamplerTriggerMode } from '../types/dj';
import { samplerEngine, SAMPLER_BANKS } from '../audio/SamplerEngine';
import { Volume2, Upload, Sparkles, Disc, Radio, Sliders, Square, Music, Zap } from 'lucide-react';

const TRIGGER_MODES: { label: string; mode: SamplerTriggerMode; desc: string }[] = [
  { label: 'SHOT', mode: 'one_shot', desc: 'One-Shot (Stutter): Triggers from beginning on tap' },
  { label: 'GATE', mode: 'hold', desc: 'Hold (Gate): Plays while held down, stops on release' },
  { label: 'TOGL', mode: 'toggle', desc: 'Toggle: Tap to start, tap again to stop' },
  { label: 'LOOP', mode: 'loop', desc: 'Loop: Seamless repeat until tapped' },
];

export const SamplerBank: React.FC = () => {
  const [slots, setSlots] = useState<SamplerSlot[]>([]);
  const [currentBank, setCurrentBank] = useState<SamplerBankPreset>('reggae_soundclash');
  const [quantize, setQuantize] = useState<boolean>(false);
  const [masterVol, setMasterVol] = useState<number>(0.9);
  const [activeUploadSlot, setActiveUploadSlot] = useState<number | null>(null);
  const [isDraggingOverSlot, setIsDraggingOverSlot] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsubSlots = samplerEngine.subscribe((updatedSlots) => {
      setSlots(updatedSlots);
    });
    const unsubBank = samplerEngine.onBankChange((b) => {
      setCurrentBank(b);
    });
    const unsubQuantize = samplerEngine.onQuantizeChange((q) => {
      setQuantize(q);
    });

    setCurrentBank(samplerEngine.getCurrentBank());
    setQuantize(samplerEngine.isQuantizeEnabled());

    return () => {
      unsubSlots();
      unsubBank();
      unsubQuantize();
    };
  }, []);

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeUploadSlot === null || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const arrayBuffer = await file.arrayBuffer();
    await samplerEngine.loadCustomSample(activeUploadSlot, arrayBuffer, file.name.replace(/\.[^/.]+$/, ''));
    setActiveUploadSlot(null);
  };

  const handleFileDrop = async (e: React.DragEvent, slotId: number) => {
    e.preventDefault();
    setIsDraggingOverSlot(null);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    const file = e.dataTransfer.files[0];
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i)) return;
    const arrayBuffer = await file.arrayBuffer();
    await samplerEngine.loadCustomSample(slotId, arrayBuffer, file.name.replace(/\.[^/.]+$/, ''));
  };

  return (
    <div className="w-full bg-slate-950/95 backdrop-blur-xl rounded-2xl border border-white/10 p-3 sm:p-4 shadow-2xl">
      {/* Top Studio Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 mb-3.5">
        {/* Left: Brand & Bank Switcher */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.9)] animate-pulse" />
            <span className="font-mono font-black text-xs text-white tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              STUDIO SAMPLER & FX
            </span>
          </div>

          {/* Sound Banks */}
          <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-white/10">
            {(['reggae_soundclash', 'hiphop_trap', 'custom'] as SamplerBankPreset[]).map((bankKey) => {
              const bank = SAMPLER_BANKS[bankKey];
              const isSelected = currentBank === bankKey;
              return (
                <button
                  key={bankKey}
                  onClick={() => samplerEngine.setBank(bankKey)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase rounded tracking-tight transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={bank.title}
                >
                  {bankKey === 'reggae_soundclash' ? 'SOUNDCLASH' : bankKey === 'hiphop_trap' ? 'HIP-HOP' : 'CUSTOM'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Quantize, Stop All & Master Volume */}
        <div className="flex items-center gap-3">
          {/* Quantize Toggle */}
          <button
            onClick={() => samplerEngine.setQuantize(!quantize)}
            title="Beat Quantize: Snap sample triggers directly to Master Deck's 1/4 beatgrid"
            className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
              quantize
                ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.8)]'
                : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3" />
            QUANTIZE {quantize ? 'ON' : 'OFF'}
          </button>

          {/* Emergency Stop All */}
          <button
            onClick={() => samplerEngine.stopAll()}
            title="Instantly stop all playing sample pads"
            className="px-2.5 py-1 rounded-md text-[10px] font-mono font-black bg-rose-950/80 text-rose-300 border border-rose-600/60 hover:bg-rose-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
          >
            <Square className="w-2.5 h-2.5 fill-current" />
            STOP ALL
          </button>

          {/* Master Volume Fader */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-white/10">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={masterVol}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setMasterVol(v);
                samplerEngine.setMasterVolume(v);
              }}
              title={`Sampler Master Volume: ${Math.round(masterVol * 100)}%`}
              className="w-16 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <span className="text-[10px] font-mono text-slate-500 hidden xl:inline">
            <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Alt+1-8</kbd>
          </span>
        </div>
      </div>

      {/* Hidden file input for custom samples */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCustomUpload}
        accept="audio/*"
        className="hidden"
      />

      {/* 8-Pad Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {slots.map((slot, index) => {
          const currentMode = slot.triggerMode || 'one_shot';
          const isDragging = isDraggingOverSlot === slot.id;

          return (
            <div
              key={slot.id}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOverSlot(slot.id);
              }}
              onDragLeave={() => setIsDraggingOverSlot(null)}
              onDrop={(e) => handleFileDrop(e, slot.id)}
              className={`flex flex-col bg-slate-900/90 rounded-xl p-2 border transition-all shadow-inner ${
                isDragging
                  ? 'border-amber-400 bg-amber-950/30 ring-2 ring-amber-400'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Trigger Mode Selector */}
              <div className="flex items-center justify-between mb-1.5 text-[8.5px] font-mono">
                <span className="text-slate-400 font-bold">MODE</span>
                <div className="flex bg-slate-950/80 rounded p-0.5 border border-white/5">
                  {TRIGGER_MODES.map((m) => (
                    <button
                      key={m.mode}
                      onClick={() => samplerEngine.setSlotTriggerMode(slot.id, m.mode)}
                      title={m.desc}
                      className={`px-1 py-0.2 rounded transition-all cursor-pointer font-bold ${
                        currentMode === m.mode
                          ? 'bg-amber-500 text-black shadow-sm font-extrabold'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pad Button */}
              <button
                onMouseDown={() => samplerEngine.triggerSlot(slot.id, 'down')}
                onMouseUp={() => samplerEngine.triggerSlot(slot.id, 'up')}
                onMouseLeave={() => {
                  if (currentMode === 'hold' && slot.isPlaying) {
                    samplerEngine.triggerSlot(slot.id, 'up');
                  }
                }}
                className={`relative h-20 w-full rounded-lg flex flex-col items-center justify-between p-2 font-mono transition-all cursor-pointer select-none active:scale-95 ${
                  slot.isPlaying
                    ? 'ring-2 ring-white scale-[0.98]'
                    : 'hover:brightness-110'
                }`}
                style={{
                  background: slot.isPlaying
                    ? `linear-gradient(135deg, ${slot.color}, #ffffff)`
                    : `linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))`,
                  border: `1px solid ${slot.color}55`,
                  boxShadow: slot.isPlaying
                    ? `0 0 22px ${slot.color}`
                    : `0 2px 8px rgba(0,0,0,0.5)`,
                }}
              >
                <div className="w-full flex items-center justify-between">
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded bg-black/60 text-white"
                    style={{ color: slot.color }}
                  >
                    #{index + 1}
                  </span>
                  <span className="text-[8px] text-slate-400 font-bold">
                    Alt+{index + 1}
                  </span>
                </div>

                <div className="text-center font-black text-xs tracking-tight text-white line-clamp-1 px-1">
                  {slot.name}
                </div>

                <div className="w-full flex items-center justify-between text-[8px] text-slate-400 font-bold">
                  <span>{slot.isCustom ? 'USER' : currentMode.toUpperCase()}</span>
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: slot.isPlaying ? '#ffffff' : slot.color,
                      boxShadow: slot.isPlaying ? `0 0 8px #ffffff` : 'none',
                    }}
                  />
                </div>
              </button>

              {/* Pitch Adjust & Vol Slider */}
              <div className="flex flex-col gap-1 mt-2 pt-1.5 border-t border-white/5">
                {/* Volume Slider */}
                <div className="flex items-center justify-between gap-1 text-[8.5px] font-mono text-slate-400">
                  <span className="text-[7.5px] font-bold">VOL</span>
                  <input
                    type="range"
                    min="0"
                    max="1.2"
                    step="0.05"
                    value={slot.volume}
                    onChange={(e) => samplerEngine.setSlotVolume(slot.id, parseFloat(e.target.value))}
                    title={`Pad Volume: ${Math.round(slot.volume * 100)}%`}
                    className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-white"
                  />
                  <button
                    onClick={() => {
                      setActiveUploadSlot(slot.id);
                      fileInputRef.current?.click();
                    }}
                    title="Load custom audio file onto this pad (or drag & drop)"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Upload className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Pitch Adjust Slider (-12 to +12 semitones) */}
                <div className="flex items-center justify-between gap-1 text-[8.5px] font-mono text-slate-400">
                  <span className="text-[7.5px] font-bold">PITCH</span>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={slot.pitchSemitones || 0}
                    onChange={(e) => samplerEngine.setSlotPitch(slot.id, parseInt(e.target.value, 10))}
                    title={`Pitch Tuning: ${(slot.pitchSemitones || 0) > 0 ? '+' : ''}${slot.pitchSemitones || 0} semitones`}
                    className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span
                    onClick={() => samplerEngine.setSlotPitch(slot.id, 0)}
                    title="Double-click or click to reset pitch to 0"
                    className="text-[7.5px] font-black w-5 text-right cursor-pointer text-cyan-400 hover:text-white"
                  >
                    {(slot.pitchSemitones || 0) > 0 ? `+${slot.pitchSemitones}` : slot.pitchSemitones || 0}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
