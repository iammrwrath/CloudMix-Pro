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
    
    // Clean up title (remove feat, remaster, parentheses)
    const cleanTitle = title
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/\s*\[[^\]]*\]/g, '')
      .replace(/\s*-\s*Remaster(ed)?/i, '')
      .trim();

    const key = this.getCacheKey(artist, cleanTitle);
    if (this.cache.has(key)) {
      return this.cache.get(key)!.syncedLines;
    }

    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const promise = (async () => {
      try {
        let url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(cleanTitle)}`;
        if (durationSec && durationSec > 0) {
          url += `&duration=${Math.round(durationSec)}`;
        }

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'CloudMixPro/1.6.4 (https://github.com/iammrwrath/CloudMix-Pro)',
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.syncedLyrics) {
            const parsed = BroadcastService.parseLRC(data.syncedLyrics);
            this.cache.set(key, {
              artist,
              title: cleanTitle,
              syncedLines: parsed,
              plainLyrics: data.plainLyrics || '',
              fetchedAt: Date.now(),
            });
            return parsed;
          }
        }

        // Secondary fallback search if exact match returned 404
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${artist} ${cleanTitle}`)}`;
        const searchRes = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'CloudMixPro/1.6.4 (https://github.com/iammrwrath/CloudMix-Pro)',
          },
        });

        if (searchRes.ok) {
          const results = await searchRes.json();
          if (Array.isArray(results) && results.length > 0) {
            const firstWithSynced = results.find((r: any) => r.syncedLyrics);
            if (firstWithSynced && firstWithSynced.syncedLyrics) {
              const parsed = BroadcastService.parseLRC(firstWithSynced.syncedLyrics);
              this.cache.set(key, {
                artist,
                title: cleanTitle,
                syncedLines: parsed,
                plainLyrics: firstWithSynced.plainLyrics || '',
                fetchedAt: Date.now(),
              });
              return parsed;
            }
          }
        }
      } catch (err) {
        console.warn('[LyricsService] Error fetching lyrics:', err);
      } finally {
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
