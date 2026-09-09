import React, { useState, useEffect } from 'react';
import { midiControllerService, MidiDevice } from '../services/MidiControllerService';
import { Sliders, Cpu, Check, AlertCircle, X, Sparkles } from 'lucide-react';

interface MidiModalProps {
  onClose: () => void;
}

export const MidiModal: React.FC<MidiModalProps> = ({ onClose }) => {
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [selectedPreset, setSelectedPreset] = useState('Pioneer DDJ-FLX4 / DDJ-400');
  const [isLearning, setIsLearning] = useState(false);
  const [learningControl, setLearningControl] = useState<string | null>(null);

  useEffect(() => {
    midiControllerService.init().then(() => {
      setDevices(midiControllerService.getConnectedDevices());
    });
  }, []);

  const handleStartLearn = (controlName: string) => {
    setIsLearning(true);
    setLearningControl(controlName);
    midiControllerService.startLearn(controlName);
  };

  const cancelLearn = () => {
    setIsLearning(false);
    setLearningControl(null);
    midiControllerService.cancelLearn();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dj-panel border border-dj-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dj-border bg-dj-surface/90">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-base text-white">DJ Controller & MIDI Mappings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Device Detection */}
          <div className="bg-dj-surface rounded-xl p-3 border border-dj-border">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
              CONNECTED HARDWARE
            </span>
            {devices.length > 0 ? (
              <div className="space-y-1.5">
                {devices.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-emerald-500/40"
                  >
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">{d.name}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  No hardware DJ controller detected via WebMIDI. Connect your USB controller and allow MIDI access in your browser.
                </span>
              </div>
            )}
          </div>

          {/* Preset Selection */}
          <div className="bg-dj-surface rounded-xl p-3 border border-dj-border">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
              CONTROLLER PROFILES
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Pioneer DDJ-FLX4 / DDJ-400',
                'Pioneer DDJ-REV1',
                'Traktor Kontrol S2 / S4',
                'Numark Mixtrack Pro FX',
                'Hercules DJControl Inpulse',
                'Custom User Profile',
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPreset(p)}
                  className={`p-2 rounded-lg text-left text-xs font-semibold border transition-all ${
                    selectedPreset === p
                      ? 'bg-amber-950/70 border-amber-500/80 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive MIDI Learn */}
          <div className="bg-dj-surface rounded-xl p-3 border border-dj-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                VISUAL MIDI LEARN WIZARD
              </span>
              {isLearning && (
                <button
                  onClick={cancelLearn}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase"
                >
                  Cancel Learn
                </button>
              )}
            </div>

            {isLearning ? (
              <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-500/80 text-center animate-pulse">
                <p className="text-xs font-bold text-amber-300">
                  Awaiting input for: <span className="text-white uppercase">{learningControl}</span>
                </p>
                <p className="text-[11px] text-amber-200/80 mt-1">
                  Touch any knob, fader, or pad on your physical DJ controller now...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {[
                  'DeckA_Play',
                  'DeckA_Cue',
                  'DeckA_Filter',
                  'DeckA_Fader',
                  'Crossfader',
                  'DeckB_Play',
                  'DeckB_Cue',
                  'DeckB_Filter',
                  'DeckB_Fader',
                ].map((ctrl) => (
                  <button
                    key={ctrl}
                    onClick={() => handleStartLearn(ctrl)}
                    className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 hover:text-amber-400 transition-colors text-center truncate"
                  >
                    Learn {ctrl}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
