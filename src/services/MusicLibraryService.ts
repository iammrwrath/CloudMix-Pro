/**
 * MusicLibraryService
 * Ingests, caches, and indexes the entire music collection including Music.csv (6,257 tracks)
 * and CloudMix Pro IndexedDB tracks for real-time sub-millisecond Cortex AI recommendation querying.
 */

import { CortexTrack } from '../types/cortex';
import { cortexAiService } from './CortexAiService';
import { storageCache } from './StorageCacheService';
import { TrackMetadata } from '../types/dj';
import { decodeHtmlEntities } from '../utils/decodeHtml';

export class MusicLibraryService {
  private tracks: CortexTrack[] = [];
  private isLoaded: boolean = false;
  private loadPromise: Promise<CortexTrack[]> | null = null;
  private listeners: Set<(tracks: CortexTrack[]) => void> = new Set();

  public async getTracks(): Promise<CortexTrack[]> {
    if (this.isLoaded) return this.tracks;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.initLibrary();
    return this.loadPromise;
  }

  public subscribe(listener: (tracks: CortexTrack[]) => void): () => void {
    this.listeners.add(listener);
    if (this.isLoaded) {
      listener([...this.tracks]);
    }
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const copy = [...this.tracks];
    for (const listener of this.listeners) {
      try {
        listener(copy);
      } catch (err) {
        console.error('Error notifying MusicLibraryService listener:', err);
      }
    }
  }

  /**
   * Intelligently classifies or extracts genuine music genres
   * based on track metadata, artist, title keywords, album, or BPM heuristics.
   */
  public detectGenre(title?: string, artist?: string, album?: string, pathOrUrl?: string, bpm?: number): string {
    const text = `${title || ''} ${artist || ''} ${album || ''} ${pathOrUrl || ''}`.toLowerCase();

    // Specific genre patterns
    if (/\b(dancehall|reggae|ragga|soca|dub|soundclash)\b/.test(text)) return 'Dancehall';
    if (/\b(afro|afrobeats|amapiano|afropop)\b/.test(text)) return 'Afrobeats';
    if (/\b(hip hop|hip-hop|rap|trap|boom bap|freestyle|drill)\b/.test(text)) return 'Hip-Hop / Rap';
    if (/\b(r&b|rnb|soul|neo-soul|funk)\b/.test(text)) return 'R&B / Soul';
    if (/\b(tech house|deep house|house|electro house|funky house|disco)\b/.test(text)) return 'House';
    if (/\b(techno|acid|minimal|industrial|peak time)\b/.test(text)) return 'Techno';
    if (/\b(drum & bass|drum and bass|dnb|jungle|liquid)\b/.test(text)) return 'Drum & Bass';
    if (/\b(dubstep|riddim|bass house|future bass)\b/.test(text)) return 'Bass / Dubstep';
    if (/\b(trance|psytrance|goa|uplifting)\b/.test(text)) return 'Trance';
    if (/\b(reggaeton|dembow|latin|salsa|bachata|moombahton)\b/.test(text)) return 'Latin / Reggaeton';
    if (/\b(pop|synthpop|dance pop|electropop)\b/.test(text)) return 'Pop / Dance';
    if (/\b(rock|metal|indie|punk|alternative)\b/.test(text)) return 'Rock / Alternative';

    // BPM-informed heuristics if keywords are absent
    if (bpm) {
      if (bpm >= 170 && bpm <= 178) return 'Drum & Bass';
      if (bpm >= 138 && bpm <= 145) return 'Dubstep / Trap';
      if (bpm >= 128 && bpm <= 136) return 'Techno / Electro';
      if (bpm >= 120 && bpm <= 127) return 'House / EDM';
      if (bpm >= 105 && bpm <= 118) return 'Afrobeats / Pop';
      if (bpm >= 85 && bpm <= 104) return 'Hip-Hop / Dancehall';
      if (bpm >= 65 && bpm <= 84) return 'R&B / Slow Trap';
    }

    return 'Electronic / Club';
  }

