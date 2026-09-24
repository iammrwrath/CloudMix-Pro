import { storageCache } from './StorageCacheService';
import { TrackMetadata, DeckId } from '../types/dj';

export interface StreamerbotConfig {
  enabled: boolean;
  wsUrl: string;
  autoConnect: boolean;
  actionOnTrackChange: string;
  actionOnDrop: string;
  actionOnCrossfader: string;
}

export type StreamerbotStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

class StreamerbotService {
  private ws: WebSocket | null = null;
  private status: StreamerbotStatus = 'disconnected';
  private statusListeners: Set<(status: StreamerbotStatus) => void> = new Set();
  private config: StreamerbotConfig = {
    enabled: false,
    wsUrl: 'ws://127.0.0.1:8080/',
    autoConnect: false,
    actionOnTrackChange: 'CloudMix_Track_Change',
    actionOnDrop: 'CloudMix_Drop',
    actionOnCrossfader: 'CloudMix_Crossfader',
  };
  private reconnectTimeout: any = null;
  private lastTriggeredTrackId: string = '';

  constructor() {
    this.loadConfig();
  }

  private async loadConfig() {
    try {
      const saved = await storageCache.getSetting<StreamerbotConfig>('streamerbot_config', this.config);
      if (saved) {
        this.config = { ...this.config, ...saved };
        if (this.config.enabled && this.config.autoConnect) {
          this.connect();
        }
      }
    } catch {}
  }

  public async saveConfig(newConfig: Partial<StreamerbotConfig>) {
    this.config = { ...this.config, ...newConfig };
    await storageCache.setSetting('streamerbot_config', this.config);
  }

  public getConfig(): StreamerbotConfig {
    return { ...this.config };
  }

  public getStatus(): StreamerbotStatus {
    return this.status;
  }

  public subscribeStatus(listener: (status: StreamerbotStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(status: StreamerbotStatus) {
    this.status = status;
    this.statusListeners.forEach((l) => l(status));
  }

  public connect(url?: string): Promise<boolean> {
    const targetUrl = url || this.config.wsUrl || 'ws://127.0.0.1:8080/';
    this.disconnect();

    this.setStatus('connecting');

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(targetUrl);

        const connectTimeout = setTimeout(() => {
          if (this.status === 'connecting') {
            this.disconnect();
            this.setStatus('error');
            resolve(false);
          }
        }, 5000);

        this.ws.onopen = () => {
          clearTimeout(connectTimeout);
          this.setStatus('connected');
          console.log(`[Streamer.bot] Connected to WebSocket at ${targetUrl}`);
          resolve(true);
        };

        this.ws.onclose = () => {
          clearTimeout(connectTimeout);
          this.setStatus('disconnected');
          this.ws = null;
          if (this.config.enabled && this.config.autoConnect) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
          }
        };

        this.ws.onerror = (err) => {
          clearTimeout(connectTimeout);
          console.warn('[Streamer.bot] WebSocket error:', err);
          this.setStatus('error');
          resolve(false);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[Streamer.bot] Received event:', data);
          } catch {}
        };
      } catch (err) {
        this.setStatus('error');
        resolve(false);
      }
    });
  }

  public disconnect() {
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  /**
   * Universal trigger execution via Streamer.bot standard WebSocket API ("DoAction")
   */
  public async triggerAction(actionName: string, args: Record<string, any> = {}): Promise<boolean> {
    if (!actionName || actionName.trim() === '') return false;

    // 1. If WebSocket is connected, send DoAction directly
    if (this.ws && this.status === 'connected') {
      try {
        const payload = {
          request: 'DoAction',
          action: {
            name: actionName.trim(),
          },
          args: {
            ...args,
            cloudmixTimestamp: Date.now(),
            source: 'CloudMixPro',
          },
          id: `cloudmix_${Date.now()}`,
        };
        this.ws.send(JSON.stringify(payload));
        return true;
      } catch (err) {
        console.warn('[Streamer.bot] Failed to send WebSocket payload:', err);
      }
    }

    // 2. HTTP Fallback: In case user runs Streamer.bot HTTP Server instead of WebSocket
    try {
      const httpEndpoint = this.config.wsUrl
        .replace('ws://', 'http://')
        .replace('wss://', 'https://')
        .replace(/\/$/, '') + '/DoAction';

      const res = await fetch(httpEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: { name: actionName.trim() },
          args,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Broadcast DJ event on track change
   */
  public onTrackChange(track: TrackMetadata | null, deck: DeckId) {
    if (!this.config.enabled || !track) return;
    if (track.id === this.lastTriggeredTrackId) return;
    this.lastTriggeredTrackId = track.id;

    if (this.config.actionOnTrackChange) {
      this.triggerAction(this.config.actionOnTrackChange, {
        event: 'track_change',
        deck,
        title: track.title,
        artist: track.artist,
        bpm: track.bpm,
        key: track.camelotKey || track.key,
        duration: track.duration,
        genre: track.genre || '',
      });
    }
  }

  /**
   * Broadcast DJ event on drop or energy peak
   */
  public onDrop(deck: DeckId, bpm: number, key: string) {
    if (!this.config.enabled || !this.config.actionOnDrop) return;
    this.triggerAction(this.config.actionOnDrop, {
      event: 'beat_drop',
      deck,
      bpm,
      key,
    });
  }
}

export const streamerbotService = new StreamerbotService();
