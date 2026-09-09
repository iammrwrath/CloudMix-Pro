import { MidiMappingRule } from '../types/dj';
import { storageCache } from './StorageCacheService';

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer?: string;
  state: string;
}

export type MidiEventCallback = (controlName: string, value: number, rawData: Uint8Array) => void;

export class MidiControllerService {
  private midiAccess: any = null;
  private connectedInputs: Map<string, any> = new Map();
  private connectedOutputs: Map<string, any> = new Map();
  private mappings: Map<string, MidiMappingRule> = new Map(); // key = `${statusByte}_${data1}`
  private listeners: Set<MidiEventCallback> = new Set();
  private isLearning: boolean = false;
  private learningControl: string | null = null;

  constructor() {
    this.loadDefaultMappings();
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

  private loadDefaultMappings() {
    // Standard Pioneer DDJ-FLX4 / DDJ-400 preset mappings
    const defaultRules: MidiMappingRule[] = [
      // Deck A Transport
      { controlName: 'DeckA_Play', statusByte: 0x90, data1: 0x0B, channel: 0, type: 'button' },
      { controlName: 'DeckA_Cue', statusByte: 0x90, data1: 0x0C, channel: 0, type: 'button' },
      { controlName: 'DeckA_Sync', statusByte: 0x90, data1: 0x58, channel: 0, type: 'button' },
      // Deck A Mixer
      { controlName: 'DeckA_EQ_High', statusByte: 0xb0, data1: 0x07, channel: 0, type: 'knob' },
      { controlName: 'DeckA_EQ_Mid', statusByte: 0xb0, data1: 0x0b, channel: 0, type: 'knob' },
      { controlName: 'DeckA_EQ_Low', statusByte: 0xb0, data1: 0x0f, channel: 0, type: 'knob' },
      { controlName: 'DeckA_Filter', statusByte: 0xb0, data1: 0x17, channel: 0, type: 'knob' },
      { controlName: 'DeckA_Fader', statusByte: 0xb0, data1: 0x13, channel: 0, type: 'slider' },
      // Deck B Transport
      { controlName: 'DeckB_Play', statusByte: 0x91, data1: 0x0B, channel: 1, type: 'button' },
      { controlName: 'DeckB_Cue', statusByte: 0x91, data1: 0x0C, channel: 1, type: 'button' },
      { controlName: 'DeckB_Sync', statusByte: 0x91, data1: 0x58, channel: 1, type: 'button' },
      // Deck B Mixer
      { controlName: 'DeckB_EQ_High', statusByte: 0xb1, data1: 0x07, channel: 1, type: 'knob' },
      { controlName: 'DeckB_EQ_Mid', statusByte: 0xb1, data1: 0x0b, channel: 1, type: 'knob' },
      { controlName: 'DeckB_EQ_Low', statusByte: 0xb1, data1: 0x0f, channel: 1, type: 'knob' },
      { controlName: 'DeckB_Filter', statusByte: 0xb1, data1: 0x17, channel: 1, type: 'knob' },
      { controlName: 'DeckB_Fader', statusByte: 0xb1, data1: 0x13, channel: 1, type: 'slider' },
      // Master
      { controlName: 'Crossfader', statusByte: 0xb0, data1: 0x1f, channel: 0, type: 'slider' },
      { controlName: 'Master_Volume', statusByte: 0xb0, data1: 0x02, channel: 0, type: 'knob' },
    ];

    defaultRules.forEach((r) => {
      this.mappings.set(`${r.statusByte}_${r.data1}`, r);
    });
  }

  private handleMidiMessage(event: any) {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0];
    const data1 = data[1];
    const data2 = data[2];

    // Handle MIDI Learn mode
    if (this.isLearning && this.learningControl) {
      const newRule: MidiMappingRule = {
        controlName: this.learningControl,
        statusByte: status,
        data1: data1,
        channel: status & 0x0f,
        type: data2 > 0 && status >= 0xb0 && status <= 0xbf ? 'knob' : 'button',
      };
      this.mappings.set(`${status}_${data1}`, newRule);
      this.isLearning = false;
      this.learningControl = null;
      return;
    }

    const mapping = this.mappings.get(`${status}_${data1}`);
    if (mapping) {
      // Normalize value: 0 to 127 mapped to 0.0 to 1.0
      const normalizedValue = data2 / 127.0;
      this.listeners.forEach((cb) => cb(mapping.controlName, normalizedValue, data));
    }
  }

  public onControl(callback: MidiEventCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
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
