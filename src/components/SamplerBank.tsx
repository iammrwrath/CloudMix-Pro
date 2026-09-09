import React, { useState, useEffect, useRef } from 'react';
import { SamplerSlot } from '../types/dj';
import { samplerEngine } from '../audio/SamplerEngine';
import { Volume2, Upload, Sparkles, Disc } from 'lucide-react';

export const SamplerBank: React.FC = () => {
  const [slots, setSlots] = useState<SamplerSlot[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeUploadSlot, setActiveUploadSlot] = useState<number | null>(null);

  useEffect(() => {
    const unsub = samplerEngine.subscribe((updatedSlots) => {
      setSlots(updatedSlots);
    });
    return () => unsub();
  }, []);

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeUploadSlot === null || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const arrayBuffer = await file.arrayBuffer();
    await samplerEngine.loadCustomSample(activeUploadSlot, arrayBuffer, file.name.replace(/\.[^/.]+$/, ''));
    setActiveUploadSlot(null);
  };

  return (
    <div className="w-full bg-slate-950/90 backdrop-blur-xl rounded-2xl border border-white/10 p-3.5 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
          <span className="font-mono font-black text-xs text-white tracking-wider">
            PRO 8-SLOT SOUNDBOARD & SAMPLER
          </span>
          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
            (Web Audio Real-Time Synthesis + Custom File Loader)
          </span>
        </div>

        <span className="text-[10px] font-mono text-slate-400">
          Trigger: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">Alt + 1-8</kbd>
        </span>
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
          return (
            <div
              key={slot.id}
              className="flex flex-col bg-slate-900/80 rounded-xl p-2 border border-white/10 hover:border-white/20 transition-all shadow-inner"
            >
              {/* Pad Button */}
              <button
                onMouseDown={() => samplerEngine.triggerSlot(slot.id)}
                className={`relative h-20 w-full rounded-lg flex flex-col items-center justify-between p-2 font-mono transition-all cursor-pointer select-none active:scale-95 ${
                  slot.isPlaying
                    ? 'ring-2 ring-white scale-[0.98]'
                    : 'hover:brightness-110'
                }`}
                style={{
                  background: slot.isPlaying
                    ? `linear-gradient(135deg, ${slot.color}, #ffffff)`
                    : `linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.9))`,
                  border: `1px solid ${slot.color}44`,
                  boxShadow: slot.isPlaying
                    ? `0 0 20px ${slot.color}`
                    : `0 2px 8px rgba(0,0,0,0.4)`,
                }}
              >
                <div className="w-full flex items-center justify-between">
                  <span
                    className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-black/60 text-white"
                    style={{ color: slot.color }}
                  >
                    #{index + 1}
                  </span>
                  <span className="text-[8px] text-slate-400 font-bold">
                    Alt+{index + 1}
                  </span>
                </div>

                <div className="text-center font-black text-xs tracking-tight text-white line-clamp-1">
                  {slot.name}
                </div>

                <div className="w-full flex items-center justify-between text-[8px] text-slate-400">
                  <span>{slot.isCustom ? 'CUSTOM' : 'PRESET'}</span>
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: slot.isPlaying ? '#ffffff' : slot.color,
                      boxShadow: slot.isPlaying ? `0 0 6px #ffffff` : 'none',
                    }}
                  />
                </div>
              </button>

              {/* Pad Volume Slider & Custom Upload */}
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={slot.volume}
                  onChange={(e) => samplerEngine.setSlotVolume(slot.id, parseFloat(e.target.value))}
                  title={`Volume: ${Math.round(slot.volume * 100)}%`}
                  className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
                />

                <button
                  onClick={() => {
                    setActiveUploadSlot(slot.id);
                    fileInputRef.current?.click();
                  }}
                  title="Upload custom audio file to this pad"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
