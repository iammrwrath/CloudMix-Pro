import { TrackMetadata } from '../types/dj';
import { storageCache } from './StorageCacheService';

export interface GoogleDriveConfig {
  apiKey: string;
  clientId: string;
  folderId?: string;
  accessToken?: string;
}

export class GoogleDriveService {
  private config: GoogleDriveConfig = {
    apiKey: '',
    clientId: '',
    folderId: '',
    accessToken: '',
  };

  constructor() {
    this.loadSavedConfig();
  }

  private async loadSavedConfig() {
    const saved = await storageCache.getSetting<GoogleDriveConfig>('gdrive_config', {
      apiKey: '',
      clientId: '',
      folderId: '',
      accessToken: '',
    });
    this.config = saved;
  }

  public setConfig(newConfig: Partial<GoogleDriveConfig>) {
    this.config = { ...this.config, ...newConfig };
    storageCache.setSetting('gdrive_config', this.config);
  }

  public getConfig(): GoogleDriveConfig {
    return this.config;
  }

  /**
   * Streams audio with range-request support or returns cached ArrayBuffer if already saved locally.
   */
  public async loadAudioData(track: TrackMetadata, onProgress?: (percent: number) => void): Promise<ArrayBuffer> {
    // 1. Check local tiered cache first (Instant SSD/IndexedDB access)
    const cached = await storageCache.getCachedAudioData(track.id);
    if (cached) {
      if (onProgress) onProgress(100);
      return cached;
    }

    // 2. Fetch from remote Google Drive or Web URL
    let fetchUrl = track.fileUrl;
    const headers: Record<string, string> = {};

    if (track.fileSource === 'drive' && track.driveFileId) {
      // Direct Google Drive API v3 binary stream endpoint
      fetchUrl = `https://www.googleapis.com/drive/v3/files/${track.driveFileId}?alt=media`;
      if (this.config.accessToken) {
        headers['Authorization'] = `Bearer ${this.config.accessToken}`;
      } else if (this.config.apiKey) {
        fetchUrl += `&key=${this.config.apiKey}`;
      }
    }

    const response = await fetch(fetchUrl, { headers, signal: AbortSignal.timeout(4000) });
    if (!response.ok) {
      throw new Error(`Failed to load audio from Google Drive: HTTP ${response.status} ${response.statusText}`);
    }

    const contentLength = +(response.headers.get('Content-Length') || 0);
    if (!response.body || contentLength === 0) {
      const buffer = await response.arrayBuffer();
      await storageCache.cacheAudioData(track.id, buffer);
      return buffer;
    }

    // Stream chunks with progress reporting
    const reader = response.body.getReader();
    let receivedLength = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedLength += value.length;
        if (contentLength > 0 && onProgress) {
          onProgress(Math.round((receivedLength / contentLength) * 100));
        }
      }
    }

    // Assemble ArrayBuffer
    const fullArray = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      fullArray.set(chunk, position);
      position += chunk.length;
    }

    const finalBuffer = fullArray.buffer;

    // Cache locally for instant next-time load and offline readiness
    await storageCache.cacheAudioData(track.id, finalBuffer);

    return finalBuffer;
  }

  /**
   * Search and list audio files from Google Drive folder.
   */
  public async listDriveAudioFiles(folderId?: string): Promise<Array<{ id: string; name: string; size: number; mimeType: string }>> {
    if (!this.config.apiKey && !this.config.accessToken) {
      return [];
    }

    const targetFolder = folderId || this.config.folderId || 'root';
    const query = `'${targetFolder}' in parents and (mimeType contains 'audio/' or name contains '.mp3' or name contains '.wav' or name contains '.flac' or name contains '.m4a' or name contains '.aac') and trashed = false`;

    let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,size,mimeType)&pageSize=100`;

    const headers: Record<string, string> = {};
    if (this.config.accessToken) {
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    } else if (this.config.apiKey) {
      url += `&key=${this.config.apiKey}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.files || []).map((f: { id: string; name: string; size?: string; mimeType: string }) => ({
      id: f.id,
      name: f.name,
      size: parseInt(f.size || '0', 10),
      mimeType: f.mimeType,
    }));
  }

  /**
   * 1-Click "Pin Track for Offline"
   */
  public async pinTrackOffline(track: TrackMetadata, onProgress?: (p: number) => void): Promise<void> {
    await this.loadAudioData(track, onProgress);
    track.isOfflineCached = true;
    await storageCache.saveTrack(track);
  }
}

export const googleDriveService = new GoogleDriveService();
