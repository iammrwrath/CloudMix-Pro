import { HotCue, TrackMetadata, Playlist, BeatGrid } from '../types/dj';
import { storageCache } from './StorageCacheService';

export type SyncEventType =
  | 'CUE_UPDATED'
  | 'LOOP_UPDATED'
  | 'BEATGRID_UPDATED'
  | 'PLAYLIST_UPDATED'
  | 'TRACK_RATED'
  | 'HISTORY_ADDED';

export interface SyncMessage {
  type: SyncEventType;
  deviceId: string;
  timestamp: number;
  payload: any;
}

export class CloudProgressionService {
  private deviceId: string;
  private channel: BroadcastChannel;
  private listeners: Map<SyncEventType, Set<(payload: any) => void>> = new Map();
  private wsConnection: WebSocket | null = null;
  private cloudEndpoint: string = '';

  constructor() {
    this.deviceId = 'dev_' + Math.random().toString(36).substring(2, 9);
    this.channel = new BroadcastChannel('cloudmix_cross_progression');

    this.channel.onmessage = (event) => {
      const msg: SyncMessage = event.data;
      if (msg && msg.deviceId !== this.deviceId) {
        this.dispatchLocal(msg.type, msg.payload);
      }
    };
  }

  public setCloudEndpoint(url: string) {
    this.cloudEndpoint = url;
    if (this.wsConnection) {
      try { this.wsConnection.close(); } catch {}
    }
    if (url) {
      this.connectWebSocket(url);
    }
  }

  private connectWebSocket(url: string) {
    try {
      this.wsConnection = new WebSocket(url);
      this.wsConnection.onmessage = (evt) => {
        try {
          const msg: SyncMessage = JSON.parse(evt.data);
          if (msg && msg.deviceId !== this.deviceId) {
            this.dispatchLocal(msg.type, msg.payload);
          }
        } catch {}
      };
    } catch {}
  }

  public on(event: SyncEventType, callback: (payload: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private dispatchLocal(type: SyncEventType, payload: any) {
    const set = this.listeners.get(type);
    if (set) {
      set.forEach((cb) => {
        try { cb(payload); } catch (e) { console.error(e); }
      });
    }
  }

  private broadcast(type: SyncEventType, payload: any) {
    const msg: SyncMessage = {
      type,
      deviceId: this.deviceId,
      timestamp: Date.now(),
      payload,
    };

    // Broadcast across windows / tabs / displays
    try {
      this.channel.postMessage(msg);
    } catch {}

    // Send to cloud websocket if connected
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      try {
        this.wsConnection.send(JSON.stringify(msg));
      } catch {}
    }
  }

  // Cross-Progression API Methods
  public async syncHotCue(trackId: string, cue: HotCue) {
    const track = await storageCache.getTrack(trackId);
    if (track) {
      const idx = track.hotCues.findIndex((c) => c.id === cue.id);
      if (idx >= 0) {
        track.hotCues[idx] = cue;
      } else {
        track.hotCues.push(cue);
      }
      await storageCache.saveTrack(track);
      this.broadcast('CUE_UPDATED', { trackId, cue });
    }
  }

  public async syncBeatGrid(trackId: string, grid: BeatGrid) {
    const track = await storageCache.getTrack(trackId);
    if (track) {
      track.beatGrid = grid;
      await storageCache.saveTrack(track);
      this.broadcast('BEATGRID_UPDATED', { trackId, grid });
    }
  }

  public async syncPlaylist(playlist: Playlist) {
    await storageCache.savePlaylist(playlist);
    this.broadcast('PLAYLIST_UPDATED', playlist);
  }
}

export const cloudProgression = new CloudProgressionService();
