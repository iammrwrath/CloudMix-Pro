import { openDB, IDBPDatabase } from 'idb';
import { TrackMetadata, Playlist, AutomixQueueItem, HistoryItem } from '../types/dj';

const DB_NAME = 'cloudmix_pro_db';
const DB_VERSION = 1;

export class StorageCacheService {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tracks')) {
          const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
          trackStore.createIndex('bpm', 'bpm');
          trackStore.createIndex('artist', 'artist');
          trackStore.createIndex('title', 'title');
        }
        if (!db.objectStoreNames.contains('audioBuffers')) {
          db.createObjectStore('audioBuffers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }

  // Tracks & Metadata
  public async saveTrack(track: TrackMetadata): Promise<void> {
    const db = await this.dbPromise;
    await db.put('tracks', track);
  }

  public async saveTracks(tracks: TrackMetadata[]): Promise<void> {
    if (!tracks || tracks.length === 0) return;
    const db = await this.dbPromise;
    const tx = db.transaction('tracks', 'readwrite');
    for (const track of tracks) {
      tx.store.put(track);
    }
    await tx.done;
  }

  public async getTrack(id: string): Promise<TrackMetadata | undefined> {
    const db = await this.dbPromise;
    return await db.get('tracks', id);
  }

  public async getAllTracks(): Promise<TrackMetadata[]> {
    const db = await this.dbPromise;
    return await db.getAll('tracks');
  }

  public async deleteTrack(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('tracks', id);
    await db.delete('audioBuffers', id);
  }

  // Audio Chunk / File Cache
  public async cacheAudioData(id: string, data: ArrayBuffer): Promise<void> {
    const db = await this.dbPromise;
    await db.put('audioBuffers', { id, data, cachedAt: Date.now() });
  }

  public async getCachedAudioData(id: string): Promise<ArrayBuffer | null> {
    const db = await this.dbPromise;
    const record = await db.get('audioBuffers', id);
    return record ? record.data : null;
  }

  // Playlists
  public async savePlaylist(playlist: Playlist): Promise<void> {
    const db = await this.dbPromise;
    await db.put('playlists', playlist);
  }

  public async getAllPlaylists(): Promise<Playlist[]> {
    const db = await this.dbPromise;
    return await db.getAll('playlists');
  }

  public async deletePlaylist(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('playlists', id);
  }

  // Settings
  public async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    // 1. Try native desktop disk storage first (persists across all patches, version updates, and cache clears)
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.getUserSetting) {
      try {
        const diskVal = await (window as any).desktopAPI.getUserSetting(key, undefined);
        if (diskVal !== undefined && diskVal !== null) {
          return diskVal as T;
        }
      } catch {}
    }

    // 2. Try IndexedDB
    try {
      const db = await this.dbPromise;
      const res = await db.get('settings', key);
      if (res && res.value !== undefined && res.value !== null) {
        // Dual-save back to disk storage for future updates
        if (typeof window !== 'undefined' && (window as any).desktopAPI?.saveUserSetting) {
          (window as any).desktopAPI.saveUserSetting(key, res.value).catch(() => {});
        }
        return res.value as T;
      }
    } catch {}

    // 3. Try window.localStorage as resilient secondary fallback
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(`cloudmix_setting_${key}`);
        if (raw !== null && raw !== undefined) {
          const parsed = JSON.parse(raw);
          return parsed as T;
        }
      } catch {}
    }

    return defaultValue;
  }

  public async setSetting<T>(key: string, value: T): Promise<void> {
    // 1. Save to native desktop disk storage (permanent survival across patches)
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.saveUserSetting) {
      try {
        await (window as any).desktopAPI.saveUserSetting(key, value);
      } catch {}
    }

    // 2. Save to IndexedDB
    try {
      const db = await this.dbPromise;
      await db.put('settings', { key, value });
    } catch {}

    // 3. Save to window.localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(`cloudmix_setting_${key}`, JSON.stringify(value));
      } catch {}
    }
  }

  // Automix Queue & Set History
  public async getQueue(): Promise<AutomixQueueItem[]> {
    return this.getSetting<AutomixQueueItem[]>('automix_queue', []);
  }

  public async saveQueue(queue: AutomixQueueItem[]): Promise<void> {
    await this.setSetting('automix_queue', queue);
  }

  public async getHistory(): Promise<HistoryItem[]> {
    return this.getSetting<HistoryItem[]>('set_history', []);
  }

  public async addHistory(item: HistoryItem): Promise<void> {
    const history = await this.getHistory();
    // Prepend latest track, keep up to 100 items
    const updated = [item, ...history.filter(h => h.id !== item.id)].slice(0, 100);
    await this.setSetting('set_history', updated);
  }

  public async clearHistory(): Promise<void> {
    await this.setSetting('set_history', []);
  }

  public async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear('audioBuffers');
  }
}

export const storageCache = new StorageCacheService();
