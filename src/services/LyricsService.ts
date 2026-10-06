import { LyricsLine } from '../types/dj';
import { BroadcastService } from './BroadcastService';

interface CachedLyrics {
  artist: string;
  title: string;
  syncedLines: LyricsLine[];
  plainLyrics?: string;
  fetchedAt: number;
}

class LyricsService {
  private cache: Map<string, CachedLyrics> = new Map();
  private pendingRequests: Map<string, Promise<LyricsLine[]>> = new Map();

  private getCacheKey(artist: string, title: string): string {
    return `${artist.toLowerCase().trim()}_${title.toLowerCase().trim()}`;
  }

  /**
   * Fetch synced LRC lyrics from lrclib.net (free, fast, public synced lyrics API)
   */
  public async fetchLyrics(artist: string, title: string, durationSec?: number): Promise<LyricsLine[]> {
    if (!artist || !title) return [];
    
    // Clean up artist (remove ' - Topic', ' VEVO', ' Official', etc.)
    const cleanArtist = artist
      .replace(/\s*-\s*Topic$/i, '')
      .replace(/\s*Topic$/i, '')
      .replace(/\s*VEVO$/i, '')
      .replace(/\s*Official.*$/i, '')
      .trim();

    // Clean up title (remove feat, remaster, parentheses)
    const cleanTitle = title
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/\s*\[[^\]]*\]/g, '')
      .replace(/\s*-\s*Remaster(ed)?/i, '')
      .trim();

    const key = this.getCacheKey(cleanArtist || artist, cleanTitle);
    if (this.cache.has(key)) {
      return this.cache.get(key)!.syncedLines;
    }

    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const promise = (async () => {
      const targetArtist = cleanArtist || artist;

      // 1. Try local server proxy first (Port 8088) - performs search gracefully on backend with no browser console 404
      try {
        const proxyUrl = `http://127.0.0.1:8088/api/lyrics?artist=${encodeURIComponent(targetArtist)}&track=${encodeURIComponent(cleanTitle)}${durationSec ? `&duration=${Math.round(durationSec)}` : ''}`;
        const proxyRes = await fetch(proxyUrl);
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          if (json && json.found && json.data) {
            const synced = json.data.syncedLyrics ? BroadcastService.parseLRC(json.data.syncedLyrics) : [];
            this.cache.set(key, {
              artist: targetArtist,
              title: cleanTitle,
              syncedLines: synced,
              plainLyrics: json.data.plainLyrics || '',
              fetchedAt: Date.now(),
            });
            return synced;
          }
        }
      } catch {}

      // 2. Direct fallback (in case standalone without broadcast server)
      const userAgent = 'CloudMixPro/1.9.7 (https://github.com/iammrwrath/CloudMix-Pro)';
      try {
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${targetArtist} ${cleanTitle}`)}`;
        const searchRes = await fetch(searchUrl, {
          headers: { 'User-Agent': userAgent },
        });

        if (searchRes.ok) {
          const results = await searchRes.json();
          if (Array.isArray(results) && results.length > 0) {
            const firstWithSynced = results.find((r: any) => r.syncedLyrics) || results[0];
            if (firstWithSynced) {
              const parsed = firstWithSynced.syncedLyrics ? BroadcastService.parseLRC(firstWithSynced.syncedLyrics) : [];
              this.cache.set(key, {
                artist: targetArtist,
                title: cleanTitle,
                syncedLines: parsed,
                plainLyrics: firstWithSynced.plainLyrics || '',
                fetchedAt: Date.now(),
              });
              return parsed;
            }
          }
        }
      } catch {} finally {
        this.pendingRequests.delete(key);
      }

      return [];
    })();

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Find current lyric line based on current playback timestamp in seconds
   */
  public getLineAtTime(lines: LyricsLine[], currentTimeSec: number): LyricsLine | null {
    if (!lines || lines.length === 0) return null;
    const currentMs = currentTimeSec * 1000;

    let activeIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].timestampMs <= currentMs) {
        activeIndex = i;
      } else {
        break;
      }
    }

    if (activeIndex >= 0) {
      return lines[activeIndex];
    }
    return null;
  }
}

export const lyricsService = new LyricsService();
