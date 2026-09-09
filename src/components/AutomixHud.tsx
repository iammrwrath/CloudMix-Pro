import React, { useState, useEffect } from 'react';
import { AutomixMode, AutomixState, DeckState } from '../types/dj';
import { automixService } from '../services/AutomixService';
import { Bot, Play, Pause, FastForward, Activity, Zap } from 'lucide-react';

interface AutomixHudProps {
  deckA: DeckState;
  deckB: DeckState;
}

export const AutomixHud: React.FC<AutomixHudProps> = ({ deckA, deckB }) => {
  const [automixState, setAutomixState] = useState<AutomixState>(automixService.getState());

  useEffect(() => {
    const unsub = automixService.subscribe((state) => {
      setAutomixState(state);
    });
    return () => unsub();
  }, []);

  const modes: { id: AutomixMode; label: string; desc: string }[] = [
    { id: 'stem_swap', label: 'NEURAL STEM SWAP', desc: 'Downbeat Bass & Vocal Swap' },
    { id: 'eq_blend', label: 'SMOOTH EQ BLEND', desc: '16-Bar High/Low Crossfade' },
    { id: 'echo_drop', label: 'ECHO OUT DROP', desc: '1/2 Beat Delay Drop' },
  ];

  const durations = [8, 16, 32];

  return (
    <div className="w-full bg-slate-950/90 backdrop-blur-xl rounded-2xl border border-white/10 p-3.5 shadow-2xl">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Engine Status & Master Toggle */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-400 p-0.5 flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.5)]">
            <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-mono font-black text-sm text-white">
                AUTOMIX AI ASSISTANT
              </span>
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  automixState.active
                    ? 'bg-purple-950 text-purple-300 border-purple-500 animate-pulse'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                {automixState.active ? (automixState.transitioning ? 'TRANSITIONING' : 'MONITORING') : 'STANDBY'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Autonomous phrase-matched mixing with Neural Mix transition algorithms
            </span>
          </div>
        </div>

        {/* Center: Transition Mode Selector */}
        <div className="flex items-center space-x-1.5 bg-slate-900/80 p-1 rounded-xl border border-white/5">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => automixService.setMode(m.id)}
              className={`px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer border ${
                automixState.mode === m.id
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                  : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="text-[10px] font-mono font-black">{m.label}</div>
              <div className="text-[8px] text-slate-300 opacity-80">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Right: Controls & Trigger */}
        <div className="flex items-center space-x-2.5">
          {/* Duration Pills */}
          <div className="flex items-center space-x-1 bg-slate-900 px-2 py-1 rounded-lg border border-white/5">
            <span className="text-[9px] font-mono text-slate-400 mr-1">BARS:</span>
            {durations.map((d) => (
              <button
                key={d}
                onClick={() => automixService.setDurationBeats(d)}
                className={`w-6 h-5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                  automixState.transitionDurationBeats === d
                    ? 'bg-white text-black font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d / 4}
              </button>
            ))}
          </div>

          {/* Trigger Now Button */}
          <button
            onClick={() => automixService.triggerInstantTransition(deckA, deckB)}
            disabled={!deckA.track || !deckB.track}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/40 font-mono text-xs font-bold transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-sm"
          >
            <FastForward className="w-4 h-4" />
            <span>MIX NOW</span>
          </button>

          {/* Master Enable/Disable Toggle */}
          <button
            onClick={() => automixService.toggleAutomix(deckA, deckB)}
            className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl font-mono text-xs font-black transition-all active:scale-95 cursor-pointer border ${
              automixState.active
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.6)]'
                : 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
            }`}
          >
            {automixState.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{automixState.active ? 'STOP AUTOMIX' : 'START AUTOMIX'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar when transitioning */}
      {automixState.transitioning && (
        <div className="w-full mt-3 pt-2 border-t border-white/5 flex flex-col space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-purple-300 font-bold">
              Autonomous Crossfade $\to$ Deck {automixState.targetDeck}
            </span>
            <span className="text-white font-black">
              {Math.round(automixState.progress * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 transition-all"
              style={{ width: `${automixState.progress * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