  public async initLibrary(): Promise<CortexTrack[]> {
    const combined: Map<string, CortexTrack> = new Map();

    // 0. Primary: Direct Algoriddim djay Pro MediaLibrary.db ingestion (6,000+ local tracks with real audio file paths)
    try {
      if ((window as any).desktopAPI?.readDjayLibrary) {
        const djayTracks = await (window as any).desktopAPI.readDjayLibrary();
        if (Array.isArray(djayTracks) && djayTracks.length > 0) {
          for (const dt of djayTracks) {
            combined.set(dt.id, {
              ...dt,
              energyLevel: dt.bpm >= 128 ? 8 : dt.bpm >= 120 ? 7 : 6,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Could not load djay library:', err);
    }

    // 1. Load tracks from CloudMix Pro IndexedDB (only for tracks not already freshly resolved from djay Pro DB)
    try {
      const storedTracks = await storageCache.getAllTracks();
      for (const t of storedTracks) {
        const pulseT = this.convertDjTrackToPulse(t);
        if (!combined.has(pulseT.id)) {
          combined.set(pulseT.id, pulseT);
        }
      }
    } catch (err) {
      console.warn('Could not load tracks from storageCache:', err);
    }

    // Fallback seed if completely empty
    if (combined.size === 0) {
      const demos = this.getFallbackDemoTracks();
      for (const d of demos) {
        combined.set(d.id, d);
      }
    }

    // INSTANT UI DISPLAY: Populate live tracks and notify immediately (< 50ms)
    this.tracks = Array.from(combined.values());
    this.isLoaded = true;
    this.notify();

    // Persist active library to IndexedDB in non-blocking background
    try {
      const djTracks = this.tracks.map((t) => this.convertPulseToDjTrack(t));
      storageCache.saveTracks(djTracks).catch((e) => console.warn('Background track cache save error:', e));
    } catch {}

    // BACKGROUND INCREMENTAL SCAN: Load saved local directory and Music.csv asynchronously without blocking UI startup
    setTimeout(async () => {
      let updated = false;

      // 3. Scan saved local music folder path in background
      try {
        const savedPath = await storageCache.getSetting<string>('local_music_path', '');
        if (savedPath && savedPath.trim()) {
          const localTracks = await this.scanLocalFolder(savedPath.trim());
          for (const t of localTracks) {
            if (!combined.has(t.id)) {
              combined.set(t.id, t);
              updated = true;
            }
          }
        }
      } catch (err) {
        console.warn('Could not scan local music folder in background:', err);
      }

      // 4. Load from Music.csv via Electron IPC or Fetch
      try {
        let csvContent = '';
        if ((window as any).desktopAPI?.readMusicCsv) {
          csvContent = await (window as any).desktopAPI.readMusicCsv();
        } else {
          const res = await fetch('/Music.csv');
          if (res.ok) {
            csvContent = await res.text();
          }
        }

        if (csvContent && csvContent.length > 50) {
          const parsedCsv = this.parseMusicCsv(csvContent);
          for (const t of parsedCsv) {
            if (!combined.has(t.id)) {
              combined.set(t.id, t);
              updated = true;
            }
          }
        }
      } catch (err) {
        console.warn('Could not load Music.csv in background:', err);
      }

      if (updated) {
        this.tracks = Array.from(combined.values());
        this.notify();
        try {
          const djTracks = this.tracks.map((t) => this.convertPulseToDjTrack(t));
          storageCache.saveTracks(djTracks).catch(() => {});
        } catch {}
      }
    }, 250);

    return this.tracks;
  }

  public convertPulseToDjTrack(track: CortexTrack): TrackMetadata {
    const cleanTitle = decodeHtmlEntities(track.title);
    const cleanArtist = decodeHtmlEntities(track.artist);
    const cleanAlbum = decodeHtmlEntities(track.album || '');
    const genre = track.genre && track.genre !== 'Various' && track.genre !== 'Music'
      ? track.genre
      : this.detectGenre(cleanTitle, cleanArtist, cleanAlbum, track.fileUrl, track.bpm);

    return {
      id: track.id,
      title: cleanTitle,
      artist: cleanArtist,
      album: cleanAlbum,
      genre,
      year: track.year || new Date().getFullYear(),
      duration: track.duration || 180,
      bpm: track.bpm || 124,
      key: track.key || '8A',
      camelotKey: track.camelotKey || '8A',
      fileUrl: track.fileUrl,
      fileSource: track.fileSource as any,
      coverArtUrl: track.coverArtUrl,
      dateAdded: new Date().toLocaleDateString(),
      rating: track.rating || 4,
      hotCues: [],
      savedLoops: [],
      beatGrid: { bpm: track.bpm || 124, firstBeatOffset: 0.0, meter: 4 },
    };
  }

  /**
   * Scans a local folder for audio files via Electron IPC (scan-directory).
   * Returns tracks with real file:/// URLs.
   */
  public async scanLocalFolder(dirPath: string): Promise<CortexTrack[]> {
    if (!dirPath || !(window as any).desktopAPI?.scanDirectory) return [];

    try {
      const files: Array<{ name: string; fullPath: string; size: number }> =
        await (window as any).desktopAPI.scanDirectory(dirPath);

      if (!Array.isArray(files) || files.length === 0) return [];

      return files.map((f) => {
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        // Try to parse "Artist - Title.mp3" convention
        const nameNoExt = f.name.replace(/\.[^.]+$/, '');
        let title = decodeHtmlEntities(nameNoExt);
        let artist = 'Local File';
        if (nameNoExt.includes(' - ')) {
          const parts = nameNoExt.split(' - ');
          artist = decodeHtmlEntities(parts[0].trim());
          title = decodeHtmlEntities(parts.slice(1).join(' - ').trim());
        }

        const id = `local_${f.fullPath.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40)}`;
        // Encode the path for use as file:/// URL
        const fileUrl = 'file:///' + f.fullPath.replace(/\\/g, '/').replace(/^\//, '');

        const genre = this.detectGenre(title, artist, undefined, f.fullPath, 124.0);

        return {
          id,
          title,
          artist,
          genre,
          duration: 210,
          bpm: 124.0,
          key: '8A',
          camelotKey: '8A',
          energyLevel: 6,
          fileUrl,
          filePath: f.fullPath,
          fileSource: 'local' as const,
          rating: 3,
        };
      });
    } catch (err) {
      console.warn('[MusicLibrary] scanLocalFolder error:', err);
      return [];
    }
  }

  /**
   * Re-scan a local path and merge results into the live library.
   * Called by SettingsModal after the user saves a new path.
   * Returns the number of tracks found.
   */
  public async refreshFromLocalPath(dirPath: string): Promise<number> {
    await storageCache.setSetting('local_music_path', dirPath);
    const newTracks = await this.scanLocalFolder(dirPath);

    let added = 0;
    for (const t of newTracks) {
      if (!this.tracks.some((existing) => existing.id === t.id)) {
        this.tracks.unshift(t);
        added++;
      }
    }

    if (added > 0 || newTracks.length > 0) {
      this.isLoaded = true;
      this.notify();

      try {
        const djTracks = newTracks.map((t) => this.convertPulseToDjTrack(t));
        await storageCache.saveTracks(djTracks);
      } catch (err) {
        console.warn('Failed to persist scanned tracks to storageCache:', err);
      }
    }

    return newTracks.length;
  }


  // Fast robust CSV parser for Music.csv format
  public parseMusicCsv(csvText: string): CortexTrack[] {
    const results: CortexTrack[] = [];
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return results;

    // Header index mapping
    const headerLine = lines[0];
    const headers = this.parseCsvLine(headerLine).map((h) => h.toLowerCase().trim());
    const titleIdx = headers.indexOf('title');
    const artistIdx = headers.indexOf('artist');
    const albumIdx = headers.indexOf('album');
    const timeIdx = headers.indexOf('time');
    const bpmIdx = headers.indexOf('bpm');
    const keyIdx = headers.indexOf('key');
    const urlIdx = headers.indexOf('url');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = this.parseCsvLine(line);
      const title = decodeHtmlEntities((cols[titleIdx] || 'Untitled').trim().replace(/^"|"$/g, ''));
      const artist = decodeHtmlEntities((cols[artistIdx] || 'Unknown Artist').trim().replace(/^"|"$/g, ''));
      const album = cols[albumIdx] ? decodeHtmlEntities(cols[albumIdx].trim().replace(/^"|"$/g, '')) : undefined;
      const timeStr = (cols[timeIdx] || '03:00').trim();
      const bpmRaw = parseFloat(cols[bpmIdx] || '124');
      const keyRaw = (cols[keyIdx] || '8A').trim();
      const rawUrl = (cols[urlIdx] || '').trim();

      // Parse duration mm:ss to seconds
      let durationSec = 180;
      if (timeStr.includes(':')) {
        const [m, s] = timeStr.split(':').map((n) => parseInt(n, 10) || 0);
        durationSec = m * 60 + s;
      }

      const bpm = isNaN(bpmRaw) || bpmRaw <= 0 ? 124.0 : Math.round(bpmRaw * 10) / 10;
      const camelotKey = cortexAiService.normalizeCamelotKey(keyRaw);

      // Estimate energy level from BPM and genre
      let energy = 5;
      if (bpm >= 135) energy = 9;
      else if (bpm >= 126) energy = 8;
      else if (bpm >= 120) energy = 7;
      else if (bpm >= 100) energy = 6;
      else if (bpm >= 85) energy = 5;
      else energy = 4;

      const id = `csv_${i}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 24)}`;

      // Decode file:/// or file://localhost/ URL for native Electron loading
      let fileUrl = rawUrl;
      try {
        if (fileUrl.startsWith('file://localhost/')) {
          fileUrl = 'file:///' + decodeURIComponent(fileUrl.replace(/^file:\/\/localhost\//i, ''));
        } else if (fileUrl.startsWith('file:///')) {
          fileUrl = decodeURIComponent(fileUrl);
        }
      } catch {}

      const genre = this.detectGenre(title, artist, album, fileUrl, bpm);

      results.push({
        id,
        title,
        artist,
        album,
        genre,
        duration: durationSec,
        bpm,
        key: keyRaw,
        camelotKey,
        energyLevel: energy,
        fileUrl: fileUrl || 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
        fileSource: 'csv',
        rating: 4,
      });
    }

    return results;
  }

  private parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        fields.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    fields.push(cur);
    return fields;
  }

  public convertDjTrackToPulse(track: TrackMetadata): CortexTrack {
    return {
      id: track.id,
      title: decodeHtmlEntities(track.title),
      artist: decodeHtmlEntities(track.artist),
      album: track.album ? decodeHtmlEntities(track.album) : track.album,
      genre: track.genre,
      year: track.year,
      duration: track.duration,
      bpm: track.bpm,
      key: track.key,
      camelotKey: track.camelotKey || cortexAiService.normalizeCamelotKey(track.key),
      energyLevel: track.bpm >= 128 ? 8 : track.bpm >= 120 ? 7 : 5,
      fileUrl: track.fileUrl,
      fileSource: track.fileSource,
      rating: track.rating,
      coverArtUrl: track.coverArtUrl,
    };
  }

  public addTrack(track: CortexTrack) {
    if (!this.tracks.some((t) => t.id === track.id)) {
      this.tracks.unshift(track);
      this.notify();
    }
  }

  private getFallbackDemoTracks(): CortexTrack[] {
    return [
      {
        id: 'pulse-demo-1',
        title: 'Shiver (Club Mix)',
        artist: 'John Summit & Hayla',
        album: 'Comfort in Chaos',
        genre: 'Tech House',
        duration: 236,
        bpm: 126.0,
        key: 'Am',
        camelotKey: '8A',
        energyLevel: 8,
        fileUrl: 'https://cdn.freesound.org/previews/415/415444_5121236-lq.mp3',
        fileSource: 'local',
        rating: 5,
      },
      {
        id: 'pulse-demo-2',
        title: 'Where Are U Now (Afro VIP)',
        artist: 'Skrillex & Diplo',
        album: 'Jack U Remixed',
        genre: 'Afro House',
        duration: 220,
        bpm: 124.0,
        key: 'Em',
        camelotKey: '9A',
        energyLevel: 8,
        fileUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
        fileSource: 'local',
        rating: 5,
      },
      {
        id: 'pulse-demo-3',
        title: 'Rhyme Dust (Dimension Remix)',
        artist: 'MK & Dom Dolla',
        album: 'Rhyme Dust Remixed',
        genre: 'Drum & Bass',
        duration: 205,
        bpm: 174.0,
        key: 'Fm',
        camelotKey: '4A',
        energyLevel: 9,
        fileUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
        fileSource: 'local',
        rating: 5,
      },
      {
        id: 'pulse-demo-4',
        title: 'Starlight Symphony',
        artist: 'Kavinsky & Daft Sound',
        album: 'Nightcall Legends',
        genre: 'Synthwave',
        duration: 228,
        bpm: 124.0,
        key: 'Fm',
        camelotKey: '4A',
        energyLevel: 7,
        fileUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
        fileSource: 'local',
        rating: 5,
      },
      {
        id: 'pulse-demo-5',
        title: 'Solar Flare (Festival VIP)',
        artist: 'Martin G & Hardwell',
        album: 'Ultra Miami 2026',
        genre: 'Mainstage',
        duration: 195,
        bpm: 128.0,
        key: 'Am',
        camelotKey: '8A',
        energyLevel: 9,
        fileUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
        fileSource: 'local',
        rating: 5,
      },
      {
        id: 'pulse-demo-6',
        title: "'97 Hov",
        artist: 'Benny the Butcher',
        album: 'The Plugs I Met',
        genre: 'Hip Hop',
        duration: 251,
        bpm: 82.0,
        key: 'Gm',
        camelotKey: '6A',
        energyLevel: 6,
        fileUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
        fileSource: 'csv',
        rating: 4,
      },
      {
        id: 'pulse-demo-7',
        title: 'BROTHER',
        artist: 'Jessie Reyez & 6LACK',
        album: 'YESSIE',
        genre: 'R&B',
        duration: 179,
        bpm: 80.0,
        key: 'Bbm',
        camelotKey: '3A',
        energyLevel: 5,
        fileUrl: 'https://cdn.freesound.org/previews/415/415444_5121236-lq.mp3',
        fileSource: 'csv',
        rating: 5,
      },
      {
        id: 'pulse-demo-8',
        title: 'GOLIATH',
        artist: 'Jessie Reyez',
        album: 'YESSIE',
        genre: 'Trap / R&B',
        duration: 186,
        bpm: 86.0,
        key: 'Cm',
        camelotKey: '5A',
        energyLevel: 6,
        fileUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
        fileSource: 'csv',
        rating: 4,
      },
      {
        id: 'pulse-demo-9',
        title: 'Do It To It',
        artist: 'ACRAZE & Cherish',
        album: 'Do It To It',
        genre: 'House',
        duration: 158,
        bpm: 125.0,
        key: 'Dm',
        camelotKey: '7A',
        energyLevel: 8,
        fileUrl: 'https://cdn.freesound.org/previews/415/415444_5121236-lq.mp3',
        fileSource: 'local',
        rating: 5,
      },
      {
        id: 'pulse-demo-10',
        title: 'Breathe',
        artist: 'CamelPhat & Cristoph ft. Jem Cooke',
        album: 'Dark Matter',
        genre: 'Melodic House',
        duration: 313,
        bpm: 125.0,
        key: 'Cm',
        camelotKey: '5A',
        energyLevel: 7,
        fileUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
        fileSource: 'local',
        rating: 5,
      },
    ];
  }
}

export const musicLibraryService = new MusicLibraryService();
