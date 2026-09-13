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

export const BUILT_IN_PROFILES: MidiProfile[] = [
  {
    id: 'reloop_buddy',
    name: 'Reloop Buddy',
    manufacturer: 'Reloop',
    description: 'Algoriddim djay dedicated 2-deck controller featuring Neural Mix toggles, FX paddle switches, dedicated loop encoder, and 8 performance pads per deck.',
    tags: ['Algoriddim djay', 'Neural Mix', 'Paddle FX', '8 RGB Pads', 'Portable'],
    deviceMatchNames: ['buddy', 'reloop buddy', 'reloop_buddy'],
    mappings: buildStandard2DeckMappings(0, 1),
  },
  {
    id: 'reloop_ready',
    name: 'Reloop Ready',
    manufacturer: 'Reloop',
    description: 'Ultra-compact performance controller engineered for travel and sitting directly over 13-inch laptop keyboards with 16 RGB pads.',
    tags: ['Compact', '16 RGB Pads', 'djay Pro', 'Serato'],
    deviceMatchNames: ['ready', 'reloop ready', 'reloop_ready'],
    mappings: buildStandard2DeckMappings(0, 1),
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
    deviceMatchNames: ['ddj-flx4', 'ddj-400', 'flx4', 'pioneer ddj-400'],
    mappings: buildStandard2DeckMappings(0, 1),
  },
  {
    id: 'pioneer_ddj_rev1',
    name: 'Pioneer DDJ-REV1',
    manufacturer: 'Pioneer DJ',
    description: 'Battle-style scratch controller with horizontal top-mounted tempo sliders and performance pads in the mixer center.',
    tags: ['Battle Style', 'Scratch', 'Tracking Scratch'],
    deviceMatchNames: ['ddj-rev1', 'rev1', 'pioneer rev1'],
    mappings: buildStandard2DeckMappings(0, 1),
  },
  {
    id: 'pioneer_ddj_1000',
    name: 'Pioneer DDJ-1000 / DDJ-800',
    manufacturer: 'Pioneer DJ',
    description: 'Club-grade controller with full-sized mechanical CDJ jog wheels, customizable On-Jog color displays, and 14 Beat FX.',
    tags: ['Club Pro', 'On-Jog Display', 'Magvel Fader'],
    deviceMatchNames: ['ddj-1000', 'ddj-800', 'pioneer 1000', 'pioneer 800'],
    mappings: buildStandard2DeckMappings(0, 1),
  },
  {
    id: 'pioneer_ddj_flx10',
    name: 'Pioneer DDJ-FLX10',
    manufacturer: 'Pioneer DJ',
    description: 'Flagship 4-channel controller with dedicated hardware Track Separation / 3-Stem Live Mashup buttons (Drums, Vocal, Inst).',
    tags: ['4-Channel', 'Live Stems', 'Track Separation'],
    deviceMatchNames: ['ddj-flx10', 'flx10', 'pioneer flx10'],
    mappings: buildStandard2DeckMappings(0, 1),
  },
  {
    id: 'pioneer_ddj_sb3',
    name: 'Pioneer DDJ-SB3 / DDJ-200',
    manufacturer: 'Pioneer DJ',
    description: 'Popular compact 2-channel controllers featuring Pad Scratch and smooth Filter Fade.',
    tags: ['Compact', 'Pad Scratch', 'Filter Fade'],
    deviceMatchNames: ['ddj-sb3', 'ddj-sb', 'ddj-200'],
    mappings: buildStandard2DeckMappings(0, 1),
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
    mappings: buildStandard2DeckMappings(0, 1),
  },
  {
    id: 'numark_dj2go2_touch',
    name: 'Numark DJ2GO2 Touch',
    manufacturer: 'Numark',
    description: 'Pocket-sized ultra-portable 2-channel DJ controller with capacitive touch scratch wheels and built-in audio interface.',
    tags: ['Ultra-Portable', 'Pocket Size', 'Touch Jog'],
    deviceMatchNames: ['dj2go2', 'dj2go', 'numark dj2go'],
    mappings: buildStandard2DeckMappings(0, 1),
  },
  {
    id: 'hercules_inpulse_500',
    name: 'Hercules DJControl Inpulse',
    manufacturer: 'Hercules',
    description: 'Advanced controller equipped with light guides (Beatmatch Guide), Intelligent Music Assistant, and retractable feet.',
    tags: ['Beatmatch Guide', 'Light Guides', 'Filter FX'],
    deviceMatchNames: ['inpulse', 'hercules inpulse', 'inpulse 500', 'inpulse 300', 'inpulse 200'],
    mappings: buildStandard2DeckMappings(0, 1),
  },
  {
    id: 'hercules_inpulse_t7',
    name: 'Hercules DJControl Inpulse T7',
    manufacturer: 'Hercules',
    description: 'Motorized 7-inch vinyl platter DJ controller offering authentic vinyl feeling, real felt slipmats, and central labels.',
    tags: ['Motorized Vinyl', '7-Inch Platters', 'Authentic Scratch'],
    deviceMatchNames: ['inpulse t7', 'hercules t7', 't7'],
    mappings: buildStandard2DeckMappings(0, 1),
  },
  {
    id: 'hercules_starlight',
    name: 'Hercules DJControl Starlight',
    manufacturer: 'Hercules',
    description: 'Ultra-compact travel DJ controller with built-in audio card and brilliant RGB ambient base lighting.',
    tags: ['Travel', 'RGB Base', 'Compact'],
    deviceMatchNames: ['starlight', 'hercules starlight'],
    mappings: buildStandard2DeckMappings(0, 1),
  },
  {
    id: 'denon_prime_4',
    name: 'Denon DJ Prime / SC Live',
    manufacturer: 'Denon DJ',
    description: '4-deck standalone and performance controller with dedicated sweep FX, OLED feedback, and club connectivity.',
    tags: ['4-Deck', 'Sweep FX', 'Pro Performance'],
    deviceMatchNames: ['prime 4', 'sc live', 'denon', 'mc4000'],
    mappings: buildStandard2DeckMappings(0, 1),
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
  private activeProfileId: string = 'reloop_buddy';

  constructor() {
    this.initProfileFromStorage();
  }

  private async initProfileFromStorage() {
    try {
      const savedProfileId = await storageCache.getSetting<string>('selected_midi_profile', 'reloop_buddy');
      this.loadProfile(savedProfileId);
    } catch {
      this.loadProfile('reloop_buddy');
    }
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

  private scanDevices() {
    if (!this.midiAccess) return;

    this.connectedInputs.clear();
    this.connectedOutputs.clear();

    this.midiAccess.inputs.forEach((input: any) => {
      this.connectedInputs.set(input.id, input);
      input.onmidimessage = (msg: any) => this.handleMidiMessage(msg);

      // Hardware Auto-Detection: Match connected device against profiles
      const deviceName = (input.name || '').toLowerCase();
      const matchedProfile = BUILT_IN_PROFILES.find((p) =>
        p.deviceMatchNames.some((m) => deviceName.includes(m.toLowerCase()))
      );

      if (matchedProfile && matchedProfile.id !== this.activeProfileId) {
        console.log(`[MIDI AUTO-DETECT] Controller matched: ${matchedProfile.name} (${input.name})`);
        this.loadProfile(matchedProfile.id);
      }
    });

    this.midiAccess.outputs.forEach((output: any) => {
      this.connectedOutputs.set(output.id, output);
    });
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

  public getActiveProfile(): MidiProfile {
    return BUILT_IN_PROFILES.find((p) => p.id === this.activeProfileId) || BUILT_IN_PROFILES[0];
  }

  public loadProfile(profileId: string) {
    const target = BUILT_IN_PROFILES.find((p) => p.id === profileId) || BUILT_IN_PROFILES[0];
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
      this.listeners.forEach((cb) => cb(mapping.controlName, normalizedValue, data));
    }
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
}

export const midiControllerService = new MidiControllerService();

