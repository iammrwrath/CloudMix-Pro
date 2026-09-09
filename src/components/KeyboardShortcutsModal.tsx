import React from 'react';
import { X, Keyboard, Command, Music, Sliders, Volume2, Sparkles } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const sections = [
    {
      title: 'DECK A CONTROLS (Cyan)',
      color: '#00f0ff',
      shortcuts: [
        { key: 'W', action: 'Play / Pause' },
        { key: 'Q', action: 'Cue (Return / Set)' },
        { key: 'E', action: 'Beatgrid Sync' },
        { key: '1, 2, 3, 4', action: 'Trigger Hot Cues 1–4' },
        { key: 'A', action: 'Loop In' },
        { key: 'S', action: 'Loop Out' },
        { key: 'D', action: '4-Bar Auto Loop' },
      ],
    },
    {
      title: 'DECK B CONTROLS (Rose)',
      color: '#ff2e88',
      shortcuts: [
        { key: 'I', action: 'Play / Pause' },
        { key: 'U', action: 'Cue (Return / Set)' },
        { key: 'O', action: 'Beatgrid Sync' },
        { key: '7, 8, 9, 0', action: 'Trigger Hot Cues 1–4' },
        { key: 'J', action: 'Loop In' },
        { key: 'K', action: 'Loop Out' },
        { key: 'L', action: '4-Bar Auto Loop' },
      ],
    },
    {
      title: 'MIXER & CROSSFADER',
      color: '#a855f7',
      shortcuts: [
        { key: 'Z', action: 'Snap Crossfader to Deck A (-1.0)' },
        { key: 'X', action: 'Center Crossfader (0.0)' },
        { key: 'C', action: 'Snap Crossfader to Deck B (+1.0)' },
        { key: '[', action: 'Toggle Headphone Cue A' },
        { key: ']', action: 'Toggle Headphone Cue B' },
      ],
    },
    {
      title: 'SAMPLER & WORKSTATION',
      color: '#10b981',
      shortcuts: [
        { key: 'Alt + 1–8', action: 'Trigger Sampler Drops 1–8' },
        { key: 'V', action: 'Toggle Horizontal / Vertical Waveforms' },
        { key: '?', action: 'Toggle Keyboard Shortcuts Modal' },
        { key: 'Esc', action: 'Close Modal' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-950 border border-white/20 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white font-mono tracking-tight">
                KEYBOARD DJ SHORTCUTS ENGINE
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Lightning-fast zero-latency hardware control straight from your keyboard
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          {sections.map((sec) => (
            <div
              key={sec.title}
              className="bg-slate-900/60 rounded-xl p-3.5 border border-white/5 flex flex-col space-y-2.5"
            >
              <div
                className="font-mono text-xs font-black tracking-wider flex items-center space-x-2"
                style={{ color: sec.color }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: sec.color }}
                />
                <span>{sec.title}</span>
              </div>

              <div className="flex flex-col space-y-1.5">
                {sec.shortcuts.map((sc) => (
                  <div
                    key={sc.key}
                    className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0"
                  >
                    <span className="text-slate-300 font-medium">{sc.action}</span>
                    <kbd className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold text-[11px] border border-slate-700 shadow-sm">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900/80 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Tip: Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200">?</kbd> at any time to toggle this reference</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold cursor-pointer transition-colors"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
};
