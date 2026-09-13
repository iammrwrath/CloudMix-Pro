import React, { useState, useEffect, useMemo } from 'react';
import { midiControllerService, MidiDevice, MidiActivityEvent } from '../services/MidiControllerService';
import { MidiProfile } from '../types/dj';
import { Sliders, Cpu, Check, AlertCircle, X, Sparkles, Search, Radio, Activity, CheckCircle2 } from 'lucide-react';

interface MidiModalProps {
  onClose: () => void;
}

const MANUFACTURERS = ['ALL', 'RELOOP', 'PIONEER DJ', 'TRAKTOR', 'NUMARK', 'HERCULES', 'DENON / RANE', 'CUSTOM'] as const;

export const MidiModal: React.FC<MidiModalProps> = ({ onClose }) => {
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [profiles, setProfiles] = useState<MidiProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<MidiProfile>(midiControllerService.getActiveProfile());
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLearning, setIsLearning] = useState(false);
  const [learningControl, setLearningControl] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<MidiActivityEvent | null>(null);

  useEffect(() => {
    setProfiles(midiControllerService.getProfiles());
    setActiveProfile(midiControllerService.getActiveProfile());

    midiControllerService.init().then(() => {
      setDevices(midiControllerService.getConnectedDevices());
    });

    const unsubProfile = midiControllerService.onProfileChange((p) => {
      setActiveProfile(p);
    });

    const unsubActivity = midiControllerService.onMidiActivity((ev) => {
      setLastActivity(ev);
    });

    return () => {
      unsubProfile();
      unsubActivity();
    };
  }, []);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // Manufacturer filter
      if (selectedManufacturer !== 'ALL') {
        if (selectedManufacturer === 'RELOOP' && p.manufacturer !== 'Reloop') return false;
        if (selectedManufacturer === 'PIONEER DJ' && p.manufacturer !== 'Pioneer DJ') return false;
        if (selectedManufacturer === 'TRAKTOR' && p.manufacturer !== 'Native Instruments') return false;
        if (selectedManufacturer === 'NUMARK' && p.manufacturer !== 'Numark') return false;
        if (selectedManufacturer === 'HERCULES' && p.manufacturer !== 'Hercules') return false;
        if (selectedManufacturer === 'DENON / RANE' && p.manufacturer !== 'Denon DJ' && p.manufacturer !== 'Rane') return false;
        if (selectedManufacturer === 'CUSTOM' && p.manufacturer !== 'User Defined') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
        const matchMfg = p.manufacturer.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchTags && !matchMfg) return false;
      }

      return true;
    });
  }, [profiles, selectedManufacturer, searchQuery]);

  const handleSelectProfile = (profileId: string) => {
    midiControllerService.loadProfile(profileId);
  };

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-dj-panel border border-dj-border rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dj-border bg-dj-surface/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Sliders className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-white">DJ Controller & MIDI Mapping Hub</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {profiles.length} Profiles
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Plug-and-play presets with WebMIDI auto-detection & Visual MIDI Learn
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(92vh-130px)]">
          {/* 1. Connected Hardware & Live Activity Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Connected Devices */}
            <div className="bg-dj-surface/80 rounded-xl p-3 border border-dj-border flex flex-col justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                CONNECTED HARDWARE
              </span>
              {devices.length > 0 ? (
                <div className="space-y-1.5">
                  {devices.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-emerald-500/40"
                    >
                      <div className="flex items-center space-x-2 overflow-hidden">
                        <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-xs font-bold text-white truncate">{d.name}</span>
                          <span className="text-[9px] font-mono text-slate-400">{d.manufacturer || 'USB MIDI Device'}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center space-x-2 p-2 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>No USB controller detected. Connect your device via USB to activate hardware mixing.</span>
                </div>
              )}
            </div>

            {/* Live MIDI Bus Activity Monitor */}
            <div className="bg-dj-surface/80 rounded-xl p-3 border border-dj-border flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  LIVE MIDI MONITOR
                </span>
                <span className="flex items-center space-x-1 text-[9px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>LISTENING</span>
                </span>
              </div>

              {lastActivity ? (
                <div className="p-2 rounded-lg bg-slate-950/90 border border-cyan-500/30 font-mono text-xs text-slate-300 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-cyan-400 font-bold">STATUS: 0x{lastActivity.status.toString(16).toUpperCase()}</span>
                    <span className="text-purple-400 font-bold">CH: {lastActivity.channel + 1}</span>
                    <span className="text-amber-400 font-bold">D1: {lastActivity.data1}</span>
                    <span className="text-emerald-400 font-bold">VAL: {lastActivity.data2}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-white/5 pt-1">
                    <span>MAPPED ACTION:</span>
                    <span className="text-white font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                      {lastActivity.controlName || 'Unmapped Control'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 text-xs font-mono">
                  <span>Press buttons, move faders, or turn knobs to test</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Controller Profiles Section with Search & Manufacturer Tabs */}
          <div className="bg-dj-surface/80 rounded-xl p-3 border border-dj-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
                  CONTROLLER HARDWARE PROFILES
                </span>
                <span className="text-[11px] text-slate-400">
                  Select your controller below or let CloudMix Pro auto-detect upon connection
                </span>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search controller (e.g. Buddy, FLX4)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs bg-slate-900 rounded-lg border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Manufacturer Filter Strip */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none">
              {MANUFACTURERS.map((mfg) => (
                <button
                  key={mfg}
                  onClick={() => setSelectedManufacturer(mfg)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedManufacturer === mfg
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {mfg}
                </button>
              ))}
            </div>

            {/* Profiles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {filteredProfiles.map((p) => {
                const isSelected = activeProfile.id === p.id;

                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProfile(p.id)}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-900/80 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-white flex items-center space-x-1.5">
                          <span>{p.name}</span>
                          {p.id === 'reloop_buddy' && (
                            <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              FEATURED
                            </span>
                          )}
                        </span>
                        {isSelected ? (
                          <div className="flex items-center space-x-1 text-amber-400 text-[10px] font-mono font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ACTIVE</span>
                          </div>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-400">{p.manufacturer}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                        {p.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {p.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-400 border border-white/5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Visual MIDI Learn Wizard */}
          <div className="bg-dj-surface/80 rounded-xl p-3 border border-dj-border">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
                  VISUAL MIDI LEARN WIZARD
                </span>
                <span className="text-[11px] text-slate-400">
                  Map any physical knob, fader, pad, or button on your DJ controller
                </span>
              </div>
              {isLearning && (
                <button
                  onClick={cancelLearn}
                  className="px-2 py-0.5 rounded bg-rose-950 border border-rose-600 text-[10px] font-bold text-rose-300 uppercase hover:bg-rose-900 transition-colors cursor-pointer"
                >
                  Cancel Learn
                </button>
              )}
            </div>

            {isLearning ? (
              <div className="p-4 rounded-xl bg-amber-950/70 border border-amber-500 text-center animate-pulse">
                <p className="text-xs font-bold text-amber-300">
                  Listening for hardware input for:{' '}
                  <span className="text-white uppercase font-mono px-2 py-0.5 rounded bg-amber-900/60 border border-amber-600">
                    {learningControl}
                  </span>
                </p>
                <p className="text-[11px] text-amber-200/90 mt-2">
                  Touch any knob, fader, pad, or button on your physical DJ controller right now...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {[
                  'DeckA_Play',
                  'DeckA_Cue',
                  'DeckA_Sync',
                  'DeckA_Fader',
                  'DeckA_Filter',
                  'DeckA_EQ_High',
                  'DeckA_EQ_Low',
                  'DeckA_Stem_Vocals',
                  'DeckB_Play',
                  'DeckB_Cue',
                  'DeckB_Sync',
                  'DeckB_Fader',
                  'DeckB_Filter',
                  'DeckB_EQ_High',
                  'DeckB_EQ_Low',
                  'DeckB_Stem_Vocals',
                  'Crossfader',
                  'Master_Volume',
                  'DeckA_FX_Paddle',
                  'DeckB_FX_Paddle',
                ].map((ctrl) => (
                  <button
                    key={ctrl}
                    onClick={() => handleStartLearn(ctrl)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[10px] font-mono text-slate-300 hover:text-amber-400 transition-colors text-center truncate cursor-pointer"
                  >
                    Learn {ctrl}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-dj-border bg-dj-surface/90 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Active Profile:{' '}
              <strong className="text-white font-mono">{activeProfile.name}</strong> ({activeProfile.mappings.length} mappings)
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

