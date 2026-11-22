import { MidiMappingRule, MidiProfile } from '../types/dj';
import { storageCache } from './StorageCacheService';

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer?: string;
  state: string;
}

export interface MidiActivityEvent {
  status: number;
  data1: number;
  data2: number;
  channel: number;
  controlName?: string;
  timestamp: number;
}

export type MidiEventCallback = (controlName: string, value: number, rawData: Uint8Array) => void;

// Helper to build standard 2-deck mappings
const buildStandard2DeckMappings = (deckACh = 0, deckBCh = 1): MidiMappingRule[] => [
  // Deck A Transport
  { controlName: 'DeckA_Play', statusByte: 0x90 + deckACh, data1: 0x0B, channel: deckACh, type: 'button' },
  { controlName: 'DeckA_Cue', statusByte: 0x90 + deckACh, data1: 0x0C, channel: deckACh, type: 'button' },
  { controlName: 'DeckA_Sync', statusByte: 0x90 + deckACh, data1: 0x58, channel: deckACh, type: 'button' },
  // Deck A Mixer & EQ
  { controlName: 'DeckA_EQ_High', statusByte: 0xb0 + deckACh, data1: 0x07, channel: deckACh, type: 'knob' },
  { controlName: 'DeckA_EQ_Mid', statusByte: 0xb0 + deckACh, data1: 0x0b, channel: deckACh, type: 'knob' },
  { controlName: 'DeckA_EQ_Low', statusByte: 0xb0 + deckACh, data1: 0x0f, channel: deckACh, type: 'knob' },
  { controlName: 'DeckA_Filter', statusByte: 0xb0 + deckACh, data1: 0x17, channel: deckACh, type: 'knob' },
  { controlName: 'DeckA_Fader', statusByte: 0xb0 + deckACh, data1: 0x13, channel: deckACh, type: 'slider' },
  { controlName: 'DeckA_Pitch', statusByte: 0xb0 + deckACh, data1: 0x00, channel: deckACh, type: 'slider' },
  { controlName: 'DeckA_JogTurn', statusByte: 0xb0 + deckACh, data1: 0x21, channel: deckACh, type: 'jog' },
  // Deck A Loops & FX & Stems
  { controlName: 'DeckA_Loop_Toggle', statusByte: 0x90 + deckACh, data1: 0x23, channel: deckACh, type: 'button' },
  { controlName: 'DeckA_Loop_Halve', statusByte: 0xb0 + deckACh, data1: 0x22, channel: deckACh, type: 'knob' },
  { controlName: 'DeckA_FX_Paddle', statusByte: 0x90 + deckACh, data1: 0x30, channel: deckACh, type: 'button' },
  { controlName: 'DeckA_Stem_Vocals', statusByte: 0x90 + deckACh, data1: 0x35, channel: deckACh, type: 'button' },
  { controlName: 'DeckA_Stem_Harmonics', statusByte: 0x90 + deckACh, data1: 0x36, channel: deckACh, type: 'button' },
  { controlName: 'DeckA_Stem_Bass', statusByte: 0x90 + deckACh, data1: 0x37, channel: deckACh, type: 'button' },
  { controlName: 'DeckA_Stem_Drums', statusByte: 0x90 + deckACh, data1: 0x38, channel: deckACh, type: 'button' },
  { controlName: 'Headphone_Cue_A', statusByte: 0x90 + deckACh, data1: 0x54, channel: deckACh, type: 'button' },

  // Deck A Hot Cues 1-8
  { controlName: 'DeckA_HotCue_1', statusByte: 0x90 + deckACh, data1: 0x24, channel: deckACh, type: 'button' },
  { controlName: 'DeckA_HotCue_2', statusByte: 0x90 + deckACh, data1: 0x25, channel: deckACh, type: 'button' },
  { controlName: 'DeckA_HotCue_3', statusByte: 0x90 + deckACh, data1: 0x26, channel: deckACh, type: 'button' },
  { controlName: 'DeckA_HotCue_4', statusByte: 0x90 + deckACh, data1: 0x27, channel: deckACh, type: 'button' },
  { controlName: 'DeckA_HotCue_5', statusByte: 0x90 + deckACh, data1: 0x28, channel: deckACh, type: 'button' },
  { controlName: 'DeckA_HotCue_6', statusByte: 0x90 + deckACh, data1: 0x29, channel: deckACh, type: 'button' },
  { controlName: 'DeckA_HotCue_7', statusByte: 0x90 + deckACh, data1: 0x2A, channel: deckACh, type: 'button' },
  { controlName: 'DeckA_HotCue_8', statusByte: 0x90 + deckACh, data1: 0x2B, channel: deckACh, type: 'button' },

  // Deck B Transport
  { controlName: 'DeckB_Play', statusByte: 0x90 + deckBCh, data1: 0x0B, channel: deckBCh, type: 'button' },
  { controlName: 'DeckB_Cue', statusByte: 0x90 + deckBCh, data1: 0x0C, channel: deckBCh, type: 'button' },
  { controlName: 'DeckB_Sync', statusByte: 0x90 + deckBCh, data1: 0x58, channel: deckBCh, type: 'button' },
  // Deck B Mixer & EQ
  { controlName: 'DeckB_EQ_High', statusByte: 0xb0 + deckBCh, data1: 0x07, channel: deckBCh, type: 'knob' },
  { controlName: 'DeckB_EQ_Mid', statusByte: 0xb0 + deckBCh, data1: 0x0b, channel: deckBCh, type: 'knob' },
  { controlName: 'DeckB_EQ_Low', statusByte: 0xb0 + deckBCh, data1: 0x0f, channel: deckBCh, type: 'knob' },
  { controlName: 'DeckB_Filter', statusByte: 0xb0 + deckBCh, data1: 0x17, channel: deckBCh, type: 'knob' },
  { controlName: 'DeckB_Fader', statusByte: 0xb0 + deckBCh, data1: 0x13, channel: deckBCh, type: 'slider' },
  { controlName: 'DeckB_Pitch', statusByte: 0xb0 + deckBCh, data1: 0x00, channel: deckBCh, type: 'slider' },
  { controlName: 'DeckB_JogTurn', statusByte: 0xb0 + deckBCh, data1: 0x21, channel: deckBCh, type: 'jog' },
  // Deck B Loops & FX & Stems
  { controlName: 'DeckB_Loop_Toggle', statusByte: 0x90 + deckBCh, data1: 0x23, channel: deckBCh, type: 'button' },
  { controlName: 'DeckB_Loop_Halve', statusByte: 0xb0 + deckBCh, data1: 0x22, channel: deckBCh, type: 'knob' },
  { controlName: 'DeckB_FX_Paddle', statusByte: 0x90 + deckBCh, data1: 0x30, channel: deckBCh, type: 'button' },
  { controlName: 'DeckB_Stem_Vocals', statusByte: 0x90 + deckBCh, data1: 0x35, channel: deckBCh, type: 'button' },
  { controlName: 'DeckB_Stem_Harmonics', statusByte: 0x90 + deckBCh, data1: 0x36, channel: deckBCh, type: 'button' },
  { controlName: 'DeckB_Stem_Bass', statusByte: 0x90 + deckBCh, data1: 0x37, channel: deckBCh, type: 'button' },
  { controlName: 'DeckB_Stem_Drums', statusByte: 0x90 + deckBCh, data1: 0x38, channel: deckBCh, type: 'button' },
  { controlName: 'Headphone_Cue_B', statusByte: 0x90 + deckBCh, data1: 0x54, channel: deckBCh, type: 'button' },

  // Deck B Hot Cues 1-8
  { controlName: 'DeckB_HotCue_1', statusByte: 0x90 + deckBCh, data1: 0x24, channel: deckBCh, type: 'button' },
  { controlName: 'DeckB_HotCue_2', statusByte: 0x90 + deckBCh, data1: 0x25, channel: deckBCh, type: 'button' },
  { controlName: 'DeckB_HotCue_3', statusByte: 0x90 + deckBCh, data1: 0x26, channel: deckBCh, type: 'button' },
  { controlName: 'DeckB_HotCue_4', statusByte: 0x90 + deckBCh, data1: 0x27, channel: deckBCh, type: 'button' },
  { controlName: 'DeckB_HotCue_5', statusByte: 0x90 + deckBCh, data1: 0x28, channel: deckBCh, type: 'button' },
  { controlName: 'DeckB_HotCue_6', statusByte: 0x90 + deckBCh, data1: 0x29, channel: deckBCh, type: 'button' },
  { controlName: 'DeckB_HotCue_7', statusByte: 0x90 + deckBCh, data1: 0x2A, channel: deckBCh, type: 'button' },
  { controlName: 'DeckB_HotCue_8', statusByte: 0x90 + deckBCh, data1: 0x2B, channel: deckBCh, type: 'button' },

  // Master Section
  { controlName: 'Crossfader', statusByte: 0xb0, data1: 0x1f, channel: 0, type: 'slider' },
  { controlName: 'Master_Volume', statusByte: 0xb0, data1: 0x02, channel: 0, type: 'knob' },
];

