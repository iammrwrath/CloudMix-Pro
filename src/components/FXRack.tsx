import React from 'react';
import { DeckId, FXType, FXUnit } from '../types/dj';
import { RotaryKnob } from './RotaryKnob';
import { Sparkles, Power, Activity } from 'lucide-react';

interface FXRackProps {
  deckAfx: FXUnit;
  deckBfx: FXUnit;
  onUpdateDeckAFX: (fx: FXUnit) => void;
  onUpdateDeckBFX: (fx: FXUnit) => void;
}

const FX_TYPES: { id: FXType; label: string; desc: string }[] = [
  { id: 'echo', label: 'ECHO', desc: 'BPM Delay' },
  { id: 'reverb', label: 'REVERB', desc: 'Space Hall' },
  { id: 'flanger', label: 'FLANGER', desc: 'Jet Sweep' },
  { id: 'bitcrusher', label: 'CRUSHER', desc: '8-Bit Lo-Fi' },
  { id: 'roll', label: 'ROLL', desc: 'Stutter Loop' },
  { id: 'filter', label: 'FILTER', desc: 'Peak Sweep' },
];

const BEAT_DIVISIONS = [
  { label: '1/8', val: 0.125 },
  { label: '1/4', val: 0.25 },
  { label: '1/2', val: 0.5 },
  { label: '1', val: 1.0 },
  { label: '2', val: 2.0 },
  { label: '4', val: 4.0 },
];

export const FXRack: React.FC<FXRackProps> = ({
  deckAfx,
  deckBfx,
  onUpdateDeckAFX,
  onUpdateDeckBFX,
}) => {
  const renderDeckUnit = (
    deckId: DeckId,
    fx: FXUnit,
    onUpdate: (fx: FXUnit) => void,
    accentColor: string,
    glowColor: string
  ) => {
    return (
      <div className="flex-1 bg-slate-950/70 backdrop-blur-xl rounded-xl p-3 border border-white/10 shadow-lg flex flex-col justify-between">
        {/* Unit Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
          <div className="flex items-center space-x-2">
            <div
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{
                backgroundColor: fx.enabled ? accentColor : '#64748b',
                boxShadow: fx.enabled ? `0 0 8px ${glowColor}` : 'none',
              }}
            />
            <span className="font-mono font-black text-xs text-slate-200">
              DECK {deckId} FX RACK
            </span>
          </div>

          <button
            onClick={() => onUpdate({ ...fx, enabled: !fx.enabled })}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-[11px] font-mono font-extrabold transition-all cursor-pointer border ${
              fx.enabled
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-black border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{fx.enabled ? 'ACTIVE' : 'BYPASS'}</span>
          </button>
        </div>

        {/* FX Type Selector Pills */}
        <div className="grid grid-cols-6 gap-1.5 mb-3">
          {FX_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => onUpdate({ ...fx, type: t.id })}
              className={`py-1.5 px-1 rounded-md text-center transition-all cursor-pointer border ${
                fx.type === t.id
                  ? 'bg-slate-800 border-white/30 text-white shadow-sm'
                  : 'bg-slate-900/80 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div
                className="text-[10px] font-mono font-black leading-none"
                style={{ color: fx.type === t.id ? accentColor : undefined }}
              >
                {t.label}
              </div>
              <div className="text-[8px] text-slate-400 font-sans tracking-tight mt-0.5 truncate">
                {t.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Lower Controls: Beat Divisions + Wet/Dry & Param Dials */}
        <div className="flex items-center justify-between bg-slate-900/60 rounded-lg p-2 border border-white/5">
          {/* Beat Divisions */}
          <div className="flex flex-col space-y-1">
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
              BEAT DIVISION
            </span>
            <div className="flex items-center space-x-1">
              {BEAT_DIVISIONS.map((b) => (
                <button
                  key={b.label}
                  onClick={() => onUpdate({ ...fx, beats: b.val })}
                  className={`w-7 h-6 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                    fx.beats === b.val
                      ? 'bg-white text-black border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-white'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rotary Controls */}
          <div className="flex items-center space-x-4 pr-2">
            <div className="flex flex-col items-center">
              <RotaryKnob
                value={fx.param}
                min={0}
                max={1}
                step={0.01}
                defaultValue={0.5}
                size={44}
                accentColor={accentColor}
                label="PARAM"
                onChange={(val) => onUpdate({ ...fx, param: val })}
              />
            </div>

            <div className="flex flex-col items-center">
              <RotaryKnob
                value={fx.wetDry}
                min={0}
                max={1}
                step={0.01}
                defaultValue={0.5}
                size={44}
                accentColor={accentColor}
                label="WET / DRY"
                onChange={(val) => onUpdate({ ...fx, wetDry: val })}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-3 p-3 bg-slate-950/90 rounded-2xl border border-white/10 shadow-2xl">
      {renderDeckUnit('A', deckAfx, onUpdateDeckAFX, '#00f0ff', 'rgba(0,240,255,0.6)')}
      {renderDeckUnit('B', deckBfx, onUpdateDeckBFX, '#ff2e88', 'rgba(255,46,136,0.6)')}
    </div>
  );
};