// Dedicated native Reloop Buddy hardware mapping matching Algoriddim djay specification
const buildReloopBuddyMappings = (): MidiMappingRule[] => [
  // ================= DECK A (Ch 0: 0x90 / 0xB0) =================
  // Transport
  { controlName: 'DeckA_Play', statusByte: 0x90, data1: 0x00, channel: 0, type: 'button' },
  { controlName: 'DeckA_Play_Shift', statusByte: 0x90, data1: 0x10, channel: 0, type: 'button' },
  { controlName: 'DeckA_Cue', statusByte: 0x90, data1: 0x01, channel: 0, type: 'button' },
  { controlName: 'DeckA_Cue_Shift', statusByte: 0x90, data1: 0x05, channel: 0, type: 'button' },
  { controlName: 'DeckA_Sync', statusByte: 0x90, data1: 0x02, channel: 0, type: 'button' },
  { controlName: 'DeckA_Sync_Shift', statusByte: 0x90, data1: 0x03, channel: 0, type: 'button' },
  { controlName: 'DeckA_Pitch', statusByte: 0xB0, data1: 0x09, channel: 0, type: 'slider' },
  { controlName: 'DeckA_JogTurn', statusByte: 0xB0, data1: 0x06, channel: 0, type: 'jog' },
  { controlName: 'DeckA_JogTouch', statusByte: 0x90, data1: 0x06, channel: 0, type: 'button' },
  { controlName: 'DeckA_JogBend', statusByte: 0xB0, data1: 0x2B, channel: 0, type: 'jog' },

  // Mixer, EQ & Filter (Deck A)
  { controlName: 'DeckA_Fader', statusByte: 0xB0, data1: 0x1C, channel: 0, type: 'slider' },
  { controlName: 'DeckA_Filter', statusByte: 0xB0, data1: 0x1A, channel: 0, type: 'knob' },
  { controlName: 'DeckA_EQ_Low', statusByte: 0xB0, data1: 0x19, channel: 0, type: 'knob' },
  { controlName: 'DeckA_EQ_High', statusByte: 0xB0, data1: 0x17, channel: 0, type: 'knob' },
  { controlName: 'Headphone_Cue_A', statusByte: 0x90, data1: 0x1B, channel: 0, type: 'button' },
  { controlName: 'DeckA_EQ_ModeToggle', statusByte: 0x90, data1: 0x23, channel: 0, type: 'button' },

  // ================= DECK B (Ch 1: 0x91 / 0xB1) =================
  // Transport
  { controlName: 'DeckB_Play', statusByte: 0x91, data1: 0x00, channel: 1, type: 'button' },
  { controlName: 'DeckB_Play_Shift', statusByte: 0x91, data1: 0x10, channel: 1, type: 'button' },
  { controlName: 'DeckB_Cue', statusByte: 0x91, data1: 0x01, channel: 1, type: 'button' },
  { controlName: 'DeckB_Cue_Shift', statusByte: 0x91, data1: 0x05, channel: 1, type: 'button' },
  { controlName: 'DeckB_Sync', statusByte: 0x91, data1: 0x02, channel: 1, type: 'button' },
  { controlName: 'DeckB_Sync_Shift', statusByte: 0x91, data1: 0x03, channel: 1, type: 'button' },
  { controlName: 'DeckB_Pitch', statusByte: 0xB1, data1: 0x09, channel: 1, type: 'slider' },
  { controlName: 'DeckB_JogTurn', statusByte: 0xB1, data1: 0x06, channel: 1, type: 'jog' },
  { controlName: 'DeckB_JogTouch', statusByte: 0x91, data1: 0x06, channel: 1, type: 'button' },
  { controlName: 'DeckB_JogBend', statusByte: 0xB1, data1: 0x2B, channel: 1, type: 'jog' },

  // Mixer, EQ & Filter (Deck B)
  { controlName: 'DeckB_Fader', statusByte: 0xB1, data1: 0x1C, channel: 1, type: 'slider' },
  { controlName: 'DeckB_Filter', statusByte: 0xB1, data1: 0x1A, channel: 1, type: 'knob' },
  { controlName: 'DeckB_EQ_Low', statusByte: 0xB1, data1: 0x19, channel: 1, type: 'knob' },
  { controlName: 'DeckB_EQ_High', statusByte: 0xB1, data1: 0x17, channel: 1, type: 'knob' },
  { controlName: 'Headphone_Cue_B', statusByte: 0x91, data1: 0x1B, channel: 1, type: 'button' },
  { controlName: 'DeckB_EQ_ModeToggle', statusByte: 0x91, data1: 0x23, channel: 1, type: 'button' },

  // ================= MASTER & LIBRARY (Ch 14: 0x9E / 0xBE) =================
  { controlName: 'Crossfader', statusByte: 0xBE, data1: 0x08, channel: 14, type: 'slider' },
  { controlName: 'Master_Volume', statusByte: 0xBE, data1: 0x0A, channel: 14, type: 'knob' },
  { controlName: 'Headphone_Volume', statusByte: 0xBE, data1: 0x0C, channel: 14, type: 'knob' },
  { controlName: 'Headphone_Mix', statusByte: 0xBE, data1: 0x0D, channel: 14, type: 'knob' },
  { controlName: 'Library_Scroll', statusByte: 0xBE, data1: 0x00, channel: 14, type: 'knob' },
  { controlName: 'DeckA_Load', statusByte: 0x9E, data1: 0x02, channel: 14, type: 'button' },
  { controlName: 'DeckB_Load', statusByte: 0x9E, data1: 0x03, channel: 14, type: 'button' },
  { controlName: 'Library_Back', statusByte: 0x9E, data1: 0x7B, channel: 14, type: 'button' },
  { controlName: 'Library_SourceToggle', statusByte: 0x9E, data1: 0x06, channel: 14, type: 'button' },

  // ================= FX PADDLES (Ch 8: 0x98 / 0xB8, Ch 9: 0x99 / 0xB9) =================
  { controlName: 'DeckA_FX_Paddle', statusByte: 0x98, data1: 0x00, channel: 8, type: 'button' },
  { controlName: 'DeckA_FX_WetDry', statusByte: 0xB8, data1: 0x00, channel: 8, type: 'knob' },
  { controlName: 'DeckB_FX_Paddle', statusByte: 0x99, data1: 0x00, channel: 9, type: 'button' },
  { controlName: 'DeckB_FX_WetDry', statusByte: 0xB9, data1: 0x00, channel: 9, type: 'knob' },

  // ================= DECK A PADS & LOOPS (Ch 4: 0x94 / 0xB4) =================
  { controlName: 'DeckA_Loop_Toggle', statusByte: 0x94, data1: 0x40, channel: 4, type: 'button' },
  { controlName: 'DeckA_Loop_Halve', statusByte: 0xB4, data1: 0x34, channel: 4, type: 'knob' },
  { controlName: 'DeckA_PadMode_HotCue', statusByte: 0x94, data1: 0x00, channel: 4, type: 'button' },
  { controlName: 'DeckA_PadMode_InstantFX', statusByte: 0x94, data1: 0x02, channel: 4, type: 'button' },
  { controlName: 'DeckA_PadMode_Neural', statusByte: 0x94, data1: 0x08, channel: 4, type: 'button' },
  { controlName: 'DeckA_PadMode_Bounce', statusByte: 0x94, data1: 0x09, channel: 4, type: 'button' },
  { controlName: 'DeckA_PadMode_Sampler', statusByte: 0x94, data1: 0x0B, channel: 4, type: 'button' },
  { controlName: 'DeckA_PadMode_Slicer', statusByte: 0x94, data1: 0x0F, channel: 4, type: 'button' },
  { controlName: 'DeckA_PadMode_Loop', statusByte: 0x94, data1: 0x11, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_1', statusByte: 0x94, data1: 20, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_2', statusByte: 0x94, data1: 21, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_3', statusByte: 0x94, data1: 22, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_4', statusByte: 0x94, data1: 23, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_5', statusByte: 0x94, data1: 24, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_6', statusByte: 0x94, data1: 25, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_7', statusByte: 0x94, data1: 26, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_8', statusByte: 0x94, data1: 27, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_1_Shift', statusByte: 0x94, data1: 28, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_2_Shift', statusByte: 0x94, data1: 29, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_3_Shift', statusByte: 0x94, data1: 30, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_4_Shift', statusByte: 0x94, data1: 31, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_5_Shift', statusByte: 0x94, data1: 32, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_6_Shift', statusByte: 0x94, data1: 33, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_7_Shift', statusByte: 0x94, data1: 34, channel: 4, type: 'button' },
  { controlName: 'DeckA_Pad_8_Shift', statusByte: 0x94, data1: 35, channel: 4, type: 'button' },

  // ================= DECK B PADS & LOOPS (Ch 5: 0x95 / 0xB5) =================
  { controlName: 'DeckB_Loop_Toggle', statusByte: 0x95, data1: 0x40, channel: 5, type: 'button' },
  { controlName: 'DeckB_Loop_Halve', statusByte: 0xB5, data1: 0x34, channel: 5, type: 'knob' },
  { controlName: 'DeckB_PadMode_HotCue', statusByte: 0x95, data1: 0x00, channel: 5, type: 'button' },
  { controlName: 'DeckB_PadMode_InstantFX', statusByte: 0x95, data1: 0x02, channel: 5, type: 'button' },
  { controlName: 'DeckB_PadMode_Neural', statusByte: 0x95, data1: 0x08, channel: 5, type: 'button' },
  { controlName: 'DeckB_PadMode_Bounce', statusByte: 0x95, data1: 0x09, channel: 5, type: 'button' },
  { controlName: 'DeckB_PadMode_Sampler', statusByte: 0x95, data1: 0x0B, channel: 5, type: 'button' },
  { controlName: 'DeckB_PadMode_Slicer', statusByte: 0x95, data1: 0x0F, channel: 5, type: 'button' },
  { controlName: 'DeckB_PadMode_Loop', statusByte: 0x95, data1: 0x11, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_1', statusByte: 0x95, data1: 20, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_2', statusByte: 0x95, data1: 21, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_3', statusByte: 0x95, data1: 22, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_4', statusByte: 0x95, data1: 23, channel: 5, type: 'button' }, // User button exact match!
  { controlName: 'DeckB_Pad_5', statusByte: 0x95, data1: 24, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_6', statusByte: 0x95, data1: 25, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_7', statusByte: 0x95, data1: 26, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_8', statusByte: 0x95, data1: 27, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_1_Shift', statusByte: 0x95, data1: 28, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_2_Shift', statusByte: 0x95, data1: 29, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_3_Shift', statusByte: 0x95, data1: 30, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_4_Shift', statusByte: 0x95, data1: 31, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_5_Shift', statusByte: 0x95, data1: 32, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_6_Shift', statusByte: 0x95, data1: 33, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_7_Shift', statusByte: 0x95, data1: 34, channel: 5, type: 'button' },
  { controlName: 'DeckB_Pad_8_Shift', statusByte: 0x95, data1: 35, channel: 5, type: 'button' },
];

// Pioneer DDJ Series (DDJ-400, DDJ-FLX4, DDJ-SB3, DDJ-REV1, DDJ-1000, DDJ-FLX10) native USB MIDI spec
const buildPioneerDdjMappings = (): MidiMappingRule[] => [
  ...buildStandard2DeckMappings(0, 1),
  // Deck A (Ch 0) & Mixer Ch 6 (0xB6/0x96) & Performance Pads Ch 7 (0x97)
  { controlName: 'DeckA_Play', statusByte: 0x90, data1: 0x0B, channel: 0, type: 'button' },
  { controlName: 'DeckA_Cue', statusByte: 0x90, data1: 0x0C, channel: 0, type: 'button' },
  { controlName: 'DeckA_Sync', statusByte: 0x90, data1: 0x58, channel: 0, type: 'button' },
  { controlName: 'DeckA_Pitch', statusByte: 0xB0, data1: 0x00, channel: 0, type: 'slider' },
  { controlName: 'DeckA_JogTurn', statusByte: 0xB0, data1: 0x22, channel: 0, type: 'jog' },
  { controlName: 'DeckA_JogBend', statusByte: 0xB0, data1: 0x21, channel: 0, type: 'jog' },
  { controlName: 'DeckA_JogTouch', statusByte: 0x90, data1: 0x36, channel: 0, type: 'button' },
  { controlName: 'DeckA_Fader', statusByte: 0xB0, data1: 0x13, channel: 0, type: 'slider' },
  { controlName: 'DeckA_EQ_High', statusByte: 0xB0, data1: 0x07, channel: 0, type: 'knob' },
  { controlName: 'DeckA_EQ_Mid', statusByte: 0xB0, data1: 0x0B, channel: 0, type: 'knob' },
  { controlName: 'DeckA_EQ_Low', statusByte: 0xB0, data1: 0x0F, channel: 0, type: 'knob' },
  { controlName: 'DeckA_Filter', statusByte: 0xB6, data1: 0x17, channel: 6, type: 'knob' },
  { controlName: 'Headphone_Cue_A', statusByte: 0x90, data1: 0x54, channel: 0, type: 'button' },
  { controlName: 'DeckA_Load', statusByte: 0x96, data1: 0x46, channel: 6, type: 'button' },
  { controlName: 'DeckA_Loop_Toggle', statusByte: 0x90, data1: 0x14, channel: 0, type: 'button' },
  // Deck A Pads & Stems (Ch 7: 0x97 + Ch 0 direct fallback)
  { controlName: 'DeckA_HotCue_1', statusByte: 0x97, data1: 0x00, channel: 7, type: 'button' },
  { controlName: 'DeckA_HotCue_2', statusByte: 0x97, data1: 0x01, channel: 7, type: 'button' },
  { controlName: 'DeckA_HotCue_3', statusByte: 0x97, data1: 0x02, channel: 7, type: 'button' },
  { controlName: 'DeckA_HotCue_4', statusByte: 0x97, data1: 0x03, channel: 7, type: 'button' },
  { controlName: 'DeckA_HotCue_5', statusByte: 0x97, data1: 0x04, channel: 7, type: 'button' },
  { controlName: 'DeckA_HotCue_6', statusByte: 0x97, data1: 0x05, channel: 7, type: 'button' },
  { controlName: 'DeckA_HotCue_7', statusByte: 0x97, data1: 0x06, channel: 7, type: 'button' },
  { controlName: 'DeckA_HotCue_8', statusByte: 0x97, data1: 0x07, channel: 7, type: 'button' },
  { controlName: 'DeckA_Stem_Vocals', statusByte: 0x97, data1: 0x35, channel: 7, type: 'button' },
  { controlName: 'DeckA_Stem_Harmonics', statusByte: 0x97, data1: 0x36, channel: 7, type: 'button' },
  { controlName: 'DeckA_Stem_Bass', statusByte: 0x97, data1: 0x37, channel: 7, type: 'button' },
  { controlName: 'DeckA_Stem_Drums', statusByte: 0x97, data1: 0x38, channel: 7, type: 'button' },

  // Deck B (Ch 1) & Performance Pads Ch 9 (0x99)
  { controlName: 'DeckB_Play', statusByte: 0x91, data1: 0x0B, channel: 1, type: 'button' },
  { controlName: 'DeckB_Cue', statusByte: 0x91, data1: 0x0C, channel: 1, type: 'button' },
  { controlName: 'DeckB_Sync', statusByte: 0x91, data1: 0x58, channel: 1, type: 'button' },
  { controlName: 'DeckB_Pitch', statusByte: 0xB1, data1: 0x00, channel: 1, type: 'slider' },
  { controlName: 'DeckB_JogTurn', statusByte: 0xB1, data1: 0x22, channel: 1, type: 'jog' },
  { controlName: 'DeckB_JogBend', statusByte: 0xB1, data1: 0x21, channel: 1, type: 'jog' },
  { controlName: 'DeckB_JogTouch', statusByte: 0x91, data1: 0x36, channel: 1, type: 'button' },
  { controlName: 'DeckB_Fader', statusByte: 0xB1, data1: 0x13, channel: 1, type: 'slider' },
  { controlName: 'DeckB_EQ_High', statusByte: 0xB1, data1: 0x07, channel: 1, type: 'knob' },
  { controlName: 'DeckB_EQ_Mid', statusByte: 0xB1, data1: 0x0B, channel: 1, type: 'knob' },
  { controlName: 'DeckB_EQ_Low', statusByte: 0xB1, data1: 0x0F, channel: 1, type: 'knob' },
  { controlName: 'DeckB_Filter', statusByte: 0xB6, data1: 0x18, channel: 6, type: 'knob' },
  { controlName: 'Headphone_Cue_B', statusByte: 0x91, data1: 0x54, channel: 1, type: 'button' },
  { controlName: 'DeckB_Load', statusByte: 0x96, data1: 0x47, channel: 6, type: 'button' },
  { controlName: 'DeckB_Loop_Toggle', statusByte: 0x91, data1: 0x14, channel: 1, type: 'button' },
  { controlName: 'DeckB_HotCue_1', statusByte: 0x99, data1: 0x00, channel: 9, type: 'button' },
  { controlName: 'DeckB_HotCue_2', statusByte: 0x99, data1: 0x01, channel: 9, type: 'button' },
  { controlName: 'DeckB_HotCue_3', statusByte: 0x99, data1: 0x02, channel: 9, type: 'button' },
  { controlName: 'DeckB_HotCue_4', statusByte: 0x99, data1: 0x03, channel: 9, type: 'button' },
  { controlName: 'DeckB_HotCue_5', statusByte: 0x99, data1: 0x04, channel: 9, type: 'button' },
  { controlName: 'DeckB_HotCue_6', statusByte: 0x99, data1: 0x05, channel: 9, type: 'button' },
  { controlName: 'DeckB_HotCue_7', statusByte: 0x99, data1: 0x06, channel: 9, type: 'button' },
  { controlName: 'DeckB_HotCue_8', statusByte: 0x99, data1: 0x07, channel: 9, type: 'button' },
  { controlName: 'DeckB_Stem_Vocals', statusByte: 0x99, data1: 0x35, channel: 9, type: 'button' },
  { controlName: 'DeckB_Stem_Harmonics', statusByte: 0x99, data1: 0x36, channel: 9, type: 'button' },
  { controlName: 'DeckB_Stem_Bass', statusByte: 0x99, data1: 0x37, channel: 9, type: 'button' },
  { controlName: 'DeckB_Stem_Drums', statusByte: 0x99, data1: 0x38, channel: 9, type: 'button' },

  // Master & Browser (Ch 6: 0xB6 / 0x96)
  { controlName: 'Crossfader', statusByte: 0xB6, data1: 0x1F, channel: 6, type: 'slider' },
  { controlName: 'Library_Scroll', statusByte: 0xB6, data1: 0x40, channel: 6, type: 'knob' },
  { controlName: 'Master_Volume', statusByte: 0xB6, data1: 0x08, channel: 6, type: 'knob' },
];

// Numark Mixtrack Pro FX / Party Mix / DJ2GO2 Touch native USB MIDI spec
const buildNumarkMappings = (): MidiMappingRule[] => [
  ...buildStandard2DeckMappings(0, 1),
  // Deck A (Ch 0, Pads Ch 4)
  { controlName: 'DeckA_Play', statusByte: 0x90, data1: 0x00, channel: 0, type: 'button' },
  { controlName: 'DeckA_Cue', statusByte: 0x90, data1: 0x01, channel: 0, type: 'button' },
  { controlName: 'DeckA_Sync', statusByte: 0x90, data1: 0x02, channel: 0, type: 'button' },
  { controlName: 'DeckA_Pitch', statusByte: 0xB0, data1: 0x09, channel: 0, type: 'slider' },
  { controlName: 'DeckA_JogTurn', statusByte: 0xB0, data1: 0x06, channel: 0, type: 'jog' },
  { controlName: 'DeckA_JogTouch', statusByte: 0x90, data1: 0x06, channel: 0, type: 'button' },
  { controlName: 'DeckA_Fader', statusByte: 0xB0, data1: 0x1C, channel: 0, type: 'slider' },
  { controlName: 'DeckA_EQ_High', statusByte: 0xB0, data1: 0x17, channel: 0, type: 'knob' },
  { controlName: 'DeckA_EQ_Mid', statusByte: 0xB0, data1: 0x18, channel: 0, type: 'knob' },
  { controlName: 'DeckA_EQ_Low', statusByte: 0xB0, data1: 0x19, channel: 0, type: 'knob' },
  { controlName: 'DeckA_Filter', statusByte: 0xB0, data1: 0x1A, channel: 0, type: 'knob' },
  { controlName: 'Headphone_Cue_A', statusByte: 0x90, data1: 0x1B, channel: 0, type: 'button' },
  { controlName: 'DeckA_Stem_Vocals', statusByte: 0x94, data1: 0x14, channel: 4, type: 'button' },
  { controlName: 'DeckA_Stem_Harmonics', statusByte: 0x94, data1: 0x15, channel: 4, type: 'button' },
  { controlName: 'DeckA_Stem_Bass', statusByte: 0x94, data1: 0x16, channel: 4, type: 'button' },
  { controlName: 'DeckA_Stem_Drums', statusByte: 0x94, data1: 0x17, channel: 4, type: 'button' },

  // Deck B (Ch 1, Pads Ch 5)
  { controlName: 'DeckB_Play', statusByte: 0x91, data1: 0x00, channel: 1, type: 'button' },
  { controlName: 'DeckB_Cue', statusByte: 0x91, data1: 0x01, channel: 1, type: 'button' },
  { controlName: 'DeckB_Sync', statusByte: 0x91, data1: 0x02, channel: 1, type: 'button' },
  { controlName: 'DeckB_Pitch', statusByte: 0xB1, data1: 0x09, channel: 1, type: 'slider' },
  { controlName: 'DeckB_JogTurn', statusByte: 0xB1, data1: 0x06, channel: 1, type: 'jog' },
  { controlName: 'DeckB_JogTouch', statusByte: 0x91, data1: 0x06, channel: 1, type: 'button' },
  { controlName: 'DeckB_Fader', statusByte: 0xB1, data1: 0x1C, channel: 1, type: 'slider' },
  { controlName: 'DeckB_EQ_High', statusByte: 0xB1, data1: 0x17, channel: 1, type: 'knob' },
  { controlName: 'DeckB_EQ_Mid', statusByte: 0xB1, data1: 0x18, channel: 1, type: 'knob' },
  { controlName: 'DeckB_EQ_Low', statusByte: 0xB1, data1: 0x19, channel: 1, type: 'knob' },
  { controlName: 'DeckB_Filter', statusByte: 0xB1, data1: 0x1A, channel: 1, type: 'knob' },
  { controlName: 'Headphone_Cue_B', statusByte: 0x91, data1: 0x1B, channel: 1, type: 'button' },
  { controlName: 'DeckB_Stem_Vocals', statusByte: 0x95, data1: 0x14, channel: 5, type: 'button' },
  { controlName: 'DeckB_Stem_Harmonics', statusByte: 0x95, data1: 0x15, channel: 5, type: 'button' },
  { controlName: 'DeckB_Stem_Bass', statusByte: 0x95, data1: 0x16, channel: 5, type: 'button' },
  { controlName: 'DeckB_Stem_Drums', statusByte: 0x95, data1: 0x17, channel: 5, type: 'button' },

  // Master Mixer Section (Ch 15: 0xBF / 0x9F & Ch 0 fallback)
  { controlName: 'Crossfader', statusByte: 0xBF, data1: 0x08, channel: 15, type: 'slider' },
  { controlName: 'Library_Scroll', statusByte: 0xBF, data1: 0x00, channel: 15, type: 'knob' },
  { controlName: 'DeckA_Load', statusByte: 0x9F, data1: 0x02, channel: 15, type: 'button' },
  { controlName: 'DeckB_Load', statusByte: 0x9F, data1: 0x03, channel: 15, type: 'button' },
];

// Denon DJ Prime / SC Live / MC4000 native MIDI specification
const buildDenonMappings = (): MidiMappingRule[] => [
  ...buildStandard2DeckMappings(0, 1),
  { controlName: 'DeckA_Play', statusByte: 0x90, data1: 0x04, channel: 0, type: 'button' },
  { controlName: 'DeckA_Cue', statusByte: 0x90, data1: 0x01, channel: 0, type: 'button' },
  { controlName: 'DeckA_Sync', statusByte: 0x90, data1: 0x02, channel: 0, type: 'button' },
  { controlName: 'DeckA_JogTurn', statusByte: 0xB0, data1: 0x08, channel: 0, type: 'jog' },
  { controlName: 'DeckA_JogTouch', statusByte: 0x90, data1: 0x08, channel: 0, type: 'button' },
  { controlName: 'DeckA_Pitch', statusByte: 0xB0, data1: 0x04, channel: 0, type: 'slider' },
  { controlName: 'DeckB_Play', statusByte: 0x91, data1: 0x04, channel: 1, type: 'button' },
  { controlName: 'DeckB_Cue', statusByte: 0x91, data1: 0x01, channel: 1, type: 'button' },
  { controlName: 'DeckB_Sync', statusByte: 0x91, data1: 0x02, channel: 1, type: 'button' },
  { controlName: 'DeckB_JogTurn', statusByte: 0xB1, data1: 0x08, channel: 1, type: 'jog' },
  { controlName: 'DeckB_JogTouch', statusByte: 0x91, data1: 0x08, channel: 1, type: 'button' },
  { controlName: 'DeckB_Pitch', statusByte: 0xB1, data1: 0x04, channel: 1, type: 'slider' },
  { controlName: 'Crossfader', statusByte: 0xB2, data1: 0x00, channel: 2, type: 'slider' },
  { controlName: 'Library_Scroll', statusByte: 0xB2, data1: 0x10, channel: 2, type: 'knob' },
  { controlName: 'DeckA_Load', statusByte: 0x90, data1: 0x05, channel: 0, type: 'button' },
  { controlName: 'DeckB_Load', statusByte: 0x91, data1: 0x05, channel: 1, type: 'button' },
];

// Hercules DJControl Inpulse (500 / 300 / 200 / T7 / Starlight) native MIDI spec
const buildHerculesInpulseMappings = (): MidiMappingRule[] => [
  ...buildStandard2DeckMappings(0, 1),
  // Hercules Mixer Ch 0 (0xB0 / 0x90)
  { controlName: 'Crossfader', statusByte: 0xB0, data1: 0x00, channel: 0, type: 'slider' },
  { controlName: 'Library_Scroll', statusByte: 0xB0, data1: 0x01, channel: 0, type: 'knob' },
  { controlName: 'Master_Volume', statusByte: 0xB0, data1: 0x03, channel: 0, type: 'knob' },
  // Hercules Deck A (Ch 1) & Pads (Ch 6)
  { controlName: 'DeckA_Play', statusByte: 0x91, data1: 0x07, channel: 1, type: 'button' },
  { controlName: 'DeckA_Cue', statusByte: 0x91, data1: 0x06, channel: 1, type: 'button' },
  { controlName: 'DeckA_Sync', statusByte: 0x91, data1: 0x05, channel: 1, type: 'button' },
  { controlName: 'DeckA_Fader', statusByte: 0xB1, data1: 0x00, channel: 1, type: 'slider' },
  { controlName: 'DeckA_Filter', statusByte: 0xB1, data1: 0x01, channel: 1, type: 'knob' },
  { controlName: 'DeckA_EQ_Low', statusByte: 0xB1, data1: 0x02, channel: 1, type: 'knob' },
  { controlName: 'DeckA_EQ_Mid', statusByte: 0xB1, data1: 0x03, channel: 1, type: 'knob' },
  { controlName: 'DeckA_EQ_High', statusByte: 0xB1, data1: 0x04, channel: 1, type: 'knob' },
  { controlName: 'DeckA_Pitch', statusByte: 0xB1, data1: 0x08, channel: 1, type: 'slider' },
  { controlName: 'DeckA_JogTurn', statusByte: 0xB1, data1: 0x0A, channel: 1, type: 'jog' },
  { controlName: 'DeckA_JogTouch', statusByte: 0x91, data1: 0x08, channel: 1, type: 'button' },
  { controlName: 'Headphone_Cue_A', statusByte: 0x91, data1: 0x0C, channel: 1, type: 'button' },
  { controlName: 'DeckA_Load', statusByte: 0x91, data1: 0x0D, channel: 1, type: 'button' },
  { controlName: 'DeckA_Stem_Vocals', statusByte: 0x96, data1: 0x00, channel: 6, type: 'button' },
  { controlName: 'DeckA_Stem_Harmonics', statusByte: 0x96, data1: 0x01, channel: 6, type: 'button' },
  { controlName: 'DeckA_Stem_Bass', statusByte: 0x96, data1: 0x02, channel: 6, type: 'button' },
  { controlName: 'DeckA_Stem_Drums', statusByte: 0x96, data1: 0x03, channel: 6, type: 'button' },

  // Hercules Deck B (Ch 2) & Pads (Ch 7)
  { controlName: 'DeckB_Play', statusByte: 0x92, data1: 0x07, channel: 2, type: 'button' },
  { controlName: 'DeckB_Cue', statusByte: 0x92, data1: 0x06, channel: 2, type: 'button' },
  { controlName: 'DeckB_Sync', statusByte: 0x92, data1: 0x05, channel: 2, type: 'button' },
  { controlName: 'DeckB_Fader', statusByte: 0xB2, data1: 0x00, channel: 2, type: 'slider' },
  { controlName: 'DeckB_Filter', statusByte: 0xB2, data1: 0x01, channel: 2, type: 'knob' },
  { controlName: 'DeckB_EQ_Low', statusByte: 0xB2, data1: 0x02, channel: 2, type: 'knob' },
  { controlName: 'DeckB_EQ_Mid', statusByte: 0xB2, data1: 0x03, channel: 2, type: 'knob' },
  { controlName: 'DeckB_EQ_High', statusByte: 0xB2, data1: 0x04, channel: 2, type: 'knob' },
  { controlName: 'DeckB_Pitch', statusByte: 0xB2, data1: 0x08, channel: 2, type: 'slider' },
  { controlName: 'DeckB_JogTurn', statusByte: 0xB2, data1: 0x0A, channel: 2, type: 'jog' },
  { controlName: 'DeckB_JogTouch', statusByte: 0x92, data1: 0x08, channel: 2, type: 'button' },
  { controlName: 'Headphone_Cue_B', statusByte: 0x92, data1: 0x0C, channel: 2, type: 'button' },
  { controlName: 'DeckB_Load', statusByte: 0x92, data1: 0x0D, channel: 2, type: 'button' },
  { controlName: 'DeckB_Stem_Vocals', statusByte: 0x97, data1: 0x00, channel: 7, type: 'button' },
  { controlName: 'DeckB_Stem_Harmonics', statusByte: 0x97, data1: 0x01, channel: 7, type: 'button' },
  { controlName: 'DeckB_Stem_Bass', statusByte: 0x97, data1: 0x02, channel: 7, type: 'button' },
  { controlName: 'DeckB_Stem_Drums', statusByte: 0x97, data1: 0x03, channel: 7, type: 'button' },
];

export const BUILT_IN_PROFILES: MidiProfile[] = [
  {
    id: 'reloop_buddy',
    name: 'Reloop Buddy',
    manufacturer: 'Reloop',
    description: 'Algoriddim djay dedicated 2-deck controller featuring Neural Mix toggles, FX paddle switches, dedicated loop encoder, and 8 performance pads per deck.',
    tags: ['Algoriddim djay', 'Neural Mix', 'Paddle FX', '8 RGB Pads', 'Portable'],
    deviceMatchNames: ['buddy', 'reloop buddy', 'reloop_buddy'],
    mappings: buildReloopBuddyMappings(),
  },
  {
    id: 'reloop_ready',
    name: 'Reloop Ready',
    manufacturer: 'Reloop',
    description: 'Ultra-compact performance controller engineered for travel and sitting directly over 13-inch laptop keyboards with 16 RGB pads.',
    tags: ['Compact', '16 RGB Pads', 'djay Pro', 'Serato'],
    deviceMatchNames: ['ready', 'reloop ready', 'reloop_ready'],
    mappings: buildReloopBuddyMappings(),
  },
  {
    id: 'reloop_mixon',
    name: 'Reloop Mixon 4 / Mixon 8 Pro',
    manufacturer: 'Reloop',
    description: 'Flagship 4-channel hybrid DJ workstation with motorized jog wheels, dedicated real-time stem split controls, and tablet docking dock.',
    tags: ['4-Channel', 'Motorized Platters', 'Flagship Workstation'],
    deviceMatchNames: ['mixon', 'mixon 4', 'mixon 8', 'reloop mixon'],
    mappings: buildStandard2DeckMappings(0, 1),
  },
  {
    id: 'reloop_beatpad2',
    name: 'Reloop Beatpad 2',
    manufacturer: 'Reloop',
    description: 'Classic robust DJ controller designed specifically for Algoriddim djay with multi-color drum pads and versatile sound card.',
    tags: ['Classic djay', 'Multi-FX', 'Drum Pads'],
    deviceMatchNames: ['beatpad', 'beatpad 2', 'reloop beatpad'],
    mappings: buildStandard2DeckMappings(0, 1),
  },
  {
    id: 'pioneer_ddj_flx4',
    name: 'Pioneer DDJ-FLX4 / DDJ-400',
    manufacturer: 'Pioneer DJ',
    description: 'Worldwide standard 2-channel entry controller with club-standard CDJ + DJM layout, Smart CFX, and Smart Fader.',
    tags: ['Club Standard', 'Smart CFX', 'Rekordbox', 'Serato'],
    deviceMatchNames: ['ddj-flx4', 'ddj flx4', 'ddj-400', 'ddj 400', 'flx4', 'pioneer ddj-400'],
    mappings: buildPioneerDdjMappings(),
  },
  {
    id: 'pioneer_ddj_rev1',
    name: 'Pioneer DDJ-REV1',
    manufacturer: 'Pioneer DJ',
    description: 'Battle-style scratch controller with horizontal top-mounted tempo sliders and performance pads in the mixer center.',
    tags: ['Battle Style', 'Scratch', 'Tracking Scratch'],
    deviceMatchNames: ['ddj-rev1', 'ddj rev1', 'rev1', 'pioneer rev1'],
    mappings: buildPioneerDdjMappings(),
  },
  {
    id: 'pioneer_ddj_1000',
    name: 'Pioneer DDJ-1000 / DDJ-800',
    manufacturer: 'Pioneer DJ',
    description: 'Club-grade controller with full-sized mechanical CDJ jog wheels, customizable On-Jog color displays, and 14 Beat FX.',
    tags: ['Club Pro', 'On-Jog Display', 'Magvel Fader'],
    deviceMatchNames: ['ddj-1000', 'ddj 1000', 'ddj-800', 'ddj 800', 'pioneer 1000', 'pioneer 800'],
    mappings: buildPioneerDdjMappings(),
  },
  {
    id: 'pioneer_ddj_flx10',
    name: 'Pioneer DDJ-FLX10',
    manufacturer: 'Pioneer DJ',
    description: 'Flagship 4-channel controller with dedicated hardware Track Separation / 3-Stem Live Mashup buttons (Drums, Vocal, Inst).',
    tags: ['4-Channel', 'Live Stems', 'Track Separation'],
    deviceMatchNames: ['ddj-flx10', 'ddj flx10', 'flx10', 'pioneer flx10'],
    mappings: buildPioneerDdjMappings(),
  },
  {
    id: 'pioneer_ddj_sb3',
    name: 'Pioneer DDJ-SB3 / DDJ-200',
    manufacturer: 'Pioneer DJ',
    description: 'Popular compact 2-channel controllers featuring Pad Scratch and smooth Filter Fade.',
    tags: ['Compact', 'Pad Scratch', 'Filter Fade'],
    deviceMatchNames: ['ddj-sb3', 'ddj sb3', 'ddj-sb2', 'ddj-sb', 'ddj-200', 'ddj 200'],
    mappings: buildPioneerDdjMappings(),
  },
  {
    id: 'traktor_kontrol_s2_s4',
    name: 'Traktor Kontrol S2 / S3 / S4',
    manufacturer: 'Native Instruments',
    description: 'Precision club controller with Haptic Drive motorized jog wheels, RGB stem feedback, and carbon-protect faders.',
    tags: ['Haptic Drive', 'RGB Pads', 'Precision Faders'],
    deviceMatchNames: ['kontrol', 'traktor', 's2', 's4', 's3'],
    mappings: buildStandard2DeckMappings(2, 3),
  },
  {
    id: 'numark_mixtrack_pro_fx',
    name: 'Numark Mixtrack Pro FX',
    manufacturer: 'Numark',
    description: '2-deck controller featuring dual spring-loaded paddle FX triggers, 6-inch capacitive-touch jog wheels, and 16 multi-function pads.',
    tags: ['Paddle FX', 'Capacitive Jog', 'Auto Loop'],
    deviceMatchNames: ['mixtrack', 'platinum fx', 'numark mixtrack'],
    mappings: buildNumarkMappings(),
  },
  {
    id: 'numark_party_mix',
    name: 'Numark Party Mix / Party Mix II / Live',
    manufacturer: 'Numark',
    description: 'Plug-and-play party controller with dual LED light shows, performance pads (Cues/Loop/Sampler/Stems), and responsive jog wheels.',
    tags: ['Plug & Play', 'LED Party Show', 'Compact'],
    deviceMatchNames: ['party mix', 'partymix', 'party mix ii', 'party mix live', 'numark party'],
    mappings: buildNumarkMappings(),
  },
  {
    id: 'numark_dj2go2_touch',
    name: 'Numark DJ2GO2 Touch',
    manufacturer: 'Numark',
    description: 'Pocket-sized ultra-portable 2-channel DJ controller with capacitive touch scratch wheels and built-in audio interface.',
    tags: ['Ultra-Portable', 'Pocket Size', 'Touch Jog'],
    deviceMatchNames: ['dj2go2', 'dj2go', 'numark dj2go'],
    mappings: buildNumarkMappings(),
  },
  {
    id: 'hercules_inpulse_500',
    name: 'Hercules DJControl Inpulse',
    manufacturer: 'Hercules',
    description: 'Advanced controller equipped with light guides (Beatmatch Guide), Intelligent Music Assistant, and retractable feet.',
    tags: ['Beatmatch Guide', 'Light Guides', 'Filter FX'],
    deviceMatchNames: ['inpulse', 'djcontrol inpulse', 'hercules inpulse', 'inpulse 500', 'inpulse 300', 'inpulse 200'],
    mappings: buildHerculesInpulseMappings(),
  },
  {
    id: 'hercules_inpulse_t7',
    name: 'Hercules DJControl Inpulse T7',
    manufacturer: 'Hercules',
    description: 'Motorized 7-inch vinyl platter DJ controller offering authentic vinyl feeling, real felt slipmats, and central labels.',
    tags: ['Motorized Vinyl', '7-Inch Platters', 'Authentic Scratch'],
    deviceMatchNames: ['inpulse t7', 'hercules t7', 't7'],
    mappings: buildHerculesInpulseMappings(),
  },
  {
    id: 'hercules_starlight',
    name: 'Hercules DJControl Starlight',
    manufacturer: 'Hercules',
    description: 'Ultra-compact travel DJ controller with built-in audio card and brilliant RGB ambient base lighting.',
    tags: ['Travel', 'RGB Base', 'Compact'],
    deviceMatchNames: ['starlight', 'hercules starlight'],
    mappings: buildHerculesInpulseMappings(),
  },
  {
    id: 'denon_prime_4',
    name: 'Denon DJ Prime / SC Live',
    manufacturer: 'Denon DJ',
    description: '4-deck standalone and performance controller with dedicated sweep FX, OLED feedback, and club connectivity.',
    tags: ['4-Deck', 'Sweep FX', 'Pro Performance'],
    deviceMatchNames: ['prime 4', 'prime 2', 'prime go', 'sc live', 'denon', 'denon dj', 'mc4000'],
    mappings: buildDenonMappings(),
  },
  {
    id: 'rane_one_four',
    name: 'Rane ONE / Rane FOUR',
    manufacturer: 'Rane',
    description: 'Direct-drive motorized platters with MAG FOUR crossfader, dedicated Stem split buttons, and dual battle FX switches.',
    tags: ['Direct Drive', 'Mag Four', 'Battle FX', 'Stem Split'],
    deviceMatchNames: ['rane', 'rane one', 'rane four'],
    mappings: buildStandard2DeckMappings(0, 1),
  },
  {
    id: 'custom_user',
    name: 'Custom User Profile',
    manufacturer: 'User Defined',
    description: 'Custom user MIDI profile configured using the Visual MIDI Learn Wizard. Saved persistently across app launches.',
    tags: ['Custom', 'MIDI Learn', 'User Saved'],
    deviceMatchNames: [],
    mappings: buildStandard2DeckMappings(0, 1),
  },
];

export class MidiControllerService {
  private midiAccess: any = null;
  private connectedInputs: Map<string, any> = new Map();
  private connectedOutputs: Map<string, any> = new Map();
  private mappings: Map<string, MidiMappingRule> = new Map(); // key = `${statusByte}_${data1}`
  private listeners: Set<MidiEventCallback> = new Set();
  private activityListeners: Set<(event: MidiActivityEvent) => void> = new Set();
  private profileChangeListeners: Set<(profile: MidiProfile) => void> = new Set();
  private isLearning: boolean = false;
  private learningControl: string | null = null;
  private activeProfileId: string | null = null;

  constructor() {
    this.initProfileFromStorage();
  }

  private async initProfileFromStorage() {
    // A profile is only active while matching hardware is connected (see scanDevices).
    // Clear any stale persisted selection so no phantom profile shows as ACTIVE.
    try {
      await storageCache.setSetting('selected_midi_profile', null);
    } catch {}
  }

  public async init(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) {
      console.warn('WebMIDI is not supported in this browser.');
      return false;
    }

    try {
      this.midiAccess = await (navigator as any).requestMIDIAccess({ sysex: true });
      this.scanDevices();
      if (this.midiAccess) {
        this.midiAccess.onstatechange = () => this.scanDevices();
      }
      return true;
    } catch (err) {
      console.error('Failed to get MIDI access:', err);
      return false;
    }
  }

  /**
   * Matches a connected USB/WebMIDI controller name & manufacturer against built-in plug-and-play presets.
   */
  public matchControllerProfile(deviceName: string, manufacturer?: string): MidiProfile | null {
    const rawName = (deviceName || '').toLowerCase();
    const rawMfg = (manufacturer || '').toLowerCase();
    const compactName = rawName.replace(/[^a-z0-9]+/g, '');
    const combinedRaw = `${rawName} ${rawMfg}`.trim();

    if (!combinedRaw) return null;

    // 1. Direct & normalized substring match across model tokens (prefer specific longest match first)
    let bestMatch: { profile: MidiProfile; score: number } | null = null;
    for (const profile of BUILT_IN_PROFILES) {
      for (const token of profile.deviceMatchNames) {
        const lowerTok = token.toLowerCase();
        const compactTok = lowerTok.replace(/[^a-z0-9]+/g, '');
        if (combinedRaw.includes(lowerTok) || (compactTok.length >= 4 && compactName.includes(compactTok))) {
          const score = lowerTok.length;
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { profile, score };
          }
        }
      }
    }
    if (bestMatch) return bestMatch.profile;

    // 2. Brand / manufacturer fallback for plug-and-play compatibility on generic USB driver names
    const brandMap: Array<[string, string]> = [
      ['pioneer', 'pioneer_ddj_flx4'],
      ['alphatheta', 'pioneer_ddj_flx4'],
      ['reloop', 'reloop_buddy'],
      ['numark', 'numark_mixtrack_pro_fx'],
      ['denon', 'denon_prime_4'],
      ['hercules', 'hercules_inpulse_500'],
      ['native instruments', 'traktor_kontrol_s2_s4'],
      ['rane', 'rane_one_four'],
    ];
    for (const [brand, profileId] of brandMap) {
      if (combinedRaw.includes(brand)) {
        return BUILT_IN_PROFILES.find((p) => p.id === profileId) || null;
      }
    }
    return null;
  }

  private scanDevices() {
    if (!this.midiAccess) return;

    this.connectedInputs.clear();
    this.connectedOutputs.clear();

    let matchedAnyDevice = false;

    this.midiAccess.inputs.forEach((input: any) => {
      this.connectedInputs.set(input.id, input);
      input.onmidimessage = (msg: any) => this.handleMidiMessage(msg);

      // Plug-and-Play Hardware Auto-Detection: Match connected device against presets
      const matchedProfile = this.matchControllerProfile(input.name || '', input.manufacturer);

      if (matchedProfile) {
        matchedAnyDevice = true;
        if (matchedProfile.id !== this.activeProfileId) {
          console.log(`[MIDI AUTO-DETECT] Controller matched: ${matchedProfile.name} (${input.name})`);
          this.loadProfile(matchedProfile.id);
        }
      }
    });

    this.midiAccess.outputs.forEach((output: any) => {
      this.connectedOutputs.set(output.id, output);
    });

    // If no devices connected and no manual profile selected, ensure no profile is forced active
    if (this.connectedInputs.size === 0 && !matchedAnyDevice) {
      storageCache.getSetting<string | null>('selected_midi_profile', null).then((saved) => {
        if (!saved && this.activeProfileId !== null) {
          this.unloadProfile();
        }
      }).catch(() => {});
    }
  }

  public getConnectedDevices(): MidiDevice[] {
    const list: MidiDevice[] = [];
    this.connectedInputs.forEach((input) => {
      list.push({
        id: input.id,
        name: input.name || 'Generic MIDI Device',
        manufacturer: input.manufacturer || 'Unknown',
        state: input.state || 'connected',
      });
    });
    return list;
  }

  public getProfiles(): MidiProfile[] {
    return BUILT_IN_PROFILES;
  }

  public getActiveProfile(): MidiProfile | null {
    if (!this.activeProfileId) return null;
    return BUILT_IN_PROFILES.find((p) => p.id === this.activeProfileId) || null;
  }

  public unloadProfile() {
    this.activeProfileId = null;
    this.mappings.clear();
    storageCache.setSetting('selected_midi_profile', null).catch(() => {});
    this.profileChangeListeners.forEach((l) => l(null as any));
  }

  public loadProfile(profileId: string) {
    const target = BUILT_IN_PROFILES.find((p) => p.id === profileId);
    if (!target) return;
    this.activeProfileId = target.id;
    this.mappings.clear();

    target.mappings.forEach((r) => {
      this.mappings.set(`${r.statusByte}_${r.data1}`, r);
    });

    storageCache.setSetting('selected_midi_profile', target.id).catch(() => {});
    this.profileChangeListeners.forEach((l) => l(target));
  }

  private handleMidiMessage(event: any) {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0];
    const data1 = data[1];
    const data2 = data[2];
    const channel = status & 0x0f;

    // Handle MIDI Learn mode
    if (this.isLearning && this.learningControl) {
      const newRule: MidiMappingRule = {
        controlName: this.learningControl,
        statusByte: status,
        data1: data1,
        channel: channel,
        type: data2 > 0 && status >= 0xb0 && status <= 0xbf ? 'knob' : 'button',
      };
      this.mappings.set(`${status}_${data1}`, newRule);

      // Save custom rule into Custom User Profile
      const customProfile = BUILT_IN_PROFILES.find((p) => p.id === 'custom_user');
      if (customProfile) {
        customProfile.mappings = [
          ...customProfile.mappings.filter((m) => m.controlName !== newRule.controlName),
          newRule,
        ];
        storageCache.setSetting('custom_midi_mappings', customProfile.mappings).catch(() => {});
      }

      this.isLearning = false;
      this.learningControl = null;
      return;
    }

    const mapping = this.mappings.get(`${status}_${data1}`);

    // Broadcast live MIDI activity for monitor UI
    this.activityListeners.forEach((l) =>
      l({
        status,
        data1,
        data2,
        channel,
        controlName: mapping?.controlName,
        timestamp: Date.now(),
      })
    );

    if (mapping) {
      // Normalize value: 0 to 127 mapped to 0.0 to 1.0
      const normalizedValue = data2 / 127.0;

      // Soft Takeover / Fader Pickup check for sliders and continuous knobs
      if (mapping.type === 'slider' || mapping.type === 'knob') {
        const target = this.softTakeoverTargets.get(mapping.controlName);
        const isEngaged = this.softTakeoverActive.get(mapping.controlName);

        if (target !== undefined && !isEngaged) {
          // Check if hardware physical fader has crossed or reached within 3% threshold of software value
          if (Math.abs(normalizedValue - target) <= 0.04) {
            this.softTakeoverActive.set(mapping.controlName, true);
          } else {
            // Still in pickup state - ignore sudden physical jumps to protect audio mix
            return;
          }
        }
      }

      this.listeners.forEach((cb) => cb(mapping.controlName, normalizedValue, data));
    }
  }

  // Algoriddim djay Pro Soft Takeover / Fader Pickup State (ARMidiPitchFaderPickupLEDModel)
  private softTakeoverTargets: Map<string, number> = new Map();
  private softTakeoverActive: Map<string, boolean> = new Map(); // true once physical controller catches software value

  public setSoftwareControlTarget(controlName: string, value: number) {
    this.softTakeoverTargets.set(controlName, value);
    // When target changes significantly, require pickup again
    this.softTakeoverActive.set(controlName, false);
  }

  public getSoftTakeoverState(controlName: string): { active: boolean; target?: number } {
    return {
      active: this.softTakeoverActive.get(controlName) ?? true,
      target: this.softTakeoverTargets.get(controlName),
    };
  }

  public resetSoftTakeover() {
    this.softTakeoverTargets.clear();
    this.softTakeoverActive.clear();
  }

  public onControl(callback: MidiEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public onMidiActivity(callback: (event: MidiActivityEvent) => void): () => void {
    this.activityListeners.add(callback);
    return () => this.activityListeners.delete(callback);
  }

  public onProfileChange(callback: (profile: MidiProfile) => void): () => void {
    this.profileChangeListeners.add(callback);
    return () => this.profileChangeListeners.delete(callback);
  }

  public startLearn(controlName: string) {
    this.isLearning = true;
    this.learningControl = controlName;
  }

  public cancelLearn() {
    this.isLearning = false;
    this.learningControl = null;
  }

  /** Export current MIDI mappings as declarative JSON (VirtualDJ / djay Pro style) */
  public exportCustomMappingJson(): string {
    return JSON.stringify(
      {
        schema: 'cloudmix-midi-mapping-v1',
        exportedAt: new Date().toISOString(),
        mappings: (this as any).mappings || [],
      },
      null,
      2
    );
  }

  /** Import declarative JSON MIDI mappings */
  public importCustomMappingJson(jsonStr: string): { ok: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      const list = Array.isArray(parsed) ? parsed : parsed?.mappings;
      if (!Array.isArray(list)) return { ok: false, count: 0, error: 'Invalid mapping array' };
      (this as any).mappings = list;
      return { ok: true, count: list.length };
    } catch (e: any) {
      return { ok: false, count: 0, error: e?.message || 'Parse error' };
    }
  }

  /** Send MIDI SysEx packet (0xF0 ... 0xF7) for hardware jog-wheel screens */
  public sendSysExJogUpdate(deck: 'A' | 'B', bpm: number, elapsedSec: number, title: string): void {
    const outputs = (this as any).midiAccess?.outputs;
    if (!outputs) return;
    const payload = `${deck}|${bpm.toFixed(1)}|${Math.floor(elapsedSec)}|${(title || '').slice(0, 24)}`;
    const bytes = [0xf0, 0x00, 0x20, 0x7f, ...Array.from(payload).map((c) => c.charCodeAt(0) & 0x7f), 0xf7];
    outputs.forEach((out: any) => {
      try {
        out.send(bytes);
      } catch {}
    });
  }
}

export const midiControllerService = new MidiControllerService();

